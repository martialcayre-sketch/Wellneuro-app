import { getRagConfig } from '@/lib/rag/config';

type EmbeddingResponse = {
  data?: Array<{ index: number; embedding: number[] }>;
  error?: { message?: string };
};

export async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  const config = getRagConfig();
  if (inputs.length === 0) return [];

  const response = await fetch(`${config.openAiBaseUrl}/embeddings`, {
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
  });

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
