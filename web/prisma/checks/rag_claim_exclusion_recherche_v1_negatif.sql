-- Contrat de migration 20261111160000_rag_claim_exclusion_recherche_v1
-- ([[D-490]]). Exécuté après `prisma migrate deploy` ; toutes les fixtures
-- sont annulées. Deux garanties, chacune éprouvée par ce qui devrait la
-- violer (ERRCODE sentinelle WN001, jamais intercepté) :
--   1. la recherche (match_wellneuro_rag_claims) ne rend pas un claim exclu,
--      et rend toujours son jumeau non exclu (contrôle positif) ;
--   2. l'acte `exclusion_recherche` du journal n'admet qu'une forme complète.
--
-- Plage de sentinelles WN-*-9996 : 9998/9997 sont à rag_claim_barriere_d003_v1,
-- 9999 à rag_claim_decisions_journal_v1 et à l'étiquetage.
BEGIN;

-- 0. Structurel : la colonne existe, non nulle, fausse par défaut — sans quoi
--    l'application de la migration aurait pu exclure des claims existants.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'rag_corpus_claims'
    AND column_name = 'exclu_recherche'
    AND data_type = 'boolean'
    AND is_nullable = 'NO'
    AND column_default = 'false';
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'exclusion recherche : colonne exclu_recherche absente, nullable ou sans défaut false.';
  END IF;
END $$;

-- 1. Fixtures : un chunk, deux claims VALIDE identiques sauf la marque.
INSERT INTO public.rag_corpus_chunks
  (id, batch_id, source_id, chunk_id, version_source, version_chunk,
   notebook, section, content, content_sha256,
   embedding_model, embedding_dimensions, embedding, indexation_autorisee)
VALUES
  ('__excl_chunk__', 'LOT_996_2026-11-11', 'WN-SRC-9996', 'WN-CH-9996-001',
   'v1.0', 'v1.0', '99', 'fixture', 'Verbatim de fixture — contrat exclusion recherche.',
   repeat('0', 64), 'contrat', 1536,
   ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true);

INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at,
   embedding_model, embedding_dimensions, embedding, active, exclu_recherche)
VALUES
  -- A — VALIDE, non exclu. LE CONTRÔLE POSITIF.
  ('__excl_a__', 'WN-CL-9996-001', 'WN-SRC-9996', 'v1.0',
   'Claim de fixture A — signé, non exclu. Doit remonter.',
   repeat('1', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true, false),
  -- X — VALIDE, exclu de la recherche, sinon identique à A.
  ('__excl_x__', 'WN-CL-9996-002', 'WN-SRC-9996', 'v1.0',
   'Claim de fixture X — signé, exclu de la recherche. Ne doit pas remonter.',
   repeat('2', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true, true);

INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk)
VALUES
  ('__excl_a__', 'WN-CH-9996-001', 'v1.0'),
  ('__excl_x__', 'WN-CH-9996-001', 'v1.0');

-- 2. Comportemental. Contrôle positif AVANT l'assertion négative : une
--    fonction qui ne rend plus rien passerait sinon pour un filtre.
DO $$
DECLARE
  n int;
  vecteur extensions.vector(1536) := ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9996'], NULL)
    WHERE claim_id = 'WN-CL-9996-001'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'exclusion recherche : CONTRÔLE POSITIF en échec — A (VALIDE, non exclu) ne remonte pas.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9996'], NULL)
    WHERE claim_id = 'WN-CL-9996-002'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'exclusion recherche : X (exclu_recherche = true) remonte — la recherche ne respecte pas la marque.';
  END IF;

  SELECT count(*) INTO n
  FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9996'], NULL);
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('exclusion recherche : %s ligne(s) au lieu d''une seule.', n);
  END IF;
END $$;

-- 3. Le journal : l'acte conforme passe, chaque manque est refusé.
DO $$
DECLARE
  conforme constant jsonb := '[{"id":"__excl_x__","claimId":"WN-CL-9996-002","versionClaim":"v1.0","sens":"exclure"}]';
  motif constant text := 'Hors parcours au dossier de fixture.';
  acte bigint;
  tirage bigint;
