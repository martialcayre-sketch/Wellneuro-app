import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { statutPartageMedecinTraitant } from '@/lib/trust/consentementPartage';
import type { StatutChoix } from '@/lib/trust/types';

// Fil de correspondance médecin (C3 LOT-06, V1 = transcription praticien).
//
// UNE SEULE ROUTE, GET + POST, le sens dans le corps : consigner un envoi et
// transcrire une réponse écrivent la même table avec exactement les mêmes
// gardes — deux routes dupliqueraient `garder()` sans aucun gain de sûreté.
//
// Le médecin n'accède à rien, l'application n'envoie rien. PRATICIEN SEUL,
// garde d'appartenance appliquée.
//
// DOSSIER CLOS = CONSIGNATION REFUSÉE, POUR LES DEUX SENS (FM-2 : la
// correspondance est une pièce du dossier ; `accepteNouvelEnvoi` est le point
// de décision unique — leçon #181). Le cas réel « réponse arrivée après
// clôture » a un chemin propre : rouvrir le suivi, transcrire, reclôturer —
// la clôture est réversible. La LECTURE, elle, n'est jamais refusée : la
// clôture promet la lecture des archives.
//
// TRUST : l'état du consentement « partage médecin traitant » est EXPOSÉ,
// jamais opposé (décision utilisateur du 2026-07-22) — le partage a lieu hors
// application ; bloquer la consignation rendrait le dossier aveugle sans
// protéger personne.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export type CorrespondanceExposee = {
  id: string;
  sens: string;
  medecinLibelle: string;
  texte: string;
  idSynthese: string | null;
  echangeLe: string | null;
  consigneLe: string;
};

export type CorrespondanceMedecinApiResponse =
  | {
      ok: true;
      correspondances: CorrespondanceExposee[];
      accepteConsignation: boolean;
      partageMedecinTraitant: StatutChoix | null;
    }
  | { ok: true; correspondance: CorrespondanceExposee }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, string> = {
  sens_invalide: 'Sens de l’échange invalide (envoi ou réponse).',
  medecin_libelle_vide: 'Indiquez le médecin concerné (désignation libre).',
  medecin_libelle_email:
    'Désignez le médecin sans adresse e-mail : seule une désignation libre est conservée.',
  medecin_libelle_trop_long: 'La désignation du médecin est trop longue.',
  texte_vide: 'Le texte de l’échange est vide.',
  texte_trop_long: 'Le texte de l’échange est trop long (8 000 caractères maximum).',
  date_echange_invalide: 'Date de l’échange illisible.',
  date_echange_future: 'La date de l’échange ne peut pas être dans le futur.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorrespondanceMedecinApiResponse>(
    { ok: false, reason, error },
    { status },
  );
}

function exposer(ligne: {
  id: string;
  sens: string;
  medecinLibelle: string;
  texte: string;
  idSynthese: string | null;
  echangeLe: Date | null;
  consigneLe: Date;
}): CorrespondanceExposee {
  return {
    id: ligne.id,
    sens: ligne.sens,
    medecinLibelle: ligne.medecinLibelle,
    texte: ligne.texte,
    // Référence souple : un id disparu est exposé tel quel, l'écran le tolère
    // (constat AC-5 de la revue de la PR 1) — jamais d'échec de lecture ici.
    idSynthese: ligne.idSynthese,
    echangeLe: ligne.echangeLe ? ligne.echangeLe.toISOString() : null,
    consigneLe: ligne.consigneLe.toISOString(),
  };
}

const SELECTION = {
  id: true,
  sens: true,
  medecinLibelle: true,
  texte: true,
  idSynthese: true,
  echangeLe: true,
  consigneLe: true,
} as const;

type Garde =
  | { echec: NextResponse<CorrespondanceMedecinApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/** Session + identifiant + appartenance. Retourne l'e-mail praticien ou une réponse d'échec. */
async function garder(idPatient: string): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }

  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email);
  if (appartenance === 'introuvable') {
    return { echec: echec('patient_not_found', 'Patient introuvable.', 404) };
  }
  if (appartenance === 'autre_praticien') {
    return { echec: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }

  return { email: email ?? '' };
}

// GET /api/praticien/correspondance-medecin?idPatient= — le fil, du plus
// récent au plus ancien, avec l'état du dossier et du consentement.
export async function GET(req: Request): Promise<NextResponse<CorrespondanceMedecinApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    const [lignes, patient, choix] = await Promise.all([
      prisma.correspondanceMedecin.findMany({
        where: { idPatient },
        select: SELECTION,
        orderBy: { consigneLe: 'desc' },
      }),
      prisma.patient.findUnique({
        where: { idPatient },
        select: { actif: true, suiviClotureLe: true },
      }),
      prisma.trustChoiceEvent.findMany({
        where: { idPatient, finalite: 'partage_medecin_traitant' },
        select: { finalite: true, statut: true, enregistreLe: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      correspondances: lignes.map(exposer),
      // Courtoisie d'écran : la décision qui fait foi reste le 409 du POST.
      accepteConsignation: patient ? accepteNouvelEnvoi(patient) : false,
      partageMedecinTraitant: statutPartageMedecinTraitant(choix),
    });
  } catch (err) {
    console.error(
      '[praticien/correspondance-medecin GET]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  sens?: string;
  medecinLibelle?: string;
  texte?: string;
  idSynthese?: string | null;
  echangeLe?: string | null;
};

// POST /api/praticien/correspondance-medecin — consigne un envoi ou transcrit
// une réponse, daté du présent par la base.
export async function POST(req: Request): Promise<NextResponse<CorrespondanceMedecinApiResponse>> {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // Dossier clos : plus aucune consignation, quel que soit le sens. Le refus
    // est ici, dans la route, et non dans l'écran — sinon un appel direct le
    // contourne (#181).
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const preparation = preparerCorrespondance({
      idPatient,
      praticienEmail: garde.email,
      sens: body.sens,
      medecinLibelle: body.medecinLibelle,
      texte: body.texte,
      idSynthese: body.idSynthese,
      echangeLe: body.echangeLe,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // Référence de synthèse : elle doit exister et appartenir au même patient
    // — sans révéler l'existence d'une synthèse chez autrui (même 404 dans les
    // deux cas, patron corrigeNoteId).
    const idSynthese = preparation.donnees.idSynthese;
    if (idSynthese) {
      const synthese = await prisma.syntheseIA.findUnique({
        where: { idSynthese },
        select: { idPatient: true },
      });
      if (!synthese || synthese.idPatient !== idPatient) {
        return echec('synthese_not_found', 'Synthèse introuvable pour ce patient.', 404);
      }
    }

    // `consigneLe` n'est PAS transmis : la base pose le présent
    // (@default(now())). Une consignation est structurellement inantidatable.
    const creee = await prisma.correspondanceMedecin.create({
      data: preparation.donnees,
      select: SELECTION,
    });

    return NextResponse.json({ ok: true, correspondance: exposer(creee) }, { status: 201 });
  } catch (err) {
    console.error(
      '[praticien/correspondance-medecin POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
