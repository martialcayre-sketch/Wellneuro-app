import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { REQUETE_CORPUS_MAX } from '@/lib/supplement-library/config';
import { getPractitionerC4Access } from '@/lib/supplement-library/access';
import {
  RAYON_MICRONUTRITION,
  servirRayonCorpus,
  type RayonCorpusResult,
} from '@/lib/supplement-library/rayonCorpus';

// Rayon corpus (C4, outil n°1) — PRATICIEN SEUL, derrière WN_C4_ENABLED
// (fail-closed, 404 flag éteint). Restitue les claims validés (barrière D-003
// via match_wellneuro_rag_claims) filtrés PAR NOTEBOOK du rayon. Le corpus vide
// est un état normal — la route répond 200 avec corpusVide, jamais une erreur.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `REQUETE_CORPUS_MAX` vit dans `lib/supplement-library/config.ts` : un
// `route.ts` n'accepte qu'une liste fermée d'exports, et y exporter une valeur
// casse `next build` sans que le type-check de T1 en dise un mot.

export type ComplementsCorpusApiResponse =
  | ({ ok: true } & RayonCorpusResult)
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ComplementsCorpusApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/complements/corpus?requete=&rayon=micronutrition
export async function GET(req: Request): Promise<NextResponse<ComplementsCorpusApiResponse>> {
  try {
    const access = getPractitionerC4Access(await getServerSession(authOptions));
    if (!access.ok) {
      return echec(access.reason, access.error, access.status);
    }

    const { searchParams } = new URL(req.url);
    const rayonBrut = (searchParams.get('rayon') ?? RAYON_MICRONUTRITION).trim();
    // Allowlist d'UN SEUL rayon, pas une validation syntaxique. Une regex laisse
    // passer n'importe quelle entrée de RAYON_VERS_NOTEBOOK (cognition, douleur,
    // intestin…) : cette route les servirait alors derrière WN_C4_ENABLED, en
    // contournant WN_RECHERCHE_CORPUS_ENABLED qui est censé les garder. Même
    // correctif que sur /api/praticien/corpus/rayons (#546) : chaque route qui
    // accepte un `rayon` en entrée libre restreint à SES rayons, jamais à la carte.
    if (rayonBrut !== RAYON_MICRONUTRITION) {
      return echec('rayon_invalide', 'Rayon invalide.', 400);
    }
    const requete = (searchParams.get('requete') ?? '').trim();
    if (requete.length > REQUETE_CORPUS_MAX) {
      return echec('requete_invalide', `La requête ne doit pas dépasser ${REQUETE_CORPUS_MAX} caractères.`, 400);
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
