import { RAG_MAX_BATCH_SIZE, RAG_MAX_CONTENT_LENGTH } from '@/lib/rag/config';
import { normalizeWellneuroText, sha256WellneuroText } from '@/lib/rag/validation';

// Contrat d'ingestion de la couche CLAIMS. Chaque règle ci-dessous réplique une
// contrainte CHECK de la migration 20260722150000_rag_corpus_claims_v1 : le
// serveur refuse au bord ce que la base refuserait de toute façon, mais avec un
// message métier plutôt qu'une violation de contrainte opaque.
//
// Deux invariants non négociables portés ici, avant la base :
//   - `statut` est TOUJOURS forcé à EN_ATTENTE_VALIDATION à l'ingestion. La
//     validation praticien (statut = VALIDE) est un acte humain distinct, jamais
//     un effet de bord d'un POST. Un payload qui tente VALIDE est rejeté (D-003).
//   - un claim cite AU MOINS un chunk source. Un claim sans source ne remonte
//     jamais (prédicat EXISTS de match_wellneuro_rag_claims) : l'accepter
//     fabriquerait une ligne morte et casserait le modèle à deux couches.

const CLAIM_RE = /^WN-CL-\d{4}-\d{3}$/;
const SOURCE_RE = /^WN-SRC-\d{4}$/;
const CHUNK_RE = /^WN-CH-\d{4}-\d{3}$/;
const VERSION_RE = /^v?\d+\.\d+$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export const CLAIM_TYPOLOGIES = ['déclaré', 'observé', 'vécu', 'interprété'] as const;
export type ClaimTypologie = (typeof CLAIM_TYPOLOGIES)[number];
const TYPOLOGIES = new Set<string>(CLAIM_TYPOLOGIES);

/** Seul statut acceptable à l'ingestion : la validation praticien vient après. */
export const CLAIM_INGEST_STATUT = 'EN_ATTENTE_VALIDATION' as const;

export type RagClaimSourceInput = {
  chunkId: string;
  versionChunk: string;
};

export type RagClaimInput = {
  claimId: string;
  sourceId: string;
  versionClaim: string;
  texteNormalise: string;
  contentSha256: string;
  classeAutorite?: string;
  niveauPreuve?: string;
  typologieLecture: ClaimTypologie;
  prescriptif: boolean;
  modeleReviseur?: string;
  metadata: Record<string, unknown>;
  sources: RagClaimSourceInput[];
  statut: typeof CLAIM_INGEST_STATUT;
  patientIdentifiable: false;
  compartment: 'ACTIF';
};

export type RagClaimsIngestPayload = {
  claims: RagClaimInput[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Le corps JSON doit être un objet.');
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${key} est requis.`);
  }
  return value.trim();
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${key} doit être une chaîne.`);
  return value.trim() || undefined;
}

function parseSource(value: unknown, claimIndex: number, sourceIndex: number): RagClaimSourceInput {
  const source = asRecord(value);
  const chunkId = requiredString(source, 'chunkId');
  const versionChunk = requiredString(source, 'versionChunk');
  if (!CHUNK_RE.test(chunkId)) {
    throw new Error(`claims[${claimIndex}].sources[${sourceIndex}].chunkId invalide.`);
  }
  if (!VERSION_RE.test(versionChunk)) {
    throw new Error(`claims[${claimIndex}].sources[${sourceIndex}].versionChunk invalide.`);
  }
  return { chunkId, versionChunk };
}

