-- Contrat des faits du laboratoire ([[D-267]], BIO-INGEST LOT-07, migration
-- `20261005150000_bio_ingest_faits_laboratoire_v1`). Le reste du staging est
-- tenu par `bio_ingest_staging_v1_negatif.sql` et `bio_ingest_purge_v1_negatif.sql`.
--
-- Les faits du laboratoire promettent SIX choses, et ce fichier les éprouve TOUTES :
--   1. absents de l'impression ⇒ NULL : une ligne sans faits s'insère ;
--   2. présents, ils sont conservés VERBATIM (virgule décimale, tiret long,
--      flèche, intervalle par sexe) ;
--   3. jamais vides : chaîne vide, espaces, tabulation refusés — la
--      tabulation est le cas que `btrim` à un argument laissait passer ;
--   4. bornés : 300 caractères pour l'intervalle, 50 pour le marquage —
--      la borne admise, la borne + 1 refusée ;
--   5. figés avec ce qui a été lu : une décision qui réécrit l'un ou l'autre
--      est refusée ;
--   6. ils survivent à la purge du document ([[D-258]]) ; et `resultats_biologiques`
--      ne porte aucune colonne d'intervalle ni de marquage ([[D-256]] A5) ;
--      structure : colonnes TEXT nullables, deux CHECK présents.
--
-- CHAQUE REFUS EST ISOLÉ ET RECONNU : `pg_temp.refus` exige le SQLSTATE
-- attendu ET la contrainte (ou le message du trigger) visée.
--
-- Identités de fixture seulement ; documents SYNTHÉTIQUES. Tout se déroule
-- dans une transaction annulée à la fin.
BEGIN;

SET LOCAL TimeZone TO 'Europe/Paris';

CREATE FUNCTION pg_temp.refus(cas text, requete text, etat text, indice text)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  accepte boolean := false;
  e_etat text;
  e_message text;
  e_contrainte text;
BEGIN
  BEGIN
    EXECUTE requete;
    accepte := true;
  EXCEPTION
    WHEN others THEN
      GET STACKED DIAGNOSTICS e_etat = RETURNED_SQLSTATE,
                              e_message = MESSAGE_TEXT,
                              e_contrainte = CONSTRAINT_NAME;
      IF e_etat <> etat
         OR position(indice IN coalesce(e_contrainte, '') || ' ' || e_message) = 0 THEN
        RAISE EXCEPTION 'FAITS LABO: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'FAITS LABO: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

-- Une ligne de l'extraction `imp_f`, faits fournis tels quels.
CREATE FUNCTION pg_temp.ligne(id_ligne text, rang integer, intervalle text, marquage text)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO lignes_biologiques_candidates
    (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, intervalle_lu, marquage_lu, statut_mapping)
  VALUES (id_ligne, 'PAT_CONTRAT_FL1', 'imp_f', rang, 1, 'Libellé', '1', intervalle, marquage, 'inconnu');
$f$;

