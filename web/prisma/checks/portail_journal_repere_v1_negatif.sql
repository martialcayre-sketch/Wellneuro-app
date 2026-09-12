-- Contrat de `portail_journal_reperes` (campagne « vie du portail patient » —
-- le repère de fraîcheur du journal).
--
-- La table promet six choses, et ce fichier les éprouve TOUTES :
--   1. un repère s'écrit, et se RELIT tel qu'il a été posé ;
--   2. UN SEUL PAR DOSSIER — une seconde insertion sur le même dossier est
--      REFUSÉE (23505). C'est la promesse centrale, et elle n'est pas de
--      confort : sans elle, la table deviendrait un journal de visites,
--      c'est-à-dire un décompte d'assiduité déguisé. « Ce patient a ouvert son
--      portail 14 fois en septembre » est un constat sur lui, que la campagne
--      s'interdit et que `DC-19`/`DC-20` interdisent en général ;
--   3. L'AVANCÉE ÉCRASE, et la valeur précédente est PERDUE. Le cas positif
--      l'éprouve explicitement : ce n'est pas une trace d'audit, et la perte
--      est voulue. Un test qui se contenterait d'accepter l'UPDATE passerait
--      vert sur une table qui aurait secrètement gardé l'historique ;
--   4. la table porte EXACTEMENT ses deux colonnes, LISTE BLANCHE. Aucun
--      compteur, aucune date de première visite, aucune durée, et pas même un
--      `mis_a_jour_le` — il vaudrait toujours `vu_jusqua`, et une colonne
--      redondante finit par servir à autre chose ;
--   5. la FK vers `patients` est en ON DELETE RESTRICT — passée en CASCADE, la
--      suppression nommée de `patient/effacement.ts` deviendrait du code mort
--      en silence ;
--   6. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  vu timestamp(3);
  reelles text[];

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparaison à un `array_agg(... ORDER BY
  -- column_name)`) : une colonne ajoutée à la fin rougirait alors qu'elle est
  -- déclarée, et le message afficherait deux ensembles identiques au tri près.
  COLS_REPERES CONSTANT text[] := ARRAY['id_patient', 'vu_jusqua'];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_jrepere', 'PAT_CONTRAT_JREPERE', 'jennifer.martin@example.test',
          'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIF — un repère s'écrit et se relit ───────────────────────
  BEGIN
    INSERT INTO portail_journal_reperes (id_patient, vu_jusqua)
    VALUES ('PAT_CONTRAT_JREPERE', TIMESTAMP '2026-09-12 09:00:00');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'JOURNAL REPÈRE: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, le journal ne se replierait jamais.',
        SQLSTATE;
  END;

  SELECT r.vu_jusqua INTO vu FROM portail_journal_reperes r WHERE r.id_patient = 'PAT_CONTRAT_JREPERE';
  IF vu IS DISTINCT FROM TIMESTAMP '2026-09-12 09:00:00' THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: le repère relu (%) n''est pas celui qui a été posé.', coalesce(vu::text, 'NULL');
  END IF;

  -- ── 2. UN SEUL REPÈRE PAR DOSSIER ────────────────────────────────────────
  -- La clé primaire porte l'interdit. Sans elle, deux lignes cohabiteraient et
  -- la table serait un journal de visites — le décompte d'assiduité que la
  -- campagne s'interdit.
  refuse := false;
  BEGIN
    INSERT INTO portail_journal_reperes (id_patient, vu_jusqua)
    VALUES ('PAT_CONTRAT_JREPERE', TIMESTAMP '2026-09-12 10:00:00');
  EXCEPTION
    WHEN unique_violation THEN
      refuse := true;
    WHEN others THEN
      RAISE EXCEPTION
        'JOURNAL REPÈRE: le second repère a été rejeté pour le mauvais motif (SQLSTATE %, attendu 23505) — la clé primaire a-t-elle changé ?',
        SQLSTATE;
  END;

  IF NOT refuse THEN
    RAISE EXCEPTION
      'JOURNAL REPÈRE: un SECOND repère a été ACCEPTÉ sur le même dossier — la table est devenue un journal de visites, donc un décompte d''assiduité (DC-19/DC-20).';
  END IF;

  -- ── 3. L'avancée ÉCRASE, et la valeur précédente est PERDUE ──────────────
  UPDATE portail_journal_reperes
  SET vu_jusqua = TIMESTAMP '2026-09-12 11:00:00'
  WHERE id_patient = 'PAT_CONTRAT_JREPERE';

  SELECT count(*) INTO nb FROM portail_journal_reperes WHERE id_patient = 'PAT_CONTRAT_JREPERE';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'JOURNAL REPÈRE: % ligne(s) après une avancée, 1 attendue — l''historique est conservé quelque part, et il ne doit pas l''être.',
      nb;
  END IF;

  SELECT r.vu_jusqua INTO vu FROM portail_journal_reperes r WHERE r.id_patient = 'PAT_CONTRAT_JREPERE';
  IF vu IS DISTINCT FROM TIMESTAMP '2026-09-12 11:00:00' THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: l''avancée n''a pas pris (% relu).', coalesce(vu::text, 'NULL');
  END IF;

  -- ── 4. Liste blanche de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'portail_journal_reperes';

  IF reelles IS DISTINCT FROM COLS_REPERES THEN
    RAISE EXCEPTION
      'JOURNAL REPÈRE: colonnes inattendues (%). Attendu exactement % — toute colonne neuve doit être arbitrée : l''interdit « ne pas compter » en dépend, et l''absence de `mis_a_jour_le` aussi (il vaudrait toujours `vu_jusqua`).',
      reelles, COLS_REPERES;
  END IF;

  -- ── 5. Les deux colonnes sont NOT NULL ───────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'portail_journal_reperes'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id_patient', 'vu_jusqua');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: % colonne(s) NOT NULL sur 2 attendues — un repère sans instant ne replie rien.', nb;
  END IF;

  -- ── 6. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  -- `confdeltype = 'r'`, invisible du drift check.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'portail_journal_reperes'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'portail_journal_reperes' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: RLS désactivée sur portail_journal_reperes';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'portail_journal_reperes'
  ) THEN
    RAISE EXCEPTION 'JOURNAL REPÈRE: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'JOURNAL REPÈRE: écriture valide acceptée et relue, second repère refusé (23505), avancée écrasante sans historique, liste blanche exacte (2 colonnes), 2 NOT NULL, FK RESTRICT, RLS deny-all.';
END $$;

ROLLBACK;