function parseClaim(value: unknown, index: number): RagClaimInput {
  const claim = asRecord(value);
  const claimId = requiredString(claim, 'claimId');
  const sourceId = requiredString(claim, 'sourceId');
  const versionClaim = requiredString(claim, 'versionClaim');
  const texteNormalise = requiredString(claim, 'texteNormalise');
  const contentSha256 = requiredString(claim, 'contentSha256').toLowerCase();
  const typologieLecture = requiredString(claim, 'typologieLecture');
  const classeAutorite = optionalString(claim, 'classeAutorite');
  const niveauPreuve = optionalString(claim, 'niveauPreuve');
  const modeleReviseur = optionalString(claim, 'modeleReviseur');

  if (!CLAIM_RE.test(claimId)) throw new Error(`claims[${index}].claimId invalide.`);
  if (!SOURCE_RE.test(sourceId)) throw new Error(`claims[${index}].sourceId invalide.`);
  if (!VERSION_RE.test(versionClaim)) throw new Error(`claims[${index}].versionClaim invalide.`);
  if (!SHA256_RE.test(contentSha256)) throw new Error(`claims[${index}].contentSha256 invalide.`);
  if (!TYPOLOGIES.has(typologieLecture)) {
    throw new Error(`claims[${index}].typologieLecture doit être ∈ {${CLAIM_TYPOLOGIES.join(', ')}}.`);
  }
  if (texteNormalise.length > RAG_MAX_CONTENT_LENGTH) {
    throw new Error(`claims[${index}].texteNormalise dépasse ${RAG_MAX_CONTENT_LENGTH} caractères.`);
  }

  // `prescriptif` : booléen strict, défaut false (comme la colonne).
  let prescriptif = false;
  if (claim.prescriptif !== undefined) {
    if (typeof claim.prescriptif !== 'boolean') {
      throw new Error(`claims[${index}].prescriptif doit être un booléen.`);
    }
    prescriptif = claim.prescriptif;
  }

  // `statut` : le seul admis est EN_ATTENTE_VALIDATION. Toute tentative de poser
  // VALIDE (ou REJETE) par l'ingestion est refusée — la signature praticien ne
  // passe jamais par cette voie.
  if (claim.statut !== undefined && claim.statut !== CLAIM_INGEST_STATUT) {
    throw new Error(
      `claims[${index}].statut : l'ingestion ne pose que ${CLAIM_INGEST_STATUT} (validation praticien distincte).`,
    );
  }

  if (claim.patientIdentifiable !== false) {
    throw new Error(`claims[${index}] contient ou déclare une donnée patient identifiable.`);
  }
  if (claim.compartment !== 'ACTIF') {
    throw new Error(`claims[${index}] doit être ACTIF.`);
  }

  const normalized = normalizeWellneuroText(texteNormalise);
  const calculatedHash = sha256WellneuroText(normalized);
  if (calculatedHash !== contentSha256) {
    throw new Error(
      `claims[${index}] HASH_MISMATCH attendu=${contentSha256} obtenu=${calculatedHash}.`,
    );
  }

  const metadataValue = claim.metadata;
  if (
    metadataValue !== undefined &&
    (!metadataValue || typeof metadataValue !== 'object' || Array.isArray(metadataValue))
  ) {
    throw new Error(`claims[${index}].metadata doit être un objet.`);
  }

  if (!Array.isArray(claim.sources) || claim.sources.length === 0) {
    throw new Error(`claims[${index}].sources doit lister au moins un chunk source.`);
  }
  const sources = claim.sources.map((source, sourceIndex) => parseSource(source, index, sourceIndex));
  const sourceKeys = new Set<string>();
  for (const source of sources) {
    const key = `${source.chunkId}@${source.versionChunk}`;
    if (sourceKeys.has(key)) {
      throw new Error(`claims[${index}] cite deux fois le même chunk source : ${key}.`);
    }
    sourceKeys.add(key);
  }

  return {
    claimId,
    sourceId,
    versionClaim,
    texteNormalise: normalized,
    contentSha256,
    classeAutorite,
    niveauPreuve,
    typologieLecture: typologieLecture as ClaimTypologie,
    prescriptif,
    modeleReviseur,
    metadata: (metadataValue as Record<string, unknown> | undefined) ?? {},
    sources,
    statut: CLAIM_INGEST_STATUT,
    patientIdentifiable: false,
    compartment: 'ACTIF',
  };
}

export function parseRagClaimsIngestPayload(value: unknown): RagClaimsIngestPayload {
  const record = asRecord(value);
  if (!Array.isArray(record.claims) || record.claims.length === 0) {
    throw new Error('claims doit être une liste non vide.');
  }
  if (record.claims.length > RAG_MAX_BATCH_SIZE) {
    throw new Error(`Un lot d'ingestion ne peut pas dépasser ${RAG_MAX_BATCH_SIZE} claims.`);
  }

  const claims = record.claims.map(parseClaim);
  const identities = new Set<string>();
  for (const claim of claims) {
    const key = `${claim.claimId}@${claim.versionClaim}`;
    if (identities.has(key)) throw new Error(`Claim dupliqué dans la requête : ${key}.`);
    identities.add(key);
  }
  return { claims };
}

/** Texte soumis à l'embedding : l'affirmation normalisée, sans front matter. */
export function embeddingTextForClaim(input: string): string {
  return normalizeWellneuroText(input);
}
