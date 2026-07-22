-- WellNeuro — couche CLAIMS du corpus (modèle à deux couches, A9 / D-004).
-- Le verbatim source immuable vit dans rag_corpus_chunks ; les claims sont des
-- affirmations révisées par LLM puis VALIDÉES PAR UN PRATICIEN, liées à leurs
-- chunks sources. La règle D-003 (aucune sortie RAG n'atteint un patient sans
-- validation praticien) est portée par la SEULE voie de récupération autorisée,
-- la fonction match_wellneuro_rag_claims : elle n'expose qu'un claim actif,
-- statut = 'VALIDE', non patient, ACTIF, ET rattaché à ≥1 chunk source. Le
-- runtime Prisma se connecte en postgres et bypasse RLS : tout accès aux claims
-- DOIT passer par cette fonction, jamais par un SELECT direct sur la table.
-- Corpus exclusivement documentaire : aucune donnée patient.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.rag_corpus_claims (
  id text PRIMARY KEY,
  claim_id text NOT NULL,
  source_id text NOT NULL,
  version_claim text NOT NULL,
  -- Affirmation normalisée (règle WellNeuro) et son empreinte d'intégrité.
  texte_normalise text NOT NULL,
  content_sha256 char(64) NOT NULL,
  -- Qualification de la connaissance.
  classe_autorite text,
  niveau_preuve text,
  -- Typologie unique des lectures (A7) : déclaré / observé / vécu / interprété.
  typologie_lecture text NOT NULL,
  prescriptif boolean NOT NULL DEFAULT false,
  -- Traçabilité : modèle LLM ayant rédigé le brouillon du claim.
  modele_reviseur text,
  -- Cycle de validation praticien.
  statut text NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
  validateur text,
  valide_at timestamptz,
  -- Vectorisation propre : les claims validés sont recherchables directement.
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL DEFAULT 1536,
  embedding extensions.vector(1536) NOT NULL,
  -- Invariants de confidentialité, alignés sur rag_corpus_chunks.
  patient_identifiable boolean NOT NULL DEFAULT false,
  compartment text NOT NULL DEFAULT 'ACTIF',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rag_corpus_claims_claim_version_key UNIQUE (claim_id, version_claim),
  CONSTRAINT rag_corpus_claims_claim_format  CHECK (claim_id  ~ '^WN-CL-[0-9]{4}-[0-9]{3}$'),
  CONSTRAINT rag_corpus_claims_source_format CHECK (source_id ~ '^WN-SRC-[0-9]{4}$'),
  CONSTRAINT rag_corpus_claims_version_format CHECK (version_claim ~ '^v?[0-9]+\.[0-9]+$'),
  CONSTRAINT rag_corpus_claims_sha256_format CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT rag_corpus_claims_typologie     CHECK (typologie_lecture IN ('déclaré', 'observé', 'vécu', 'interprété')),
  CONSTRAINT rag_corpus_claims_statut        CHECK (statut IN ('EN_ATTENTE_VALIDATION', 'VALIDE', 'REJETE')),
  CONSTRAINT rag_corpus_claims_dimensions    CHECK (embedding_dimensions = 1536),
  CONSTRAINT rag_corpus_claims_compartment   CHECK (compartment = 'ACTIF'),
  CONSTRAINT rag_corpus_claims_not_patient   CHECK (patient_identifiable = false),
  -- Un claim VALIDE porte obligatoirement son validateur et sa date : la
  -- signature praticien ne peut être ni vide ni implicite.
  CONSTRAINT rag_corpus_claims_valide_signe  CHECK (
    statut <> 'VALIDE' OR (validateur IS NOT NULL AND valide_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.rag_corpus_claims IS
  'Couche claims du corpus : affirmations sourcées, validées praticien. Un claim ne remonte que si statut = VALIDE (D-003). Aucune donnée patient.';

-- Table de jonction claims ↔ chunks sources (liens pluriels de la SPEC).
-- Intégrité référentielle des deux côtés : un claim ne peut citer que des chunks
-- réels, et un claim supprimé emporte ses liens.
CREATE TABLE public.rag_corpus_claim_sources (
  claim_pk text NOT NULL,
  chunk_id text NOT NULL,
  version_chunk text NOT NULL,
  -- Empreinte du verbatim source AU MOMENT du rattachement : permet de détecter
  -- à l'audit qu'un chunk cité a été supersédé/corrigé depuis la validation du
  -- claim (dérive de la couche verbatim sous un claim validé). Nullable tant que
  -- l'ingestion des claims ne la peuple pas encore.
  source_content_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rag_corpus_claim_sources_pkey PRIMARY KEY (claim_pk, chunk_id, version_chunk),
  CONSTRAINT rag_corpus_claim_sources_sha256_format CHECK (source_content_sha256 IS NULL OR source_content_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT rag_corpus_claim_sources_claim_fk FOREIGN KEY (claim_pk)
    REFERENCES public.rag_corpus_claims (id) ON DELETE CASCADE,
  CONSTRAINT rag_corpus_claim_sources_chunk_fk FOREIGN KEY (chunk_id, version_chunk)
    REFERENCES public.rag_corpus_chunks (chunk_id, version_chunk) ON DELETE RESTRICT
);

COMMENT ON TABLE public.rag_corpus_claim_sources IS
  'Liens claim → chunks sources (many-to-many). FK des deux côtés : un claim ne cite que des chunks existants.';

ALTER TABLE public.rag_corpus_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_corpus_claim_sources ENABLE ROW LEVEL SECURITY;

-- Index de recherche vectorielle (HNSW cosinus) + accès filtrés fréquents.
CREATE INDEX rag_corpus_claims_embedding_hnsw_idx
  ON public.rag_corpus_claims
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX rag_corpus_claims_surfacable_idx
  ON public.rag_corpus_claims (active, statut, source_id);

CREATE INDEX rag_corpus_claim_sources_chunk_idx
  ON public.rag_corpus_claim_sources (chunk_id, version_chunk);

-- Recherche vectorielle des claims VALIDÉS uniquement. Seul un claim signé
-- praticien (statut = VALIDE), actif, non patient, en compartiment ACTIF, peut
-- remonter. Interne : EXECUTE retiré de PUBLIC plus bas.
CREATE OR REPLACE FUNCTION public.match_wellneuro_rag_claims(
  query_embedding    extensions.vector(1536),
  match_count        integer          DEFAULT 8,
  min_similarity     double precision DEFAULT 0.55,
  filter_source_ids  text[]           DEFAULT NULL,
  filter_typologie   text             DEFAULT NULL
)
RETURNS TABLE (
  id text,
  claim_id text,
  source_id text,
  version_claim text,
  texte_normalise text,
  content_sha256 text,
  classe_autorite text,
  niveau_preuve text,
  typologie_lecture text,
  prescriptif boolean,
  validateur text,
  valide_at timestamptz,
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
    c.claim_id,
    c.source_id,
    c.version_claim,
    c.texte_normalise,
    c.content_sha256::text,
    c.classe_autorite,
    c.niveau_preuve,
    c.typologie_lecture,
    c.prescriptif,
    c.validateur,
    c.valide_at,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.rag_corpus_claims AS c
  WHERE c.active = true
    AND c.statut = 'VALIDE'
    AND c.patient_identifiable = false
    AND c.compartment = 'ACTIF'
    -- Modèle à deux couches : un claim ne peut remonter qu'adossé à ≥1 verbatim
    -- source. Un claim validé mais orphelin de source ne sort JAMAIS (fermeture
    -- de la classe « ce que la migration ne fait pas » : sans ce prédicat, un
    -- claim VALIDE sans lien de jonction serait exposé, sans verbatim traçable).
    AND EXISTS (
      SELECT 1 FROM public.rag_corpus_claim_sources s WHERE s.claim_pk = c.id
    )
    AND (filter_source_ids IS NULL OR c.source_id = ANY(filter_source_ids))
    AND (filter_typologie IS NULL OR c.typologie_lecture = filter_typologie)
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 50));
$$;

-- CREATE FUNCTION accorde EXECUTE à PUBLIC par défaut : on le retire (leçon de
-- 20260721230000). Puis retrait explicite pour anon/authenticated s'ils existent
-- (Supabase, pas la CI). Seul le rôle de connexion Prisma conserve l'exécution.
REVOKE EXECUTE ON FUNCTION public.match_wellneuro_rag_claims(
  extensions.vector, integer, double precision, text[], text
) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.match_wellneuro_rag_claims(
      extensions.vector, integer, double precision, text[], text
    ) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.match_wellneuro_rag_claims(
      extensions.vector, integer, double precision, text[], text
    ) FROM authenticated;
  END IF;
END $$;
