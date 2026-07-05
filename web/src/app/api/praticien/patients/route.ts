import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_ASSIGNATIONS = 40;

type Patient = {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  actif: string;
};

type Assignation = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateAssignation: string;
  statut: string;
};

export type PatientsApiResponse = {
  patients: Patient[];
  assignations: Assignation[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export type CreatePatientResponse = {
  success: boolean;
  patient?: Patient;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'duplicate_email' | 'exception';
};

export type PatchPatientResponse = {
  success: boolean;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception';
};

export type DeletePatientResponse = {
  success: boolean;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception';
};

// Prochain idPatient au format PATnnn, dérivé du max courant en base.
async function nextIdPatient(): Promise<string> {
  const patients = await prisma.patient.findMany({ select: { idPatient: true } });
  const maxId = patients.reduce((max, p) => {
    const m = /^PAT(\d+)$/.exec(p.idPatient);
    if (!m) return max;
    return Math.max(max, Number(m[1]));
  }, 0);
  return `PAT${String(maxId + 1).padStart(3, '0')}`;
}

export async function GET(): Promise<NextResponse<PatientsApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  try {
    const [dbPatients, dbAssignations] = await Promise.all([
      prisma.patient.findMany({ orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] }),
      prisma.assignation.findMany({
        orderBy: { dateAssignation: 'desc' },
        take: MAX_ASSIGNATIONS,
      }),
    ]);

    const patients: Patient[] = dbPatients.map(p => ({
      idPatient: p.idPatient,
      email: p.email,
      prenom: p.prenom,
      nom: p.nom,
      telephone: p.telephone ?? '',
      actif: p.actif ? 'OUI' : 'NON',
    }));

    const assignations: Assignation[] = dbAssignations.map(a => ({
      idAssignation: a.idAssignation,
      idPatient: a.idPatient,
      emailPatient: a.emailPatient,
      idQuestionnaire: a.idQuestionnaire,
      titre: a.titre,
      dateAssignation: a.dateAssignation.toISOString(),
      statut: a.statut,
    }));

    return NextResponse.json({ patients, assignations });
  } catch (err) {
    console.error('[patients GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      patients: [],
      assignations: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}

export async function POST(req: Request): Promise<NextResponse<CreatePatientResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  type CreatePatientPayload = {
    prenom?: string;
    nom?: string;
    email?: string;
    telephone?: string;
    dateNaissance?: string;
  };

  let payload: CreatePatientPayload;
  try {
    payload = (await req.json()) as CreatePatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const prenom = (payload.prenom ?? '').trim().slice(0, 100);
  const nom = (payload.nom ?? '').trim().slice(0, 100);
  const email = (payload.email ?? '').trim().toLowerCase().slice(0, 254);
  const telephone = (payload.telephone ?? '').trim().slice(0, 30);
  const dateNaissance = (payload.dateNaissance ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isDateValid = !dateNaissance || /^\d{4}-\d{2}-\d{2}$/.test(dateNaissance);
  if (!prenom || !nom || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !prenom || !nom
          ? 'Prénom et nom sont requis.'
          : !isEmailValid
            ? 'Email invalide.'
            : 'Date de naissance invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, reason: 'duplicate_email', error: 'Un patient avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    const idPatient = await nextIdPatient();
    const praticienEmail = (session.user?.email ?? '').toLowerCase();

    await prisma.patient.create({
      data: {
        idPatient,
        email,
        prenom,
        nom,
        dateNaissance: dateNaissance || null,
        telephone: telephone || null,
        praticienEmail,
        actif: true,
      },
    });

    return NextResponse.json({
      success: true,
      patient: {
        idPatient,
        email,
        prenom,
        nom,
        telephone,
        actif: 'OUI',
      },
    });
  } catch (err) {
    // Collision rare sur idPatient (créations quasi simultanées) : contrainte unique Prisma P2002
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({
        success: false,
        reason: 'exception',
        error: 'Conflit lors de la génération du numéro patient, réessayez.',
      });
    }
    console.error('[patients POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la création du patient.',
    });
  }
}

type PatchPatientPayload = {
  idPatient?: string;
  telephone?: string;
  actif?: 'OUI' | 'NON';
};

export async function PATCH(req: Request): Promise<NextResponse<PatchPatientResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: PatchPatientPayload;
  try {
    payload = (await req.json()) as PatchPatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const telephone = (payload.telephone ?? '').trim().slice(0, 30);
  const actif = payload.actif;

  if (!idPatient || !/^PAT\d+$/.test(idPatient)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'idPatient invalide.' },
      { status: 400 }
    );
  }
  if (actif !== undefined && actif !== 'OUI' && actif !== 'NON') {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Valeur actif invalide (OUI ou NON).' },
      { status: 400 }
    );
  }

  try {
    await prisma.patient.update({
      where: { idPatient },
      data: {
        ...(payload.telephone !== undefined && { telephone: telephone || null }),
        ...(actif !== undefined && { actif: actif === 'OUI' }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 }
      );
    }
    console.error('[patients PATCH]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la modification du patient.',
    });
  }
}

// DELETE /api/praticien/patients?idPatient=PAT001
// Désactive le patient en PostgreSQL (soft-delete, préserve l'historique clinique)
export async function DELETE(req: Request): Promise<NextResponse<DeletePatientResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();

  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'idPatient invalide.' }, { status: 400 });
  }

  try {
    const { count } = await prisma.patient.updateMany({
      where: { idPatient },
      data: { actif: false },
    });

    if (count === 0) {
      return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[patients DELETE]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la suppression.' });
  }
}
