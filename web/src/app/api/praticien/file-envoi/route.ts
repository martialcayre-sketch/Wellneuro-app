import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import { estInstrumentCabinet, idsAssignablesPour } from '@/lib/instruments';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';

// File d'envoi de la bibliothèque (arbitrage 2026-07-23 : « file simple,
// envoi au clic »). Un brouillon par patient accumule des questionnaires ;
// rien ne part d'ici — l'envoi est un POST séparé sur ./envoyer.

export type FileEnvoiItem = {
  id: string;
  titre: string;
  /** Instrument du cabinet devenu non assignable (dépublié ou désactivé) :
   * affiché barré d'un badge, il sera filtré à l'envoi. */
  indisponible?: boolean;
};

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

type InfoCabinet = { titre: string; actif: boolean; statutRelecture: string };

function itemDe(id: string, cabinetParId: Map<string, InfoCabinet>): FileEnvoiItem {
  if (!estInstrumentCabinet(id)) {
    return { id, titre: CATALOGUE_DEFINITIONS[id]?.titre || id };
  }
  const info = cabinetParId.get(id);
  // Un instrument du cabinet dépublié ou désactivé reste LISTÉ, marqué
  // indisponible — jamais supprimé silencieusement : c'est l'envoi qui le
  // filtrera, et l'écran doit le dire avant.
  const indisponible = !info || !info.actif || info.statutRelecture !== 'valide';
  return { id, titre: info?.titre || id, ...(indisponible ? { indisponible: true } : {}) };
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
    // Les instruments du cabinet (CAB_) n'ont pas de titre au catalogue en
    // code : une seule lecture pour tous les brouillons — statut compris,
    // pour marquer les items devenus non assignables.
    const idsCabinet = [...new Set(lignes.flatMap(l => l.qids.filter(estInstrumentCabinet)))];
    const cabinetParId = new Map<string, InfoCabinet>(
      idsCabinet.length === 0
        ? []
        : (
            await prisma.cabinetInstrument.findMany({
              where: {
                idInstrument: { in: idsCabinet },
                praticienEmail: { equals: emailSession, mode: 'insensitive' },
              },
              select: { idInstrument: true, titre: true, actif: true, statutRelecture: true },
            })
          ).map(row => [
            row.idInstrument,
            { titre: row.titre, actif: row.actif, statutRelecture: row.statutRelecture },
          ]),
    );
    return NextResponse.json<FileEnvoiApiResponse>({
      brouillons: lignes.map(l => ({
        idBrouillon: l.idBrouillon,
        idPatient: l.idPatient,
        prenom: l.patient.prenom,
        nom: l.patient.nom,
        emailPatient: l.patient.email,
        items: l.qids.map(id => itemDe(id, cabinetParId)),
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
    // ni alias historiques, ni passations praticien, ni ids inconnus — et
    // côté cabinet, seuls les instruments PUBLIÉS du praticien en session.
    const assignables = await idsAssignablesPour(emailSession);
    const qids = [...new Set(qidsDemandes.filter(id => assignables.has(id)))];
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

    // Invariant « un seul brouillon actif par patient et par praticien » :
    // un index partiel (WHERE statut='brouillon') n'est pas exprimable dans
    // le schéma Prisma et ferait dériver le contrôle schéma ↔ migrations.
    // On sérialise donc les ajouts concurrents sur le verrou de la ligne
    // patient (même patron FOR UPDATE que l'accès portail) : le
    // findFirst-puis-create s'exécute sous verrou, la fenêtre TOCTOU
    // disparaît.
    const resultat = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${patient.idPatient} FOR UPDATE`;
      const existant = await tx.envoiBrouillon.findFirst({
        where: {
          praticienEmail: { equals: emailSession, mode: 'insensitive' },
          idPatient: patient.idPatient,
          statut: 'brouillon',
        },
      });
      if (existant) {
        const fusion = [...new Set([...existant.qids, ...qids])].slice(0, 60);
        return tx.envoiBrouillon.update({
          where: { idBrouillon: existant.idBrouillon },
          data: {
            qids: fusion,
            dateLimite: dateLimite ?? existant.dateLimite,
            notes: notes ?? existant.notes,
          },
        });
      }
      return tx.envoiBrouillon.create({
        data: {
          idBrouillon: createPublicId('ENV'),
          praticienEmail: emailSession,
          idPatient: patient.idPatient,
          qids: qids.slice(0, 60),
          dateLimite,
          notes,
        },
      });
    });
    return NextResponse.json<MutateFileEnvoiResponse>({
      success: true,
      idBrouillon: resultat.idBrouillon,
      count: resultat.qids.length,
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
