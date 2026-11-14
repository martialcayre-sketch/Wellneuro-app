-- Contrat de la migration `nf7_declaration_suicide_cabinet_v1` (NF-7, lot 1,
-- J2-base, H59 ; [[D-303]] ; réponses 20261111-0027-a à 0029-a).
--
-- Quatre promesses :
--   1. les quatre colonnes existent, NULLABLES, sans défaut, au bon type ;
--      chacune des deux tables a sa contrainte, seule à nommer ces colonnes,
--      avec exactement sa définition ;
--   2. `cabinet_instruments` : la déclaration se pose seule, « oui » comme
--      « non », et NULL reste admis (non déclaré). La désignation (question
--      et option « non ») ne se pose qu'entière et qu'avec « oui » ;
--   3. `assignations` : la copie se pose sur un instrument du cabinet,
--      « oui » comme « non », et reste NULL ailleurs. Toute copie sur un
--      questionnaire hors cabinet est refusée ;
--   4. le CHECK « valide ⇒ déclaré » n'est PAS posé : un instrument `valide`
--      sans déclaration s'écrit encore, puisque le drapeau du lot 2 est
--      éteint (20261111-0029-a).
--
-- Tout se déroule dans une transaction annulée à la fin. Identités
-- synthétiques seulement.
BEGIN;

