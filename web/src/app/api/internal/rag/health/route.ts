import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { getRagHealth } from '@/lib/rag/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let config;
  try {
    config = getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail : le motif exact (secret absent,
    // clé manquante…) ne doit pas être appris par un appelant anonyme.
    console.error('RAG health : configuration invalide —', error);
    return NextResponse.json(
      { ok: false, configured: false, error: 'RAG de production non configuré.' },
      { status: 503 },
    );
  }

  if (!isAuthorizedRagRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const health = await getRagHealth();
    const hnswPresent = health.indexes.includes('rag_corpus_chunks_embedding_hnsw_idx');
    return NextResponse.json({
      ok: Boolean(health.pgvectorVersion && hnswPresent),
      configured: true,
      embeddingModel: config.embeddingModel,
      embeddingDimensions: config.embeddingDimensions,
      ...health,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : 'Échec du contrôle pgvector.',
      },
      { status: 500 },
    );
  }
}