BEGIN
  -- 3.0 Conformes : exclure, puis rétablir.
  INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, source_id, claims)
  VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', 'WN-SRC-9996', conforme)
  RETURNING id INTO acte;
  INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, source_id, claims)
  VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', 'WN-SRC-9996',
          jsonb_set(conforme, '{0,sens}', '"retablir"'));

  -- 3.1 Une exclusion ne décide rien.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, decision, motif, validateur, claims)
    VALUES ('exclusion_recherche', 'VALIDE', motif, 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : décision acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.2 Un claim par acte ; jamais aucun ; un objet.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme || conforme);
    RAISE EXCEPTION 'exclusion : deux claims acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', '[]');
    RAISE EXCEPTION 'exclusion : aucun claim accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', '["exclure"]');
    RAISE EXCEPTION 'exclusion : élément non objet accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.3 Le sens : présent, et l'un des deux.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme #- '{0,sens}');
    RAISE EXCEPTION 'exclusion : sens absent accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,sens}', '"masquer"'));
    RAISE EXCEPTION 'exclusion : sens hors liste accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.4 Le motif : présent, et pas fait de blancs — y compris NON-ESPACE,
  --     cas qui fait rougir un `btrim` à un argument.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('exclusion_recherche', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif absent accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', '', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', E'\t\r\n', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif de blancs accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', E' ', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif d''espace insécable accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', E'  ​﻿\f\x0b', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif de blancs typographiques ou invisibles accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', '   ', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : motif d''espaces accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.5 L'élément nomme son claim : id, claimId, versionClaim.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme #- '{0,id}');
    RAISE EXCEPTION 'exclusion : claim sans identifiant accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,claimId}', '""'));
    RAISE EXCEPTION 'exclusion : claimId vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme #- '{0,versionClaim}');
    RAISE EXCEPTION 'exclusion : version absente acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,id}', '""'));
    RAISE EXCEPTION 'exclusion : identifiant vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,id}', '5'));
    RAISE EXCEPTION 'exclusion : identifiant numérique accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,claimId}', '5'));
    RAISE EXCEPTION 'exclusion : claimId numérique accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,versionClaim}', '""'));
    RAISE EXCEPTION 'exclusion : version vide acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,versionClaim}', '1'));
    RAISE EXCEPTION 'exclusion : version numérique acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.6 Aucune pièce de tirage : ni tirage, ni échantillon, ni questionnaire.
  --     Le tirage doit EXISTER (le trigger d'insertion le vérifie avant le
  --     CHECK) : sans lui, le refus viendrait du trigger, et le retrait de
  --     `tirage_id IS NULL` du CHECK passerait inaperçu.
  INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'contrat@wellneuro.fr', 'WN-SRC-9996', '{"seed":1}')
  RETURNING id INTO tirage;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, source_id, claims, tirage_id)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', 'WN-SRC-9996', conforme, tirage);
    RAISE EXCEPTION 'exclusion : tirage accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims, echantillon)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme, '{"seed":1}');
    RAISE EXCEPTION 'exclusion : échantillon accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims, questionnaire)
    VALUES ('exclusion_recherche', motif, 'contrat@wellneuro.fr', conforme, '{"q":1}');
    RAISE EXCEPTION 'exclusion : questionnaire accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.7 Jamais d'acte anonyme.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche', motif, '', conforme);
    RAISE EXCEPTION 'exclusion : validateur vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.8 La liste des types reste fermée.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, claims)
    VALUES ('exclusion_recherche_lot', motif, 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'exclusion : type hors liste accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3.9 Ce qui est consigné ne se réécrit pas (ajout seul, trigger existant).
  BEGIN
    UPDATE public.rag_corpus_claim_decisions
    SET claims = jsonb_set(claims, '{0,sens}', '"retablir"')
    WHERE id = acte;
    RAISE EXCEPTION 'exclusion : réécriture acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
END $$;

ROLLBACK;
