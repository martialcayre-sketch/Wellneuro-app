import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  RAYON_MICRONUTRITION,
  servirRayonCorpus,
  type RayonCorpusResult,
} from '@/lib/supplement-library/rayonCorpus';

// Rayon corpus (C4, outil n°1) — PRATICIEN SEUL, derrière WN_C4_ENABLED
// (fail-closed, 404 flag éteint). Restitue les claims validés (barrière D-003
// via match_wellneuro_rag_claims) filtrés par metadata.rayon. Le corpus vide
// est un état normal — la route répond 200 avec corpusVide, jamais une erreur.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUETE_MAX = 500;
const RAYON_RE = /^[a-z][a-z0-9_]{1,40}$/;

export type ComplementsCorpusApiResponse =
  | ({ ok: true } & RayonCorpusResult)
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ComplementsCorpusApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/complements/corpus?requete=&rayon=micronutrition
export async function GET(req: Request): Promise<NextResponse<ComplementsCorpusApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!emailPraticien(session)) {
      return echec('unauthenticated', 'Session praticien sans e-mail.', 401);
    }
    if (!isC4Enabled()) {
      return echec('flag_eteint', 'Rayon compléments indisponible.', 404);
    }

    const { searchParams } = new URL(req.url);
    const rayonBrut = (searchParams.get('rayon') ?? RAYON_MICRONUTRITION).trim();
    if (!RAYON_RE.test(rayonBrut)) {
      return echec('rayon_invalide', 'Rayon invalide.', 400);
    }
    const requete = (searchParams.get('requete') ?? '').trim();
    if (requete.length > REQUETE_MAX) {
      return echec('requete_invalide', `La requête ne doit pas dépasser ${REQUETE_MAX} caractères.`, 400);
    }

    const resultat = await servirRayonCorpus({ rayon: rayonBrut, requete });
    return NextResponse.json({ ok: true, ...resultat });
  } catch (err) {
    console.error(
      '[praticien/complements/corpus GET]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
