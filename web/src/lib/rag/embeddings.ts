import { getRagConfig } from '@/lib/rag/config';

type EmbeddingResponse = {
  data?: Array<{ index: number; embedding: number[] }>;
  error?: { message?: string };
};

// Borne l'appel embeddings : sur un conteneur persistant (Scalingo, sans le
// `maxDuration` serverless de Vercel), un OpenAI qui pend bloquerait la requête
// indéfiniment. 30 s = marge large pour un batch, sous le seuil « premier octet »
// de 30 s du routeur pour les rares chemins où l'embedding est synchrone.
const DELAI_EMBEDDINGS_MS = 30_000;

export async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  const config = getRagConfig();
  if (inputs.length === 0) return [];

  let response: Response;
  try {
    response = await fetch(`${config.openAiBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.openAiApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: inputs,
        dimensions: config.embeddingDimensions,
        encoding_format: 'float',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(DELAI_EMBEDDINGS_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(`Délai dépassé pour les embeddings (${DELAI_EMBEDDINGS_MS / 1000} s).`);
    }
    throw err;
  }

  const payload = (await response.json().catch(() => ({}))) as EmbeddingResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Échec embeddings HTTP ${response.status}.`);
  }

  const ordered = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
  if (ordered.length !== inputs.length) {
    throw new Error(`Nombre d'embeddings incohérent : ${ordered.length}/${inputs.length}.`);
  }

  return ordered.map((item, index) => {
    if (item.embedding.length !== config.embeddingDimensions) {
      throw new Error(
        `Dimension embedding incohérente à l'index ${index} : ${item.embedding.length}/${config.embeddingDimensions}.`,
      );
    }
    if (item.embedding.some((value) => !Number.isFinite(value))) {
      throw new Error(`Embedding non numérique à l'index ${index}.`);
    }
    return item.embedding;
  });
}
