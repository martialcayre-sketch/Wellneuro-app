export const RAG_EMBEDDING_DIMENSIONS = 1536;
export const RAG_MAX_BATCH_SIZE = 64;
export const RAG_MAX_CONTENT_LENGTH = 100_000;

export type RagConfig = {
  enabled: true;
  internalSecret: string;
  openAiApiKey: string;
  openAiBaseUrl: string;
  embeddingModel: string;
  embeddingDimensions: typeof RAG_EMBEDDING_DIMENSIONS;
};

export function getRagConfig(): RagConfig {
  if (process.env.RAG_PGVECTOR_ENABLED !== 'true') {
    throw new Error('RAG_PGVECTOR_ENABLED doit valoir true pour activer le RAG de production.');
  }

  const internalSecret = process.env.RAG_INTERNAL_SECRET?.trim();
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiBaseUrl = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  const embeddingModel = process.env.RAG_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';
  const dimensions = Number(process.env.RAG_EMBEDDING_DIMENSIONS || RAG_EMBEDDING_DIMENSIONS);

  if (!internalSecret || internalSecret.length < 32) {
    throw new Error('RAG_INTERNAL_SECRET est absent ou trop court (minimum 32 caractères).');
  }
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY est absent.');
  }
  if (dimensions !== RAG_EMBEDDING_DIMENSIONS) {
    throw new Error(`RAG_EMBEDDING_DIMENSIONS doit valoir ${RAG_EMBEDDING_DIMENSIONS}.`);
  }

  return {
    enabled: true,
    internalSecret,
    openAiApiKey,
    openAiBaseUrl,
    embeddingModel,
    embeddingDimensions: RAG_EMBEDDING_DIMENSIONS,
  };
}
