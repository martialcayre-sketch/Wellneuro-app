-- Contrat des statuts posés près d'une valeur biologique ([[D-322]], F58).
--
-- La table promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. une pose valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ; une date
--      antidatée est ignorée ; l'ordre croît d'un acte au suivant ;
--   3. le résultat d'un AUTRE dossier, ou un résultat inexistant, est refusé ;
--   4. seul le praticien DU DOSSIER pose ou retire (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) ;
--   5. l'acte vise une TÊTE de fil : une pose sur une ligne déjà corrigée est
--      refusée, sur sa correction elle passe ; un retrait sur une ligne
--      corrigée après la pose est refusé ;
--   6. une pose CHANGE le statut actif : reposer le statut actif est refusé,
--      en poser un autre passe ;
--   7. un retrait vise un statut ACTIF : sans statut, ou après un retrait, il
--      est refusé ; après un retrait, une pose — même du statut retiré —
--      passe ;
--   8. le statut est pris dans la liste FERMÉE de [[D-322]] §1 — ses six
--      codes passent, un autre est refusé ;
--   9. chaque acte a sa forme : une pose porte un statut, un retrait n'en
--      porte pas ; un acte inconnu est refusé ;
--  10. UPDATE et TRUNCATE sont refusés — l'acte est figé ;
--  11. l'effacement NOMMÉ passe en base, en une instruction (poses et
--      retraits ensemble), et le résultat ne s'efface pas avant ses actes
--      (RESTRICT) ;
--  12. les FK ont la règle annoncée (RESTRICT vers patient et résultat), les
--      CHECK et les index sont présents, les trois triggers aussi, les
--      verrous de clé de BP-09 précèdent le contrôle de tête (ceux que prend
--      la correction de la ligne), et les deux fonctions ont leur
--      `search_path` épinglé (présence relue : une session seule n'éprouve
--      pas la concurrence) ;
--  13. la table porte EXACTEMENT ses huit colonnes (liste blanche) : aucune
--      valeur, aucun analyte, aucune date recopiée, aucun texte libre — toute
--      colonne neuve s'arbitre ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des deux fonctions n'est exécutable par PUBLIC ;
--  15. le statut ACTIF se relit par le dernier `ordre` d'une ligne, et la
--      valeur corrigée apparaît sans statut ([[D-322]] §3).
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus du trigger est reconnu à son MESSAGE, pas
-- seulement à son code (P0001). Un CHECK ne s'isole pas, parce que le trigger
-- refuse avant lui : `praticien_non_vide` (un e-mail blanc n'est pas celui du
-- dossier). Il reste la garde si le trigger tombait, et le cas 12 relit sa
-- clause.
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
--   `res_s1` seul ; `res_s2` corrigé par `res_s2_corr` ; `res_s3`, `res_s4`,
--   `res_s5`, `res_s6` seuls (`res_s5` sera corrigé en cours de contrat).
-- Dossier B, d'un AUTRE praticien : `res_sb` seul.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_stat_a', 'PAT_CONTRAT_STAT_A', 'sophie.nicola+statut@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_stat_b', 'PAT_CONTRAT_STAT_B', 'jennifer.martin+statut@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_stat', 'BIO_CONTRAT_STAT', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id) VALUES
  ('res_s1', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_s2', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_s2_corr', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 2, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_s2'),
  ('res_s3', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_s4', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-04 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_s5', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-05 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_s6', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-06 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_sb', 'PAT_CONTRAT_STAT_B', 'BIO_CONTRAT_STAT', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', NULL);

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  statut_lu text;
  code_statut text;
BEGIN
  -- ── 1 et 2. Une pose valide, instant et ordre posés par la base ──────────
  INSERT INTO statuts_poses_resultats_biologiques (id, ordre, id_patient, id_resultat, acte, statut, praticien_email, acte_le)
  VALUES ('st_s1', 999999, 'PAT_CONTRAT_STAT_A', 'res_s1', 'pose', 'a_suivre', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM statuts_poses_resultats_biologiques WHERE id = 'st_s1';
  IF ligne.id_resultat IS DISTINCT FROM 'res_s1' OR ligne.acte IS DISTINCT FROM 'pose'
     OR ligne.statut IS DISTINCT FROM 'a_suivre' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la pose relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;

  -- ── 3. Le résultat du dossier ────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 résultat d''un autre dossier',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x3a', 'PAT_CONTRAT_STAT_A', 'res_sb', 'pose', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');
  PERFORM pg_temp.refuse('3 résultat inexistant',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x3b', 'PAT_CONTRAT_STAT_A', 'res_absent', 'pose', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');

  -- ── 4. Le praticien du dossier ───────────────────────────────────────────
  -- `res_s3` est une tête sans statut : seul le praticien peut faire refuser
  -- la pose. `res_s1` porte un statut actif : seul le praticien peut faire
  -- refuser le retrait.
  PERFORM pg_temp.refuse('4 pose par un autre praticien',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x4a', 'PAT_CONTRAT_STAT_A', 'res_s3', 'pose', 'a_suivre', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('4 retrait par un autre praticien',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x4b', 'PAT_CONTRAT_STAT_A', 'res_s1', 'retrait', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  -- La casse ne compte pas, comme dans `filtrePatientsDuPraticien`.
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
  VALUES ('st_s3', 'PAT_CONTRAT_STAT_A', 'res_s3', 'pose', 'contexte_a_preciser', 'Praticien@WellNeuro.fr');
  SELECT ordre INTO ligne FROM statuts_poses_resultats_biologiques WHERE id = 'st_s3';
  IF ligne.ordre <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''un acte au suivant.';
  END IF;

  -- ── 5. Une tête de fil ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('5 pose sur une ligne corrigée',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x5a', 'PAT_CONTRAT_STAT_A', 'res_s2', 'pose', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'seule la tête du fil porte un statut');
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
  VALUES ('st_s2_corr', 'PAT_CONTRAT_STAT_A', 'res_s2_corr', 'pose', 'donnee_a_verifier', 'praticien@wellneuro.fr');
  -- Une pose, puis une correction de la ligne : le retrait n'y passe plus, et
  -- la valeur corrigée apparaît sans statut (cas 15).
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
  VALUES ('st_s5', 'PAT_CONTRAT_STAT_A', 'res_s5', 'pose', 'a_suivre', 'praticien@wellneuro.fr');
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id)
  VALUES ('res_s5_corr', 'PAT_CONTRAT_STAT_A', 'BIO_CONTRAT_STAT', 2, 'mg/L', TIMESTAMP '2026-09-05 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_s5');
  PERFORM pg_temp.refuse('5 retrait sur une ligne corrigée après la pose',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x5b', 'PAT_CONTRAT_STAT_A', 'res_s5', 'retrait', 'praticien@wellneuro.fr')$q$,
    'P0001', 'seule la tête du fil porte un statut');

  -- ── 6. Une pose change le statut actif ───────────────────────────────────
  PERFORM pg_temp.refuse('6 pose du statut déjà actif',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x6', 'PAT_CONTRAT_STAT_A', 'res_s1', 'pose', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'est déjà le statut actif');
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
  VALUES ('st_s1_b', 'PAT_CONTRAT_STAT_A', 'res_s1', 'pose', 'relie_au_protocole', 'praticien@wellneuro.fr');

  -- ── 7. Un retrait vise un statut actif ───────────────────────────────────
  PERFORM pg_temp.refuse('7 retrait sans statut posé',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x7a', 'PAT_CONTRAT_STAT_A', 'res_s4', 'retrait', 'praticien@wellneuro.fr')$q$,
    'P0001', 'ne porte aucun statut posé');
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
  VALUES ('st_s3_r', 'PAT_CONTRAT_STAT_A', 'res_s3', 'retrait', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('7 second retrait',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x7b', 'PAT_CONTRAT_STAT_A', 'res_s3', 'retrait', 'praticien@wellneuro.fr')$q$,
    'P0001', 'ne porte aucun statut posé');
  INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
  VALUES ('st_s3_b', 'PAT_CONTRAT_STAT_A', 'res_s3', 'pose', 'contexte_a_preciser', 'praticien@wellneuro.fr');

  -- ── 8. La liste fermée ───────────────────────────────────────────────────
  -- Les six codes, posés l'un après l'autre sur `res_s6` : chaque pose change
  -- le statut actif, seule la liste peut faire refuser.
  FOREACH code_statut IN ARRAY ARRAY['aucune_action_retenue', 'a_suivre', 'contexte_a_preciser',
                                     'donnee_a_verifier', 'avis_medical_a_envisager', 'relie_au_protocole'] LOOP
    INSERT INTO statuts_poses_resultats_biologiques (id_patient, id, id_resultat, acte, statut, praticien_email)
    VALUES ('PAT_CONTRAT_STAT_A', 'st_s6_' || code_statut, 'res_s6', 'pose', code_statut, 'praticien@wellneuro.fr');
  END LOOP;
  PERFORM pg_temp.refuse('8 statut hors liste',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x8', 'PAT_CONTRAT_STAT_A', 'res_s4', 'pose', 'normal', 'praticien@wellneuro.fr')$q$,
    '23514', 'statuts_poses_resultats_biologiques_statut_check');

  -- ── 9. La forme de chaque acte ───────────────────────────────────────────
  PERFORM pg_temp.refuse('9 pose sans statut',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
       VALUES ('x9a', 'PAT_CONTRAT_STAT_A', 'res_s4', 'pose', 'praticien@wellneuro.fr')$q$,
    '23514', 'statuts_poses_resultats_biologiques_forme_pose');
  -- `res_s1` porte un statut actif : seule la forme peut faire refuser.
  PERFORM pg_temp.refuse('9 retrait qui porte un statut',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x9b', 'PAT_CONTRAT_STAT_A', 'res_s1', 'retrait', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    '23514', 'statuts_poses_resultats_biologiques_forme_retrait');
  PERFORM pg_temp.refuse('9 acte inconnu',
    $q$INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
       VALUES ('x9c', 'PAT_CONTRAT_STAT_A', 'res_s4', 'validation', 'a_suivre', 'praticien@wellneuro.fr')$q$,
    '23514', 'statuts_poses_resultats_biologiques_acte_check');

  -- ── 15. Le statut actif se relit par le dernier ordre ────────────────────
  SELECT s.statut INTO statut_lu FROM statuts_poses_resultats_biologiques s
  WHERE s.id_resultat = 'res_s1' ORDER BY s.ordre DESC LIMIT 1;
  IF statut_lu IS DISTINCT FROM 'relie_au_protocole' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : le statut actif de res_s1 est %, attendu relie_au_protocole.', statut_lu;
  END IF;
  SELECT count(*) INTO nb FROM statuts_poses_resultats_biologiques WHERE id_resultat = 'res_s5_corr';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la valeur corrigée porte % acte(s) ; elle doit apparaître sans statut.', nb;
  END IF;

  -- ── 10. Figée ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('10 UPDATE',
    $q$UPDATE statuts_poses_resultats_biologiques SET statut = 'a_suivre' WHERE id = 'st_s1_b'$q$,
    'P0001', 'un acte de statut est figé');
  PERFORM pg_temp.refuse('10 TRUNCATE',
    $q$TRUNCATE statuts_poses_resultats_biologiques$q$,
    'P0001', 'un acte de statut est figé');

  -- ── 11. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 résultat effacé avant ses statuts',
    $q$DELETE FROM resultats_biologiques WHERE id = 'res_s1'$q$,
    '23503', 'statuts_poses_resultats_biologiques_id_resultat_fkey');
  DELETE FROM statuts_poses_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_STAT_A';
  SELECT count(*) INTO nb FROM statuts_poses_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_STAT_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : l''effacement en une instruction a laissé % ligne(s).', nb;
  END IF;
  DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_STAT_A';

  -- ── 12. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.statuts_poses_resultats_biologiques'::regclass AND contype = 'f'
    AND conname IN ('statuts_poses_resultats_biologiques_id_patient_fkey',
                    'statuts_poses_resultats_biologiques_id_resultat_fkey')
    AND confdeltype = 'r';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clé(s) étrangère(s) sur 2 ont la règle RESTRICT.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.statuts_poses_resultats_biologiques'::regclass AND contype = 'c'
    AND conname IN ('statuts_poses_resultats_biologiques_acte_check',
                    'statuts_poses_resultats_biologiques_forme_pose',
                    'statuts_poses_resultats_biologiques_forme_retrait',
                    'statuts_poses_resultats_biologiques_statut_check',
                    'statuts_poses_resultats_biologiques_praticien_non_vide');
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK sur 5 sont présents.', nb;
  END IF;
  -- Le CHECK que le trigger devance (voir l'en-tête) : sa clause est relue,
  -- faute de pouvoir l'éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.statuts_poses_resultats_biologiques'::regclass AND contype = 'c'
    AND conname = 'statuts_poses_resultats_biologiques_praticien_non_vide'
    AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
    AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : la clause de garde résiduelle du praticien est absente.';
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'statuts_poses_resultats_biologiques'
    AND indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'statuts_poses_resultats_biologiques_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'statuts_poses_resultats_biologiques_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'statuts_poses_resultats_biologiques_resultat_ordre_idx' AND indexdef LIKE '%(id_resultat, ordre)'));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % index sur 3 sont présents, sans prédicat.', nb;
  END IF;
  -- Les trois triggers, actifs : BEFORE INSERT par ligne, BEFORE UPDATE par
  -- ligne, BEFORE TRUNCATE par instruction.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgrelid = 'public.statuts_poses_resultats_biologiques'::regclass
    AND t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND ((t.tgname = 'statuts_poses_resultats_biologiques_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname = 'statuts_poses_resultats_biologiques_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname = 'statuts_poses_resultats_biologiques_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % trigger(s) sur 3 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Les verrous de BP-09, sur la clé de la ligne visée, AVANT le contrôle de
  -- tête (en-tête de la migration) : une correction concurrente de la même
  -- ligne prend le même. Une session seule n'éprouve pas la concurrence,
  -- elle relit au moins l'appel et sa place ; l'ordre dossier puis clé, et
  -- le refus de REPEATABLE READ, sont relus par le contrat de BP-09 sur la
  -- fonction partagée.
  IF pg_get_functiondef('public.statuts_poses_resultats_biologiques_avant_insertion()'::regprocedure)
       !~ 'resultats_biologiques_verrouiller_cle\(NEW\.id_patient, cible_analyte, cible_preleve\)[^$]*supersedes_resultat_id = NEW\.id_resultat' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : les verrous de clé de BP-09 ne précèdent plus le contrôle de tête.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.statuts_poses_resultats_biologiques_avant_insertion()'::regprocedure,
                  'public.statuts_poses_resultats_biologiques_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % fonction(s) sur 2 ont le search_path épinglé.', nb;
  END IF;

  -- ── 13. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'statuts_poses_resultats_biologiques';
  IF colonnes <> ARRAY['acte', 'acte_le', 'id', 'id_patient', 'id_resultat',
                       'ordre', 'praticien_email', 'statut'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 14. RLS et fonctions ─────────────────────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.statuts_poses_resultats_biologiques'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'statuts_poses_resultats_biologiques';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('statuts_poses_resultats_biologiques_figee',
                      'statuts_poses_resultats_biologiques_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat statuts_poses_resultats_biologiques_v1 : quinze promesses tenues.';
END;
$$;

ROLLBACK;
