-- Contrat de migration 20261017100000_rag_claim_decisions_etiquetage_v1
-- (J3-12c, [[D-320]]). Exécuté après `prisma migrate deploy` ; toutes les
-- fixtures sont annulées. Chaque garantie de l'acte `etiquetage` est éprouvée
-- par l'insertion qui devrait la violer : si elle passe, le contrat échoue
-- (ERRCODE sentinelle WN001, jamais intercepté).
BEGIN;

DO $$
DECLARE
  -- Un élément conforme : un claim, ses besoins (1 à 12), sa rubrique.
  conforme constant jsonb := '[{"id":"__etq__","claimId":"WN-CL-9999-001","versionClaim":"v1.0","statutAvant":"VALIDE","statutApres":"VALIDE","besoins":[2,4],"rubrique":"options"}]';
  acte bigint;
BEGIN
  -- 0. L'étiquetage conforme passe : un claim, aucune décision, aucune pièce.
  INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
  VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme)
  RETURNING id INTO acte;

  -- 1. Un étiquetage ne décide rien.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, decision, validateur, claims)
    VALUES ('etiquetage', 'VALIDE', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'étiquetage : décision acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 2. Un claim par acte, jamais un lot ; jamais aucun.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme || conforme);
    RAISE EXCEPTION 'étiquetage : deux claims acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', '[]');
    RAISE EXCEPTION 'étiquetage : aucun claim accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3. Des besoins : liste non vide d'entiers de 1 à 12.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[]'));
    RAISE EXCEPTION 'étiquetage : besoins vides acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme #- '{0,besoins}');
    RAISE EXCEPTION 'étiquetage : besoins absents acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[13]'));
    RAISE EXCEPTION 'étiquetage : besoin 13 accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[0]'));
    RAISE EXCEPTION 'étiquetage : besoin 0 accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[2.5]'));
    RAISE EXCEPTION 'étiquetage : besoin non entier accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '["2"]'));
    RAISE EXCEPTION 'étiquetage : besoin en chaîne accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[[]]'));
    RAISE EXCEPTION 'étiquetage : besoins imbriqués vides acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,besoins}', '[[3]]'));
    RAISE EXCEPTION 'étiquetage : besoins imbriqués acceptés' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 4. Une rubrique de la liste fermée des fiches d'usage — l'ancien
  --    vocabulaire du dossier (« indication ») n'en est pas.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,rubrique}', '"indication"'));
    RAISE EXCEPTION 'étiquetage : rubrique hors liste acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme #- '{0,rubrique}');
    RAISE EXCEPTION 'étiquetage : rubrique absente acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 4 bis. L'élément nomme son claim, et c'est un objet.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme #- '{0,id}');
    RAISE EXCEPTION 'étiquetage : claim sans identifiant accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,id}', '""'));
    RAISE EXCEPTION 'étiquetage : identifiant vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', jsonb_set(conforme, '{0,claimId}', '""'));
    RAISE EXCEPTION 'étiquetage : claimId vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', '["options"]');
    RAISE EXCEPTION 'étiquetage : élément non objet accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 5. Aucune pièce de tirage.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims, echantillon)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme, '{"seed":1}');
    RAISE EXCEPTION 'étiquetage : échantillon accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims, questionnaire)
    VALUES ('etiquetage', 'contrat@wellneuro.fr', conforme, '{"q":1}');
    RAISE EXCEPTION 'étiquetage : questionnaire accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 6. Jamais d'acte anonyme.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage', '', conforme);
    RAISE EXCEPTION 'étiquetage : validateur vide accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 7. La liste des types reste fermée.
  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, claims)
    VALUES ('etiquetage_lot', 'contrat@wellneuro.fr', conforme);
    RAISE EXCEPTION 'étiquetage : type hors liste accepté' USING ERRCODE = 'WN001';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 8. Ce qui est consigné ne se réécrit pas (ajout seul, trigger existant).
  BEGIN
    UPDATE public.rag_corpus_claim_decisions
    SET claims = jsonb_set(claims, '{0,rubrique}', '"limites"')
    WHERE id = acte;
    RAISE EXCEPTION 'étiquetage : réécriture acceptée' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

END $$;

ROLLBACK;
