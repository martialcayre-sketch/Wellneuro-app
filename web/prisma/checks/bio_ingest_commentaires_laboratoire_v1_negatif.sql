-- Contrat des commentaires du laboratoire ([[D-278]] §3, lot de sécurité 11A,
-- migration `20261010220000_bio_ingest_commentaires_laboratoire_v1`).
--
-- Les commentaires promettent CINQ choses, et ce fichier les éprouve TOUTES :
--   1. absents par défaut : une ligne ou un import qui ne les pose pas lit
--      NULL et « rien d'omis » ;
--   2. jamais vides ni hors borne : vide, blanc, au-delà de 1 000 caractères
--      (ligne) ou de 4 000 (import) sont refusés ; aux bornes, admis ;
--   3. « non transcrit » seulement à côté d'un commentaire NULL, sur la ligne
--      comme sur l'import ;
--   4. sur la ligne, figés avec ce qui a été lu : une décision qui les pose,
--      les retire ou les réécrit est refusée ; la décision elle-même les laisse
--      intacts ;
--   5. sur l'import, lus et jamais pré-posés : une insertion qui les porte est
--      refusée ; la terminaison les pose ; un import terminé ne les change
--      plus ; une extraction en échec n'en porte aucun.
-- Plus la structure (types, nullabilité, défauts, cinq CHECK).
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
        RAISE EXCEPTION 'COMMENTAIRES: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'COMMENTAIRES: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

-- Une ligne de l'extraction `imp_c`, commentaire et signal fournis tels quels.
CREATE FUNCTION pg_temp.ligne(id_ligne text, rang integer, commentaire text, omis boolean)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO lignes_biologiques_candidates
    (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, commentaire_lu,
     commentaire_non_transcrit, statut_mapping)
  VALUES (id_ligne, 'PAT_CONTRAT_CL1', 'imp_c', rang, 1, 'Libellé', '1', commentaire, omis, 'inconnu');
$f$;

-- Un import neuf du compte rendu `cr_c`, commentaires fournis tels quels.
CREATE FUNCTION pg_temp.import(id_import text, commentaires text, omis boolean)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO imports_biologiques
    (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, commentaires_lus,
     commentaires_non_transcrits)
  VALUES (id_import, 'PAT_CONTRAT_CL1', 'cr_c', 'modele-contrat', 'bio-extraction-v4',
          'praticien@wellneuro.fr', commentaires, omis);
$f$;

