import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { CATALOGUE_DEFINITIONS, IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';

// File d'envoi de la bibliothèque (arbitrage 2026-07-23 : « file simple,
// envoi au clic »). Un brouillon par patient accumule des questionnaires ;
// rien ne part d'ici — l'envoi est un POST séparé sur ./envoyer.

export type FileEnvoiItem = { id: string; titre: string };

export type FileEnvoiBrouillon = {
  idBrouillon: string;
  idPatient: string;
  prenom: string;
  nom: string;
  emailPatient: string;
  items: FileEnvoiItem[];
  dateLimite: string | null;
  notes: string | null;
};

export type FileEnvoiApiResponse = {
  brouillons: FileEnvoiBrouillon[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export type MutateFileEnvoiResponse = {
  success: boolean;
  idBrouillon?: string;
  count?: number;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'not_found'
    | 'dossier_cloture'
    | 'exception';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function titreDe(id: string): string {
  return CATALOGUE_DEFINITIONS[id]?.titre || id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<FileEnvoiApiResponse>(
      { brouillons: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 },
    );
  }
  try {
    const lignes = await prisma.envoiBrouillon.findMany({
      where: { praticienEmail: { equals: emailSession, mode: 'insensitive' }, statut: 'brouillon' },
      orderBy: { createdAt: 'asc' },
      include: { patient: { select: { prenom: true, nom: true, email: true } } },
    });
    return NextResponse.json<FileEnvoiApiResponse>({
      brouillons: lignes.map(l => ({
        idBrouillon: l.idBrouillon,
        idPatient: l.idPatient,
        prenom: l.patient.prenom,
        nom: l.patient.nom,
        emailPatient: l.patient.email,
        items: l.qids.map(id => ({ id, titre: titreDe(id) })),
        dateLimite: l.dateLimite,
        notes: l.notes,
      })),
    });
  } catch {
    return NextResponse.json<FileEnvoiApiResponse>(
      { brouillons: [], unavailable: true, reason: 'exception' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<MutateFileEnvoiResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      emailPatient?: unknown;
      qids?: unknown;
      dateLimite?: unknown;
      notes?: unknown;
    };
    const emailPatient =
      typeof body.emailPatient === 'string' ? body.emailPatient.trim().toLowerCase().slice(0, 254) : '';
    const qidsDemandes = Array.isArray(body.qids)
      ? body.qids.filter((q): q is string => typeof q === 'string').map(q => q.trim().slice(0, 50))
      : [];
    const dateLimite =
      typeof body.dateLimite === 'string' && DATE_REGEX.test(body.dateLimite) ? body.dateLimite : null;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

    // Seuls les instruments réellement assignables entrent dans la file :
    // ni alias historiques, ni passations praticien, ni ids inconnus.
    const qids = [...new Set(qidsDemandes.filter(id => IDS_ASSIGNABLES.has(id)))];
    if (!EMAIL_REGEX.test(emailPatient) || qids.length === 0) {
      return NextResponse.json<MutateFileEnvoiResponse>(
        { success: false, reason: 'invalid_payload', error: 'Patient ou questionnaires invalides.' },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { email: emailPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient || !patient.actif) {
      return NextResponse.json<MutateFileEnvoiResponse>(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (!accepteNouvelEnvoi(patient)) {
      return NextResponse.json<MutateFileEnvoiResponse>(
        { success: false, reason: RAISON_DOSSIER_CLOS, error: MESSAGE_DOSSIER_CLOS },
        { status: 409 },
      );
    }

    const existant = await prisma.envoiBrouillon.findFirst({
      where: {
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        idPatient: patient.idPatient,
        statut: 'brouillon',
      },
    });
    if (existant) {
      const fusion = [...new Set([...existant.qids, ...qids])].slice(0, 60);
      const maj = await prisma.envoiBrouillon.update({
        where: { idBrouillon: existant.idBrouillon },
        data: {
          qids: fusion,
          dateLimite: dateLimite ?? existant.dateLimite,
          notes: notes ?? existant.notes,
        },
      });
      return NextResponse.json<MutateFileEnvoiResponse>({
        success: true,
        idBrouillon: maj.idBrouillon,
        count: maj.qids.length,
      });
    }
    const cree = await prisma.envoiBrouillon.create({
      data: {
        idBrouillon: createPublicId('ENV'),
        praticienEmail: emailSession,
        idPatient: patient.idPatient,
        qids: qids.slice(0, 60),
        dateLimite,
        notes,
      },
    });
    return NextResponse.json<MutateFileEnvoiResponse>({
      success: true,
      idBrouillon: cree.idBrouillon,
      count: cree.qids.length,
    });
  } catch {
    return NextResponse.json<MutateFileEnvoiResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<MutateFileEnvoiResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const url = new URL(request.url);
    const idBrouillon = url.searchParams.get('idBrouillon')?.trim().slice(0, 50) ?? '';
    const qid = url.searchParams.get('qid')?.trim().slice(0, 50) ?? '';
    if (!idBrouillon) {
      return NextResponse.json<MutateFileEnvoiResponse>(
        { success: false, reason: 'invalid_payload', error: 'Brouillon manquant.' },
        { status: 400 },
      );
    }
    const brouillon = await prisma.envoiBrouillon.findFirst({
      where: {
        idBrouillon,
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        statut: 'brouillon',
      },
    });
    if (!brouillon) {
      return NextResponse.json<MutateFileEnvoiResponse>(
        { success: false, reason: 'not_found', error: 'Brouillon introuvable.' },
        { status: 404 },
      );
    }
    if (qid) {
      const restants = brouillon.qids.filter(id => id !== qid);
      if (restants.length > 0) {
        const maj = await prisma.envoiBrouillon.update({
          where: { idBrouillon },
          data: { qids: restants },
        });
        return NextResponse.json<MutateFileEnvoiResponse>({
          success: true,
          idBrouillon,
          count: maj.qids.length,
        });
      }
    }
    await prisma.envoiBrouillon.delete({ where: { idBrouillon } });
    return NextResponse.json<MutateFileEnvoiResponse>({ success: true, idBrouillon, count: 0 });
  } catch {
    return NextResponse.json<MutateFileEnvoiResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}
