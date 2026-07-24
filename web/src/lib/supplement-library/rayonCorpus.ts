// Rayon corpus « micronutrition » (C4, outil n°1) — sert, dans chaque fiche,
// les claims VALIDÉS du corpus filtrés par leur tag de rayon (metadata.rayon).
//
// La barrière D-003 n'est PAS réimplémentée ici : la seule voie de récupération
// reste la fonction SQL match_wellneuro_rag_claims, qui n'expose qu'un claim
// signé praticien (statut VALIDE, actif, non patient, adossé à ≥1 verbatim
// source). Cette fonction ne connaît pas le tag « rayon » — on filtre donc les
// résultats en aval sur metadata.rayon, sans jamais contourner la barrière.
//
// Le corpus reste VIDE tant que le notebook « 10 — Micronutrition et
// compléments » n'est pas ingéré (autre session) : l'absence de claims est un
// état normal, jamais une erreur (« corpus en cours de constitution »).
import { prisma } from '@/lib/prisma';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { isC4Enabled } from './featureFlag';

export const C4_RAYON_CORPUS_VERSION = 'c4-rayon-corpus-v1' as const;

export const RAYON_MICRONUTRITION = 'micronutrition' as const;

export type ClaimRayon = {
  claimId: string;
  versionClaim: string;
  texteNormalise: string;
  classeAutorite: string;
  niveauPreuve: string;
  typologieLecture: string;
  prescriptif: boolean;
  validateur: string | null;
  valideAt: string | null;
  rayon: string | null;
  similarity: number;
};

export type RayonCorpusResult = {
  contractVersion: typeof C4_RAYON_CORPUS_VERSION;
  rayon: string;
  // false quand la chaîne corpus n'est pas configurée sur l'environnement
  // (embeddings indisponibles) — l'écran l'affiche comme « en cours de
  // constitution », jamais comme une panne.
  disponible: boolean;
  corpusVide: boolean;
  claims: ClaimRayon[];
  message: string;
};

const MESSAGE_VIDE = 'Corpus en cours de constitution — aucun claim validé pour ce rayon.';
const MESSAGE_INDISPONIBLE = 'Le rayon corpus n\'est pas encore disponible sur cet environnement.';
const MESSAGE_REQUETE_VIDE = 'Aucune requête fournie : le rayon corpus n\'a rien à restituer.';

function vectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

type LigneClaim = {
  claim_id: string;
  version_claim: string;
  texte_normalise: string;
  classe_autorite: string;
  niveau_preuve: string;
  typologie_lecture: string;
  prescriptif: boolean;
  validateur: string | null;
  valide_at: Date | string | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

function litRayon(metadata: Record<string, unknown> | null): string | null {
  const valeur = metadata?.rayon;
  return typeof valeur === 'string' && valeur.length > 0 ? valeur : null;
}

/**
 * Sert les claims validés d'un rayon pour une requête donnée (la fiche : nom du
 * complément, intention, ingrédient). Filtre les résultats de la barrière
 * D-003 sur metadata.rayon. Ne lève jamais pour une absence de claims : le vide
 * est un état, pas une erreur.
 */
export async function servirRayonCorpus(params: {
  rayon: string;
  requete: string;
  matchCount?: number;
  minSimilarity?: number;
}): Promise<RayonCorpusResult> {
  if (!isC4Enabled()) {
    throw new Error(
      'Rayon compléments désactivé : WN_C4_ENABLED doit valoir « true » (fail-closed).',
    );
  }

  const rayon = params.rayon.trim();
  const requete = params.requete.trim();
  const matchCount = Math.max(1, Math.min(params.matchCount ?? 24, 50));
  const minSimilarity = Math.max(-1, Math.min(params.minSimilarity ?? 0.5, 1));

  if (!rayon || !requete) {
    return {
      contractVersion: C4_RAYON_CORPUS_VERSION,
      rayon,
      disponible: true,
      corpusVide: true,
      claims: [],
      message: MESSAGE_REQUETE_VIDE,
    };
  }

  // La chaîne corpus (embeddings) peut ne pas être configurée : on dégrade
  // proprement en « corpus en cours de constitution » plutôt qu'en erreur.
  let embedding: number[];
  try {
    [embedding] = await createEmbeddings([requete]);
  } catch {
    return {
      contractVersion: C4_RAYON_CORPUS_VERSION,
      rayon,
      disponible: false,
      corpusVide: true,
      claims: [],
      message: MESSAGE_INDISPONIBLE,
    };
  }

  const littéral = vectorLiteral(embedding);
  let lignes: LigneClaim[];
  try {
    lignes = await prisma.$queryRaw<LigneClaim[]>`
      SELECT
        claim_id,
        version_claim,
        texte_normalise,
        classe_autorite,
        niveau_preuve,
        typologie_lecture,
        prescriptif,
        validateur,
        valide_at,
        metadata,
        similarity
      FROM public.match_wellneuro_rag_claims(
        ${littéral}::extensions.vector,
        ${matchCount}::integer,
        ${minSimilarity}::double precision,
        NULL::text[],
        NULL::text
      )
    `;
  } catch {
    return {
      contractVersion: C4_RAYON_CORPUS_VERSION,
      rayon,
      disponible: false,
      corpusVide: true,
      claims: [],
      message: MESSAGE_INDISPONIBLE,
    };
  }

  // La fonction SQL ignore le tag de rayon : on filtre en aval sur
  // metadata.rayon (aucune migration, décision actée §1 plan C).
  const claims: ClaimRayon[] = lignes
    .filter((ligne) => litRayon(ligne.metadata) === rayon)
    .map((ligne) => ({
      claimId: ligne.claim_id,
      versionClaim: ligne.version_claim,
      texteNormalise: ligne.texte_normalise,
      classeAutorite: ligne.classe_autorite,
      niveauPreuve: ligne.niveau_preuve,
      typologieLecture: ligne.typologie_lecture,
      prescriptif: ligne.prescriptif,
      validateur: ligne.validateur,
      valideAt: ligne.valide_at
        ? (ligne.valide_at instanceof Date ? ligne.valide_at.toISOString() : String(ligne.valide_at))
        : null,
      rayon: litRayon(ligne.metadata),
      similarity: Number(ligne.similarity),
    }));

  return {
    contractVersion: C4_RAYON_CORPUS_VERSION,
    rayon,
    disponible: true,
    corpusVide: claims.length === 0,
    claims,
    message: claims.length === 0 ? MESSAGE_VIDE : '',
  };
}
