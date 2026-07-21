import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { upsertRagChunks } from '@/lib/rag/store';
import { embeddingTextForChunk, parseRagIngestPayload } from '@/lib/rag/validation';
import { verifyRagBatch } from '@/lib/rag/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail sur la cause exacte.
    console.error('RAG ingest : configuration invalide —', error);
    return NextResponse.json({ error: 'RAG de production non configuré.' }, { status: 503 });
  }

  if (!isAuthorizedRagRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  try {
    const payload = parseRagIngestPayload(rawBody);
    const batchIds = [...new Set(payload.chunks.map((chunk) => chunk.batchId))];
    if (batchIds.length !== 1) {
      return NextResponse.json(
        { error: 'Une requête d’ingestion doit contenir un seul lot.' },
        { status: 422 },
      );
    }

    const batchId = batchIds[0];
    // L'embedding porte sur le corps seul ; le hash d'intégrité reste calculé
    // sur le texte complet (front matter compris) — voir embeddingTextForChunk.
    const embeddings = await createEmbeddings(
      payload.chunks.map((chunk) => embeddingTextForChunk(chunk.content)),
    );
    const indexed = await upsertRagChunks(payload.chunks, embeddings);
    const retrieval = await verifyRagBatch(
      batchId,
      payload.chunks.map((chunk) => chunk.chunkId),
    );

    if (!retrieval.ok) {
      return NextResponse.json(
        {
          error: 'RAG_RETRIEVAL_TEST_FAILED',
          batchId,
          indexedCount: indexed.length,
          retrieval,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      batchId,
      status: 'INDEXE_RAG_PRODUCTION',
      indexedCount: indexed.length,
      retrieval,
      chunks: indexed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec d’ingestion RAG.';
    const status = /HASH_MISMATCH|VERSION_CONFLICT|invalide|requis|doit|dépasse|dupliqué/.test(message)
      ? 422
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
