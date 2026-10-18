import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  deciderComposition,
  lireCompositionAnalyte,
  type CompositionSigneeAffichee,
  type LireCompositionResultat,
  type RaisonRefusComposition,
} from '@/lib/biology-library/compositionsAnalytes';
import { CODE_ANALYTE_RE } from '@/lib/biology-library/correspondancesNabm';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { signature } from '@/lib/biology-library/saisieMessages';

// Composition signée des analyses groupées et des calculés (F80, D-323 §1) —
// PRATICIEN SEUL, derrière WN_CB_ENABLED. Patron de `nabm/correspondances` :
// signataire = e-mail de session, date posée par la base, décision prise sur
// l'état vu à l'écran. Référentiel global au cabinet : aucune donnée patient.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CompositionAnalyteApiResponse =
  | ({ ok: true } & Omit<Extract<LireCompositionResultat, { ok: true }>, 'ok'>)
  | { ok: false; reason: string; error: string };

export type DecisionCompositionApiResponse =
  | { ok: true; active: CompositionSigneeAffichee | null }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<RaisonRefusComposition, { message: string; status: number }> = {
  composition_non_preparee: { message: 'Aucune composition n’est préparée pour cet analyte.', status: 409 },
  composants_invalides: {
    message: 'Choisissez au moins un composant, pris dans la liste préparée.',
    status: 422,
  },
  analyte_inconnu: { message: 'Cet analyte n’existe pas au catalogue.', status: 404 },
  analyte_inactif: { message: 'Cet analyte est inactif au catalogue : rien à signer.', status: 409 },
  etat_divergent: { message: 'La composition a changé depuis l’affichage — rechargez la fiche.', status: 409 },
};

function echec<T>(reason: string, error: string, status: number) {
  return NextResponse.json<T>({ ok: false, reason, error } as T, { status });
}

// GET /api/praticien/biologie/compositions?analyte=BIO_NFS
export async function GET(req: Request): Promise<NextResponse<CompositionAnalyteApiResponse>> {
  type R = CompositionAnalyteApiResponse;
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) return echec<R>(access.reason, access.error, access.status);

    const analyte = (new URL(req.url).searchParams.get('analyte') ?? '').trim();
    if (!CODE_ANALYTE_RE.test(analyte)) return echec<R>('analyte_invalide', 'Code d’analyte invalide.', 400);

    const resultat = await lireCompositionAnalyte(analyte);
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec<R>(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json<R>(resultat);
  } catch (err) {
    console.error('[praticien/biologie/compositions GET]', signature(err));
    return echec<R>('exception', 'Erreur technique.', 500);
  }
}

type PostBody = { analyteCode?: unknown; decision?: unknown; composants?: unknown; verifieLeVu?: unknown };

const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur.trim() : '');

// POST /api/praticien/biologie/compositions
//   { analyteCode, decision: 'signer', composants: string[] }
//   { analyteCode, decision: 'retirer', verifieLeVu }
export async function POST(req: Request): Promise<NextResponse<DecisionCompositionApiResponse>> {
  type R = DecisionCompositionApiResponse;
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) return echec<R>(access.reason, access.error, access.status);

    // Le signataire est celui de la session, jamais un champ reçu du client.
    const praticien = emailPraticien(access.session);
    if (!praticien) return echec<R>('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec<R>('invalid', 'Corps de requête illisible.', 400);
    }

    const analyteCode = texte(body.analyteCode);
    const decision = texte(body.decision);
    if (!CODE_ANALYTE_RE.test(analyteCode)) return echec<R>('analyte_invalide', 'Code d’analyte invalide.', 400);
    if (decision !== 'signer' && decision !== 'retirer') {
      return echec<R>('decision_invalide', 'Décision inconnue.', 400);
    }

    let composants: string[] | undefined;
    let verifieLeVu: Date | undefined;
    if (decision === 'signer') {
      if (
        !Array.isArray(body.composants) ||
        body.composants.length > 64 ||
        !body.composants.every(c => typeof c === 'string' && CODE_ANALYTE_RE.test(c))
      ) {
        return echec<R>('composants_invalides', MESSAGES_REFUS.composants_invalides.message, 400);
      }
      composants = body.composants as string[];
    } else {
      verifieLeVu = new Date(texte(body.verifieLeVu));
      if (Number.isNaN(verifieLeVu.getTime())) {
        return echec<R>('signature_vue_invalide', 'La composition à retirer est mal désignée — rechargez la fiche.', 400);
      }
    }

    const resultat = await deciderComposition({ analyteCode, decision, composants, verifieLeVu, praticien });
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec<R>(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json<R>({ ok: true, active: resultat.active });
  } catch (err) {
    console.error('[praticien/biologie/compositions POST]', signature(err));
    return echec<R>('exception', 'Erreur technique.', 500);
  }
}
