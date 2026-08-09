-- Contrat structurel pgvector (migrations 20260721090000, 20260721230000,
-- 20260722150000). Strictement en lecture seule : joué en CI après
-- `migrate deploy`, et en préflight de release-db.yml contre la production.
--
-- Ce qu'il ferme : le drift check Prisma ne voit ni l'extension, ni les index
-- HNSW, ni les fonctions SQL — tout le socle RAG vit en SQL brut. Un index
-- HNSW perdu (drop manuel, rebuild interrompu → index invalide) dégraderait
-- la recherche en scan séquentiel : mêmes résultats, latence dégradée, aucune
-- suite ne rougit. De même, un rebuild en L2 (`vector_l2_ops`) laisserait
-- l'index en place mais inutilisable par l'ORDER BY cosinus (`<=>`) des deux
-- fonctions match_* — d'où l'assertion sur l'operator class, pas seulement
-- sur l'existence.
--
-- Vérifié conforme sur la production Supabase le 2026-08-09 avant câblage
-- fail-closed dans le préflight.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN READ ONLY;

DO $$
DECLARE
  paire record;
  idx record;
  fonction text;
  role_supabase text;
  proc record;
BEGIN
  -- L'extension vector, dans le schéma `extensions` : l'ingestion et les deux
  -- fonctions match_* qualifient le type (`extensions.vector`) — une extension
  -- relocalisée casserait le runtime en gardant `pg_extension` non vide.
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION 'pgvector: extension vector absente ou hors du schéma extensions'
      USING ERRCODE = 'WN001';
  END IF;

  -- Les deux index HNSW : présents sur la bonne table, méthode hnsw, colonne
  -- embedding, cosinus, et VALIDES (un CREATE INDEX interrompu laisse un index
  -- invalide que le planificateur ignore — structurellement présent, mort).
  FOR paire IN
    SELECT * FROM (VALUES
      ('public.rag_corpus_chunks', 'rag_corpus_chunks_embedding_hnsw_idx'),
      ('public.rag_corpus_claims', 'rag_corpus_claims_embedding_hnsw_idx')
    ) AS t(table_cible, index_attendu)
  LOOP
    SELECT am.amname, a.attname, oc.opcname, i.indisvalid, i.indisready
      INTO idx
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_am am ON am.oid = ic.relam
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    JOIN pg_opclass oc ON oc.oid = i.indclass[0]
    WHERE i.indrelid = to_regclass(paire.table_cible)
      AND ic.relname = paire.index_attendu;

    IF idx IS NULL THEN
      RAISE EXCEPTION 'pgvector: index % absent de % — la recherche RAG tombe en scan séquentiel',
        paire.index_attendu, paire.table_cible USING ERRCODE = 'WN001';
    END IF;
    IF idx.amname <> 'hnsw' OR idx.attname <> 'embedding'
       OR idx.opcname <> 'vector_cosine_ops' THEN
      RAISE EXCEPTION 'pgvector: index % dévié (méthode %, colonne %, opclass %) — attendu hnsw/embedding/vector_cosine_ops',
        paire.index_attendu, idx.amname, idx.attname, idx.opcname USING ERRCODE = 'WN001';
    END IF;
    IF NOT idx.indisvalid OR NOT idx.indisready THEN
      RAISE EXCEPTION 'pgvector: index % invalide ou non prêt — présent au catalogue, ignoré du planificateur',
        paire.index_attendu USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  -- Les signatures exactes des deux voies de récupération : le runtime
  -- (web/src/lib/rag/store.ts) les appelle positionnellement, et la barrière
  -- D-003 est PORTÉE par match_wellneuro_rag_claims — un renommage ou un
  -- changement d'arguments casserait la recherche au premier appel seulement.
  FOREACH fonction IN ARRAY ARRAY[
    'public.match_wellneuro_rag_chunks(extensions.vector, integer, double precision, text, text[], text[])',
    'public.match_wellneuro_rag_claims(extensions.vector, integer, double precision, text[], text)'
  ] LOOP
    IF to_regprocedure(fonction) IS NULL THEN
      RAISE EXCEPTION 'pgvector: signature introuvable — %', fonction
        USING ERRCODE = 'WN001';
    END IF;

    SELECT p.provolatile, p.proretset, p.proacl,
           p.proacl IS NULL OR EXISTS (
             SELECT 1 FROM aclexplode(p.proacl) x
             WHERE x.grantee = 0 AND x.privilege_type = 'EXECUTE'
           ) AS public_execute
      INTO proc
    FROM pg_proc p WHERE p.oid = to_regprocedure(fonction);

    IF proc.provolatile <> 's' OR NOT proc.proretset THEN
      RAISE EXCEPTION 'pgvector: % n''est plus STABLE et set-returning', fonction
        USING ERRCODE = 'WN001';
    END IF;

    -- Leçon de 20260721230000, constatée en production le 2026-07-21 :
    -- CREATE FUNCTION accorde EXECUTE à PUBLIC par défaut (proacl NULL), et
    -- anon en héritait. Un `CREATE OR REPLACE` futur qui oublierait le REVOKE
    -- rouvrirait la recherche interne à PostgREST — cette assertion mord AUSSI
    -- sur la base du CI, où proacl NULL suffit à la faire lever.
    IF proc.public_execute THEN
      RAISE EXCEPTION 'pgvector: EXECUTE accordé à PUBLIC sur % (proacl par défaut ou grant explicite)',
        fonction USING ERRCODE = 'WN001';
    END IF;
    -- anon/authenticated n'existent que sur Supabase : vacue en CI, mordante
    -- en préflight — c'est elle qui aurait vu le grant nominatif de prod.
    FOREACH role_supabase IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_supabase)
         AND has_function_privilege(role_supabase, to_regprocedure(fonction), 'EXECUTE')
      THEN
        RAISE EXCEPTION 'pgvector: le rôle % peut exécuter %', role_supabase, fonction
          USING ERRCODE = 'WN001';
      END IF;
    END LOOP;
  END LOOP;
END $$;

ROLLBACK;
