-- Contrat de la migration `d515_designation_suicide_assignation_v1` (D-515
-- §4, H59, lot D-277 ; réponses 20261112-2025-a et 20261113-1807-a).
--
-- Quatre promesses :
--   1. les trois colonnes existent sur `assignations`, NULLABLES, sans
--      défaut, au bon type (text, integer, jsonb) ; une seule contrainte
--      CHECK les nomme, avec exactement sa définition ; la copie de
--      déclaration de NF-7 n'est nommée que par sa contrainte et par celle-ci ;
--   2. la désignation est ENTIÈRE ou ABSENTE : une ou deux colonnes sur
--      trois, à l'insertion comme à la mise à jour, sont refusées ;
--   3. la désignation ne se pose que sous une copie de déclaration « oui »
--      (IS TRUE) : ni sous « non », ni sous NULL, ni sur le catalogue ; et
--      sous « oui », son absence reste admise (désignation INCONNUE, D-515
--      §7 — jamais lue comme « non ») ;
--   4. la copie JSON est un objet : tableau, chaîne, nombre, booléen et
--      `null` JSON refusés.
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
        RAISE EXCEPTION 'D-515: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'D-515: « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'D-515: « % » a été accepté.', libelle;
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
    RAISE EXCEPTION 'D-515: « % » a été refusé (% : %).', libelle, SQLSTATE, SQLERRM;
END;
$$;

