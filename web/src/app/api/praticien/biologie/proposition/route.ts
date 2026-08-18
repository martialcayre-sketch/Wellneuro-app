import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { isCbPropositionEnabled } from '@/lib/biology-library/featureFlag';
import {
  deriverPropositionPourPatient,
  type LimiteProposition,
  type ResultatProposition,
} from '@/lib/biology-library/propositionService';

// Proposition de bilan biologique hiérarchisée ([[D-071]]) — PREMIER APPELANT
// de production du moteur de statuts.
//
// GET rend la proposition ; POST consigne qu'un panel a déjà été exploré HORS
// OUTIL (existence et date, jamais un résultat — verrou HDS). `declarePar` est
// l'e-mail de session et `declareLe` est posé par la base : une déclaration
// est structurellement inantidatable et inattribuable à autrui.
//
// Rien n'est prescrit ni assigné ici : la proposition est une orientation
// d'exploration, pas une ordonnance (`DC-31`, `DC-32`).
//
// FAIL-CLOSED sur `WN_CB_PROPOSITION` ET `WN_CB_ENABLED` — 503 avec motif
// français, comme les drapeaux frères.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const PANEL_CODE_PATTERN = /^[A-Z0-9_]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/biologie/proposition';

type LigneExposee = Extract<ResultatProposition, { ok: true }>['proposition']['lignes'][number];

export type PropositionApiResponse =
  | { ok: true; lignes: LigneExposee[]; limites: LimiteProposition[]; documentes: DocumenteExpose[] }
  | { ok: true; documente: DocumenteExpose }
  | { ok: false; reason: string; error: string };

export type DocumenteExpose = {
  panelCode: string;
  documenteLe: string;
  declarePar: string;
  declareLe: string;
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PropositionApiResponse>({ ok: false, reason, error }, { status });
}

function exposerDocumente(ligne: {
  panelCode: string;
  documenteLe: Date;
  declarePar: string;
  declareLe: Date;
}): DocumenteExpose {
  return {
    panelCode: ligne.panelCode,
    documenteLe: ligne.documenteLe.toISOString(),
    declarePar: ligne.declarePar,
    declareLe: ligne.declareLe.toISOString(),
  };
}

