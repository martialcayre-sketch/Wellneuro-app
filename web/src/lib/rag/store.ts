import { prisma } from '@/lib/prisma';
import { getRagConfig } from '@/lib/rag/config';
import type { RagChunkInput } from '@/lib/rag/validation';

export type RagIndexedChunk = {
  id: string;
  chunkId: string;
  versionChunk: string;
  contentSha256: string;
};

export type RagSearchFilters = {
  notebook?: string;
  sourceIds?: string[];
  batchIds?: string[];
  matchCount?: number;
  minSimilarity?: number;
};

export type RagSearchResult = {
  id: string;
  batch_id: string;
  source_id: string;
  chunk_id: string;
  version_source: string;
  version_chunk: string;
  notebook: string;
  section: string;
  content: string;
  content_sha256: string;
  source_drive_id: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
};

function vectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function upsertRagChunks(
  chunks: RagChunkInput[],
  embeddings: number[][],
): Promise<RagIndexedChunk[]> {
  if (chunks.length !== embeddings.length) {
    throw new Error(`Chunks/embeddings incohérents : ${chunks.length}/${embeddings.length}.`);
  }
  const config = getRagConfig();

  return prisma.$transaction(async (tx) => {
    const indexed: RagIndexedChunk[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = embeddings[index];
      const id = `${chunk.chunkId}@${chunk.versionChunk}`;
      const embeddingText = vectorLiteral(embedding);
      const metadataJson = JSON.stringify(chunk.metadata ?? {});

      const existing = await tx.$queryRaw<Array<{ content_sha256: string }>>`
        SELECT content_sha256::text
        FROM public.rag_corpus_chunks
        WHERE chunk_id = ${chunk.chunkId}
          AND version_chunk = ${chunk.versionChunk}
        LIMIT 1
      `;

      if (existing[0] && existing[0].content_sha256 !== chunk.contentSha256) {
        throw new Error(
          `VERSION_CONFLICT ${chunk.chunkId}@${chunk.versionChunk} : hash déjà indexé différent.`,
        );
      }

      await tx.$executeRaw`
        UPDATE public.rag_corpus_chunks
        SET active = false,
            superseded_at = now(),
            updated_at = now()
        WHERE chunk_id = ${chunk.chunkId}
          AND version_chunk <> ${chunk.versionChunk}
          AND active = true
      `;

      await tx.$executeRaw`
        INSERT INTO public.rag_corpus_chunks (
          id,
          batch_id,
          source_id,
          chunk_id,
          version_source,
          version_chunk,
          notebook,
          section,
          content,
          content_sha256,
          source_drive_id,
          metadata,
          embedding_model,
          embedding_dimensions,
          embedding,
          compartment,
          indexation_autorisee,
          patient_identifiable,
          active,
          indexed_at,
          superseded_at,
          updated_at
        ) VALUES (
          ${id},
          ${chunk.batchId},
          ${chunk.sourceId},
          ${chunk.chunkId},
          ${chunk.versionSource},
          ${chunk.versionChunk},
          ${chunk.notebook},
          ${chunk.section},
          ${chunk.content},
          ${chunk.contentSha256},
          ${chunk.sourceDriveId ?? null},
          ${metadataJson}::jsonb,
          ${config.embeddingModel},
          ${config.embeddingDimensions},
          ${embeddingText}::extensions.vector,
          'ACTIF',
          true,
          false,
          true,
          now(),
          null,
          now()
        )
        ON CONFLICT (chunk_id, version_chunk)
        DO UPDATE SET
          batch_id = EXCLUDED.batch_id,
          source_id = EXCLUDED.source_id,
          version_source = EXCLUDED.version_source,
          notebook = EXCLUDED.notebook,
          section = EXCLUDED.section,
          content = EXCLUDED.content,
          source_drive_id = EXCLUDED.source_drive_id,
          metadata = EXCLUDED.metadata,
          embedding_model = EXCLUDED.embedding_model,
          embedding_dimensions = EXCLUDED.embedding_dimensions,
          embedding = EXCLUDED.embedding,
          compartment = 'ACTIF',
          indexation_autorisee = true,
          patient_identifiable = false,
          active = true,
          indexed_at = now(),
          superseded_at = null,
          updated_at = now()
      `;

      indexed.push({
        id,
        chunkId: chunk.chunkId,
        versionChunk: chunk.versionChunk,
        contentSha256: chunk.contentSha256,
      });
    }

    return indexed;
  });
}

export async function searchRagChunks(
  queryEmbedding: number[],
  filters: RagSearchFilters = {},
): Promise<RagSearchResult[]> {
  const embeddingText = vectorLiteral(queryEmbedding);
  const matchCount = Math.max(1, Math.min(filters.matchCount ?? 8, 50));
  const minSimilarity = Math.max(-1, Math.min(filters.minSimilarity ?? 0.55, 1));
  const notebook = filters.notebook?.trim() || null;
  const sourceIds = filters.sourceIds?.length ? filters.sourceIds : null;
  const batchIds = filters.batchIds?.length ? filters.batchIds : null;

  return prisma.$queryRaw<RagSearchResult[]>`
    SELECT *
    FROM public.match_wellneuro_rag_chunks(
      ${embeddingText}::extensions.vector,
      ${matchCount}::integer,
      ${minSimilarity}::double precision,
      ${notebook}::text,
      ${sourceIds}::text[],
      ${batchIds}::text[]
    )
  `;
}

export async function getRagHealth() {
  const extension = await prisma.$queryRaw<Array<{ extversion: string }>>`
    SELECT extversion
    FROM pg_extension
    WHERE extname = 'vector'
  `;
  const counts = await prisma.$queryRaw<Array<{
    total: bigint;
    active: bigint;
    batches: bigint;
    sources: bigint;
  }>>`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE active = true) AS active,
      count(DISTINCT batch_id) AS batches,
      count(DISTINCT source_id) AS sources
    FROM public.rag_corpus_chunks
  `;
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'rag_corpus_chunks'
    ORDER BY indexname
  `;

  const count = counts[0];
  return {
    pgvectorVersion: extension[0]?.extversion ?? null,
    chunks: {
      total: count ? Number(count.total) : 0,
      active: count ? Number(count.active) : 0,
      batches: count ? Number(count.batches) : 0,
      sources: count ? Number(count.sources) : 0,
    },
    indexes: indexes.map((row) => row.indexname),
  };
}
