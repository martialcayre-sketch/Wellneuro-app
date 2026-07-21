import { createHash } from 'node:crypto';
import {
  RAG_MAX_BATCH_SIZE,
  RAG_MAX_CONTENT_LENGTH,
} from '@/lib/rag/config';

const BATCH_RE = /^LOT_\d{3}_\d{4}-\d{2}-\d{2}$/;
const SOURCE_RE = /^WN-SRC-\d{4}$/;
const CHUNK_RE = /^WN-CH-\d{4}-\d{3}$/;
const VERSION_RE = /^v?\d+\.\d+$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export type RagChunkInput = {
  batchId: string;
  sourceId: string;
  chunkId: string;
  versionSource: string;
  versionChunk: string;
  notebook: string;
  section: string;
  content: string;
  contentSha256: string;
  sourceDriveId?: string;
  /** Modèle LLM ayant amendé le texte, s'il diffère du verbatim source. */
  llmAmendmentModel?: string;
  /** Référence de la preuve de validation NotebookLM (URL ou identifiant PV). */
  validationEvidence?: string;
  metadata?: Record<string, unknown>;
  compartment: 'ACTIF';
  indexationAutorisee: true;
  patientIdentifiable: false;
};

export type RagIngestPayload = {
  chunks: RagChunkInput[];
};

export function normalizeWellneuroText(input: string): string {
  const withoutBom = input.startsWith('\uFEFF') ? input.slice(1) : input;
  const lf = withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const noTrailingWhitespace = lf
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
  return `${noTrailingWhitespace.replace(/\n*$/g, '')}\n`;
}

export function sha256WellneuroText(input: string): string {
  return createHash('sha256').update(normalizeWellneuroText(input), 'utf8').digest('hex');
}

/**
 * Texte soumis à l'embedding : le corps du chunk, sans le front matter YAML.
 * Le hash d'intégrité porte sur le texte complet, mais vectoriser le YAML
 * (identique entre chunks d'une même source) rapprocherait artificiellement
 * des chunks distincts et ferait échouer le test de récupération du lot.
 * Même sémantique que stripFrontMatterForRag_ côté Apps Script.
 */
export function embeddingTextForChunk(input: string): string {
  const normalized = normalizeWellneuroText(input);
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  return end < 0 ? normalized : normalized.slice(end + 5);
}

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

function parseChunk(value: unknown, index: number): RagChunkInput {
  const chunk = asRecord(value);
  const batchId = requiredString(chunk, 'batchId');
  const sourceId = requiredString(chunk, 'sourceId');
  const chunkId = requiredString(chunk, 'chunkId');
  const versionSource = requiredString(chunk, 'versionSource');
  const versionChunk = requiredString(chunk, 'versionChunk');
  const notebook = requiredString(chunk, 'notebook');
  const section = requiredString(chunk, 'section');
  const content = requiredString(chunk, 'content');
  const contentSha256 = requiredString(chunk, 'contentSha256').toLowerCase();
  const sourceDriveId = optionalString(chunk, 'sourceDriveId');
  const llmAmendmentModel = optionalString(chunk, 'llmAmendmentModel');
  const validationEvidence = optionalString(chunk, 'validationEvidence');

  if (!BATCH_RE.test(batchId)) throw new Error(`chunks[${index}].batchId invalide.`);
  if (!SOURCE_RE.test(sourceId)) throw new Error(`chunks[${index}].sourceId invalide.`);
  if (!CHUNK_RE.test(chunkId)) throw new Error(`chunks[${index}].chunkId invalide.`);
  if (!VERSION_RE.test(versionSource)) throw new Error(`chunks[${index}].versionSource invalide.`);
  if (!VERSION_RE.test(versionChunk)) throw new Error(`chunks[${index}].versionChunk invalide.`);
  if (!SHA256_RE.test(contentSha256)) throw new Error(`chunks[${index}].contentSha256 invalide.`);
  if (content.length > RAG_MAX_CONTENT_LENGTH) {
    throw new Error(`chunks[${index}].content dépasse ${RAG_MAX_CONTENT_LENGTH} caractères.`);
  }
  if (chunk.compartment !== 'ACTIF') throw new Error(`chunks[${index}] doit être ACTIF.`);
  if (chunk.indexationAutorisee !== true) {
    throw new Error(`chunks[${index}] n'est pas autorisé à l'indexation.`);
  }
  if (chunk.patientIdentifiable !== false) {
    throw new Error(`chunks[${index}] contient ou déclare une donnée patient identifiable.`);
  }

  const normalized = normalizeWellneuroText(content);
  const calculatedHash = sha256WellneuroText(normalized);
  if (calculatedHash !== contentSha256) {
    throw new Error(
      `chunks[${index}] HASH_MISMATCH attendu=${contentSha256} obtenu=${calculatedHash}.`,
    );
  }
  if (!embeddingTextForChunk(normalized).trim()) {
    throw new Error(`chunks[${index}].content est vide une fois le front matter retiré.`);
  }

  const metadataValue = chunk.metadata;
  if (
    metadataValue !== undefined &&
    (!metadataValue || typeof metadataValue !== 'object' || Array.isArray(metadataValue))
  ) {
    throw new Error(`chunks[${index}].metadata doit être un objet.`);
  }

  return {
    batchId,
    sourceId,
    chunkId,
    versionSource,
    versionChunk,
    notebook,
    section,
    content: normalized,
    contentSha256,
    sourceDriveId,
    llmAmendmentModel,
    validationEvidence,
    metadata: (metadataValue as Record<string, unknown> | undefined) ?? {},
    compartment: 'ACTIF',
    indexationAutorisee: true,
    patientIdentifiable: false,
  };
}

export function parseRagIngestPayload(value: unknown): RagIngestPayload {
  const record = asRecord(value);
  if (!Array.isArray(record.chunks) || record.chunks.length === 0) {
    throw new Error('chunks doit être une liste non vide.');
  }
  if (record.chunks.length > RAG_MAX_BATCH_SIZE) {
    throw new Error(`Un lot d'ingestion ne peut pas dépasser ${RAG_MAX_BATCH_SIZE} chunks.`);
  }

  const chunks = record.chunks.map(parseChunk);
  const identities = new Set<string>();
  for (const chunk of chunks) {
    const key = `${chunk.chunkId}@${chunk.versionChunk}`;
    if (identities.has(key)) throw new Error(`Chunk dupliqué dans la requête : ${key}.`);
    identities.add(key);
  }
  return { chunks };
}
