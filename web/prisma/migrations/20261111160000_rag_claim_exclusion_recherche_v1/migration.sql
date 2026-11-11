-- WellNeuro — la marque « exclu de la recherche » d'un claim ([[D-490]],
-- question 20261104-2225-b de la liste commune, arbitrages du responsable des
-- 2026-11-07 et 2026-11-11).
--
-- La validation d'un claim et sa visibilité en recherche deviennent deux
-- choses distinctes. Un claim VALIDE peut être EXCLU DE LA RECHERCHE par un
-- acte traçable de l'atelier : la fonction match_wellneuro_rag_claims ne le
-- rend plus. Sa VALIDITÉ ne change pas : ni statut, ni signataire, ni date de
-- signature, et les citations explicites (règles, plages, liens, positions,
-- fiches) restent jugées par les cinq prédicats de [[D-140]] §7, que
-- `lib/rag/claims/validite.ts` recopie — ce sixième prédicat est de recherche,
-- pas de validité ([[D-490]] §2).
--
-- AUCUNE donnée n'est touchée : la colonne naît fausse pour toutes les lignes,
-- la fonction rend donc exactement ce qu'elle rendait. Le premier claim exclu
-- le sera par un acte de l'atelier, journalisé. `schema.prisma` est inchangé :
-- les deux tables sont externes (`prisma.config.ts`, `tables.external`).

-- 1. La marque, sur la ligne du claim (couple identifiant-version). Une
--    colonne plutôt qu'une clé de `metadata` : aucune ingestion ne l'apporte,
--    et seul l'acte ci-dessous la pose.
ALTER TABLE public.rag_corpus_claims
  ADD COLUMN exclu_recherche boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rag_corpus_claims.exclu_recherche IS
  'D-490 : vrai = le claim ne remonte plus par match_wellneuro_rag_claims. Ne change ni son statut ni sa validité pour une citation explicite. Posée et levée par l''acte exclusion_recherche du journal.';

-- 2. Un SEPTIÈME type d'acte : exclusion_recherche.
ALTER TABLE public.rag_corpus_claim_decisions
  DROP CONSTRAINT rag_claim_decisions_type_acte,
  ADD CONSTRAINT rag_claim_decisions_type_acte CHECK (
    type_acte IN (
      'decision_individuelle', 'tirage_echantillon', 'decision_lot',
      'bascule_individuelle', 'tirage_caduc', 'etiquetage',
      'exclusion_recherche'
    )
  );

-- 3. Pièces d'une exclusion — présences ET absences, comme les autres actes.
--    UN claim par acte, qui se nomme (`id`, `claimId`, `versionClaim`) et dit
--    son `sens` : `exclure` ou `retablir`. Le MOTIF est obligatoire, dans la
--    colonne `motif` du journal (la provenance : le dossier et son
--    classement) ; non vide au sens de `btrim` à deux arguments, sinon une
--    tabulation ou un retour ligne passeraient. L'ensemble retiré couvre
--    aussi les blancs de la typographie française et les caractères
--    invisibles courants : saut de page, tabulation verticale, espace
--    insécable, espace chiffre, espace fine insécable, espace sans chasse,
--    marque d'ordre des octets. Aucune décision
--    (`rag_claim_decisions_decide` l'impose déjà), ni tirage, ni échantillon,
--    ni questionnaire.
ALTER TABLE public.rag_corpus_claim_decisions
  ADD CONSTRAINT rag_claim_decisions_exclusion_recherche_complete CHECK (
    type_acte <> 'exclusion_recherche'
    -- COALESCE : une clé ABSENTE rend NULL, et un CHECK à NULL PASSE.
    OR COALESCE((
      tirage_id IS NULL AND echantillon IS NULL AND questionnaire IS NULL
      AND motif IS NOT NULL
      AND btrim(motif, E' \t\r\n\f\x0b   ​﻿') <> ''
      AND jsonb_array_length(claims) = 1
      AND jsonb_typeof(claims -> 0 -> 'id') = 'string'
      AND (claims -> 0 ->> 'id') <> ''
      AND jsonb_typeof(claims -> 0 -> 'claimId') = 'string'
      AND (claims -> 0 ->> 'claimId') <> ''
      AND jsonb_typeof(claims -> 0 -> 'versionClaim') = 'string'
      AND (claims -> 0 ->> 'versionClaim') <> ''
      AND (claims -> 0 ->> 'sens') IN ('exclure', 'retablir')
    ), false)
  );

-- Que le claim nommé EXISTE, soit VALIDE et actif, est tenu par la route
-- (même transaction que l'UPDATE de la colonne), comme pour un étiquetage :
-- le journal ne lit pas la table des claims. Le trigger d'insertion n'a pas
-- à changer (ses branches visent tirage_id et decision_lot) ; le trigger
-- d'ajout seul tient l'exclusion comme les autres actes.

-- 4. La recherche respecte la marque. Même signature, même corps, un
--    prédicat de plus : CREATE OR REPLACE conserve le propriétaire et les
--    droits (le REVOKE de PUBLIC posé par 20260722150000 tient ; les contrats
--    rag_claim_barriere_d003_v1 et rag_pgvector_structure_v1 le vérifient).
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
    -- source. Un claim validé mais orphelin de source ne sort JAMAIS.
    AND EXISTS (
      SELECT 1 FROM public.rag_corpus_claim_sources s WHERE s.claim_pk = c.id
    )
    -- [[D-490]] : un claim exclu de la recherche ne remonte pas. Prédicat de
    -- RECHERCHE, pas de validité : validite.ts ne le recopie pas (D-140 §7
    -- précisé par D-490 §2).
    AND c.exclu_recherche = false
    AND (filter_source_ids IS NULL OR c.source_id = ANY(filter_source_ids))
    AND (filter_typologie IS NULL OR c.typologie_lecture = filter_typologie)
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT greatest(1, least(match_count, 50));
$$;