type Garde =
  | { echec: NextResponse<PropositionApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/**
 * L'ORDRE N'EST PAS DÉCORATIF. `verifierAppartenancePatient` JOURNALISE
 * l'accès au dossier : tester le drapeau après elle ferait consigner un accès
 * qui n'a pas eu lieu. Drapeau → session → forme de l'entrée → appartenance,
 * et la lecture des données seulement après.
 */
async function garder(idPatient: string, acces?: GabaritAcces): Promise<Garde> {
  if (!isCbPropositionEnabled()) {
    return {
      echec: echec(
        'cb_proposition_desactivee',
        'La proposition de bilan biologique n’est pas activée sur cet environnement.',
        503,
      ),
    };
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return { echec: echec('unauthenticated', 'Authentification requise.', 401) };
  }
  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }
  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, acces);
  if (appartenance === 'introuvable') {
    return { echec: echec('patient_not_found', 'Patient introuvable.', 404) };
  }
  if (appartenance === 'autre_praticien') {
    return { echec: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }
  return { email: email ?? '' };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idPatient = (url.searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    // `dateReference` est posée ICI, une seule fois, et descend jusqu'au
    // moteur : lui ne lit jamais l'horloge.
    const resultat = await deriverPropositionPourPatient(idPatient, new Date().toISOString());
    if (!resultat.ok) {
      // Le refus du moteur n'est pas une erreur technique : c'est une réponse
      // clinique, et son motif est écrit pour être lu par le praticien.
      return echec('proposition_indisponible', resultat.motif, 409);
    }

    const documentes = await prisma.panelBiologieDocumente.findMany({
      where: { idPatient },
      select: { panelCode: true, documenteLe: true, declarePar: true, declareLe: true },
      orderBy: { documenteLe: 'desc' },
    });

    return NextResponse.json<PropositionApiResponse>({
      ok: true,
      lignes: resultat.proposition.lignes,
      limites: resultat.limites,
      documentes: documentes.map(exposerDocumente),
    });
  } catch (err) {
    console.error('[praticien/biologie/proposition GET]', err instanceof Error ? err.message : String(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  panelCode?: unknown;
  documenteLe?: unknown;
};

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // `typeof`, et non `?? ''` : `PostBody` est un CAST, pas une validation.
    // Un `{"idPatient": 123}` ferait lever `.trim()` AVANT le test du drapeau
    // — la route rendrait 500 là où elle doit rendre 503 ou 401, et se
    // distinguerait ainsi observablement d'une route fermée.
    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // Dossier clos : la déclaration est une pièce du dossier, le refus vit
    // dans la route et pas seulement dans l'écran.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const panelCode = typeof body.panelCode === 'string' ? body.panelCode.trim() : '';
    if (!panelCode || !PANEL_CODE_PATTERN.test(panelCode) || panelCode.length > 64) {
      return echec('invalid', 'Code de panel invalide.', 400);
    }

    const documenteLeBrut = typeof body.documenteLe === 'string' ? body.documenteLe.trim() : '';
    const documenteLe = new Date(documenteLeBrut);
    if (!documenteLeBrut || Number.isNaN(documenteLe.getTime())) {
      return echec('invalid', 'Date du bilan invalide.', 400);
    }
    // LA BORNE QUE POSTGRES NE PEUT PAS PORTER ([[D-071]] §2) : `now()` n'est
    // pas immutable, donc inutilisable dans un CHECK. Sans elle, une date
    // future ferait conclure `deja_documente` au moteur et RETIRERAIT le panel
    // des propositions — une saisie fautive tairait un bilan (`DC-24`).
    //
    // LA TOLÉRANCE D'UN JOUR N'EST PAS DU CONFORT. `<input type="date">` rend
    // « 2026-08-18 », que `new Date()` lit en UTC minuit. À 00 h 30 à Paris,
    // c'est 22 h 30 UTC la veille : la date DU JOUR serait refusée comme
    // future, chaque nuit, pendant une à deux heures selon la saison — avec un
    // message faux. La borne vise une saisie d'année (2027 pour 2026), pas un
    // décalage de fuseau ; un jour de marge la tient sans rien laisser passer
    // de ce qu'elle vise.
    const TOLERANCE_FUSEAU_MS = 24 * 60 * 60 * 1000;
    if (documenteLe.getTime() > Date.now() + TOLERANCE_FUSEAU_MS) {
      return echec(
        'date_future',
        'La date du bilan est dans le futur : un bilan à venir n’est pas un bilan documenté.',
        400,
      );
    }

    // Le panel doit exister au catalogue publié. La clé étrangère le dirait
    // aussi, mais en 500 : autant refuser proprement, avec un motif lisible.
    const panel = await prisma.biologyPanel.findUnique({
      where: { code: panelCode },
      select: { code: true },
    });
    if (!panel) {
      return echec('panel_inconnu', 'Ce panel n’existe pas au catalogue biologique.', 404);
    }

    // Une re-déclaration RÉÉCRIT l'auteur en même temps que la date : sans
    // cela, la ligne attribuerait au premier déclarant une date posée par un
    // second — une trace fausse sur une pièce de dossier relisible.
    // `declareLe` est porté par `@updatedAt`, jamais par le client.
    const ligne = await prisma.panelBiologieDocumente.upsert({
      where: { idPatient_panelCode: { idPatient, panelCode } },
      create: { idPatient, panelCode, documenteLe, declarePar: garde.email },
      update: { documenteLe, declarePar: garde.email },
      select: { panelCode: true, documenteLe: true, declarePar: true, declareLe: true },
    });

    return NextResponse.json<PropositionApiResponse>({
      ok: true,
      documente: exposerDocumente(ligne),
    });
  } catch (err) {
    console.error('[praticien/biologie/proposition POST]', err instanceof Error ? err.message : String(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
