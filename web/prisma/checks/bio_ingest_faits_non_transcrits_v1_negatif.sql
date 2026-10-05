-- Contrat du signal « fait non transcrit » ([[D-267]] §10, BIO-INGEST LOT-07,
-- migration `20261005210000_bio_ingest_faits_non_transcrits_v1`). Les faits
-- eux-mêmes sont tenus par `bio_ingest_faits_laboratoire_v1_negatif.sql`.
--
-- Le signal promet QUATRE choses, et ce fichier les éprouve TOUTES :
--   1. faux par défaut : une ligne qui ne le pose pas lit « rien d'omis » ;
--   2. vrai seulement à côté d'un fait NULL : vrai avec un texte présent est
--      refusé, pour l'intervalle comme pour le marquage ;
--   3. figé avec ce qui a été lu : une décision qui le pose ou le retire est
--      refusée pour chacun des deux, dans les deux sens, et la décision
--      elle-même le laisse intact (cas « écartée » ; « validée » exige un
--      résultat, et la fonction ne distingue pas les deux statuts) ;
--   4. structure : deux BOOLEAN NOT NULL DEFAULT false, deux CHECK présents.
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
        RAISE EXCEPTION 'NON TRANSCRIT: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'NON TRANSCRIT: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

-- Une ligne de l'extraction `imp_n`, faits et signaux fournis tels quels.
CREATE FUNCTION pg_temp.ligne(id_ligne text, rang integer, intervalle text, marquage text,
                              intervalle_omis boolean, marquage_omis boolean)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO lignes_biologiques_candidates
    (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, intervalle_lu, marquage_lu,
     intervalle_non_transcrit, marquage_non_transcrit, statut_mapping)
  VALUES (id_ligne, 'PAT_CONTRAT_NT1', 'imp_n', rang, 1, 'Libellé', '1', intervalle, marquage,
          intervalle_omis, marquage_omis, 'inconnu');
$f$;

DO $$
DECLARE
  nb integer;
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_nt1', 'PAT_CONTRAT_NT1', 'jennifer.martin+nontranscrit@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
  VALUES ('cr_n', 'PAT_CONTRAT_NT1', convert_to('non transcrit', 'UTF8'), 'application/pdf',
          encode(sha256(convert_to('non transcrit', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_n', 'PAT_CONTRAT_NT1', 'cr_n', 'modele-contrat', 'bio-extraction-v2', 'praticien@wellneuro.fr');

  -- ── 1. Faux par défaut ───────────────────────────────────────────────────
  INSERT INTO lignes_biologiques_candidates
    (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
  VALUES ('lig_n0', 'PAT_CONTRAT_NT1', 'imp_n', 1, 1, 'Libellé', '1', 'inconnu');
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE id = 'lig_n0' AND NOT intervalle_non_transcrit AND NOT marquage_non_transcrit;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'NON TRANSCRIT: une ligne qui ne pose pas le signal ne lit pas « rien d''omis ».';
  END IF;

  -- ── 2. Vrai seulement à côté d'un fait NULL ──────────────────────────────
  BEGIN
    PERFORM pg_temp.ligne('lig_n1', 2, NULL, NULL, true, false);
    PERFORM pg_temp.ligne('lig_n2', 3, NULL, NULL, false, true);
    PERFORM pg_temp.ligne('lig_n3', 4, NULL, 'H', true, false);
    PERFORM pg_temp.ligne('lig_n4', 5, '3,5 – 5,0', NULL, false, true);
    PERFORM pg_temp.ligne('lig_n5', 6, NULL, NULL, true, true);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'NON TRANSCRIT: une ligne cohérente a été refusée (%)', SQLERRM;
  END;
  PERFORM pg_temp.refus('intervalle présent et dit non transcrit',
    $q$SELECT pg_temp.ligne('lig_t1', 11, '3,5 – 5,0', NULL, true, false)$q$,
    '23514', 'lignes_biologiques_candidates_intervalle_non_transcrit_check');
  PERFORM pg_temp.refus('marquage présent et dit non transcrit',
    $q$SELECT pg_temp.ligne('lig_t2', 12, NULL, '↑', false, true)$q$,
    '23514', 'lignes_biologiques_candidates_marquage_non_transcrit_check');

  -- ── 3. Figé avec ce qui a été lu ─────────────────────────────────────────
  UPDATE imports_biologiques SET statut = 'extrait' WHERE id = 'imp_n';
  PERFORM pg_temp.refus('décision qui retire le signal de l''intervalle',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           intervalle_non_transcrit = false
       WHERE id = 'lig_n1'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui pose le signal du marquage',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           marquage_non_transcrit = true
       WHERE id = 'lig_n0'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  -- Et dans l'autre sens, pour chacun : pose de l'intervalle, retrait du marquage.
  PERFORM pg_temp.refus('décision qui pose le signal de l''intervalle',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           intervalle_non_transcrit = true
       WHERE id = 'lig_n0'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui retire le signal du marquage',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           marquage_non_transcrit = false
       WHERE id = 'lig_n2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  -- La décision elle-même passe, signal intact.
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id = 'lig_n1';
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE id = 'lig_n1' AND statut = 'ecartee' AND intervalle_non_transcrit;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'NON TRANSCRIT: la décision n''a pas laissé le signal intact.';
  END IF;

  -- ── 4. Structure ─────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'lignes_biologiques_candidates'
    AND c.column_name IN ('intervalle_non_transcrit', 'marquage_non_transcrit')
    AND c.is_nullable = 'NO' AND c.data_type = 'boolean' AND c.column_default = 'false';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'NON TRANSCRIT: % colonne(s) BOOLEAN NOT NULL DEFAULT false sur 2.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('lignes_biologiques_candidates_intervalle_non_transcrit_check',
                        'lignes_biologiques_candidates_marquage_non_transcrit_check');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'NON TRANSCRIT: % CHECK de cohérence présent(s) sur 2.', nb;
  END IF;

  DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_NT1';
  DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_NT1';
  DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_NT1';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_NT1';

  RAISE NOTICE 'NON TRANSCRIT: faux par défaut ; vrai seulement à côté d''un fait NULL (2 refus, les deux vrais admis) ; figé à la décision (pose et retrait refusés pour chacun, décision passée signal intact) ; 2 BOOLEAN NOT NULL DEFAULT false, 2 CHECK présents.';
END $$;

ROLLBACK;
