-- Contrat de la file durable des lectures ([[D-282]], migration
-- `20261013120000_g3_travaux_extraction_biologique_v1`).
--
-- Ce fichier éprouve TOUTES les promesses de la migration :
--   1. le cycle valide est ACCEPTÉ : en attente → en cours (réservé, une
--      tentative) → reprise sur un import neuf du même compte rendu → terminé ;
--      un second travail sur le même compte rendu une fois le premier fini ; un
--      échec motivé ; la purge (DELETE) d'un travail terminé ;
--   2. chaque CHECK mord (23514) sous son PROPRE nom ;
--   3. le trigger refuse (P0001) : import courant d'un autre compte rendu, à
--      l'insertion comme à la reprise ; travail terminé modifié ; identité
--      changée ; tentatives qui reculent ;
--   4. un seul travail ouvert par compte rendu (23505) ;
--   5. les clés : compte rendu d'un autre patient (23503) ; import et compte
--      rendu non supprimables sous un travail (RESTRICT) ;
--   6. la table porte EXACTEMENT onze colonnes, l'index d'unicité est bien
--      PARTIEL, et la RLS deny-all est active et sans policy.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat` — et, pour un CHECK, de la
-- contrainte nommée : deux CHECK de la même table rendent le même code.
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, contrainte text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  nom text;
BEGIN
  BEGIN
    EXECUTE sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS nom = CONSTRAINT_NAME;
    IF SQLSTATE <> etat THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé pour une autre raison (% : %), % attendu', cas, SQLSTATE, SQLERRM, etat;
    END IF;
    IF contrainte IS NOT NULL AND nom IS DISTINCT FROM contrainte THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par %, % attendue', cas, nom, contrainte;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT « % » : accepté alors qu''il devait être refusé', cas;
END;
$$;

DO $$
DECLARE
  COLS CONSTANT text := '(id, id_patient, id_compte_rendu, id_import_courant, demande_par, statut, tentatives, reserve_jusqua, motif_echec, termine_le)';
  colonnes text[];
  nb integer;
  defn text;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_g3a', 'PAT_CONTRAT_G3A', 'jennifer.martin+g3@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_g3b', 'PAT_CONTRAT_G3B', 'michel.dogne+g3@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par) VALUES
    ('cr_g3_a', 'PAT_CONTRAT_G3A', convert_to('%PDF-g3-a', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-g3-a', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
    ('cr_g3_b', 'PAT_CONTRAT_G3A', convert_to('%PDF-g3-b', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-g3-b', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
    ('cr_g3_c', 'PAT_CONTRAT_G3B', convert_to('%PDF-g3-c', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-g3-c', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');

  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par) VALUES
    ('imp_g3_a1', 'PAT_CONTRAT_G3A', 'cr_g3_a', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr'),
    ('imp_g3_a2', 'PAT_CONTRAT_G3A', 'cr_g3_a', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr'),
    ('imp_g3_b1', 'PAT_CONTRAT_G3A', 'cr_g3_b', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr'),
    ('imp_g3_c1', 'PAT_CONTRAT_G3B', 'cr_g3_c', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr');

  -- ── 1. LE CYCLE VALIDE ───────────────────────────────────────────────────
  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par)
  VALUES ('tr_a', 'PAT_CONTRAT_G3A', 'cr_g3_a', 'imp_g3_a1', 'praticien@wellneuro.fr');
  -- Réclamé : en cours, réservé, une tentative.
  UPDATE travaux_extraction_biologique
     SET statut = 'en_cours', tentatives = 1, reserve_jusqua = now() + interval '6 minutes'
   WHERE id = 'tr_a';
  -- Reprise : la réservation a expiré, un import neuf du MÊME compte rendu.
  UPDATE travaux_extraction_biologique
     SET id_import_courant = 'imp_g3_a2', tentatives = 2, reserve_jusqua = now() + interval '6 minutes'
   WHERE id = 'tr_a';
  UPDATE travaux_extraction_biologique
     SET statut = 'termine', reserve_jusqua = NULL, termine_le = now()
   WHERE id = 'tr_a';
  -- Le premier fini, un second travail sur le même compte rendu est admis.
  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par)
  VALUES ('tr_a2', 'PAT_CONTRAT_G3A', 'cr_g3_a', 'imp_g3_a2', 'praticien@wellneuro.fr');
  -- Un échec motivé, direct.
  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par, statut, tentatives, motif_echec, termine_le)
  VALUES ('tr_b', 'PAT_CONTRAT_G3A', 'cr_g3_b', 'imp_g3_b1', 'praticien@wellneuro.fr', 'echec', 2, 'tentatives_epuisees', now());

  -- ── 2. CHECK (23514), chacun sous son nom ────────────────────────────────
  PERFORM pg_temp.refuse('statut hors liste', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''annule'', 0, NULL, NULL, NULL)',
    'travaux_extraction_bio_statut_check');
  PERFORM pg_temp.refuse('trois tentatives', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_attente'', 3, NULL, NULL, NULL)',
    'travaux_extraction_bio_tentatives_check');
  PERFORM pg_temp.refuse('tentatives négatives', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_attente'', -1, NULL, NULL, NULL)',
    'travaux_extraction_bio_tentatives_check');
  PERFORM pg_temp.refuse('demandeur réduit à des tabulations', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', E''\t'', ''en_attente'', 0, NULL, NULL, NULL)',
    'travaux_extraction_bio_demande_par_check');
  PERFORM pg_temp.refuse('demandeur au-delà de 320', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', repeat(''a'', 321), ''en_attente'', 0, NULL, NULL, NULL)',
    'travaux_extraction_bio_demande_par_check');
  PERFORM pg_temp.refuse('motif d''échec réduit à des tabulations', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''echec'', 1, NULL, E''\t'', now())',
    'travaux_extraction_bio_motif_echec_check');
  PERFORM pg_temp.refuse('en attente mais réservé', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_attente'', 0, now(), NULL, NULL)',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('en attente avec un motif d''échec', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_attente'', 0, NULL, ''m'', NULL)',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('en cours sans réservation', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_cours'', 1, NULL, NULL, NULL)',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('en cours sans tentative', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''en_cours'', 0, now(), NULL, NULL)',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('terminé sans date de fin', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''termine'', 1, NULL, NULL, NULL)',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('terminé encore réservé', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''termine'', 1, now(), NULL, now())',
    'travaux_extraction_bio_coherence_check');
  PERFORM pg_temp.refuse('échec sans motif', '23514',
    'INSERT INTO travaux_extraction_biologique ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_c'', ''imp_g3_c1'', ''p@w.fr'', ''echec'', 1, NULL, NULL, now())',
    'travaux_extraction_bio_coherence_check');

  -- ── 3. TRIGGER (P0001) ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('import courant d''un autre compte rendu, à l''insertion', 'P0001',
    'INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par) VALUES (''x'', ''PAT_CONTRAT_G3A'', ''cr_g3_b'', ''imp_g3_a1'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('reprise sur l''import d''un autre compte rendu', 'P0001',
    'UPDATE travaux_extraction_biologique SET id_import_courant = ''imp_g3_b1'' WHERE id = ''tr_a2''');
  PERFORM pg_temp.refuse('travail terminé modifié', 'P0001',
    'UPDATE travaux_extraction_biologique SET motif_echec = ''autre'' WHERE id = ''tr_b''');
  PERFORM pg_temp.refuse('demandeur changé', 'P0001',
    'UPDATE travaux_extraction_biologique SET demande_par = ''autre@wellneuro.fr'' WHERE id = ''tr_a2''');
  PERFORM pg_temp.refuse('compte rendu changé', 'P0001',
    'UPDATE travaux_extraction_biologique SET id_compte_rendu = ''cr_g3_b'', id_import_courant = ''imp_g3_b1'' WHERE id = ''tr_a2''');
  UPDATE travaux_extraction_biologique
     SET statut = 'en_cours', tentatives = 1, reserve_jusqua = now() + interval '6 minutes'
   WHERE id = 'tr_a2';
  PERFORM pg_temp.refuse('tentatives qui reculent', 'P0001',
    'UPDATE travaux_extraction_biologique SET statut = ''en_attente'', tentatives = 0, reserve_jusqua = NULL WHERE id = ''tr_a2''');

  -- ── 4. UN SEUL TRAVAIL OUVERT PAR COMPTE RENDU (23505) ───────────────────
  PERFORM pg_temp.refuse('second travail ouvert sur le même compte rendu', '23505',
    'INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par) VALUES (''x'', ''PAT_CONTRAT_G3A'', ''cr_g3_a'', ''imp_g3_a1'', ''p@w.fr'')');

  -- ── 5. CLÉS (23503) ──────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('compte rendu d''un autre patient', '23503',
    'INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, id_import_courant, demande_par) VALUES (''x'', ''PAT_CONTRAT_G3B'', ''cr_g3_b'', ''imp_g3_b1'', ''p@w.fr'')');

  SELECT count(*) INTO nb FROM information_schema.referential_constraints
   WHERE constraint_schema = 'public'
     AND constraint_name IN ('travaux_extraction_biologique_id_patient_fkey',
                             'travaux_extraction_biologique_id_compte_rendu_id_patient_fkey',
                             'travaux_extraction_biologique_id_import_courant_id_patient_fkey')
     AND delete_rule = 'RESTRICT';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT : les trois clés des travaux doivent être en ON DELETE RESTRICT, % le sont', nb;
  END IF;

  -- La purge d'un travail terminé (DELETE) est admise : seul l'UPDATE est figé.
  DELETE FROM travaux_extraction_biologique WHERE id = 'tr_b';
  IF EXISTS (SELECT 1 FROM travaux_extraction_biologique WHERE id = 'tr_b') THEN
    RAISE EXCEPTION 'CONTRAT : la purge d''un travail terminé devait passer';
  END IF;

  -- ── 6. COLONNES, INDEX PARTIEL, RLS ──────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'travaux_extraction_biologique';
  IF colonnes IS DISTINCT FROM ARRAY[
    'cree_le', 'demande_par', 'id', 'id_compte_rendu', 'id_import_courant',
    'id_patient', 'motif_echec', 'reserve_jusqua', 'statut', 'tentatives', 'termine_le'
  ] THEN
    RAISE EXCEPTION 'CONTRAT : colonnes inattendues sur travaux_extraction_biologique : %', colonnes;
  END IF;

  SELECT indexdef INTO defn FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'travaux_extraction_bio_ouvert_unique';
  IF defn IS NULL OR defn NOT LIKE 'CREATE UNIQUE INDEX%' OR defn NOT LIKE '%WHERE%' THEN
    RAISE EXCEPTION 'CONTRAT : travaux_extraction_bio_ouvert_unique doit être UNIQUE et PARTIEL (%)', defn;
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.travaux_extraction_biologique'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT : RLS inactive sur travaux_extraction_biologique';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'travaux_extraction_biologique';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT : % policy(s) sur travaux_extraction_biologique, deny-all attendu', nb;
  END IF;

  RAISE NOTICE 'CONTRAT g3_travaux_extraction_biologique_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