CREATE FUNCTION pg_temp.doit_refuser(libelle text, requete text, etats text[], motif text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION
    WHEN others THEN
      IF NOT (SQLSTATE = ANY (etats)) THEN
        RAISE EXCEPTION 'NF-7: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'NF-7: « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'NF-7: « % » a été accepté.', libelle;
END;
$$;

-- Une requête qui DOIT passer.
CREATE FUNCTION pg_temp.doit_accepter(libelle text, requete text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE requete;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'NF-7: « % » a été refusé (% : %).', libelle, SQLSTATE, SQLERRM;
END;
$$;

DO $$
DECLARE
  nb integer;
  def text;
  col record;
  I CONSTANT text := 'INSERT INTO cabinet_instruments (id, id_instrument, praticien_email, titre, definition_json, scoring_json, statut_relecture, updated_at, pose_question_suicide, question_suicide_id, question_suicide_option_non) VALUES ';
  A CONSTANT text := 'INSERT INTO assignations (id, id_assignation, id_patient, email_patient, id_questionnaire, titre, statut, updated_at, pose_question_suicide) VALUES ';
  J CONSTANT text := '''{"sections": []}''::jsonb, ''{}''::jsonb';
  CI CONSTANT text := 'cabinet_instruments_designation_suicide_coherente';
  CA CONSTANT text := 'assignations_declaration_suicide_cabinet_seul';
BEGIN
  -- ── 1. Colonnes et contraintes ───────────────────────────────────────────
  FOR col IN
    SELECT * FROM (VALUES
      ('cabinet_instruments', 'pose_question_suicide', 'boolean'),
      ('cabinet_instruments', 'question_suicide_id', 'text'),
      ('cabinet_instruments', 'question_suicide_option_non', 'integer'),
      ('assignations', 'pose_question_suicide', 'boolean')
    ) AS t(tbl, nom, typ)
  LOOP
    SELECT count(*) INTO nb
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = col.tbl AND c.column_name = col.nom
      AND c.data_type = col.typ AND c.is_nullable = 'YES' AND c.column_default IS NULL;
    IF nb <> 1 THEN
      RAISE EXCEPTION 'NF-7: colonne %.% absente, non nullable, avec défaut, ou pas de type %.', col.tbl, col.nom, col.typ;
    END IF;
  END LOOP;

  -- Par les colonnes référencées (`conkey`), pas par le texte.
  SELECT count(DISTINCT c.oid) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.cabinet_instruments'::regclass AND c.contype = 'c'
    AND a.attname IN ('pose_question_suicide', 'question_suicide_id', 'question_suicide_option_non');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'NF-7: % contrainte(s) CHECK sur la déclaration de cabinet_instruments ; une seule attendue (cohérence ; le CHECK « valide ⇒ déclaré » n''est pas de ce lot).', nb;
  END IF;
  SELECT count(DISTINCT c.oid) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.assignations'::regclass AND c.contype = 'c'
    AND a.attname = 'pose_question_suicide'
    -- D-515 §4 : la cohérence de la désignation nomme aussi cette colonne ;
    -- elle est éprouvée par `d515_designation_suicide_assignation_v1_negatif.sql`.
    AND c.conname <> 'assignations_designation_suicide_coherente';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'NF-7: % contrainte(s) CHECK sur la copie de la déclaration d''assignations ; une seule attendue.', nb;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c
  WHERE c.conrelid = 'public.cabinet_instruments'::regclass AND c.conname = CI AND c.contype = 'c';
  IF def IS DISTINCT FROM 'CHECK ((((question_suicide_id IS NULL) = (question_suicide_option_non IS NULL)) AND ((question_suicide_id IS NULL) OR (pose_question_suicide IS TRUE))))' THEN
    RAISE EXCEPTION 'NF-7: définition inattendue de % (reçu : %).', CI, def;
  END IF;
  SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c
  WHERE c.conrelid = 'public.assignations'::regclass AND c.conname = CA AND c.contype = 'c';
  IF def IS DISTINCT FROM 'CHECK (((pose_question_suicide IS NULL) OR ("left"(id_questionnaire, 4) = ''CAB_''::text)))' THEN
    RAISE EXCEPTION 'NF-7: définition inattendue de % (reçu : %).', CA, def;
  END IF;

  -- ── 2. cabinet_instruments ───────────────────────────────────────────────
  PERFORM pg_temp.doit_accepter('non déclaré (NULL)',
    I || '(''nf7_i1'', ''CAB_NF7_1'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('déclaré « non »',
    I || '(''nf7_i2'', ''CAB_NF7_2'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), false, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('déclaré « oui » sans désignation',
    I || '(''nf7_i3'', ''CAB_NF7_3'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), true, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('déclaré « oui » avec désignation entière',
    I || '(''nf7_i4'', ''CAB_NF7_4'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), true, ''q1'', 0)');

  PERFORM pg_temp.doit_refuser('question sans option « non »',
    I || '(''nf7_r1'', ''CAB_NF7_R1'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), true, ''q1'', NULL)', ARRAY['23514'], CI);
  PERFORM pg_temp.doit_refuser('option « non » sans question',
    I || '(''nf7_r2'', ''CAB_NF7_R2'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), true, NULL, 0)', ARRAY['23514'], CI);
  PERFORM pg_temp.doit_refuser('désignation sur une déclaration « non »',
    I || '(''nf7_r3'', ''CAB_NF7_R3'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), false, ''q1'', 0)', ARRAY['23514'], CI);
  PERFORM pg_temp.doit_refuser('désignation sans déclaration',
    I || '(''nf7_r4'', ''CAB_NF7_R4'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), NULL, ''q1'', 0)', ARRAY['23514'], CI);
  PERFORM pg_temp.doit_refuser('mise à jour qui retire le « oui » sous une désignation',
    'UPDATE cabinet_instruments SET pose_question_suicide = false WHERE id = ''nf7_i4''', ARRAY['23514'], CI);
  PERFORM pg_temp.doit_refuser('mise à jour qui remet la déclaration à NULL sous une désignation',
    'UPDATE cabinet_instruments SET pose_question_suicide = NULL WHERE id = ''nf7_i4''', ARRAY['23514'], CI);

  -- ── 4. Pas de CHECK « valide ⇒ déclaré » dans ce lot ─────────────────────
  PERFORM pg_temp.doit_accepter('instrument valide non déclaré',
    I || '(''nf7_i5'', ''CAB_NF7_5'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''valide'', now(), NULL, NULL, NULL)');

  -- ── 3. assignations ──────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('nf7_pat', 'PAT_NF7_CONTRAT', 'sophie.nicola+nf7@example.test', 'Sophie', 'Nicola', 'contrat@test.invalid', now());

  PERFORM pg_temp.doit_accepter('catalogue, copie NULL',
    A || '(''nf7_a1'', ''ASS_NF7_1'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''Q_NEU_01'', ''Contrat'', ''En attente'', now(), NULL)');
  PERFORM pg_temp.doit_accepter('cabinet, copie NULL (existant)',
    A || '(''nf7_a2'', ''ASS_NF7_2'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''CAB_NF7_1'', ''Contrat'', ''En attente'', now(), NULL)');
  PERFORM pg_temp.doit_accepter('cabinet, copie « oui »',
    A || '(''nf7_a3'', ''ASS_NF7_3'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''CAB_NF7_3'', ''Contrat'', ''En attente'', now(), true)');
  PERFORM pg_temp.doit_accepter('cabinet, copie « non »',
    A || '(''nf7_a4'', ''ASS_NF7_4'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''CAB_NF7_2'', ''Contrat'', ''En attente'', now(), false)');

  PERFORM pg_temp.doit_refuser('catalogue, copie « oui »',
    A || '(''nf7_b1'', ''ASS_NF7_B1'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''Q_NEU_02'', ''Contrat'', ''En attente'', now(), true)', ARRAY['23514'], CA);
  PERFORM pg_temp.doit_refuser('catalogue, copie « non »',
    A || '(''nf7_b2'', ''ASS_NF7_B2'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''Q_NEU_03'', ''Contrat'', ''En attente'', now(), false)', ARRAY['23514'], CA);
  PERFORM pg_temp.doit_refuser('préfixe en minuscules « cab_ »',
    A || '(''nf7_b3'', ''ASS_NF7_B3'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''cab_nf7'', ''Contrat'', ''En attente'', now(), true)', ARRAY['23514'], CA);
  PERFORM pg_temp.doit_refuser('préfixe tronqué « CAB »',
    A || '(''nf7_b4'', ''ASS_NF7_B4'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', ''CAB'', ''Contrat'', ''En attente'', now(), true)', ARRAY['23514'], CA);
  PERFORM pg_temp.doit_refuser('blanc de bord « CAB_ » précédé d''une espace',
    A || '(''nf7_b5'', ''ASS_NF7_B5'', ''PAT_NF7_CONTRAT'', ''contrat@test.invalid'', '' CAB_NF7'', ''Contrat'', ''En attente'', now(), true)', ARRAY['23514'], CA);
  PERFORM pg_temp.doit_refuser('mise à jour qui pose une copie sur le catalogue',
    'UPDATE assignations SET pose_question_suicide = true WHERE id = ''nf7_a1''', ARRAY['23514'], CA);

  RAISE NOTICE 'NF-7: quatre colonnes nullables sans défaut ; une contrainte par table, définition exacte ; déclaration NULL, « non », « oui » admises ; désignation seulement entière et sous « oui » ; copie d''assignation seulement sur CAB_ ; pas de CHECK « valide ⇒ déclaré ».';
END;
$$;

ROLLBACK;
