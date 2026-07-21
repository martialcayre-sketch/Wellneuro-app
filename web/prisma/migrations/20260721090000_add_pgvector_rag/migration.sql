-- WellNeuro — index RAG de production sur PostgreSQL/Supabase.
-- Le corpus vectorisé est exclusivement documentaire : aucune donnée patient.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.rag_corpus_chunks (
  id text PRIMARY KEY,
  batch_id text NOT NULL,
  source_id text NOT NULL,
  chunk_id text NOT NULL,
  version_source text NOT NULL,
  version_chunk text NOT NULL,
  notebook text NOT NULL,
  section text NOT NULL,
  content text NOT NULL,
  content_sha256 char(64) NOT NULL,
  source_drive_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL DEFAULT 1536,
  embedding extensions.vector(1536) NOT NULL,
  compartment text NOT NULL DEFAULT 'ACTIF',
  indexation_autorisee boolean NOT NULL DEFAULT false,
  patient_identifiable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rag_corpus_chunks_chunk_version_key UNIQUE (chunk_id, version_chunk),
  CONSTRAINT rag_corpus_chunks_batch_format CHECK (batch_id ~ '^LOT_[0-9]{3}_[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  CONSTRAINT rag_corpus_chunks_source_format CHECK (source_id ~ '^WN-SRC-[0-9]{4}$'),
  CONSTRAINT rag_corpus_chunks_chunk_format CHECK (chunk_id ~ '^WN-CH-[0-9]{4}-[0-9]{3}$'),
  CONSTRAINT rag_corpus_chunks_sha256_format CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT rag_corpus_chunks_dimensions CHECK (embedding_dimensions = 1536),
  CONSTRAINT rag_corpus_chunks_compartment CHECK (compartment = 'ACTIF'),
  CONSTRAINT rag_corpus_chunks_indexable CHECK (indexation_autorisee = true),
  CONSTRAINT rag_corpus_chunks_not_patient CHECK (patient_identifiable = false)
);

COMMENT ON TABLE public.rag_corpus_chunks IS
  'Chunks actifs WellNeuro validés NotebookLM et indexés pour le RAG. Données patient interdites.';

CREATE INDEX rag_corpus_chunks_embedding_hnsw_idx
  ON public.rag_corpus_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX rag_corpus_chunks_active_idx
  ON public.rag_corpus_chunks (active, notebook, source_id, batch_id);

CREATE INDEX rag_corpus_chunks_source_version_idx
  ON public.rag_corpus_chunks (source_id, version_source, chunk_id, version_chunk);

CREATE OR REPLACE FUNCTION public.match_wellneuro_rag_chunks(
  query_embedding extensions.vector(1536),
  match_count integer DEFAULT 8,
  min_similarity double precision DEFAULT 0.55,
  filter_notebook text DEFAULT NULL,
  filter_source_ids text[] DEFAULT NULL,
  filter_batch_ids text[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  batch_id text,
  source_id text,
  chunk_id text,
  version_source text,
  version_chunk text,
  notebook text,
  section text,
  content text,
  content_sha256 text,
  source_drive_id text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT
    c.id,
    c.batch_id,
    c.source_id,
    c.chunk_id,
    c.version_source,
    c.version_chunk,
    c.notebook,
    c.section,
    c.content,
    c.content_sha256::text,
    c.source_drive_id,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.rag_corpus_chunks AS c
  WHERE c.active = true
    AND c.indexation_autorisee = true
    AND c.patient_identifiable = false
    AND c.compartment = 'ACTIF'
    AND (filter_notebook IS NULL OR c.notebook = filter_notebook)
    AND (filter_source_ids IS NULL OR c.source_id = ANY(filter_source_ids))
    AND (filter_batch_ids IS NULL OR c.batch_id = ANY(filter_batch_ids))
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 50));
$$;
