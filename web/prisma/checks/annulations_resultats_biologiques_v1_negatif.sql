-- Contrat des annulations de résultats biologiques ([[D-291]], BIO-PARCOURS
-- BP-09).
--
-- La table promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. une annulation valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ; une date
--      antidatée est ignorée ;
--   3. le résultat d'un AUTRE dossier, ou un résultat inexistant, est refusé ;
--   4. seul le praticien DU DOSSIER pose un acte (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) — annulation comme
--      révocation ;
--   5. une annulation vise une TÊTE de fil : une ligne déjà corrigée est
--      refusée, sa correction passe ;
--   6. au plus UNE annulation active par FIL : une seconde est refusée, sur la
--      même ligne comme sur l'autre branche d'une fourche ;
--   7. une révocation valide s'écrit, et une nouvelle annulation est alors
--      admise — puis une troisième redevient refusée ;
--   8. une révocation vise une ANNULATION de CE résultat : ni une révocation,
--      ni l'annulation d'un autre résultat, ni une cible inexistante ; et une
--      annulation ne se révoque qu'UNE fois ;
--   9. les deux motifs sont pris dans leur liste FERMÉE — leurs trois codes
--      passent, un autre est refusé ;
--  10. chaque acte a sa forme : une annulation porte son motif et rien d'une
--      révocation, une révocation porte son motif et rien d'une annulation ;
--      un acte inconnu est refusé ;
--  11. UPDATE et TRUNCATE sont refusés — l'acte est figé ;
--  12. l'effacement NOMMÉ passe en base, en une instruction (annulations et
--      révocations ensemble), et le résultat ne s'efface pas avant ses actes
--      (RESTRICT) ;
--  13. les FK ont la règle annoncée (RESTRICT vers patient et résultat, NO
--      ACTION sur la clé interne), les CHECK, l'index unique partiel et les
--      index ordinaires sont présents, comme le verrou du fil et le
--      `search_path` épinglé des deux fonctions (présence relue : une session
--      seule n'éprouve pas la concurrence) ;
--  14. la table porte EXACTEMENT ses dix colonnes (liste blanche) : aucune
--      valeur, aucun analyte, aucune date recopiée, aucun texte libre — toute
--      colonne neuve s'arbitre ;
--  15. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des deux fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus du trigger est reconnu à son MESSAGE, pas
-- seulement à son code (P0001). Deux CHECK ne s'isolent pas, parce que le
-- trigger refuse avant eux : `praticien_non_vide` (un e-mail blanc n'est pas
-- celui du dossier) et la cible de `forme_revocation` (une révocation sans
-- cible ne vise aucune annulation). Ils restent la garde si le trigger
-- tombait, et le cas 13 prouve leur présence.
--
-- Identités de fixture seulement. Tout se déroule dans une transaction annulée
-- à la fin.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

-- Un refus attendu : la requête doit échouer avec CE code et un message qui
-- contient CE motif. Un succès, ou un refus d'une autre nature, fait échouer
-- le contrat en nommant le cas.
CREATE FUNCTION pg_temp.refuse(cas text, requete text, code text, motif text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  recu_code text;
  recu_message text;
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS recu_code = RETURNED_SQLSTATE, recu_message = MESSAGE_TEXT;
    IF recu_code <> code OR position(motif IN recu_message) = 0 THEN
      RAISE EXCEPTION 'CONTRAT — % : refus inattendu (% / %), attendu (% / « % »)',
        cas, recu_code, recu_message, code, motif;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT — % : la requête est passée, elle devait être refusée.', cas;
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr), un fil par date de prélèvement :
--   `res_a1` seul ; `res_a2` corrigé par `res_a2_corr` ; `res_a3` corrigé
--   DEUX fois en parallèle (`res_a3_f1`, `res_a3_f2` : la fourche que
--   [[D-124]] tolère) ; `res_a4`, `res_a5` seuls.
-- Dossier B, d'un AUTRE praticien : `res_b` seul.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_ann_a', 'PAT_CONTRAT_ANN_A', 'sophie.nicola+annulation@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_ann_b', 'PAT_CONTRAT_ANN_B', 'jennifer.martin+annulation@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_ann', 'BIO_CONTRAT_ANN', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id) VALUES
  ('res_a1', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_a2', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_a2_corr', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 2, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_a2'),
  ('res_a3', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_a3_f1', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 2, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_a3'),
  ('res_a3_f2', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 3, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_a3'),
  ('res_a4', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-04 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_a5', 'PAT_CONTRAT_ANN_A', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-05 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_b', 'PAT_CONTRAT_ANN_B', 'BIO_CONTRAT_ANN', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', NULL);

DO $$
DECLARE
  ligne record;
  nb integer;
  ecart interval;
  colonnes text[];
BEGIN
  -- ── 1 et 2. Une annulation valide, instant et ordre posés par la base ────
  INSERT INTO annulations_resultats_biologiques (id, ordre, id_patient, id_resultat, acte, motif_annulation, praticien_email, acte_le)
  VALUES ('ann_a1', 999999, 'PAT_CONTRAT_ANN_A', 'res_a1', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM annulations_resultats_biologiques WHERE id = 'ann_a1';
  IF ligne.id_resultat IS DISTINCT FROM 'res_a1' OR ligne.acte IS DISTINCT FROM 'annulation'
     OR ligne.motif_annulation IS DISTINCT FROM 'mauvais_dossier' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''annulation relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;

  -- ── 3. Le résultat du dossier ────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 résultat d''un autre dossier',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x3a', 'PAT_CONTRAT_ANN_A', 'res_b', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');
  PERFORM pg_temp.refuse('3 résultat inexistant',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x3b', 'PAT_CONTRAT_ANN_A', 'res_absent', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');

  -- ── 4. Le praticien du dossier ───────────────────────────────────────────
  -- `res_a4` est une tête sans annulation : seul le praticien peut faire
  -- refuser.
  PERFORM pg_temp.refuse('4 annulation par un autre praticien',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x4a', 'PAT_CONTRAT_ANN_A', 'res_a4', 'annulation', 'mauvais_dossier', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('4 révocation par un autre praticien',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x4b', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_a1', 'mauvais_resultat_annule', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  -- La casse ne compte pas, comme dans `filtrePatientsDuPraticien`.
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
  VALUES ('ann_a4', 'PAT_CONTRAT_ANN_A', 'res_a4', 'annulation', 'mauvaise_date_prelevement', 'Praticien@Wellneuro.FR');
  -- Le praticien de B annule le résultat de B : la règle suit le dossier, pas
  -- un e-mail fixe.
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
  VALUES ('ann_b', 'PAT_CONTRAT_ANN_B', 'res_b', 'annulation', 'mauvais_analyte', 'autre.praticien@wellneuro.fr');

  -- ── 5. Une tête de fil ───────────────────────────────────────────────────
  -- Le fil de `res_a2` ne porte aucune annulation : seule la règle de tête
  -- peut faire refuser.
  PERFORM pg_temp.refuse('5 ligne déjà corrigée',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x5', 'PAT_CONTRAT_ANN_A', 'res_a2', 'annulation', 'mauvais_analyte', 'praticien@wellneuro.fr')$q$,
    'P0001', 'seule la tête du fil s''annule');
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
  VALUES ('ann_a2', 'PAT_CONTRAT_ANN_A', 'res_a2_corr', 'annulation', 'mauvais_analyte', 'praticien@wellneuro.fr');

  -- ── 6. Une annulation active par fil ─────────────────────────────────────
  PERFORM pg_temp.refuse('6 seconde annulation de la même ligne',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x6a', 'PAT_CONTRAT_ANN_A', 'res_a1', 'annulation', 'mauvais_analyte', 'praticien@wellneuro.fr')$q$,
    'P0001', 'porte déjà une annulation active');
  -- La fourche : deux têtes, un seul fil. La seconde branche est une tête —
  -- seule la règle du FIL (et non de la ligne) la refuse.
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
  VALUES ('ann_a3', 'PAT_CONTRAT_ANN_A', 'res_a3_f1', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('6 annulation de l''autre branche d''une fourche',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x6b', 'PAT_CONTRAT_ANN_A', 'res_a3_f2', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr')$q$,
    'P0001', 'porte déjà une annulation active');

  -- ── 7. Révocation, puis nouvelle annulation ──────────────────────────────
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
  VALUES ('rev_a1', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_a1', 'mauvais_resultat_annule', 'praticien@wellneuro.fr');
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
  VALUES ('ann_a1_bis', 'PAT_CONTRAT_ANN_A', 'res_a1', 'annulation', 'mauvaise_date_prelevement', 'praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM annulations_resultats_biologiques
  WHERE id_resultat = 'res_a1' AND ordre > (SELECT ordre FROM annulations_resultats_biologiques WHERE id = 'rev_a1');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 7 : la nouvelle annulation ne suit pas la révocation dans l''ordre.';
  END IF;
  PERFORM pg_temp.refuse('7 troisième annulation, la deuxième active',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x7', 'PAT_CONTRAT_ANN_A', 'res_a1', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr')$q$,
    'P0001', 'porte déjà une annulation active');

  -- ── 8. La cible d'une révocation ─────────────────────────────────────────
  PERFORM pg_temp.refuse('8 révocation d''une révocation',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x8a', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'rev_a1', 'mauvais_resultat_annule', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une annulation de ce résultat');
  PERFORM pg_temp.refuse('8 révocation de l''annulation d''un autre résultat',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x8b', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_a4', 'mauvais_resultat_annule', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une annulation de ce résultat');
  PERFORM pg_temp.refuse('8 révocation d''une cible inexistante',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x8c', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_absente', 'mauvais_resultat_annule', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une annulation de ce résultat');
  PERFORM pg_temp.refuse('8 seconde révocation de la même annulation',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x8d', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_a1', 'resultat_verifie_exact', 'praticien@wellneuro.fr')$q$,
    '23505', 'annulations_resultats_biologiques_une_revocation_par_annulation');

  -- ── 9. Les listes fermées ────────────────────────────────────────────────
  -- Les trois motifs d'annulation sont passés (cas 1, 4 et 5). Le fil de
  -- `res_a5` ne porte aucune annulation : le trigger laisse passer, le CHECK
  -- refuse.
  PERFORM pg_temp.refuse('9 motif d''annulation hors liste',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ('x9a', 'PAT_CONTRAT_ANN_A', 'res_a5', 'annulation', 'valeur_fausse', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_motif_annulation_check');
  PERFORM pg_temp.refuse('9 motif de révocation hors liste',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
       VALUES ('x9b', 'PAT_CONTRAT_ANN_A', 'res_a4', 'revocation', 'ann_a4', 'resultat_preoccupant', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_motif_revocation_check');
  -- `mauvais_resultat_annule` est passé au cas 7 ; les deux autres passent ici.
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
  VALUES ('rev_a4', 'PAT_CONTRAT_ANN_A', 'res_a4', 'revocation', 'ann_a4', 'resultat_verifie_exact', 'praticien@wellneuro.fr');
  INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
  VALUES ('rev_a1_bis', 'PAT_CONTRAT_ANN_A', 'res_a1', 'revocation', 'ann_a1_bis', 'motif_annulation_errone', 'praticien@wellneuro.fr');

  -- ── 10. La forme de chaque acte ──────────────────────────────────────────
  -- Le fil de `res_a5` n'a pas d'annulation, `ann_b` pas de révocation : le
  -- trigger laisse passer, le CHECK de forme refuse.
  PERFORM pg_temp.refuse('10 annulation sans motif',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x10a', 'PAT_CONTRAT_ANN_A', 'res_a5', 'annulation', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_forme_annulation');
  PERFORM pg_temp.refuse('10 annulation qui porte un motif de révocation',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, motif_revocation, praticien_email)
       VALUES ('x10b', 'PAT_CONTRAT_ANN_A', 'res_a5', 'annulation', 'mauvais_dossier', 'resultat_verifie_exact', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_forme_annulation');
  PERFORM pg_temp.refuse('10 annulation qui porte une cible',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, id_annulation_revoquee, praticien_email)
       VALUES ('x10c', 'PAT_CONTRAT_ANN_A', 'res_a5', 'annulation', 'mauvais_dossier', 'ann_a1', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_forme_annulation');
  PERFORM pg_temp.refuse('10 révocation sans motif',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, praticien_email)
       VALUES ('x10d', 'PAT_CONTRAT_ANN_B', 'res_b', 'revocation', 'ann_b', 'autre.praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_forme_revocation');
  PERFORM pg_temp.refuse('10 révocation qui porte un motif d''annulation',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, motif_annulation, praticien_email)
       VALUES ('x10e', 'PAT_CONTRAT_ANN_B', 'res_b', 'revocation', 'ann_b', 'resultat_verifie_exact', 'mauvais_analyte', 'autre.praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_forme_revocation');
  PERFORM pg_temp.refuse('10 acte inconnu',
    $q$INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x10f', 'PAT_CONTRAT_ANN_A', 'res_a5', 'suppression', 'praticien@wellneuro.fr')$q$,
    '23514', 'annulations_resultats_biologiques_acte_check');

  -- ── 11. Figée ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 UPDATE',
    $q$UPDATE annulations_resultats_biologiques SET motif_annulation = 'mauvais_analyte' WHERE id = 'ann_a1'$q$,
    'P0001', 'un acte d''annulation est figé');
  PERFORM pg_temp.refuse('11 TRUNCATE',
    $q$TRUNCATE annulations_resultats_biologiques$q$,
    'P0001', 'un acte d''annulation est figé');

  -- ── 12. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('12 résultat effacé avant ses annulations',
    $q$DELETE FROM resultats_biologiques WHERE id = 'res_a1'$q$,
    '23503', 'annulations_resultats_biologiques_id_resultat_fkey');
  DELETE FROM annulations_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_ANN_A';
  SELECT count(*) INTO nb FROM annulations_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_ANN_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''effacement en une instruction a laissé % ligne(s).', nb;
  END IF;
  DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_ANN_A';

  -- ── 13. Clés, CHECK et index ─────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.annulations_resultats_biologiques'::regclass AND contype = 'f'
    AND ((conname IN ('annulations_resultats_biologiques_id_patient_fkey',
                      'annulations_resultats_biologiques_id_resultat_fkey') AND confdeltype = 'r')
      OR (conname = 'annulations_resultats_biologiques_id_annulation_revoquee_fkey' AND confdeltype = 'a'));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clé(s) étrangère(s) sur 3 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.annulations_resultats_biologiques'::regclass AND contype = 'c'
    AND conname IN ('annulations_resultats_biologiques_acte_check',
                    'annulations_resultats_biologiques_forme_annulation',
                    'annulations_resultats_biologiques_forme_revocation',
                    'annulations_resultats_biologiques_motif_annulation_check',
                    'annulations_resultats_biologiques_motif_revocation_check',
                    'annulations_resultats_biologiques_praticien_non_vide');
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % CHECK sur 6 sont présents.', nb;
  END IF;
  -- Les deux CHECK que le trigger devance (voir l'en-tête) : leur clause est
  -- relue, faute de pouvoir l'éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.annulations_resultats_biologiques'::regclass AND contype = 'c'
    AND ((conname = 'annulations_resultats_biologiques_praticien_non_vide'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'annulations_resultats_biologiques_forme_revocation'
          AND position('id_annulation_revoquee IS NOT NULL' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clause(s) de garde résiduelle sur 2 sont présentes.', nb;
  END IF;
  -- Le verrou qui sérialise les actes sur un fil, et le `search_path` épinglé
  -- des deux fonctions : une session seule n'éprouve pas la concurrence, elle
  -- relit au moins leur présence.
  IF position('FOR NO KEY UPDATE' IN pg_get_functiondef('public.annulations_resultats_biologiques_avant_insertion()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : le trigger d''insertion ne verrouille plus le fil.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.annulations_resultats_biologiques_avant_insertion()'::regprocedure,
                  'public.annulations_resultats_biologiques_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % fonction(s) sur 2 ont le search_path épinglé.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'annulations_resultats_biologiques'
    AND indexname = 'annulations_resultats_biologiques_une_revocation_par_annulation'
    AND indexdef LIKE 'CREATE UNIQUE INDEX%WHERE%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : l''index unique partiel est absent.';
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'annulations_resultats_biologiques'
    AND indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'annulations_resultats_biologiques_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'annulations_resultats_biologiques_resultat_ordre_idx' AND indexdef LIKE '%(id_resultat, ordre)')
      OR (indexname = 'annulations_resultats_biologiques_annulation_revoquee_idx' AND indexdef LIKE '%(id_annulation_revoquee)'));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % index ordinaire(s) sur 3 sont présents, sans prédicat.', nb;
  END IF;

  -- ── 14. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'annulations_resultats_biologiques';
  IF colonnes <> ARRAY['acte', 'acte_le', 'id', 'id_annulation_revoquee', 'id_patient', 'id_resultat',
                       'motif_annulation', 'motif_revocation', 'ordre', 'praticien_email'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 15. RLS et fonctions ─────────────────────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.annulations_resultats_biologiques'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'annulations_resultats_biologiques';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('annulations_resultats_biologiques_figee', 'annulations_resultats_biologiques_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat annulations_resultats_biologiques_v1 : quinze promesses tenues.';
END;
$$;

ROLLBACK;
