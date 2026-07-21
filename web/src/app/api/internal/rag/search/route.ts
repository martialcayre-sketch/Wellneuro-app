import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { searchRagChunks } from '@/lib/rag/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchBody = {
  query?: unknown;
  notebook?: unknown;
  sourceIds?: unknown;
  batchIds?: unknown;
  matchCount?: unknown;
  minSimilarity?: unknown;
};

function stringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${field} doit être une liste de chaînes non vides.`);
  }
  return value.map((item) => item.trim());
}

export async function POST(req: Request) {
  try {
    getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail sur la cause exacte.
    console.error('RAG search : configuration invalide —', error);
    return NextResponse.json({ error: 'RAG de production non configuré.' }, { status: 503 });
  }

  if (!isAuthorizedRagRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  try {
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) throw new Error('query est requis.');
    if (query.length > 10_000) throw new Error('query dépasse 10 000 caractères.');

    const notebook = typeof body.notebook === 'string' && body.notebook.trim()
      ? body.notebook.trim()
      : undefined;
    const sourceIds = stringArray(body.sourceIds, 'sourceIds');
    const batchIds = stringArray(body.batchIds, 'batchIds');
    const matchCount = body.matchCount === undefined ? undefined : Number(body.matchCount);
    const minSimilarity = body.minSimilarity === undefined
      ? undefined
      : Number(body.minSimilarity);

    if (matchCount !== undefined && !Number.isInteger(matchCount)) {
      throw new Error('matchCount doit être un entier.');
    }
    if (minSimilarity !== undefined && !Number.isFinite(minSimilarity)) {
      throw new Error('minSimilarity doit être un nombre.');
    }

    const [embedding] = await createEmbeddings([query]);
    const results = await searchRagChunks(embedding, {
      notebook,
      sourceIds,
      batchIds,
      matchCount,
      minSimilarity,
    });

    return NextResponse.json({
      ok: true,
      query,
      resultCount: results.length,
      results: results.map((result) => ({
        id: result.id,
        batchId: result.batch_id,
        sourceId: result.source_id,
        chunkId: result.chunk_id,
        versionSource: result.version_source,
        versionChunk: result.version_chunk,
        notebook: result.notebook,
        section: result.section,
        content: result.content,
        contentSha256: result.content_sha256,
        sourceDriveId: result.source_drive_id,
        metadata: result.metadata,
        similarity: Number(result.similarity),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec de recherche RAG.';
    const status = /requis|dépasse|doit être/.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
