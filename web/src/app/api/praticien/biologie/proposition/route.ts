import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderProposition, type VerdictGarde } from '@/lib/biology-library/gardeProposition';
import { statutPartageMedecinTraitant } from '@/lib/trust/consentementPartage';
import type { StatutChoix } from '@/lib/trust/types';
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

const PANEL_CODE_PATTERN = /^[A-Z0-9_]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/biologie/proposition';

type LigneExposee = Extract<ResultatProposition, { ok: true }>['proposition']['lignes'][number];

export type PropositionApiResponse =
  | {
      ok: true;
      lignes: LigneExposee[];
      limites: LimiteProposition[];
      documentes: DocumenteExpose[];
      /**
       * Choix « partage médecin traitant » du patient — EXPOSÉ, jamais opposé
       * (décision du 2026-07-22, même règle que le fil de correspondance) : le
       * courrier s'établit depuis cette surface, l'information s'y lit AVANT
       * le geste. `null` = le patient ne s'est jamais exprimé.
       */
      partageMedecinTraitant: StatutChoix | null;
    }
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

function depuisVerdict(verdict: Exclude<VerdictGarde, { ok: true }>) {
  return echec(verdict.reason, verdict.error, verdict.status);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idPatient = (url.searchParams.get('idPatient') ?? '').trim();
    const garde = await garderProposition(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return depuisVerdict(garde);

    // `dateReference` est posée ICI, une seule fois, et descend jusqu'au
    // moteur : lui ne lit jamais l'horloge.
    const resultat = await deriverPropositionPourPatient(idPatient, new Date().toISOString());
    if (!resultat.ok) {
      // Le refus du moteur n'est pas une erreur technique : c'est une réponse
      // clinique, et son motif est écrit pour être lu par le praticien.
      return echec('proposition_indisponible', resultat.motif, 409);
    }

    const [documentes, choix] = await Promise.all([
      prisma.panelBiologieDocumente.findMany({
        where: { idPatient },
        select: { panelCode: true, documenteLe: true, declarePar: true, declareLe: true },
        orderBy: { documenteLe: 'desc' },
      }),
      prisma.trustChoiceEvent.findMany({
        where: { idPatient, finalite: 'partage_medecin_traitant' },
        select: { finalite: true, statut: true, enregistreLe: true },
      }),
    ]);

    return NextResponse.json<PropositionApiResponse>({
      ok: true,
      lignes: resultat.proposition.lignes,
      limites: resultat.limites,
      documentes: documentes.map(exposerDocumente),
      partageMedecinTraitant: statutPartageMedecinTraitant(choix),
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
    const garde = await garderProposition(idPatient);
    if (!garde.ok) return depuisVerdict(garde);

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
