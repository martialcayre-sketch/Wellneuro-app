-- Contrat des constats du praticien et de leurs pièces ([[D-331]], BP-11).
--
-- Les deux tables promettent SEIZE choses, et ce fichier les éprouve TOUTES :
--   1. une pose valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ; une date
--      antidatée est ignorée ; l'ordre croît d'un acte au suivant ;
--   3. seul le praticien DU DOSSIER pose ou retire (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) ;
--   4. UN SEUL CONSTAT EN VIGUEUR par hypothèse et par dossier : une pose sur
--      une hypothèse qui a une tête doit la désigner, une pose sans tête n'en
--      désigne aucune ; une autre hypothèse, ou la même dans un autre
--      dossier, est indépendante ; un constat a au plus un successeur ;
--   5. un retrait vise LA TÊTE seule : un constat remplacé ne se retire pas
--      (revue CodeRabbit de #1589), un retrait ne se retire pas, une
--      hypothèse sans tête n'a rien à retirer ; après un retrait, une pose
--      neuve ne désigne rien ;
--   6. chaque acte a sa forme : une pose porte un verdict et l'empreinte de
--      la structure ; un retrait ne porte ni verdict, ni motif, ni note, ni
--      date, ni empreinte ; un acte inconnu est refusé ;
--   7. les quatre verdicts et les motifs FERMÉS de [[D-331]] §3 : chaque
--      couple admis passe, un verdict inconnu, un motif d'un autre verdict,
--      un motif sur `confirmee` ou l'absence de motif ailleurs sont refusés ;
--   8. la note : obligatoire avec `autre`, jamais faite de blancs (même
--      non-espace : tabulation, retour à la ligne), 2000 caractères au plus ;
--   9. les formats : `HYP_…` (minuscules, autre préfixe, préfixe nu, plus de
--      128 caractères refusés) et l'empreinte en 64 hexadécimaux ;
--  10. une pièce appartient à une POSE de son dossier, et s'écrit dans la
--      transaction qui l'a posée ;
--  11. une pièce de biologie est un résultat du dossier, tête de son fil,
--      sans annulation active ; une pièce de questionnaire est une réponse
--      du dossier, VALID ou AMBIGUOUS ; une pièce est l'une OU l'autre, et
--      ne se cite qu'une fois par constat ;
--  12. EN FIN DE TRANSACTION, `confirmee` et `non_retenue` portent au moins
--      une pièce ; `non_evaluable` et `sans_objet` peuvent n'en porter
--      aucune ; un constat effacé dans la transaction n'est plus contrôlé ;
--  13. UPDATE et TRUNCATE sont refusés sur les deux tables ;
--  14. l'effacement NOMMÉ passe en base, pièces puis constats, une
--      instruction chacun, et ni la ligne citée ni le constat ne s'effacent
--      avant leurs pièces (RESTRICT) ;
--  15. les FK ont la règle annoncée, les CHECK, les index et les triggers
--      sont présents (le contrôle de fin de transaction, différé), les
--      verrous précèdent les contrôles, REPEATABLE READ est refusé, et les
--      fonctions ont leur `search_path` épinglé (présence relue : une session
--      seule n'éprouve pas la concurrence) ;
--  16. les deux tables portent EXACTEMENT leurs colonnes (liste blanche) :
--      aucune valeur, aucune unité, aucun analyte, aucune date de
--      prélèvement recopiés ([[D-331]] §7) ; la RLS deny-all est active et
--      sans policy (posture `D-005`), et aucune fonction n'est exécutable par
--      PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus est reconnu à son MESSAGE, pas seulement
-- à son code. Deux CHECK ne s'isolent pas, parce que le trigger refuse avant
-- eux : `praticien_non_vide` (un e-mail blanc n'est pas celui du dossier) et
-- `ne_se_remplace_pas` (un constat qui se désigne n'est pas la tête). Ils
-- restent la garde si le trigger tombait, et le cas 15 relit leur clause.
--
-- Identités de fixture seulement ; vocabulaire d'hypothèses SYNTHÉTIQUE
-- (`HYP_CONTRAT_…`), aucun libellé. Tout se déroule dans une transaction
-- annulée à la fin.
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

-- Les gestes, en une ligne chacun. Une pose porte l'empreinte d'une
-- structure synthétique.
CREATE FUNCTION pg_temp.poser(
  p_id text, p_patient text, p_hyp text, p_verdict text, p_motif text,
  p_remplace text, p_note text DEFAULT NULL, p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, motif, note, id_constat_remplace, structure_sha256, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_hyp, p_verdict, p_motif, p_note, p_remplace, repeat('a', 64), p_email);
$$;

CREATE FUNCTION pg_temp.retirer(
  p_id text, p_patient text, p_hyp text, p_remplace text,
  p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, id_constat_remplace, praticien_email)
  VALUES (p_id, p_patient, 'retrait', p_hyp, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.piece_res(p_id text, p_constat text, p_patient text, p_resultat text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_resultat)
  VALUES (p_id, p_constat, p_patient, p_resultat);
$$;

CREATE FUNCTION pg_temp.piece_q(p_id text, p_constat text, p_patient text, p_reponse text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_questionnaire_reponse)
  VALUES (p_id, p_constat, p_patient, p_reponse);
$$;

-- Le contrôle de fin de transaction, joué sur-le-champ : `SET CONSTRAINTS …
-- IMMEDIATE` déclenche les contrôles en attente. Appelé dans `refuse`, il
-- s'y annule avec la pose qu'il juge.
CREATE FUNCTION pg_temp.clore()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET CONSTRAINTS constats_praticien_pieces_requises IMMEDIATE;
  SET CONSTRAINTS constats_praticien_pieces_requises DEFERRED;
END;
$$;

CREATE FUNCTION pg_temp.poser_puis_clore(p_id text, p_hyp text, p_verdict text, p_motif text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_temp.poser(p_id, 'PAT_CONTRAT_CONST_A', p_hyp, p_verdict, p_motif, NULL);
  PERFORM pg_temp.clore();
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr) : `res_c1` seul ; `res_c2` corrigé par
--   `res_c2_corr` ; `res_c3` annulé ; cinq passations, une par statut de
--   validité.
-- Dossier B, d'un AUTRE praticien : `res_cb`, `q_b`.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_const_a', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_const_b', 'PAT_CONTRAT_CONST_B', 'jennifer.martin+constat@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_const', 'BIO_CONTRAT_CONST', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id) VALUES
  ('res_c1', 'PAT_CONTRAT_CONST_A', 'BIO_CONTRAT_CONST', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c2', 'PAT_CONTRAT_CONST_A', 'BIO_CONTRAT_CONST', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c2_corr', 'PAT_CONTRAT_CONST_A', 'BIO_CONTRAT_CONST', 2, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_c2'),
  ('res_c3', 'PAT_CONTRAT_CONST_A', 'BIO_CONTRAT_CONST', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_cb', 'PAT_CONTRAT_CONST_B', 'BIO_CONTRAT_CONST', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', NULL);

INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
VALUES ('ann_c3', 'PAT_CONTRAT_CONST_A', 'res_c3', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr');

INSERT INTO questionnaire_reponses (id, id_reponse, id_patient, email_patient, id_questionnaire, titre, scores_json, statut_validite) VALUES
  ('q_valid', 'REP_CONTRAT_CONST_1', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'VALID'),
  ('q_amb', 'REP_CONTRAT_CONST_2', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'AMBIGUOUS'),
  ('q_inv', 'REP_CONTRAT_CONST_3', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'INVALID'),
  ('q_sup', 'REP_CONTRAT_CONST_4', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'SUPERSEDED'),
  ('q_hist', 'REP_CONTRAT_CONST_5', 'PAT_CONTRAT_CONST_A', 'sophie.nicola+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'HISTORICAL_ONLY'),
  ('q_b', 'REP_CONTRAT_CONST_6', 'PAT_CONTRAT_CONST_B', 'jennifer.martin+constat@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'VALID');

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  couple text[];
  i integer := 0;
BEGIN
  -- ── 1 et 2. Une pose valide, instant et ordre posés par la base ──────────
  INSERT INTO constats_praticien (id, ordre, id_patient, acte, hypothese_code, verdict, motif, note, a_revoir_le, structure_sha256, praticien_email, acte_le)
  VALUES ('c_a1', 999999, 'PAT_CONTRAT_CONST_A', 'pose', 'HYP_CONTRAT_A', 'non_evaluable', 'piece_attendue_manquante',
          'note de contrat', DATE '2027-01-15', repeat('a', 64), 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM constats_praticien WHERE id = 'c_a1';
  IF ligne.acte IS DISTINCT FROM 'pose' OR ligne.hypothese_code IS DISTINCT FROM 'HYP_CONTRAT_A'
     OR ligne.verdict IS DISTINCT FROM 'non_evaluable' OR ligne.motif IS DISTINCT FROM 'piece_attendue_manquante'
     OR ligne.a_revoir_le IS DISTINCT FROM DATE '2027-01-15' OR ligne.id_constat_remplace IS NOT NULL THEN
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

  -- ── 3. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('3 autre praticien',
    $q$SELECT pg_temp.poser('x3a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_P', 'sans_objet', 'hors_population', NULL, NULL, 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 retrait par un autre praticien',
    $q$SELECT pg_temp.retirer('x3b', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'c_a1', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.poser('c_p1', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_P', 'sans_objet', 'hors_population', NULL, NULL, 'PRATICIEN@wellneuro.fr');

  -- ── 4. Un seul constat en vigueur par hypothèse et par dossier ───────────
  PERFORM pg_temp.refuse('4 pose sans désigner la tête',
    $q$SELECT pg_temp.poser('x4a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', NULL)$q$,
    'P0001', 'porte un constat en vigueur');
  PERFORM pg_temp.refuse('4 pose qui désigne un constat d''une autre hypothèse',
    $q$SELECT pg_temp.poser('x4b', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', 'c_p1')$q$,
    'P0001', 'porte un constat en vigueur');
  PERFORM pg_temp.refuse('4 pose neuve qui remplace',
    $q$SELECT pg_temp.poser('x4c', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_NEUVE', 'sans_objet', 'hors_population', 'c_a1')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  -- Remplacer la tête passe ; l'ordre croît.
  PERFORM pg_temp.poser('c_a2', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'question_ne_se_pose_plus', 'c_a1');
  IF (SELECT ordre FROM constats_praticien WHERE id = 'c_a2') <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''un acte au suivant.';
  END IF;
  PERFORM pg_temp.refuse('4 pose qui désigne une tête dépassée',
    $q$SELECT pg_temp.poser('x4d', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', 'c_a1')$q$,
    'P0001', 'porte un constat en vigueur (c_a2)');
  -- La même hypothèse dans un autre dossier est indépendante.
  PERFORM pg_temp.poser('c_b1', 'PAT_CONTRAT_CONST_B', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', NULL, NULL, 'autre.praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'constats_praticien' AND indexname = 'constats_praticien_id_constat_remplace_key'
    AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat_remplace)' AND indexdef NOT LIKE '%WHERE%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 4 : l''unicité du successeur est absente.';
  END IF;

  -- ── 5. Un retrait vise la tête seule ─────────────────────────────────────
  PERFORM pg_temp.refuse('5 retrait d''un constat remplacé',
    $q$SELECT pg_temp.retirer('x5a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'c_a1')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.refuse('5 retrait sans tête',
    $q$SELECT pg_temp.retirer('x5b', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_RIEN', 'c_a2')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.retirer('c_a3', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'c_a2');
  PERFORM pg_temp.refuse('5 retrait d''un retrait',
    $q$SELECT pg_temp.retirer('x5c', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'c_a3')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.refuse('5 après retrait, une pose qui remplace',
    $q$SELECT pg_temp.poser('x5d', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', 'c_a2')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  PERFORM pg_temp.poser('c_a4', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_A', 'sans_objet', 'hors_population', NULL);

  -- ── 6. La forme de chaque acte ───────────────────────────────────────────
  PERFORM pg_temp.refuse('6 pose sans verdict',
    $q$SELECT pg_temp.poser('x6a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_F1', NULL, NULL, NULL)$q$,
    '23514', 'constats_praticien_forme_pose');
  PERFORM pg_temp.refuse('6 pose sans empreinte',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, motif, praticien_email)
       VALUES ('x6b', 'PAT_CONTRAT_CONST_A', 'pose', 'HYP_CONTRAT_F2', 'sans_objet', 'hors_population', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_forme_pose');
  PERFORM pg_temp.refuse('6 retrait avec verdict',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, id_constat_remplace, praticien_email)
       VALUES ('x6c', 'PAT_CONTRAT_CONST_A', 'retrait', 'HYP_CONTRAT_A', 'confirmee', 'c_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 retrait avec note',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, note, id_constat_remplace, praticien_email)
       VALUES ('x6d', 'PAT_CONTRAT_CONST_A', 'retrait', 'HYP_CONTRAT_A', 'note', 'c_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 retrait avec date',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, a_revoir_le, id_constat_remplace, praticien_email)
       VALUES ('x6e', 'PAT_CONTRAT_CONST_A', 'retrait', 'HYP_CONTRAT_A', DATE '2027-01-01', 'c_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 retrait avec empreinte',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, structure_sha256, id_constat_remplace, praticien_email)
       VALUES ('x6f', 'PAT_CONTRAT_CONST_A', 'retrait', 'HYP_CONTRAT_A', repeat('a', 64), 'c_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 acte inconnu',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, praticien_email)
       VALUES ('x6g', 'PAT_CONTRAT_CONST_A', 'modification', 'HYP_CONTRAT_F3', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_acte_check');

  -- ── 7. Verdicts et motifs fermés ─────────────────────────────────────────
  -- Chaque couple admis passe, sur une hypothèse à lui. `confirmee` et
  -- `non_retenue` reçoivent leur pièce plus bas (cas 12).
  FOREACH couple SLICE 1 IN ARRAY ARRAY[
    ARRAY['confirmee', NULL],
    ARRAY['non_retenue', 'pieces_ne_soutiennent_pas'],
    ARRAY['non_retenue', 'autre_hypothese_retenue'],
    ARRAY['non_retenue', 'contexte_explique'],
    ARRAY['non_retenue', 'autre'],
    ARRAY['non_evaluable', 'piece_attendue_manquante'],
    ARRAY['non_evaluable', 'contexte_inconnu'],
    ARRAY['non_evaluable', 'donnee_a_verifier'],
    ARRAY['non_evaluable', 'autre'],
    ARRAY['sans_objet', 'hors_population'],
    ARRAY['sans_objet', 'question_ne_se_pose_plus'],
    ARRAY['sans_objet', 'autre']
  ] LOOP
    i := i + 1;
    PERFORM pg_temp.poser('c_v' || i, 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_V' || i, couple[1], couple[2], NULL,
                          CASE WHEN couple[2] = 'autre' THEN 'note de contrat' END);
  END LOOP;
  PERFORM pg_temp.refuse('7 verdict inconnu',
    $q$SELECT pg_temp.poser('x7a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M1', 'normal', NULL, NULL)$q$,
    '23514', 'constats_praticien_verdict_check');
  PERFORM pg_temp.refuse('7 motif sur confirmee',
    $q$SELECT pg_temp.poser('x7b', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M2', 'confirmee', 'pieces_ne_soutiennent_pas', NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('7 non_retenue sans motif',
    $q$SELECT pg_temp.poser('x7c', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M3', 'non_retenue', NULL, NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('7 non_evaluable sans motif',
    $q$SELECT pg_temp.poser('x7d', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M4', 'non_evaluable', NULL, NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('7 sans_objet sans motif',
    $q$SELECT pg_temp.poser('x7e', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M5', 'sans_objet', NULL, NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('7 motif d''un autre verdict',
    $q$SELECT pg_temp.poser('x7f', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M6', 'sans_objet', 'contexte_inconnu', NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('7 motif inconnu',
    $q$SELECT pg_temp.poser('x7g', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_M7', 'non_retenue', 'deficit', NULL)$q$,
    '23514', 'constats_praticien_motif_selon_verdict');

  -- ── 8. La note ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('8 autre sans note',
    $q$SELECT pg_temp.poser('x8a', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_N1', 'sans_objet', 'autre', NULL)$q$,
    '23514', 'constats_praticien_note_avec_autre');
  PERFORM pg_temp.refuse('8 note de blancs non-espace',
    $q$SELECT pg_temp.poser('x8b', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_N2', 'sans_objet', 'hors_population', NULL, E'\t\r\n ')$q$,
    '23514', 'constats_praticien_note_forme');
  PERFORM pg_temp.refuse('8 note trop longue',
    $q$SELECT pg_temp.poser('x8c', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_N3', 'sans_objet', 'hors_population', NULL, repeat('n', 2001))$q$,
    '23514', 'constats_praticien_note_forme');
  PERFORM pg_temp.poser('c_n4', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_N4', 'sans_objet', 'hors_population', NULL, repeat('n', 2000));

  -- ── 9. Les formats ───────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('9 hypothèse en minuscules',
    $q$SELECT pg_temp.poser('x9a', 'PAT_CONTRAT_CONST_A', 'hyp_contrat', 'sans_objet', 'hors_population', NULL)$q$,
    '23514', 'constats_praticien_hypothese_format');
  PERFORM pg_temp.refuse('9 autre préfixe',
    $q$SELECT pg_temp.poser('x9b', 'PAT_CONTRAT_CONST_A', 'POP_CONTRAT', 'sans_objet', 'hors_population', NULL)$q$,
    '23514', 'constats_praticien_hypothese_format');
  PERFORM pg_temp.refuse('9 préfixe nu',
    $q$SELECT pg_temp.poser('x9c', 'PAT_CONTRAT_CONST_A', 'HYP_', 'sans_objet', 'hors_population', NULL)$q$,
    '23514', 'constats_praticien_hypothese_format');
  PERFORM pg_temp.refuse('9 hypothèse trop longue',
    $q$SELECT pg_temp.poser('x9d', 'PAT_CONTRAT_CONST_A', 'HYP_' || repeat('X', 125), 'sans_objet', 'hors_population', NULL)$q$,
    '23514', 'constats_praticien_hypothese_format');
  PERFORM pg_temp.poser('c_f5', 'PAT_CONTRAT_CONST_A', 'HYP_' || repeat('X', 124), 'sans_objet', 'hors_population', NULL);
  PERFORM pg_temp.refuse('9 empreinte hors format',
    $q$INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, motif, structure_sha256, praticien_email)
       VALUES ('x9e', 'PAT_CONTRAT_CONST_A', 'pose', 'HYP_CONTRAT_E1', 'sans_objet', 'hors_population', repeat('A', 64), 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_praticien_structure_format');

  -- ── 10. Une pièce appartient à une pose de son dossier, écrite avec elle ─
  PERFORM pg_temp.refuse('10 constat d''un autre dossier',
    $q$SELECT pg_temp.piece_q('x10a', 'c_b1', 'PAT_CONTRAT_CONST_A', 'q_valid')$q$,
    'P0001', 'n''est pas un constat de ce dossier');
  PERFORM pg_temp.refuse('10 constat inexistant',
    $q$SELECT pg_temp.piece_q('x10b', 'c_absent', 'PAT_CONTRAT_CONST_A', 'q_valid')$q$,
    'P0001', 'n''est pas un constat de ce dossier');
  PERFORM pg_temp.refuse('10 pièce d''un retrait',
    $q$SELECT pg_temp.piece_q('x10c', 'c_a3', 'PAT_CONTRAT_CONST_A', 'q_valid')$q$,
    'P0001', 'un retrait ne porte pas de pièce');
  -- Un constat écrit dans un point de sauvegarde porte le `xmin` de ce
  -- dernier, pas celui de la transaction : c'est ainsi qu'une session seule
  -- figure un constat posé AILLEURS, qui refuse ses pièces.
  BEGIN
    PERFORM pg_temp.poser('c_t1', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_T1', 'sans_objet', 'hors_population', NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
  PERFORM pg_temp.refuse('10 pièce hors de la transaction du constat',
    $q$SELECT pg_temp.piece_q('x10d', 'c_t1', 'PAT_CONTRAT_CONST_A', 'q_valid')$q$,
    'P0001', 'dans la transaction qui le pose');

  -- ── 11. La pièce elle-même ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 résultat d''un autre dossier',
    $q$SELECT pg_temp.piece_res('x11a', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_cb')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');
  PERFORM pg_temp.refuse('11 résultat corrigé',
    $q$SELECT pg_temp.piece_res('x11b', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c2')$q$,
    'P0001', 'seule la tête du fil se cite');
  PERFORM pg_temp.refuse('11 fil annulé',
    $q$SELECT pg_temp.piece_res('x11c', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c3')$q$,
    'P0001', 'porte une annulation active');
  PERFORM pg_temp.refuse('11 réponse d''un autre dossier',
    $q$SELECT pg_temp.piece_q('x11d', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_b')$q$,
    'P0001', 'n''est pas une réponse de questionnaire de ce dossier');
  PERFORM pg_temp.refuse('11 passation INVALID',
    $q$SELECT pg_temp.piece_q('x11e', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_inv')$q$,
    'P0001', 'exclue du raisonnement (INVALID)');
  PERFORM pg_temp.refuse('11 passation SUPERSEDED',
    $q$SELECT pg_temp.piece_q('x11f', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_sup')$q$,
    'P0001', 'exclue du raisonnement (SUPERSEDED)');
  PERFORM pg_temp.refuse('11 passation HISTORICAL_ONLY',
    $q$SELECT pg_temp.piece_q('x11g', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_hist')$q$,
    'P0001', 'exclue du raisonnement (HISTORICAL_ONLY)');
  PERFORM pg_temp.refuse('11 ni résultat ni réponse',
    $q$INSERT INTO pieces_constats_praticien (id, id_constat, id_patient) VALUES ('x11h', 'c_v1', 'PAT_CONTRAT_CONST_A')$q$,
    '23514', 'pieces_constats_praticien_une_piece');
  PERFORM pg_temp.refuse('11 résultat et réponse',
    $q$INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_resultat, id_questionnaire_reponse)
       VALUES ('x11i', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c1', 'q_valid')$q$,
    '23514', 'pieces_constats_praticien_une_piece');
  -- Les pièces admises : la tête d'un fil (la correction), une ligne seule,
  -- une passation VALID, une AMBIGUOUS.
  PERFORM pg_temp.piece_res('p_v1_a', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c2_corr');
  PERFORM pg_temp.piece_res('p_v1_b', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c1');
  PERFORM pg_temp.piece_q('p_v1_c', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_valid');
  PERFORM pg_temp.piece_q('p_v1_d', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_amb');
  PERFORM pg_temp.refuse('11 résultat cité deux fois',
    $q$SELECT pg_temp.piece_res('x11j', 'c_v1', 'PAT_CONTRAT_CONST_A', 'res_c1')$q$,
    '23505', 'pieces_constats_praticien_constat_resultat_key');
  PERFORM pg_temp.refuse('11 réponse citée deux fois',
    $q$SELECT pg_temp.piece_q('x11k', 'c_v1', 'PAT_CONTRAT_CONST_A', 'q_valid')$q$,
    '23505', 'pieces_constats_praticien_constat_reponse_key');

  -- ── 12. En fin de transaction, les pièces requises ───────────────────────
  -- Les quatre `non_retenue` du cas 7 reçoivent leur pièce d'abord ; `c_v1`
  -- (`confirmee`) a les siennes. Le contrôle joue TOUTES les poses en
  -- attente : sans elles, le refus nommerait la leur.
  FOR i IN 2..5 LOOP
    PERFORM pg_temp.piece_q('p_v' || i, 'c_v' || i, 'PAT_CONTRAT_CONST_A', 'q_valid');
  END LOOP;
  PERFORM pg_temp.refuse('12 confirmee sans pièce',
    $q$SELECT pg_temp.poser_puis_clore('x12a', 'HYP_CONTRAT_R1', 'confirmee', NULL)$q$,
    'P0001', 'un verdict « confirmee » porte au moins une pièce');
  PERFORM pg_temp.refuse('12 non_retenue sans pièce',
    $q$SELECT pg_temp.poser_puis_clore('x12b', 'HYP_CONTRAT_R2', 'non_retenue', 'contexte_explique')$q$,
    'P0001', 'un verdict « non_retenue » porte au moins une pièce');
  -- Tout ce qui est posé jusqu'ici tient : `non_evaluable` et `sans_objet`
  -- sans pièce, `confirmee` et `non_retenue` avec.
  PERFORM pg_temp.clore();
  PERFORM pg_temp.poser_puis_clore('c_r3', 'HYP_CONTRAT_R3', 'non_evaluable', 'contexte_inconnu');

  -- ── 13. Figées ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('13 UPDATE constat',
    $q$UPDATE constats_praticien SET verdict = 'confirmee' WHERE id = 'c_a4'$q$,
    'P0001', 'un constat et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 TRUNCATE constats',
    $q$TRUNCATE constats_praticien CASCADE$q$,
    'P0001', 'un constat et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 UPDATE pièce',
    $q$UPDATE pieces_constats_praticien SET id_resultat = 'res_c1' WHERE id = 'p_v1_c'$q$,
    'P0001', 'un constat et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 TRUNCATE pièces',
    $q$TRUNCATE pieces_constats_praticien$q$,
    'P0001', 'un constat et ses pièces sont figés');

  -- ── 14. L'effacement nommé ───────────────────────────────────────────────
  -- Une pose dont le contrôle de fin de transaction est encore EN ATTENTE au
  -- moment de l'effacement : effacée avec ses pièces, elle ne doit plus rien
  -- refuser (garde « constat effacé » du contrôle différé).
  PERFORM pg_temp.poser('c_e1', 'PAT_CONTRAT_CONST_A', 'HYP_CONTRAT_E9', 'confirmee', NULL, NULL);
  PERFORM pg_temp.piece_q('p_e1', 'c_e1', 'PAT_CONTRAT_CONST_A', 'q_amb');
  PERFORM pg_temp.refuse('14 résultat effacé avant ses pièces',
    $q$DELETE FROM resultats_biologiques WHERE id = 'res_c1'$q$,
    '23503', 'pieces_constats_praticien_id_resultat_fkey');
  PERFORM pg_temp.refuse('14 réponse effacée avant ses pièces',
    $q$DELETE FROM questionnaire_reponses WHERE id = 'q_valid'$q$,
    '23503', 'pieces_constats_praticien_id_questionnaire_reponse_fkey');
  PERFORM pg_temp.refuse('14 constat effacé avant ses pièces',
    $q$DELETE FROM constats_praticien WHERE id = 'c_v1'$q$,
    '23503', 'pieces_constats_praticien_id_constat_fkey');
  DELETE FROM pieces_constats_praticien WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  DELETE FROM constats_praticien WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  SELECT count(*) INTO nb FROM constats_praticien WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  SELECT nb + count(*) INTO nb FROM pieces_constats_praticien WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : l''effacement a laissé % ligne(s).', nb;
  END IF;
  -- Les contrôles différés des constats effacés ne refusent plus rien.
  PERFORM pg_temp.clore();
  DELETE FROM questionnaire_reponses WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  DELETE FROM annulations_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_CONST_A';
  DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_CONST_A';

  -- ── 15. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f'
    AND ((conrelid = 'public.constats_praticien'::regclass
          AND conname = 'constats_praticien_id_patient_fkey' AND confdeltype = 'r')
      OR (conrelid = 'public.constats_praticien'::regclass
          AND conname = 'constats_praticien_id_constat_remplace_fkey' AND confdeltype = 'a')
      OR (conrelid = 'public.pieces_constats_praticien'::regclass AND confdeltype = 'r'
          AND conname IN ('pieces_constats_praticien_id_constat_fkey',
                          'pieces_constats_praticien_id_patient_fkey',
                          'pieces_constats_praticien_id_resultat_fkey',
                          'pieces_constats_praticien_id_questionnaire_reponse_fkey')));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % clé(s) étrangère(s) sur 6 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conrelid = 'public.constats_praticien'::regclass AND conname IN (
           'constats_praticien_acte_check', 'constats_praticien_hypothese_format',
           'constats_praticien_forme_pose', 'constats_praticien_forme_retrait',
           'constats_praticien_verdict_check', 'constats_praticien_motif_selon_verdict',
           'constats_praticien_note_avec_autre', 'constats_praticien_note_forme',
           'constats_praticien_structure_format', 'constats_praticien_ne_se_remplace_pas',
           'constats_praticien_praticien_non_vide'))
      OR (conrelid = 'public.pieces_constats_praticien'::regclass
          AND conname = 'pieces_constats_praticien_une_piece'));
  IF nb <> 12 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % CHECK sur 12 sont présents.', nb;
  END IF;
  -- Les CHECK que le trigger devance (voir l'en-tête) : leur clause est
  -- relue, faute de pouvoir les éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.constats_praticien'::regclass AND contype = 'c'
    AND ((conname = 'constats_praticien_praticien_non_vide'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'constats_praticien_ne_se_remplace_pas'
          AND position('id_constat_remplace IS DISTINCT FROM id' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % clause(s) de garde résiduelle sur 2 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((tablename = 'constats_praticien' AND (
           (indexname = 'constats_praticien_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
        OR (indexname = 'constats_praticien_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
        OR (indexname = 'constats_praticien_patient_hypothese_idx' AND indexdef LIKE '%(id_patient, hypothese_code)')))
      OR (tablename = 'pieces_constats_praticien' AND (
           (indexname = 'pieces_constats_praticien_constat_resultat_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat, id_resultat)')
        OR (indexname = 'pieces_constats_praticien_constat_reponse_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat, id_questionnaire_reponse)')
        OR (indexname = 'pieces_constats_praticien_id_patient_idx' AND indexdef LIKE '%(id_patient)')
        OR (indexname = 'pieces_constats_praticien_id_resultat_idx' AND indexdef LIKE '%(id_resultat)')
        OR (indexname = 'pieces_constats_praticien_id_questionnaire_reponse_idx' AND indexdef LIKE '%(id_questionnaire_reponse)'))));
  IF nb <> 8 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % index sur 8 sont présents, sans prédicat.', nb;
  END IF;
  -- Six triggers BEFORE, actifs : insertion et UPDATE par ligne, TRUNCATE par
  -- instruction, sur chaque table.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND t.tgrelid IN ('public.constats_praticien'::regclass, 'public.pieces_constats_praticien'::regclass)
    AND ((t.tgname IN ('constats_praticien_avant_insertion', 'pieces_constats_praticien_avant_insertion')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname IN ('constats_praticien_no_update', 'pieces_constats_praticien_no_update')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname IN ('constats_praticien_no_truncate', 'pieces_constats_praticien_no_truncate')
          AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % trigger(s) BEFORE sur 6 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Le contrôle des pièces requises : trigger de CONTRAINTE, AFTER INSERT par
  -- ligne, différable et différé par défaut — en fin de transaction.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgrelid = 'public.constats_praticien'::regclass
    AND t.tgname = 'constats_praticien_pieces_requises'
    AND t.tgenabled = 'O' AND t.tgconstraint <> 0
    AND t.tgdeferrable AND t.tginitdeferred
    AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : le contrôle des pièces requises n''est pas un trigger de contrainte différé.';
  END IF;
  -- Les verrous avant les contrôles (en-tête de la migration). Une session
  -- seule n'éprouve pas la concurrence : elle relit l'appel et sa place.
  IF pg_get_functiondef('public.constats_praticien_avant_insertion()'::regprocedure)
       !~ '''repeatable read''[^$]*FOR KEY SHARE;[^$]*pg_advisory_xact_lock\(331, hashtext\(NEW\.id_patient[^$]*seul le praticien du dossier[^$]*SELECT c\.id INTO tete' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : REPEATABLE READ refusé, puis dossier et hypothèse verrouillés AVANT le contrôle de tête : l''ordre n''y est plus.';
  END IF;
  IF pg_get_functiondef('public.pieces_constats_praticien_avant_insertion()'::regprocedure)
       !~ 'resultats_biologiques_verrouiller_cle\(NEW\.id_patient, cible_analyte, cible_preleve\)[^$]*supersedes_resultat_id = NEW\.id_resultat[^$]*resultats_biologiques_racine_annulee' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : les verrous de clé de BP-09 ne précèdent plus les contrôles de tête et d''annulation.';
  END IF;
  IF pg_get_functiondef('public.pieces_constats_praticien_avant_insertion()'::regprocedure)
       !~ 'FOR KEY SHARE;[^$]*FROM public\.questionnaire_reponses q[^$]*FOR SHARE;' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la passation citée n''est plus verrouillée avant le contrôle de validité.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.constats_praticien_avant_insertion()'::regprocedure,
                  'public.pieces_constats_praticien_avant_insertion()'::regprocedure,
                  'public.constats_praticien_pieces_requises()'::regprocedure,
                  'public.constats_praticien_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) sur 4 ont le search_path épinglé.', nb;
  END IF;

  -- ── 16. Liste blanche des colonnes, RLS et fonctions ─────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'constats_praticien';
  IF colonnes <> ARRAY['a_revoir_le', 'acte', 'acte_le', 'hypothese_code', 'id',
                       'id_constat_remplace', 'id_patient', 'motif', 'note', 'ordre',
                       'praticien_email', 'structure_sha256', 'verdict'] THEN
    RAISE EXCEPTION 'CONTRAT — 16 : colonnes inattendues sur les constats : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'pieces_constats_praticien';
  IF colonnes <> ARRAY['id', 'id_constat', 'id_patient', 'id_questionnaire_reponse', 'id_resultat'] THEN
    RAISE EXCEPTION 'CONTRAT — 16 : colonnes inattendues sur les pièces : %', colonnes;
  END IF;
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid IN ('public.constats_praticien'::regclass, 'public.pieces_constats_praticien'::regclass)
    AND relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : la RLS est active sur % table(s) sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('constats_praticien', 'pieces_constats_praticien');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('constats_praticien_figee', 'constats_praticien_avant_insertion',
                      'pieces_constats_praticien_avant_insertion', 'constats_praticien_pieces_requises')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat constats_praticien_v1 : seize promesses tenues.';
END;
$$;

ROLLBACK;
