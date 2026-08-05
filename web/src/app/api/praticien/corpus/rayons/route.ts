import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { REQUETE_CORPUS_MAX } from '@/lib/supplement-library/config';
import { getPractitionerRechercheCorpusAccess } from '@/lib/supplement-library/access';
import {
  RAYONS_RECHERCHE_CORPUS,
  servirRayonCorpus,
  type RayonCorpusResult,
} from '@/lib/supplement-library/rayonCorpus';

// Recherche corpus clinique (rayons cognition, douleur, intestin…) — PRATICIEN SEUL,
// derrière WN_RECHERCHE_CORPUS_ENABLED (fail-closed, 404 flag éteint). Gate
// distincte de WN_C4_ENABLED : ces rayons n'ont rien à voir avec le catalogue
// de compléments. Restitue les claims validés (barrière D-003 via
// match_wellneuro_rag_claims) filtrés PAR NOTEBOOK du rayon. Le corpus vide
// est un état normal — la route répond 200 avec corpusVide, jamais une erreur.
//
// `rayon` est validé contre l'ALLOWLIST RAYONS_RECHERCHE_CORPUS, PAS contre
// RAYON_VERS_NOTEBOOK entier : servirRayonCorpus() sert n'importe quel rayon
// de la carte sans plus vérifier de flag produit (voir sa JSDoc). Une regex
// syntaxique seule laisserait cette route servir micronutrition (ou tout
// autre rayon) en contournant WN_C4_ENABLED.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CorpusRayonsApiResponse =
  | ({ ok: true } & RayonCorpusResult)
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusRayonsApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/corpus/rayons?rayon=cognition&requete=
export async function GET(req: Request): Promise<NextResponse<CorpusRayonsApiResponse>> {
  try {
    const access = getPractitionerRechercheCorpusAccess(await getServerSession(authOptions));
    if (!access.ok) {
      return echec(access.reason, access.error, access.status);
    }

    const { searchParams } = new URL(req.url);
    const rayonBrut = (searchParams.get('rayon') ?? '').trim();
    if (!RAYONS_RECHERCHE_CORPUS.includes(rayonBrut)) {
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
      '[praticien/corpus/rayons GET]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
