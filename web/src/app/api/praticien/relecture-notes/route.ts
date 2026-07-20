import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { construireReperes } from '@/lib/praticien/lectureAsOf';
import { notesActives, preparerNote } from '@/lib/praticien/relectureNote';

// Notes de relecture (SP-TT LOT-02, gate G3) — route DÉDIÉE.
//
// Pourquoi une route à part plutôt qu'un POST sur /cockpit ? Parce que le POST
// cockpit refuse toute écriture dès qu'un `asOf` est présent, et que ce refus
// est juste : il protège la confirmation d'épisode, qui ne doit jamais partir
// d'un état périmé. Une note, elle, n'est pas une décision prise dans le passé
// — c'est une décision prise aujourd'hui à propos du passé. Elle reçoit donc
// l'instant relu **dans son corps, comme une donnée**, jamais en mode de
// lecture. Cette route refuse d'ailleurs explicitement un `?asOf=` (voir plus
// bas) : la distinction doit rester lisible depuis l'extérieur.
//
// Append-only : corriger une note crée une ligne chaînée, jamais un UPDATE ni
// un DELETE. PRATICIEN SEUL, garde d'appartenance appliquée.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export type NoteExposee = {
  id: string;
  instantRelu: string;
  texte: string;
  creeLe: string;
  corrigeDepuisNoteId: string | null;
};

export type RelectureNotesApiResponse =
  | { ok: true; notes: NoteExposee[] }
  | { ok: true; note: NoteExposee }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, string> = {
  texte_vide: 'La note est vide.',
  texte_trop_long: 'La note est trop longue.',
  instant_invalide: 'Instant relu manquant ou illisible.',
  instant_hors_reperes: 'Date de lecture inconnue pour ce patient.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RelectureNotesApiResponse>({ ok: false, reason, error }, { status });
}

function exposer(ligne: {
  id: string;
  instantRelu: Date;
  texte: string;
  creeLe: Date;
  supersedesNoteId: string | null;
}): NoteExposee {
  return {
    id: ligne.id,
    instantRelu: ligne.instantRelu.toISOString(),
    texte: ligne.texte,
    creeLe: ligne.creeLe.toISOString(),
    corrigeDepuisNoteId: ligne.supersedesNoteId,
  };
}

type Garde =
  | { echec: NextResponse<RelectureNotesApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/** Session + identifiant + appartenance. Retourne l'e-mail praticien ou une réponse d'échec. */
async function garder(req: Request, idPatient: string): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };

  // Une note n'est jamais écrite « en mode passé » : l'instant relu passe par le
  // corps. Un `asOf` en paramètre trahirait la confusion que ce gate refuse.
  if (new URL(req.url).searchParams.get('asOf')) {
    return {
      echec: echec(
        'invalid',
        'L’instant relu se transmet dans le corps de la note, pas comme mode de lecture.',
        400,
      ),
    };
  }

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }

  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email);
  if (appartenance === 'introuvable') return { echec: echec('patient_not_found', 'Patient introuvable.', 404) };
  if (appartenance === 'autre_praticien') {
    return { echec: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }

  return { email: email ?? '' };
}

// GET /api/praticien/relecture-notes?idPatient=[&instantRelu=] — notes actives.
export async function GET(req: Request): Promise<NextResponse<RelectureNotesApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(req, idPatient);
    if (garde.echec) return garde.echec;

    const lignes = await prisma.relectureNote.findMany({
      where: { idPatient },
      select: { id: true, instantRelu: true, texte: true, creeLe: true, supersedesNoteId: true },
      orderBy: { creeLe: 'desc' },
    });

    const instantRelu = searchParams.get('instantRelu');
    const filtre = instantRelu ? new Date(instantRelu).getTime() : null;
    const retenues =
      filtre !== null && Number.isFinite(filtre)
        ? lignes.filter((ligne) => ligne.instantRelu.getTime() === filtre)
        : lignes;

    return NextResponse.json({ ok: true, notes: notesActives(retenues).map(exposer) });
  } catch (err) {
    console.error('[praticien/relecture-notes GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  instantRelu?: string;
  texte?: string;
  corrigeNoteId?: string | null;
};

// POST /api/praticien/relecture-notes — dépose une note, datée du présent.
export async function POST(req: Request): Promise<NextResponse<RelectureNotesApiResponse>> {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    const garde = await garder(req, idPatient);
    if (garde.echec) return garde.echec;

    if (typeof body.texte !== 'string') return echec('texte_vide', MESSAGES_REFUS.texte_vide, 400);

    // Les repères sont recalculés côté serveur : l'appelant ne choisit pas les
    // dates auxquelles il peut écrire, il choisit parmi celles qui existent.
    const [episodes, reponses] = await Promise.all([
      prisma.assessmentEpisode.findMany({
        where: { idPatient },
        select: { milestone: true, confirmedAt: true },
      }),
      prisma.questionnaireReponse.findMany({
        where: { idPatient },
        select: { idQuestionnaire: true, dateReponse: true },
      }),
    ]);

    const preparation = preparerNote({
      idPatient,
      praticienEmail: garde.email,
      texte: body.texte,
      instantRelu: body.instantRelu,
      reperes: construireReperes({ episodes, reponses }),
      supersedesNoteId: body.corrigeNoteId ?? null,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // Correction : la note visée doit exister, appartenir au même patient, et ne
    // pas être elle-même déjà corrigée — sinon deux corrections concurrentes
    // scinderaient la chaîne en deux têtes.
    const corrigeNoteId = preparation.donnees.supersedesNoteId;
    if (corrigeNoteId) {
      const [cible, dejaCorrigee] = await Promise.all([
        prisma.relectureNote.findUnique({
          where: { id: corrigeNoteId },
          select: { idPatient: true, instantRelu: true },
        }),
        prisma.relectureNote.findFirst({
          where: { supersedesNoteId: corrigeNoteId },
          select: { id: true },
        }),
      ]);
      if (!cible || cible.idPatient !== idPatient) {
        return echec('note_not_found', 'Note à corriger introuvable.', 404);
      }
      if (cible.instantRelu.getTime() !== preparation.donnees.instantRelu.getTime()) {
        return echec('instant_mismatch', 'Une correction porte sur le même instant relu.', 400);
      }
      if (dejaCorrigee) {
        return echec('note_superseded', 'Cette note a déjà été corrigée. Rechargez les notes.', 409);
      }
    }

    // `creeLe` n'est PAS transmis : la base pose le présent (@default(now())).
    // C'est ce qui rend une note structurellement inantidatable.
    const creee = await prisma.relectureNote.create({
      data: preparation.donnees,
      select: { id: true, instantRelu: true, texte: true, creeLe: true, supersedesNoteId: true },
    });

    return NextResponse.json({ ok: true, note: exposer(creee) }, { status: 201 });
  } catch (err) {
    console.error('[praticien/relecture-notes POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