DO $$
DECLARE
  nb integer;
  def text;
  col record;
  A CONSTANT text := 'INSERT INTO assignations (id, id_assignation, id_patient, email_patient, id_questionnaire, titre, statut, updated_at, pose_question_suicide, question_suicide_id, question_suicide_option_non, question_suicide_copie) VALUES ';
  -- Patient et e-mail, puis titre, statut et horodatage, communs à toutes les lignes.
  P CONSTANT text := '''PAT_D515_CONTRAT'', ''contrat@test.invalid'', ';
  C CONSTANT text := '''Contrat'', ''En attente'', now(), ';
  COPIE CONSTANT text := '''{"instrument": "Contrat", "enonce": "Question désignée", "options": [{"valeur": 0, "libelle": "Non"}, {"valeur": 1, "libelle": "Oui"}]}''::jsonb';
  CD CONSTANT text := 'assignations_designation_suicide_coherente';
  CA CONSTANT text := 'assignations_declaration_suicide_cabinet_seul';
BEGIN
  -- ── 1. Colonnes et contraintes ───────────────────────────────────────────
  FOR col IN
    SELECT * FROM (VALUES
      ('question_suicide_id', 'text'),
      ('question_suicide_option_non', 'integer'),
      ('question_suicide_copie', 'jsonb')
    ) AS t(nom, typ)
  LOOP
    SELECT count(*) INTO nb
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'assignations' AND c.column_name = col.nom
      AND c.data_type = col.typ AND c.is_nullable = 'YES' AND c.column_default IS NULL;
    IF nb <> 1 THEN
      RAISE EXCEPTION 'D-515: colonne assignations.% absente, non nullable, avec défaut, ou pas de type %.', col.nom, col.typ;
    END IF;
  END LOOP;

  -- Par les colonnes référencées (`conkey`), pas par le texte.
  SELECT count(DISTINCT c.oid) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.assignations'::regclass AND c.contype = 'c'
    AND a.attname IN ('question_suicide_id', 'question_suicide_option_non', 'question_suicide_copie');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'D-515: % contrainte(s) CHECK sur la désignation d''assignations ; une seule attendue.', nb;
  END IF;
  SELECT count(DISTINCT c.oid) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.assignations'::regclass AND c.contype = 'c'
    AND a.attname = 'pose_question_suicide'
    AND c.conname NOT IN (CA, CD);
  IF nb <> 0 THEN
    RAISE EXCEPTION 'D-515: % contrainte(s) CHECK inattendue(s) sur la copie de déclaration d''assignations (seules % et % attendues).', nb, CA, CD;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c
  WHERE c.conrelid = 'public.assignations'::regclass AND c.conname = CD AND c.contype = 'c';
  IF def IS DISTINCT FROM 'CHECK ((((question_suicide_id IS NULL) = (question_suicide_option_non IS NULL)) AND ((question_suicide_id IS NULL) = (question_suicide_copie IS NULL)) AND ((question_suicide_id IS NULL) OR (pose_question_suicide IS TRUE)) AND ((question_suicide_copie IS NULL) OR (jsonb_typeof(question_suicide_copie) = ''object''::text))))' THEN
    RAISE EXCEPTION 'D-515: définition inattendue de % (reçu : %).', CD, def;
  END IF;

  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('d515_pat', 'PAT_D515_CONTRAT', 'michel.dogne+d515@example.test', 'Michel', 'Dogné', 'contrat@test.invalid', now());

  -- ── 3. Ce qui reste admis ────────────────────────────────────────────────
  PERFORM pg_temp.doit_accepter('catalogue, tout NULL',
    A || '(''d515_a1'', ''ASS_D515_1'', ' || P || '''Q_NEU_01'', ' || C || 'NULL, NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('cabinet non déclaré, désignation NULL (existant)',
    A || '(''d515_a2'', ''ASS_D515_2'', ' || P || '''CAB_D515_1'', ' || C || 'NULL, NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('cabinet « non », désignation NULL',
    A || '(''d515_a3'', ''ASS_D515_3'', ' || P || '''CAB_D515_2'', ' || C || 'false, NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('cabinet « oui », désignation NULL (inconnue, D-515 §7)',
    A || '(''d515_a4'', ''ASS_D515_4'', ' || P || '''CAB_D515_3'', ' || C || 'true, NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('cabinet « oui », désignation entière',
    A || '(''d515_a5'', ''ASS_D515_5'', ' || P || '''CAB_D515_4'', ' || C || 'true, ''q1'', 0, ' || COPIE || ')');
  PERFORM pg_temp.doit_accepter('cabinet « oui », copie objet vide',
    A || '(''d515_a6'', ''ASS_D515_6'', ' || P || '''CAB_D515_5'', ' || C || 'true, ''q1'', 0, ''{}''::jsonb)');

  -- ── 2. Désignation partielle ─────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('question seule',
    A || '(''d515_r1'', ''ASS_D515_R1'', ' || P || '''CAB_D515_R'', ' || C || 'true, ''q1'', NULL, NULL)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('option « non » seule',
    A || '(''d515_r2'', ''ASS_D515_R2'', ' || P || '''CAB_D515_R'', ' || C || 'true, NULL, 0, NULL)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('copie seule',
    A || '(''d515_r3'', ''ASS_D515_R3'', ' || P || '''CAB_D515_R'', ' || C || 'true, NULL, NULL, ' || COPIE || ')', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('question et option sans copie',
    A || '(''d515_r4'', ''ASS_D515_R4'', ' || P || '''CAB_D515_R'', ' || C || 'true, ''q1'', 0, NULL)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('question et copie sans option',
    A || '(''d515_r5'', ''ASS_D515_R5'', ' || P || '''CAB_D515_R'', ' || C || 'true, ''q1'', NULL, ' || COPIE || ')', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('option et copie sans question',
    A || '(''d515_r6'', ''ASS_D515_R6'', ' || P || '''CAB_D515_R'', ' || C || 'true, NULL, 0, ' || COPIE || ')', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('mise à jour qui retire la seule copie',
    'UPDATE assignations SET question_suicide_copie = NULL WHERE id = ''d515_a5''', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('mise à jour qui retire la seule question',
    'UPDATE assignations SET question_suicide_id = NULL WHERE id = ''d515_a5''', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('mise à jour qui pose la seule question sous « oui »',
    'UPDATE assignations SET question_suicide_id = ''q1'' WHERE id = ''d515_a4''', ARRAY['23514'], CD);

  -- ── 3. Seulement sous « oui » ────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('désignation sous « non »',
    A || '(''d515_s1'', ''ASS_D515_S1'', ' || P || '''CAB_D515_S'', ' || C || 'false, ''q1'', 0, ' || COPIE || ')', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('désignation sans déclaration (NULL)',
    A || '(''d515_s2'', ''ASS_D515_S2'', ' || P || '''CAB_D515_S'', ' || C || 'NULL, ''q1'', 0, ' || COPIE || ')', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('désignation sur le catalogue, déclaration NULL',
    A || '(''d515_s3'', ''ASS_D515_S3'', ' || P || '''Q_NEU_02'', ' || C || 'NULL, ''q1'', 0, ' || COPIE || ')', ARRAY['23514'], CD);
  -- Sur le catalogue, « oui » est déjà refusé par la contrainte NF-7 ; le
  -- motif n'est pas exigé (l'ordre d'évaluation des CHECK n'est pas un contrat).
  PERFORM pg_temp.doit_refuser('désignation sur le catalogue sous « oui »',
    A || '(''d515_s4'', ''ASS_D515_S4'', ' || P || '''Q_NEU_03'', ' || C || 'true, ''q1'', 0, ' || COPIE || ')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('mise à jour qui passe à « non » sous une désignation',
    'UPDATE assignations SET pose_question_suicide = false WHERE id = ''d515_a5''', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('mise à jour qui remet la déclaration à NULL sous une désignation',
    'UPDATE assignations SET pose_question_suicide = NULL WHERE id = ''d515_a5''', ARRAY['23514'], CD);

  -- ── 4. La copie est un objet ─────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('copie tableau',
    A || '(''d515_j1'', ''ASS_D515_J1'', ' || P || '''CAB_D515_J'', ' || C || 'true, ''q1'', 0, ''[]''::jsonb)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('copie chaîne',
    A || '(''d515_j2'', ''ASS_D515_J2'', ' || P || '''CAB_D515_J'', ' || C || 'true, ''q1'', 0, ''"Contrat"''::jsonb)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('copie nombre',
    A || '(''d515_j3'', ''ASS_D515_J3'', ' || P || '''CAB_D515_J'', ' || C || 'true, ''q1'', 0, ''0''::jsonb)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('copie booléen',
    A || '(''d515_j4'', ''ASS_D515_J4'', ' || P || '''CAB_D515_J'', ' || C || 'true, ''q1'', 0, ''true''::jsonb)', ARRAY['23514'], CD);
  PERFORM pg_temp.doit_refuser('copie null JSON',
    A || '(''d515_j5'', ''ASS_D515_J5'', ' || P || '''CAB_D515_J'', ' || C || 'true, ''q1'', 0, ''null''::jsonb)', ARRAY['23514'], CD);

  -- Retirer la désignation ENTIÈRE reste admis (les trois ensemble).
  PERFORM pg_temp.doit_accepter('mise à jour qui retire les trois ensemble',
    'UPDATE assignations SET question_suicide_id = NULL, question_suicide_option_non = NULL, question_suicide_copie = NULL WHERE id = ''d515_a5''');

  RAISE NOTICE 'D-515: trois colonnes nullables sans défaut ; une contrainte, définition exacte ; désignation seulement entière, seulement sous « oui », absente admise sous « oui » (inconnue) ; copie seulement objet.';
END;
$$;

ROLLBACK;
