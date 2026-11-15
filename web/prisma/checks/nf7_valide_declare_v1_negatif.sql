-- Contrat de la migration `nf7_valide_declare_v1` (NF-7, troisième migration
-- de H59 ; [[D-303]], [[D-493]], [[D-515]] §6 étape 4 ; réponses
-- 20261111-0028-a et 0029-a).
--
-- Trois promesses :
--   1. `cabinet_instruments_valide_declare` existe, avec exactement sa
--      définition, et c'est la seule contrainte CHECK qui nomme
--      `statut_relecture` ;
--   2. un instrument `valide` porte une déclaration : « oui » (avec ou sans
--      désignation) comme « non » sont admis ; hors `valide`, NULL reste
--      admis (non déclaré) ;
--   3. un instrument `valide` sans déclaration est refusé, qu'il soit écrit
--      d'emblée, publié sans déclaration, ou que sa déclaration soit
--      effacée sans retour au brouillon.
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
        RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : « % » a été accepté.', libelle;
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
    RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : « % » a été refusé (% : %).', libelle, SQLSTATE, SQLERRM;
END;
$$;

DO $$
DECLARE
  nb integer;
  def text;
  I CONSTANT text := 'INSERT INTO cabinet_instruments (id, id_instrument, praticien_email, titre, definition_json, scoring_json, statut_relecture, updated_at, pose_question_suicide, question_suicide_id, question_suicide_option_non) VALUES ';
  J CONSTANT text := '''{"sections": []}''::jsonb, ''{}''::jsonb';
  CV CONSTANT text := 'cabinet_instruments_valide_declare';
BEGIN
  -- ── 1. La contrainte ─────────────────────────────────────────────────────
  -- Par les colonnes référencées (`conkey`), pas par le texte.
  SELECT count(DISTINCT c.oid) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.cabinet_instruments'::regclass AND c.contype = 'c'
    AND a.attname = 'statut_relecture';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : % contrainte(s) CHECK nomment statut_relecture ; une seule attendue.', nb;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c
  WHERE c.conrelid = 'public.cabinet_instruments'::regclass AND c.conname = CV AND c.contype = 'c';
  IF def IS DISTINCT FROM 'CHECK (((statut_relecture <> ''valide''::text) OR (pose_question_suicide IS NOT NULL)))' THEN
    RAISE EXCEPTION 'NF-7 valide ⇒ déclaré : définition inattendue de % (reçu : %).', CV, def;
  END IF;

  -- ── 2. Admis ─────────────────────────────────────────────────────────────
  PERFORM pg_temp.doit_accepter('brouillon non déclaré',
    I || '(''nfv_i1'', ''CAB_NFV_1'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''brouillon'', now(), NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('en relecture non déclaré',
    I || '(''nfv_i2'', ''CAB_NFV_2'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''grille_a_relire'', now(), NULL, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('valide déclaré « non »',
    I || '(''nfv_i3'', ''CAB_NFV_3'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''valide'', now(), false, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('valide déclaré « oui » sans désignation',
    I || '(''nfv_i4'', ''CAB_NFV_4'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''valide'', now(), true, NULL, NULL)');
  PERFORM pg_temp.doit_accepter('valide déclaré « oui » avec désignation',
    I || '(''nfv_i5'', ''CAB_NFV_5'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''valide'', now(), true, ''q1'', 0)');
  PERFORM pg_temp.doit_accepter('publication avec déclaration',
    'UPDATE cabinet_instruments SET statut_relecture = ''valide'', pose_question_suicide = false WHERE id = ''nfv_i2''');
  PERFORM pg_temp.doit_accepter('modification : retour au brouillon, déclaration effacée',
    'UPDATE cabinet_instruments SET statut_relecture = ''brouillon'', pose_question_suicide = NULL, question_suicide_id = NULL, question_suicide_option_non = NULL WHERE id = ''nfv_i5''');

  -- ── 3. Refusé ────────────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('valide non déclaré',
    I || '(''nfv_r1'', ''CAB_NFV_R1'', ''contrat@test.invalid'', ''Contrat'', ' || J || ', ''valide'', now(), NULL, NULL, NULL)', ARRAY['23514'], CV);
  PERFORM pg_temp.doit_refuser('publication sans déclaration',
    'UPDATE cabinet_instruments SET statut_relecture = ''valide'' WHERE id = ''nfv_i1''', ARRAY['23514'], CV);
  PERFORM pg_temp.doit_refuser('déclaration effacée sous valide',
    'UPDATE cabinet_instruments SET pose_question_suicide = NULL WHERE id = ''nfv_i3''', ARRAY['23514'], CV);

  RAISE NOTICE 'NF-7 valide ⇒ déclaré : une contrainte, définition exacte ; valide admis sous « oui » ou « non », NULL admis hors valide ; valide non déclaré refusé à l''écriture, à la publication et à l''effacement.';
END;
$$;

ROLLBACK;