DO $$
DECLARE
  nb integer;
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_fl1', 'PAT_CONTRAT_FL1', 'sophie.nicola+faits@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
  VALUES ('cr_f', 'PAT_CONTRAT_FL1', convert_to('faits', 'UTF8'), 'application/pdf',
          encode(sha256(convert_to('faits', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_f', 'PAT_CONTRAT_FL1', 'cr_f', 'modele-contrat', 'bio-extraction-v2', 'praticien@wellneuro.fr');

  -- ── 1 et 2. Absents ⇒ NULL ; présents ⇒ verbatim ─────────────────────────
  BEGIN
    PERFORM pg_temp.ligne('lig_f1', 1, NULL, NULL);
    PERFORM pg_temp.ligne('lig_f2', 2, '3,5 – 5,0', '↑');
    PERFORM pg_temp.ligne('lig_f3', 3, 'Homme : 30 à 400 ; Femme : 15 à 150', NULL);
    PERFORM pg_temp.ligne('lig_f4', 4, NULL, '*');
    PERFORM pg_temp.ligne('lig_f5', 5, repeat('x', 300), repeat('y', 50));
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FAITS LABO: une ligne valide, avec ou sans faits, a été refusée (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE (id = 'lig_f1' AND intervalle_lu IS NULL AND marquage_lu IS NULL)
     OR (id = 'lig_f2' AND intervalle_lu = '3,5 – 5,0' AND marquage_lu = '↑')
     OR (id = 'lig_f3' AND intervalle_lu = 'Homme : 30 à 400 ; Femme : 15 à 150' AND marquage_lu IS NULL)
     OR (id = 'lig_f4' AND intervalle_lu IS NULL AND marquage_lu = '*')
     OR (id = 'lig_f5' AND char_length(intervalle_lu) = 300 AND char_length(marquage_lu) = 50);
  IF nb <> 5 THEN
    RAISE EXCEPTION 'FAITS LABO: % ligne(s) sur 5 conservent leurs faits tels quels.', nb;
  END IF;

  -- ── 3. Jamais vides ──────────────────────────────────────────────────────
  PERFORM pg_temp.refus('intervalle vide',
    $q$SELECT pg_temp.ligne('lig_t1', 11, '', NULL)$q$,
    '23514', 'lignes_biologiques_candidates_intervalle_lu_check');
  PERFORM pg_temp.refus('intervalle d''espaces',
    $q$SELECT pg_temp.ligne('lig_t2', 12, '   ', NULL)$q$,
    '23514', 'lignes_biologiques_candidates_intervalle_lu_check');
  PERFORM pg_temp.refus('intervalle de tabulations',
    $q$SELECT pg_temp.ligne('lig_t3', 13, E'\t\t', NULL)$q$,
    '23514', 'lignes_biologiques_candidates_intervalle_lu_check');
  PERFORM pg_temp.refus('marquage vide',
    $q$SELECT pg_temp.ligne('lig_t4', 14, NULL, '')$q$,
    '23514', 'lignes_biologiques_candidates_marquage_lu_check');
  PERFORM pg_temp.refus('marquage de tabulation',
    $q$SELECT pg_temp.ligne('lig_t5', 15, NULL, E'\t')$q$,
    '23514', 'lignes_biologiques_candidates_marquage_lu_check');

  -- ── 4. Bornés ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refus('intervalle de 301 caractères',
    $q$SELECT pg_temp.ligne('lig_t6', 16, repeat('x', 301), NULL)$q$,
    '23514', 'lignes_biologiques_candidates_intervalle_lu_check');
  PERFORM pg_temp.refus('marquage de 51 caractères',
    $q$SELECT pg_temp.ligne('lig_t7', 17, NULL, repeat('y', 51))$q$,
    '23514', 'lignes_biologiques_candidates_marquage_lu_check');

  -- ── 5. Figés avec ce qui a été lu ────────────────────────────────────────
  UPDATE imports_biologiques SET statut = 'extrait' WHERE id = 'imp_f';
  PERFORM pg_temp.refus('décision qui réécrit l''intervalle',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           intervalle_lu = '0 – 1'
       WHERE id = 'lig_f2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui efface le marquage',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           marquage_lu = NULL
       WHERE id = 'lig_f2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui pose un marquage absent',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           marquage_lu = 'H'
       WHERE id = 'lig_f1'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');

  -- ── 6. Survivent à la purge ──────────────────────────────────────────────
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id_import = 'imp_f';
  UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_f';
  SELECT count(*) INTO nb FROM comptes_rendus_biologiques WHERE id = 'cr_f' AND contenu IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FAITS LABO: le document de la fixture n''a pas été purgé — le cas 6 ne prouve rien.';
  END IF;
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE id = 'lig_f2' AND intervalle_lu = '3,5 – 5,0' AND marquage_lu = '↑';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FAITS LABO: les faits du laboratoire n''ont pas survécu à la purge du document.';
  END IF;

  -- ── 6 (suite). A5 et structure ───────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'resultats_biologiques'
    AND (c.column_name ILIKE '%intervalle%' OR c.column_name ILIKE '%marquage%'
         OR c.column_name ILIKE '%reference%' OR c.column_name ILIKE '%flag%');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'FAITS LABO: resultats_biologiques porte % colonne(s) de faits du laboratoire — A5 rompu.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'lignes_biologiques_candidates'
    AND c.column_name IN ('intervalle_lu', 'marquage_lu')
    AND c.is_nullable = 'YES' AND c.data_type = 'text' AND c.column_default IS NULL;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'FAITS LABO: % colonne(s) de faits TEXT nullables sans défaut sur 2.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('lignes_biologiques_candidates_intervalle_lu_check',
                        'lignes_biologiques_candidates_marquage_lu_check');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'FAITS LABO: % CHECK de faits présent(s) sur 2.', nb;
  END IF;

  DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_FL1';
  DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_FL1';
  DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_FL1';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_FL1';

  RAISE NOTICE 'FAITS LABO: absents ⇒ NULL ; verbatim conservés (5 formes) ; vides, espaces et tabulations refusés ; bornes 300/50 admises, +1 refusée ; figés à la décision (réécriture, effacement, ajout) ; survivent à la purge ; resultats_biologiques sans colonne de faits (A5) ; 2 colonnes TEXT nullables, 2 CHECK présents.';
END $$;

ROLLBACK;
