import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';

const MAX_ASSIGNATIONS = 40;

type Patient = {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  actif: string;
  // Clôture de suivi (IDP2). DISTINCT de `actif` : un dossier clos garde son
  // accès en lecture, un dossier inactif le perd. L'écran ne peut pas déduire
  // l'un de l'autre — d'où ce champ, et non un booléen de plus.
  suiviClotureLe: string | null;
};

type Assignation = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateAssignation: string;
  statut: string;
  statutReponses: string;
  correctionCommentaire: string | null;
  correctionDemandeeDate: string | null;
};

export type PatientsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PatientsApiResponse = {
  patients: Patient[];
  assignations: Assignation[];
  pagination?: PatientsPagination;
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
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'forbidden' | 'exception';
};

// Il n'y a PAS de `DeletePatientResponse` ni de handler `DELETE` ici, et c'est
// délibéré (2026-07-21, LOT-01b). La route existait, n'avait plus d'appelant
// depuis que « Supprimer » a rejoint le menu sous son vrai nom, et surtout elle
// écrivait `actif: false` : un verbe DELETE qui ne détruisait rien, désormais
// voisin d'un effacement qui détruit vraiment. Désactiver un dossier se fait
// par `PATCH { actif: 'NON' }`, qui dit ce qu'il fait ; l'effacement par
// `POST /api/praticien/patients/cycle-de-vie`.

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

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function GET(req: Request): Promise<NextResponse<PatientsApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  const email = emailPraticien(session);
  if (!email) {
    return NextResponse.json(
      { patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  // `page` absent = comportement historique (liste complète, non paginée),
  // conservé pour les appelants qui ont besoin de tous les patients (ex.
  // le sélecteur de la nouvelle assignation). `page` présent = pagination
  // serveur avec recherche/tri, pour l'affichage tabulaire.
  const { searchParams } = new URL(req.url);
  const pageParam = Number(searchParams.get('page'));
  const isPaginated = Number.isInteger(pageParam) && pageParam >= 1;

  try {
    if (isPaginated) {
      const page = pageParam;
      const pageSize = clamp(Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
      const search = (searchParams.get('search') ?? '').trim().slice(0, 200);
      const sortBy = searchParams.get('sortBy') === 'email' ? 'email' : 'nom';

      const where = {
        ...filtrePatientsDuPraticien(email),
        ...(search
          ? {
              OR: [
                { nom: { contains: search, mode: 'insensitive' as const } },
                { prenom: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const orderBy =
        sortBy === 'email'
          ? [{ email: 'asc' as const }]
          : [{ nom: 'asc' as const }, { prenom: 'asc' as const }];

      const [dbPatients, total, dbAssignations] = await Promise.all([
        prisma.patient.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.patient.count({ where }),
        prisma.assignation.findMany({
          where: { patient: filtrePatientsDuPraticien(email) },
          orderBy: { dateAssignation: 'desc' },
          take: MAX_ASSIGNATIONS,
        }),
      ]);

      return NextResponse.json({
        patients: dbPatients.map(patientToDto),
        assignations: dbAssignations.map(assignationToDto),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    }

    const [dbPatients, dbAssignations] = await Promise.all([
      prisma.patient.findMany({ where: filtrePatientsDuPraticien(email), orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] }),
      prisma.assignation.findMany({
        where: { patient: filtrePatientsDuPraticien(email) },
        orderBy: { dateAssignation: 'desc' },
        take: MAX_ASSIGNATIONS,
      }),
    ]);

    return NextResponse.json({
      patients: dbPatients.map(patientToDto),
      assignations: dbAssignations.map(assignationToDto),
    });
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

function patientToDto(p: {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  actif: boolean;
  suiviClotureLe: Date | null;
}): Patient {
  return {
    idPatient: p.idPatient,
    email: p.email,
    prenom: p.prenom,
    nom: p.nom,
    telephone: p.telephone ?? '',
    actif: p.actif ? 'OUI' : 'NON',
    suiviClotureLe: p.suiviClotureLe ? p.suiviClotureLe.toISOString() : null,
  };
}

function assignationToDto(a: {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateAssignation: Date;
  statut: string;
  statutReponses: string;
  correctionCommentaire: string | null;
  correctionDemandeeDate: Date | null;
}): Assignation {
  return {
    idAssignation: a.idAssignation,
    idPatient: a.idPatient,
    emailPatient: a.emailPatient,
    idQuestionnaire: a.idQuestionnaire,
    titre: a.titre,
    dateAssignation: a.dateAssignation.toISOString(),
    statut: a.statut,
    statutReponses: a.statutReponses,
    correctionCommentaire: a.correctionCommentaire ?? null,
    correctionDemandeeDate: a.correctionDemandeeDate ? a.correctionDemandeeDate.toISOString() : null,
  };
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
        suiviClotureLe: null,
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

  // Même forme d'identifiant que `DELETE` (plus bas) et que la route
  // `cycle-de-vie` : `/^PAT\d+$/` rejetait les identifiants à tiret bas, dont
  // le patient fictif `PAT_SEED_03` — « Modifier » était donc inopérant sur le
  // dossier de seed. L'appartenance reste vérifiée juste en dessous.
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
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

  const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
  if (verdict === 'introuvable') {
    return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json({ success: false, reason: 'forbidden', error: 'Patient non accessible.' }, { status: 403 });
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
