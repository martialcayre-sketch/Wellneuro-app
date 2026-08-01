-- Contrat de la migration 20260801200000_rag_claim_usage_orientation.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
--
-- Ce banc existe parce que le CI, seul, ne prouve RIEN de cette migration : sa
-- base est construite vide par `migrate deploy`, le marquage y est un no-op.
-- Il éprouve la FONCTION de périmètre que la migration pose, pas une copie de
-- sa liste — et il éprouve les deux exclusions qui portent une décision
-- clinique, plutôt que de recompter 98 identifiants.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

DO $$
DECLARE
  n int;
BEGIN
  -- 1. Une source ordinaire du périmètre y est. WN-SRC-0313 (fiche synthèse
  --    insomnie et stress intense) est le cas nominal du lot sommeil.
  SELECT count(*) INTO n
  FROM public.rag_claim_orientation_sources() WHERE source_id = 'WN-SRC-0313';
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'périmètre orientation : WN-SRC-0313 (cas nominal sommeil) absent du périmètre.';
  END IF;

  -- 2. La perfusion en est exclue — seule exclusion A-009 restante après
  --    l'amendement de la décision f (2026-08-01).
  SELECT count(*) INTO n
  FROM public.rag_claim_orientation_sources() WHERE source_id = 'WN-SRC-0244';
  IF n <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'périmètre orientation : WN-SRC-0244 (perfusion) présent alors que A-009 amendé l''exclut.';
  END IF;

  -- 3. La quarantaine sanitaire exclut, et la décision f ne la lève pas.
  --    WN-SRC-0318 (« premières ordonnances », vigilance Élevée) et
  --    WN-SRC-0370 (addictions et sevrage — domaine RÉINTÉGRÉ par la décision f,
  --    mais source toujours en quarantaine) sont les deux cas qui distinguent
  --    « domaine réintégré » de « source ingérable ».
  SELECT count(*) INTO n
  FROM public.rag_claim_orientation_sources()
  WHERE source_id IN ('WN-SRC-0318', 'WN-SRC-0370');
  IF n <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'périmètre orientation : une source en quarantaine y figure — la décision f réintègre des domaines, elle ne lève aucune quarantaine.';
  END IF;

  -- 4. Le périmètre ne déborde pas sur les notebooks hors orientation. Le
  --    notebook 12 (audit des contradictions) porte les fiches prescriptives
  --    « hors périmètre moteur » : WN-SRC-0322 (sevrage benzodiazépines) et
  --    WN-SRC-0389 (Alzheimer) relèvent de domaines réintégrés, mais leur
  --    notebook les tient hors du périmètre indépendamment de cela.
  SELECT count(*) INTO n
  FROM public.rag_claim_orientation_sources()
  WHERE source_id IN ('WN-SRC-0322', 'WN-SRC-0389');
  IF n <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'périmètre orientation : une source du notebook 12 y figure — le périmètre se limite aux notebooks 02-07 et 11.';
  END IF;
END $$;

-- 5. Le marquage est IDEMPOTENT et n'écrase pas un usage existant. Fixture :
--    deux claims d'une source du périmètre, l'un vierge, l'autre portant déjà
--    un usage étranger. Rejouer le prédicat de la migration ne doit toucher que
--    le premier.
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, metadata,
   embedding_model, embedding_dimensions, embedding)
VALUES
  ('__uo_vierge__', 'WN-CL-0313-901', 'WN-SRC-0313', 'v1.0',
   'Fixture de contrat — claim sans clé usage.', repeat('a', 64),
   'déclaré', false, 'EN_ATTENTE_VALIDATION', '{"section": "fixture"}'::jsonb,
   'contrat', 1536, ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  ('__uo_etranger__', 'WN-CL-0313-902', 'WN-SRC-0313', 'v1.0',
   'Fixture de contrat — claim portant déjà un usage étranger.', repeat('b', 64),
   'déclaré', false, 'EN_ATTENTE_VALIDATION', '{"usage": "instruments"}'::jsonb,
   'contrat', 1536, ('[' || repeat('0,', 1535) || '0]')::extensions.vector);

DO $$
DECLARE
  conflits int;
  touches int;
BEGIN
  -- Le garde de la migration doit VOIR le claim à usage étranger.
  SELECT count(*) INTO conflits
  FROM public.rag_corpus_claims c
  JOIN public.rag_claim_orientation_sources() s ON s.source_id = c.source_id
  WHERE c.metadata ? 'usage' AND c.metadata->>'usage' IS DISTINCT FROM 'orientation';
  IF conflits < 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'garde du marquage : un usage étranger dans le périmètre n''est pas détecté — la migration écraserait sans le voir.';
  END IF;

  -- Le prédicat d'UPDATE ne retient que le claim vierge.
  UPDATE public.rag_corpus_claims c
  SET metadata = c.metadata || jsonb_build_object('usage', 'orientation')
  FROM public.rag_claim_orientation_sources() s
  WHERE s.source_id = c.source_id
    AND NOT (c.metadata ? 'usage')
    AND c.id IN ('__uo_vierge__', '__uo_etranger__');
  GET DIAGNOSTICS touches = ROW_COUNT;
  IF touches <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('marquage : %s ligne(s) touchée(s) au lieu de 1 — l''usage étranger a été écrasé, ou le claim vierge manqué.', touches);
  END IF;

  -- Rejeu : plus rien à faire.
  UPDATE public.rag_corpus_claims c
  SET metadata = c.metadata || jsonb_build_object('usage', 'orientation')
  FROM public.rag_claim_orientation_sources() s
  WHERE s.source_id = c.source_id
    AND NOT (c.metadata ? 'usage')
    AND c.id IN ('__uo_vierge__', '__uo_etranger__');
  GET DIAGNOSTICS touches = ROW_COUNT;
  IF touches <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'marquage : le rejeu touche encore des lignes — l''opération n''est pas idempotente.';
  END IF;

  -- L'usage étranger est intact.
  IF (SELECT metadata->>'usage' FROM public.rag_corpus_claims WHERE id = '__uo_etranger__') <> 'instruments' THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'marquage : l''usage étranger a été modifié.';
  END IF;
END $$;

ROLLBACK;
