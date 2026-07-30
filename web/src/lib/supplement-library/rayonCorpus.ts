// Rayon corpus « micronutrition » (C4, outil n°1) — sert, dans chaque fiche,
// les claims VALIDÉS du corpus d'UN notebook (l'étagère clinique).
//
// La barrière D-003 n'est PAS réimplémentée ici : la seule voie de récupération
// reste la fonction SQL match_wellneuro_rag_claims, qui n'expose qu'un claim
// signé praticien (statut VALIDE, actif, non patient, adossé à ≥1 verbatim
// source). Le rayon est filtré PAR NOTEBOOK, au niveau SQL, via le paramètre
// filter_source_ids de la fonction (décision 7 des arbitrages praticien du
// 2026-07-27 : filtrer par notebook, jamais par un tag metadata.rayon — ni
// migration, ni backfill). Filtrer côté SQL calcule les N meilleurs claims À
// L'INTÉRIEUR du notebook : aucune éviction silencieuse par des claims d'un
// autre rayon mieux classés.
//
// Le corpus reste VIDE tant que le notebook visé n'est pas ingéré ET validé :
// l'absence de claims est un état normal, jamais une erreur (« corpus en cours
// de constitution »).
import { prisma } from '@/lib/prisma';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { sourcesDuNotebook } from '@/lib/rag/claims/notebooks';
import { isC4Enabled } from './featureFlag';

export const C4_RAYON_CORPUS_VERSION = 'c4-rayon-corpus-v2' as const;

export const RAYON_MICRONUTRITION = 'micronutrition' as const;

// Correspondance rayon → notebook (libellé exact du registre sanitaire). Le
// rayon est une étagère clinique ; le notebook en est l'unité d'organisation.
// Seul « micronutrition » a un consommateur aujourd'hui (C4) ; les autres
// (« biologie », « nutrition », « stress », « humeur », « sommeil ») sont
// déclarés mais inertes tant qu'aucun écran ne les appelle.
export const RAYON_VERS_NOTEBOOK: Readonly<Record<string, string>> = {
  [RAYON_MICRONUTRITION]: '10 — Micronutrition et compléments',
  biologie: '08 — Biologie fonctionnelle',
  nutrition: '09 — Nutrition et aliments vedettes',
  stress: '03 — Stress et burnout',
  humeur: '04 — Humeur',
  sommeil: '02 — Sommeil et chronobiologie',
} as const;

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
const MESSAGE_RAYON_INCONNU = 'Rayon inconnu — aucun notebook associé.';

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
  similarity: number;
};

/**
 * Sert les claims validés d'un rayon pour une requête donnée (la fiche : nom du
 * complément, intention, ingrédient). Filtre AU NIVEAU SQL sur les sources du
 * notebook associé au rayon (filter_source_ids). Ne lève jamais pour une
 * absence de claims : le vide est un état, pas une erreur. Un rayon inconnu ou
 * un notebook sans source rend un résultat vide — JAMAIS un filtre ignoré.
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

  // Étagère = notebook. Un rayon hors correspondance, ou un notebook sans
  // aucune source au registre, rend un résultat VIDE sans jamais interroger la
  // base avec un filtre nul (qui servirait tout le corpus). C'est la garantie
  // « liste vide ⇒ résultat vide, jamais filtre ignoré ».
  const notebook = RAYON_VERS_NOTEBOOK[rayon];
  const sourceIds = notebook ? sourcesDuNotebook(notebook) : [];
  if (sourceIds.length === 0) {
    return {
      contractVersion: C4_RAYON_CORPUS_VERSION,
      rayon,
      disponible: true,
      corpusVide: true,
      claims: [],
      message: notebook ? MESSAGE_VIDE : MESSAGE_RAYON_INCONNU,
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
  // filter_source_ids passé en text[] via string_to_array : les sourceId sont
  // du format WN-SRC-XXXX (aucune virgule), la jointure est donc sûre. La liste
  // est garantie non vide ici (garde ci-dessus).
  const filtreSources = sourceIds.join(',');
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
        similarity
      FROM public.match_wellneuro_rag_claims(
        ${littéral}::extensions.vector,
        ${matchCount}::integer,
        ${minSimilarity}::double precision,
        string_to_array(${filtreSources}, ',')::text[],
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

  const claims: ClaimRayon[] = lignes.map((ligne) => ({
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
    // Le rayon est désormais porté par le notebook (filtre SQL), pas par le
    // claim : on renvoie le rayon demandé, constant pour tout l'appel.
    rayon,
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
