import { prisma } from '@/lib/prisma';

export type RagRetrievalCheck = {
  chunkId: string;
  contentSha256: string;
  nearestChunkId: string | null;
  nearestContentSha256: string | null;
  similarity: number | null;
  ok: boolean;
};

export async function verifyRagBatch(
  batchId: string,
  expectedChunkIds: string[],
): Promise<{ ok: boolean; checked: number; checks: RagRetrievalCheck[] }> {
  const rows = await prisma.$queryRaw<Array<{
    chunk_id: string;
    content_sha256: string;
    nearest_chunk_id: string | null;
    nearest_content_sha256: string | null;
    similarity: number | null;
  }>>`
    SELECT
      expected.chunk_id,
      expected.content_sha256::text,
      nearest.chunk_id AS nearest_chunk_id,
      nearest.content_sha256::text AS nearest_content_sha256,
      nearest.similarity
    FROM public.rag_corpus_chunks AS expected
    LEFT JOIN LATERAL (
      SELECT
        candidate.chunk_id,
        candidate.content_sha256,
        1 - (candidate.embedding <=> expected.embedding) AS similarity
      FROM public.rag_corpus_chunks AS candidate
      WHERE candidate.active = true
        AND candidate.indexation_autorisee = true
        AND candidate.patient_identifiable = false
        AND candidate.compartment = 'ACTIF'
      ORDER BY candidate.embedding <=> expected.embedding
      LIMIT 1
    ) AS nearest ON true
    WHERE expected.batch_id = ${batchId}
      AND expected.chunk_id = ANY(${expectedChunkIds}::text[])
      AND expected.active = true
    ORDER BY expected.chunk_id
  `;

  const checks = rows.map((row) => {
    const similarity = row.similarity === null ? null : Number(row.similarity);
    const ok =
      row.nearest_content_sha256 === row.content_sha256 &&
      similarity !== null &&
      similarity >= 0.999999;
    return {
      chunkId: row.chunk_id,
      contentSha256: row.content_sha256,
      nearestChunkId: row.nearest_chunk_id,
      nearestContentSha256: row.nearest_content_sha256,
      similarity,
      ok,
    };
  });

  return {
    ok: checks.length === expectedChunkIds.length && checks.every((check) => check.ok),
    checked: checks.length,
    checks,
  };
}
