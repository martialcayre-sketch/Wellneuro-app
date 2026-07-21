import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { upsertRagChunks } from '@/lib/rag/store';
import { parseRagIngestPayload } from '@/lib/rag/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    getRagConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RAG non configuré.' },
      { status: 503 },
    );
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

    const embeddings = await createEmbeddings(payload.chunks.map((chunk) => chunk.content));
    const indexed = await upsertRagChunks(payload.chunks, embeddings);

    return NextResponse.json({
      ok: true,
      batchId: batchIds[0],
      status: 'INDEXE_RAG_PRODUCTION',
      indexedCount: indexed.length,
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