DO $$
DECLARE
  nb integer;
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_cl1', 'PAT_CONTRAT_CL1', 'michel.dogne+commentaires@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
  VALUES ('cr_c', 'PAT_CONTRAT_CL1', convert_to('commentaires', 'UTF8'), 'application/pdf',
          encode(sha256(convert_to('commentaires', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');

  -- ── 5a. L'import : jamais pré-posé ───────────────────────────────────────
  PERFORM pg_temp.refus('import inséré avec des commentaires',
    $q$SELECT pg_temp.import('imp_x1', 'Prélèvement hémolysé.', false)$q$,
    'P0001', 'les commentaires sont lus par l''extraction');
  PERFORM pg_temp.refus('import inséré avec le signal non transcrit',
    $q$SELECT pg_temp.import('imp_x2', NULL, true)$q$,
    'P0001', 'les commentaires sont lus par l''extraction');

  -- ── 1. Absents par défaut (import) ───────────────────────────────────────
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_c', 'PAT_CONTRAT_CL1', 'cr_c', 'modele-contrat', 'bio-extraction-v4', 'praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM imports_biologiques
  WHERE id = 'imp_c' AND commentaires_lus IS NULL AND NOT commentaires_non_transcrits;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'COMMENTAIRES: un import qui ne les pose pas ne lit pas NULL et « rien d''omis ».';
  END IF;

  -- ── 1. Absents par défaut (ligne) ────────────────────────────────────────
  INSERT INTO lignes_biologiques_candidates
    (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
  VALUES ('lig_c0', 'PAT_CONTRAT_CL1', 'imp_c', 1, 1, 'Libellé', '1', 'inconnu');
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE id = 'lig_c0' AND commentaire_lu IS NULL AND NOT commentaire_non_transcrit;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'COMMENTAIRES: une ligne qui ne le pose pas ne lit pas NULL et « rien d''omis ».';
  END IF;

  -- ── 2 et 3. Ligne : borne, vide, cohérence du signal ─────────────────────
  BEGIN
    PERFORM pg_temp.ligne('lig_c1', 2, 'Valeur vérifiée sur un second prélèvement.', false);
    PERFORM pg_temp.ligne('lig_c2', 3, repeat('x', 1000), false);
    PERFORM pg_temp.ligne('lig_c3', 4, NULL, true);
    PERFORM pg_temp.ligne('lig_c4', 5, E'Contrôle souhaité.\nRésultat téléphoné.', false);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'COMMENTAIRES: une ligne cohérente a été refusée (%)', SQLERRM;
  END;
  PERFORM pg_temp.refus('commentaire de ligne vide',
    $q$SELECT pg_temp.ligne('lig_t1', 11, '', false)$q$,
    '23514', 'lignes_biologiques_candidates_commentaire_lu_check');
  PERFORM pg_temp.refus('commentaire de ligne blanc (tabulations, saut de ligne)',
    $q$SELECT pg_temp.ligne('lig_t2', 12, E'\t\n ', false)$q$,
    '23514', 'lignes_biologiques_candidates_commentaire_lu_check');
  PERFORM pg_temp.refus('commentaire de ligne au-delà de 1 000 caractères',
    $q$SELECT pg_temp.ligne('lig_t3', 13, repeat('x', 1001), false)$q$,
    '23514', 'lignes_biologiques_candidates_commentaire_lu_check');
  PERFORM pg_temp.refus('commentaire de ligne présent et dit non transcrit',
    $q$SELECT pg_temp.ligne('lig_t4', 14, 'Hémolyse.', true)$q$,
    '23514', 'lignes_biologiques_candidates_commentaire_non_transcrit_check');

  -- ── 5b. L'import : la terminaison les pose, et ses CHECK mordent ─────────
  PERFORM pg_temp.refus('commentaires d''import vides à la terminaison',
    $q$UPDATE imports_biologiques SET statut = 'extrait', commentaires_lus = '' WHERE id = 'imp_c'$q$,
    '23514', 'imports_biologiques_commentaires_lus_check');
  PERFORM pg_temp.refus('commentaires d''import blancs à la terminaison',
    $q$UPDATE imports_biologiques SET statut = 'extrait', commentaires_lus = ' ' WHERE id = 'imp_c'$q$,
    '23514', 'imports_biologiques_commentaires_lus_check');
  -- L'échec se joue sur un import SANS ligne : une extraction en échec qui en
  -- laisserait serait refusée par le trigger, pour un autre motif.
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_e', 'PAT_CONTRAT_CL1', 'cr_c', 'modele-contrat', 'bio-extraction-v4', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refus('extraction en échec qui porte des commentaires',
    $q$UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'reponse_invalide',
         commentaires_lus = 'Prélèvement hémolysé.' WHERE id = 'imp_e'$q$,
    '23514', 'imports_biologiques_commentaires_echec_check');
  PERFORM pg_temp.refus('extraction en échec qui porte le signal non transcrit',
    $q$UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'reponse_invalide',
         commentaires_non_transcrits = true WHERE id = 'imp_e'$q$,
    '23514', 'imports_biologiques_commentaires_echec_check');
  -- Et l'échec sans commentaire passe : la contrainte ne refuse pas l'échec lui-même.
  UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'reponse_invalide' WHERE id = 'imp_e';
  -- Le signal seul, commentaire NULL, est admis à la terminaison (cohérent) —
  -- sur un second import, terminé et laissé tel quel.
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_s', 'PAT_CONTRAT_CL1', 'cr_c', 'modele-contrat', 'bio-extraction-v4', 'praticien@wellneuro.fr');
  BEGIN
    UPDATE imports_biologiques SET statut = 'extrait', commentaires_non_transcrits = true WHERE id = 'imp_s';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'COMMENTAIRES: un import au signal « non transcrit » seul a été refusé (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM imports_biologiques
  WHERE id = 'imp_s' AND statut = 'extrait' AND commentaires_lus IS NULL AND commentaires_non_transcrits;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'COMMENTAIRES: le signal « non transcrit » seul n''a pas été conservé à la terminaison.';
  END IF;
  PERFORM pg_temp.refus('import terminé dont on retire le signal non transcrit',
    $q$UPDATE imports_biologiques SET commentaires_non_transcrits = false WHERE id = 'imp_s'$q$,
    'P0001', 'import figé');
  PERFORM pg_temp.refus('commentaires d''import au-delà de 4 000 caractères',
    $q$UPDATE imports_biologiques SET statut = 'extrait', commentaires_lus = repeat('x', 4001) WHERE id = 'imp_c'$q$,
    '23514', 'imports_biologiques_commentaires_lus_check');
  PERFORM pg_temp.refus('commentaires d''import présents et dits non transcrits',
    $q$UPDATE imports_biologiques SET statut = 'extrait', commentaires_lus = 'Jeûne non respecté.',
         commentaires_non_transcrits = true WHERE id = 'imp_c'$q$,
    '23514', 'imports_biologiques_commentaires_non_transcrits_check');
  UPDATE imports_biologiques
  SET statut = 'extrait', laboratoire_lu = 'Laboratoire de contrat', commentaires_lus = repeat('y', 4000)
  WHERE id = 'imp_c';
  SELECT count(*) INTO nb FROM imports_biologiques
  WHERE id = 'imp_c' AND statut = 'extrait' AND char_length(commentaires_lus) = 4000;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'COMMENTAIRES: la terminaison n''a pas posé les commentaires du compte rendu.';
  END IF;
  PERFORM pg_temp.refus('import terminé dont on réécrit les commentaires',
    $q$UPDATE imports_biologiques SET commentaires_lus = 'Autre.' WHERE id = 'imp_c'$q$,
    'P0001', 'import figé');

  -- ── 4. Ligne : figée avec ce qui a été lu ────────────────────────────────
  PERFORM pg_temp.refus('décision qui réécrit le commentaire',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           commentaire_lu = 'Autre.'
       WHERE id = 'lig_c1'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui retire le commentaire',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           commentaire_lu = NULL
       WHERE id = 'lig_c1'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui pose un commentaire',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           commentaire_lu = 'Ajouté.'
       WHERE id = 'lig_c0'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui retire le signal non transcrit',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           commentaire_non_transcrit = false
       WHERE id = 'lig_c3'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui pose le signal non transcrit',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           commentaire_non_transcrit = true
       WHERE id = 'lig_c0'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  -- La décision elle-même passe, commentaire intact.
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id = 'lig_c1';
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE id = 'lig_c1' AND statut = 'ecartee'
    AND commentaire_lu = 'Valeur vérifiée sur un second prélèvement.';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'COMMENTAIRES: la décision n''a pas laissé le commentaire intact.';
  END IF;

  -- ── Structure ────────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND ((c.table_name = 'lignes_biologiques_candidates' AND c.column_name = 'commentaire_lu')
      OR (c.table_name = 'imports_biologiques' AND c.column_name = 'commentaires_lus'))
    AND c.is_nullable = 'YES' AND c.data_type = 'text';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'COMMENTAIRES: % colonne(s) TEXT nullable sur 2.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND ((c.table_name = 'lignes_biologiques_candidates' AND c.column_name = 'commentaire_non_transcrit')
      OR (c.table_name = 'imports_biologiques' AND c.column_name = 'commentaires_non_transcrits'))
    AND c.is_nullable = 'NO' AND c.data_type = 'boolean' AND c.column_default = 'false';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'COMMENTAIRES: % colonne(s) BOOLEAN NOT NULL DEFAULT false sur 2.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('lignes_biologiques_candidates_commentaire_lu_check',
                        'lignes_biologiques_candidates_commentaire_non_transcrit_check',
                        'imports_biologiques_commentaires_lus_check',
                        'imports_biologiques_commentaires_non_transcrits_check',
                        'imports_biologiques_commentaires_echec_check');
  IF nb <> 5 THEN
    RAISE EXCEPTION 'COMMENTAIRES: % CHECK présent(s) sur 5.', nb;
  END IF;

  -- Rien sur `resultats_biologiques` ([[D-256]] A5).
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'resultats_biologiques'
    AND c.column_name LIKE 'commentaire%';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'COMMENTAIRES: resultats_biologiques porte % colonne(s) de commentaire (A5).', nb;
  END IF;

  DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_CL1';
  DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_CL1';
  DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_CL1';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_CL1';

  RAISE NOTICE 'COMMENTAIRES: absents par défaut (ligne, import) ; pré-pose à l''insertion refusée (2) ; vide, blanc, hors borne refusés et bornes admises (ligne 3 refus, import 3) ; signal seulement à côté de NULL (2 refus) ; terminaison qui pose, signal seul admis, import terminé figé (2 refus), échec sans commentaires (2 refus) ; ligne figée à la décision (5 refus, décision passée commentaire intact) ; structure et A5 tenus.';
END $$;

ROLLBACK;
