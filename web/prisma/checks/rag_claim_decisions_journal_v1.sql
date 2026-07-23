-- Contrat de migration 20260723100000_rag_claim_decisions_journal_v1.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
-- Chaque garantie du journal append-only est éprouvée par l'insertion qui
-- devrait la violer : si elle passe, le contrat échoue (ERRCODE sentinelle
-- WN001, jamais intercepté).
BEGIN;

-- Structurel : RLS sans policy, aucun grant Data API, triggers en place.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.rag_corpus_claim_decisions'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'journal claims: RLS non activée' USING ERRCODE = 'WN001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rag_corpus_claim_decisions'
  ) THEN
    RAISE EXCEPTION 'journal claims: policy inattendue' USING ERRCODE = 'WN001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'rag_corpus_claim_decisions'
      AND grantee IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'journal claims: grant Data API inattendu' USING ERRCODE = 'WN001';
  END IF;

  IF (
    SELECT count(*) FROM pg_trigger
    WHERE tgrelid = 'public.rag_corpus_claim_decisions'::regclass AND NOT tgisinternal
  ) <> 3 THEN
    RAISE EXCEPTION 'journal claims: triggers attendus absents (no_dml, no_truncate, avant_insertion)'
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- Fixtures : deux claims de test (un signable par lot, un prescriptif).
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, embedding_model, embedding_dimensions, embedding)
VALUES
  ('__jrnl_ok__', 'WN-CL-9999-001', 'WN-SRC-9999', 'v1.0', 'claim de contrat, non prescriptif',
   repeat('a', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  ('__jrnl_rx__', 'WN-CL-9999-002', 'WN-SRC-9999', 'v1.0', 'claim de contrat, prescriptif',
   repeat('b', 64), 'déclaré', true, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  ('__jrnl_autre__', 'WN-CL-8888-001', 'WN-SRC-8888', 'v1.0', 'claim de contrat, autre source',
   repeat('c', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  ('__jrnl_vecu__', 'WN-CL-9999-003', 'WN-SRC-9999', 'v1.0', 'claim de contrat, vécu',
   repeat('d', 64), 'vécu', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector);

-- Comportemental.
DO $$
DECLARE
  tirage bigint;
  lot bigint;
  date_stockee timestamptz;
BEGIN
  -- 1. Une décision individuelle qui ne couvre aucun claim est refusée.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, decision, validateur)
    VALUES ('decision_individuelle', 'VALIDE', 'contrat@wellneuro.fr');
    RAISE EXCEPTION 'journal claims: décision sans claim acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 2. Jamais d'acte anonyme, chaîne vide comprise.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, decision, validateur, claims)
    VALUES ('decision_individuelle', 'VALIDE', '',
            '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: validateur vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3. Un rejet sans motif est refusé (dette v1 comblée).
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, decision, validateur, claims)
    VALUES ('decision_individuelle', 'REJETE', 'contrat@wellneuro.fr',
            '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"REJETE"}]');
    RAISE EXCEPTION 'journal claims: rejet sans motif accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 4. Un tirage ne décide rien.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, echantillon)
    VALUES ('tirage_echantillon', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999',
            '{"seed":1,"taux":0.3,"taille":1,"tires":["__jrnl_ok__"]}');
    RAISE EXCEPTION 'journal claims: tirage décideur accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Tirage conforme : socle des tests de lot.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'contrat@wellneuro.fr', 'WN-SRC-9999',
          '{"seed":1,"taux":0.3,"taille":1,"tires":["__jrnl_ok__"]}')
  RETURNING id INTO tirage;

  -- 5. Une signature de lot sans tirage référencé est refusée.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999',
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: lot sans tirage accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 6. Un tirage d'une AUTRE source ne couvre pas ce lot (trigger).
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9998', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: lot sur tirage d''une autre source accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- 7. La voie lente ne se signe jamais par lot : claim prescriptif refusé (trigger).
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_rx__","claimId":"WN-CL-9999-002","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: prescriptif signé par lot' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- 7b. Un lot ne couvre que les claims de SA source (trigger).
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_autre__","claimId":"WN-CL-8888-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: claim hors source signé par lot' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- 7c. La voie rapide est une allowlist : un « vécu » (non prescriptif) ne se
  --     signe pas non plus par lot (trigger, migration de suivi 20260723120000).
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_vecu__","claimId":"WN-CL-9999-003","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: vécu signé par lot' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- 8. Une signature de lot ne peut être que VALIDE.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, motif, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'REJETE', 'contrat', 'contrat@wellneuro.fr', 'WN-SRC-9999', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'journal claims: rejet en masse accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 9. Chemin nominal : lot VALIDE, tirage conforme, claim signable —
  --    et cree_le posé par la base même si le client tente d'antidater.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims, cree_le)
  VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-9999', tirage,
          '{"seed":1,"verdicts":[{"id":"__jrnl_ok__","verdict":"conforme"}]}',
          '{"questions":[{"question":"contrat","reponse":"contrat","claimsCites":["WN-CL-9999-001"],"verdict":"conforme"}]}',
          '[{"id":"__jrnl_ok__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]',
          '2020-01-01T00:00:00Z')
  RETURNING id, cree_le INTO lot, date_stockee;

  IF date_stockee < now() - interval '1 minute' THEN
    RAISE EXCEPTION 'journal claims: cree_le antidaté accepté' USING ERRCODE = 'WN001';
  END IF;

  -- 9b. UN tirage, UNE issue : une seconde issue sur le même tirage viole
  --     l'index unique partiel (migration de suivi 20260723120000) — même
  --     sous concurrence, la base est l'arbitre.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, motif, validateur, source_id, tirage_id, echantillon)
    VALUES ('bascule_individuelle', 'contrat: seconde issue', 'contrat@wellneuro.fr',
            'WN-SRC-9999', tirage, '{"seed":1,"verdicts":[]}');
    RAISE EXCEPTION 'journal claims: seconde issue acceptée sur un tirage conclu' USING ERRCODE = 'WN001';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- 10. Append-only : ni UPDATE ni DELETE, même par le rôle courant.
  BEGIN
    UPDATE public.rag_corpus_claim_decisions SET motif = 'réécrit' WHERE id = lot;
    RAISE EXCEPTION 'journal claims: UPDATE accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  BEGIN
    DELETE FROM public.rag_corpus_claim_decisions WHERE id = lot;
    RAISE EXCEPTION 'journal claims: DELETE accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- 11. L'audit GIN retrouve la décision par claim couvert.
  IF NOT EXISTS (
    SELECT 1 FROM public.rag_corpus_claim_decisions
    WHERE claims @> '[{"claimId":"WN-CL-9999-001"}]'
  ) THEN
    RAISE EXCEPTION 'journal claims: audit @> aveugle' USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
