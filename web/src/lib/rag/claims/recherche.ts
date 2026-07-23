import { prisma } from '@/lib/prisma';
import { createEmbeddings } from '@/lib/rag/embeddings';

// Recherche de RESTITUTION en mode revue (Atelier v2, voie rapide).
//
// Ce n'est PAS une voie de récupération patient : la seule barrière côté
// patient reste match_wellneuro_rag_claims (statut VALIDE seul, D-003). Ici,
// le praticien authentifié joue les questions du questionnaire de restitution
// CONTRE les claims d'UNE source en cours de revue — y compris EN_ATTENTE :
// c'est précisément ce qu'il est en train d'évaluer. Le périmètre est fermé
// par source, et l'appelant (route praticien) porte l'authentification.

function vectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export type ClaimRestitution = {
  claimId: string;
  versionClaim: string;
  statut: string;
  texteNormalise: string;
  typologieLecture: string;
  prescriptif: boolean;
  similarity: number;
  /** Chunks du verbatim cités par ce claim — sert au calcul de couverture. */
  chunksCites: string[];
};

const RESTITUTION_LIMIT_MAX = 12;

/**
 * Joue une question de restitution contre les claims actifs d'une source :
 * embedding de la question, similarité cosinus, chunks cités remontés pour la
 * couverture. L'ordre et les scores sont rendus tels quels — le verdict de
 * conformité reste un acte praticien, jamais un seuil automatique.
 */
export async function jouerQuestionRestitution(params: {
  sourceId: string;
  question: string;
  limit?: number;
}): Promise<ClaimRestitution[]> {
  const { sourceId, question } = params;
  const limit = Math.max(1, Math.min(params.limit ?? 6, RESTITUTION_LIMIT_MAX));

  const [embedding] = await createEmbeddings([question]);
  const littéral = vectorLiteral(embedding);

  const lignes = await prisma.$queryRaw<Array<{
    claim_id: string;
    version_claim: string;
    statut: string;
    texte_normalise: string;
    typologie_lecture: string;
    prescriptif: boolean;
    similarity: number;
    chunks_cites: string[] | null;
  }>>`
    SELECT
      c.claim_id,
      c.version_claim,
      c.statut,
      c.texte_normalise,
      c.typologie_lecture,
      c.prescriptif,
      1 - (c.embedding <=> ${littéral}::extensions.vector) AS similarity,
      (
        SELECT array_agg(DISTINCT s.chunk_id)
        FROM public.rag_corpus_claim_sources s
        WHERE s.claim_pk = c.id
      ) AS chunks_cites
    FROM public.rag_corpus_claims c
    WHERE c.source_id = ${sourceId}
      AND c.active = true
    ORDER BY c.embedding <=> ${littéral}::extensions.vector
    LIMIT ${limit}
  `;

  return lignes.map((ligne) => ({
    claimId: ligne.claim_id,
    versionClaim: ligne.version_claim,
    statut: ligne.statut,
    texteNormalise: ligne.texte_normalise,
    typologieLecture: ligne.typologie_lecture,
    prescriptif: ligne.prescriptif,
    similarity: Number(ligne.similarity),
    chunksCites: ligne.chunks_cites ?? [],
  }));
}

export type TirageOuvert = {
  tirageId: number;
  seed: number;
  taux: number;
  lot: number;
  tires: string[];
  eligibles: string[];
};

/**
 * Le tirage OUVERT (sans issue) d'une source, s'il existe — pour reprendre
 * une revue interrompue (rechargement d'écran) sans re-tirer.
 */
export async function tirageOuvertDeSource(sourceId: string): Promise<TirageOuvert | null> {
  const lignes = await prisma.$queryRaw<Array<{ id: bigint; echantillon: unknown }>>`
    SELECT t.id, t.echantillon
    FROM public.rag_corpus_claim_decisions t
    WHERE t.type_acte = 'tirage_echantillon'
      AND t.source_id = ${sourceId}
      AND NOT EXISTS (
        SELECT 1 FROM public.rag_corpus_claim_decisions i
        WHERE i.tirage_id = t.id
          AND i.type_acte IN ('decision_lot', 'bascule_individuelle')
      )
    ORDER BY t.id DESC
    LIMIT 1
  `;
  const ligne = lignes[0];
  if (!ligne) return null;

  const echantillon = (ligne.echantillon ?? {}) as Record<string, unknown>;
  const enListe = (valeur: unknown): string[] =>
    Array.isArray(valeur) ? valeur.filter((t): t is string => typeof t === 'string') : [];
  return {
    tirageId: Number(ligne.id),
    seed: Number(echantillon.seed ?? 0),
    taux: Number(echantillon.taux ?? 0),
    lot: Number(echantillon.lot ?? 0),
    tires: enListe(echantillon.tires),
    eligibles: enListe(echantillon.eligibles),
  };
}
