-- Contrat de cohérence source → notebook — socle du filtre PAR NOTEBOOK du
-- rayon corpus (web/src/lib/supplement-library/rayonCorpus.ts ; décision 7 des
-- arbitrages praticien du 2026-07-27). Le filtre sert les claims d'un notebook
-- via sourcesDuNotebook() ; ces deux invariants garantissent que le notebook
-- d'une source est un fait univoque et présent côté base.
--
-- PORTÉE. SQL ne lit pas le registre (JSON bundlé, hors base) : ce contrat
-- vérifie donc la moitié « base » de la garde de divergence (§7) — la moitié
-- « registre » est tenue au runtime, sourcesDuNotebook() lisant le registre,
-- une source non enregistrée n'étant jamais servie (fail-closed).
--
-- EXÉCUTION. Joué en CI par `prisma db execute` sur une base RAG VIDE : les
-- invariants 1 et 2 passent alors trivialement, et l'étape 3 (fixture annulée)
-- prouve que le détecteur n'est pas un no-op. Contre la PROD, rejouer les
-- SELECT des invariants 1 et 2 en lecture seule (MCP execute_sql) : c'est là
-- qu'ils portent sur des données réelles. Toutes les fixtures sont annulées.
BEGIN;

-- Invariant 1 (données réelles) : toute source portant des claims actifs a au
-- moins un chunk avec un notebook non nul — sinon son notebook n'est pas
-- dérivable en base.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
  FROM (SELECT DISTINCT source_id FROM public.rag_corpus_claims WHERE active) c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rag_corpus_chunks ch
    WHERE ch.source_id = c.source_id AND ch.notebook IS NOT NULL
  );
  IF n > 0 THEN
    RAISE EXCEPTION 'rayon: % source(s) de claims sans chunk/notebook en base', n
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- Invariant 2 (données réelles) : une source relève d'un SEUL notebook. Le
-- filtre par notebook serait ambigu si une source apparaissait sous deux.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT source_id
    FROM public.rag_corpus_chunks
    WHERE notebook IS NOT NULL
    GROUP BY source_id
    HAVING count(DISTINCT notebook) > 1
  ) x;
  IF n > 0 THEN
    RAISE EXCEPTION 'rayon: % source(s) relevant de plusieurs notebooks', n
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- 3. Le détecteur d'orphelin n'est pas un no-op : une source de claim sans
--    chunk DOIT être vue. Fixture annulée — prouve la logique même quand les
--    tables réelles sont vides (CI).
DO $$
DECLARE n bigint;
BEGIN
  INSERT INTO public.rag_corpus_claims
    (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
     typologie_lecture, prescriptif, statut, embedding_model, embedding_dimensions, embedding)
  VALUES
    ('__rayon_orphan__', 'WN-CL-7777-001', 'WN-SRC-7777', 'v1.0', 'claim de contrat sans chunk',
     repeat('f', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
     ('[' || repeat('0,', 1535) || '0]')::extensions.vector);

  SELECT count(*) INTO n
  FROM (SELECT DISTINCT source_id FROM public.rag_corpus_claims WHERE active) c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rag_corpus_chunks ch
    WHERE ch.source_id = c.source_id AND ch.notebook IS NOT NULL
  );
  IF n = 0 THEN
    RAISE EXCEPTION 'rayon: le détecteur d''orphelin ne voit rien (no-op)'
      USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
