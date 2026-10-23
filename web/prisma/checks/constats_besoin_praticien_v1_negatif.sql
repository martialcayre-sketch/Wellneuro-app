-- Contrat des constats du praticien sur un besoin sans score et de leurs
-- pièces ([[D-347]], t40 ; patron du contrat de [[D-331]]).
--
-- Les deux tables promettent SEIZE choses, et ce fichier les éprouve TOUTES :
--   1. une pose valide s'écrit et se relit ;
--   2. l'instant, l'`ordre` et la transaction de l'acte sont posés par la
--      BASE, pas par l'appelant — l'instant en UTC, même sous une session en
--      Europe/Paris ; une date antidatée, un ordre ou une transaction fournis
--      sont ignorés ; l'ordre croît d'un acte au suivant ;
--   3. seul le praticien DU DOSSIER pose ou retire (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) ;
--   4. UN SEUL CONSTAT EN VIGUEUR par besoin et par dossier : une pose sur
--      un besoin qui a une tête doit la désigner, une pose sans tête n'en
--      désigne aucune ; un autre besoin, ou le même dans un autre dossier,
--      est indépendant ; un constat a au plus un successeur ;
--   5. un retrait vise LA TÊTE seule : un constat remplacé ne se retire pas,
--      un retrait ne se retire pas, un besoin sans tête n'a rien à retirer ;
--      après un retrait, une pose neuve ne désigne rien ;
--   6. chaque acte a sa forme : une pose porte un verdict ; un retrait ne
--      porte ni verdict, ni motif, ni note, ni date ; un acte inconnu est
--      refusé ;
--   7. le besoin : 2, 6, 7 et 11 passent, tout autre numéro est refusé
--      ([[D-347]] §2, arbitrage 5) ;
--   8. les quatre verdicts et les motifs FERMÉS de [[D-347]] §3 : chaque
--      couple admis passe, un verdict inconnu, un motif d'un autre verdict,
--      un motif sur `a_soutenir`, un motif inconnu ou l'absence de motif
--      ailleurs sont refusés ;
--   9. la note : obligatoire avec `autre`, jamais faite de blancs (même
--      non-espace : tabulation, retour à la ligne), 2000 caractères au plus ;
--  10. une pièce appartient à une POSE de son dossier, et s'écrit dans la
--      transaction qui l'a posée — un point de sauvegarde n'y change rien ;
--      la pièce écrite APRÈS le COMMIT du constat ne se figure pas dans une
--      transaction seule : le banc à deux sessions l'éprouve
--      (`scripts/banc-constats-besoin-deux-sessions.test.mjs`) ;
--  11. une pièce de biologie est un résultat du dossier, tête de son fil,
--      sans annulation active ; une pièce de questionnaire est une réponse
--      du dossier, VALID ou AMBIGUOUS ; une pièce est l'une OU l'autre, et
--      ne se cite qu'une fois par constat ;
--  12. les pièces sont FACULTATIVES : les quatre verdicts se posent sans
--      pièce et passent la fin de transaction ([[D-347]] §2, arbitrage 4) ;
--  13. UPDATE et TRUNCATE sont refusés sur les deux tables ;
--  14. l'effacement NOMMÉ passe en base, pièces puis constats, une
--      instruction chacun, avec le dossier ; ni la ligne citée ni le constat
--      ne s'effacent avant leurs pièces (RESTRICT) ; une suppression dont le
--      dossier survit est refusée en fin de transaction ;
--  15. les FK ont la règle annoncée, les CHECK, les index et les triggers
--      sont présents (les deux contrôles de fin de transaction, différés ;
--      aucun contrôle de pièces requises), les verrous précèdent les
--      contrôles, REPEATABLE READ est refusé avant eux, et les fonctions ont
--      leur `search_path` épinglé (présence relue : le banc à deux sessions
--      joue les courses et le refus de REPEATABLE READ) ;
--  16. les deux tables portent EXACTEMENT leurs colonnes (liste blanche) :
--      aucune valeur, aucune unité, aucun analyte, aucun score, aucune date
--      de prélèvement recopiés ([[D-347]] §7) ; la RLS deny-all est active
--      et sans policy (posture `D-005`), et aucune fonction n'est exécutable
--      par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus est reconnu à son MESSAGE, pas seulement
-- à son code. Deux CHECK ne s'isolent pas, parce que le trigger refuse avant
-- eux : `praticien_non_vide` (un e-mail blanc n'est pas celui du dossier) et
-- `ne_se_remplace_pas` (un constat qui se désigne n'est pas la tête). Ils
-- restent la garde si le trigger tombait, et le cas 15 relit leur clause.
--
-- QUATRE BESOINS, DONC QUATRE TÊTES PAR DOSSIER : les poses qui éprouvent un
-- CHECK remplacent la tête en vigueur (`pg_temp.poser_sur_tete`) — le
-- trigger les laisse passer, et le CHECK juge seul.
--
-- Identités de fixture seulement. Tout se déroule dans une transaction
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

-- Les gestes, en une ligne chacun.
CREATE FUNCTION pg_temp.poser(
  p_id text, p_patient text, p_besoin integer, p_verdict text, p_motif text,
  p_remplace text, p_note text DEFAULT NULL, p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, verdict, motif, note, id_constat_remplace, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_besoin, p_verdict, p_motif, p_note, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.retirer(
  p_id text, p_patient text, p_besoin integer, p_remplace text,
  p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, id_constat_remplace, praticien_email)
  VALUES (p_id, p_patient, 'retrait', p_besoin, p_remplace, p_email);
$$;

-- La tête en vigueur d'un besoin, lue comme le trigger la lit.
CREATE FUNCTION pg_temp.tete(p_patient text, p_besoin integer)
RETURNS text
LANGUAGE sql
AS $$
  SELECT c.id FROM constats_besoin_praticien c
  WHERE c.id_patient = p_patient AND c.besoin = p_besoin AND c.acte = 'pose'
    AND NOT EXISTS (SELECT 1 FROM constats_besoin_praticien s WHERE s.id_constat_remplace = c.id)
  ORDER BY c.ordre DESC LIMIT 1;
$$;

-- Une pose qui remplace la tête en vigueur, s'il y en a une : le trigger la
-- laisse passer, et seul le CHECK juge ce qu'elle porte.
CREATE FUNCTION pg_temp.poser_sur_tete(
  p_id text, p_besoin integer, p_verdict text, p_motif text, p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
AS $$
  SELECT pg_temp.poser(p_id, 'PAT_CONTRAT_CB_A', p_besoin, p_verdict, p_motif,
                       pg_temp.tete('PAT_CONTRAT_CB_A', p_besoin), p_note);
$$;

CREATE FUNCTION pg_temp.piece_res(p_id text, p_constat text, p_patient text, p_resultat text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient, id_resultat)
  VALUES (p_id, p_constat, p_patient, p_resultat);
$$;

CREATE FUNCTION pg_temp.piece_q(p_id text, p_constat text, p_patient text, p_reponse text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient, id_questionnaire_reponse)
  VALUES (p_id, p_constat, p_patient, p_reponse);
$$;

-- Le contrôle de fin de transaction, joué sur-le-champ : `SET CONSTRAINTS …
-- IMMEDIATE` déclenche les contrôles en attente. Appelé dans `refuse`, il
-- s'y annule avec la suppression qu'il juge.
CREATE FUNCTION pg_temp.clore()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET CONSTRAINTS constats_besoin_praticien_suppression_nommee,
    pieces_constats_besoin_praticien_suppression_nommee IMMEDIATE;
  SET CONSTRAINTS constats_besoin_praticien_suppression_nommee,
    pieces_constats_besoin_praticien_suppression_nommee DEFERRED;
END;
$$;

-- Une suppression hors effacement, jugée sur-le-champ.
CREATE FUNCTION pg_temp.supprimer_puis_clore(p_table text, p_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DELETE FROM %I WHERE id = %L', p_table, p_id);
  PERFORM pg_temp.clore();
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr) : `cbr_1` seul ; `cbr_2` corrigé par
--   `cbr_2_corr` ; `cbr_3` annulé ; cinq passations, une par statut de
--   validité.
-- Dossier B, d'un AUTRE praticien : `cbr_b`, `cbq_b`.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_cb_a', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_cb_b', 'PAT_CONTRAT_CB_B', 'jennifer.martin+constat-besoin@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_cb', 'BIO_CONTRAT_CB', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id) VALUES
  ('cbr_1', 'PAT_CONTRAT_CB_A', 'BIO_CONTRAT_CB', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('cbr_2', 'PAT_CONTRAT_CB_A', 'BIO_CONTRAT_CB', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('cbr_2_corr', 'PAT_CONTRAT_CB_A', 'BIO_CONTRAT_CB', 2, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'cbr_2'),
  ('cbr_3', 'PAT_CONTRAT_CB_A', 'BIO_CONTRAT_CB', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('cbr_b', 'PAT_CONTRAT_CB_B', 'BIO_CONTRAT_CB', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', NULL);

INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
VALUES ('cb_ann_3', 'PAT_CONTRAT_CB_A', 'cbr_3', 'annulation', 'mauvais_dossier', 'praticien@wellneuro.fr');

INSERT INTO questionnaire_reponses (id, id_reponse, id_patient, email_patient, id_questionnaire, titre, scores_json, statut_validite) VALUES
  ('cbq_valid', 'REP_CONTRAT_CB_1', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'VALID'),
  ('cbq_amb', 'REP_CONTRAT_CB_2', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'AMBIGUOUS'),
  ('cbq_inv', 'REP_CONTRAT_CB_3', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'INVALID'),
  ('cbq_sup', 'REP_CONTRAT_CB_4', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'SUPERSEDED'),
  ('cbq_hist', 'REP_CONTRAT_CB_5', 'PAT_CONTRAT_CB_A', 'sophie.nicola+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'HISTORICAL_ONLY'),
  ('cbq_b', 'REP_CONTRAT_CB_6', 'PAT_CONTRAT_CB_B', 'jennifer.martin+constat-besoin@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'VALID');

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  couple text[];
  b integer;
  i integer := 0;
BEGIN
  -- ── 1 et 2. Une pose valide, instant et ordre posés par la base ──────────
  INSERT INTO constats_besoin_praticien (id, ordre, id_patient, acte, besoin, verdict, motif, note, a_revoir_le, transaction_pose, praticien_email, acte_le)
  VALUES ('cb_a1', 999999, 'PAT_CONTRAT_CB_A', 'pose', 2, 'non_evaluable', 'piece_attendue_manquante',
          'note de contrat', DATE '2027-01-15', 42, 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM constats_besoin_praticien WHERE id = 'cb_a1';
  IF ligne.acte IS DISTINCT FROM 'pose' OR ligne.besoin IS DISTINCT FROM 2
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
  IF ligne.transaction_pose IS DISTINCT FROM pg_current_xact_id()::text::bigint THEN
    RAISE EXCEPTION 'CONTRAT — 2 : la transaction de l''acte n''est pas celle posée par la base (%).', ligne.transaction_pose;
  END IF;
  ordre_premier := ligne.ordre;

  -- ── 3. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('3 autre praticien',
    $q$SELECT pg_temp.poser('x3a', 'PAT_CONTRAT_CB_A', 11, 'sans_objet', 'hors_population', NULL, NULL, 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 retrait par un autre praticien',
    $q$SELECT pg_temp.retirer('x3b', 'PAT_CONTRAT_CB_A', 2, 'cb_a1', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.poser('cb_p1', 'PAT_CONTRAT_CB_A', 11, 'sans_objet', 'hors_population', NULL, NULL, 'PRATICIEN@wellneuro.fr');

  -- ── 4. Un seul constat en vigueur par besoin et par dossier ──────────────
  PERFORM pg_temp.refuse('4 pose sans désigner la tête',
    $q$SELECT pg_temp.poser('x4a', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'hors_population', NULL)$q$,
    'P0001', 'porte un constat en vigueur');
  PERFORM pg_temp.refuse('4 pose qui désigne un constat d''un autre besoin',
    $q$SELECT pg_temp.poser('x4b', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'hors_population', 'cb_p1')$q$,
    'P0001', 'porte un constat en vigueur');
  PERFORM pg_temp.refuse('4 pose neuve qui remplace',
    $q$SELECT pg_temp.poser('x4c', 'PAT_CONTRAT_CB_A', 7, 'sans_objet', 'hors_population', 'cb_a1')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  -- Remplacer la tête passe ; l'ordre croît.
  PERFORM pg_temp.poser('cb_a2', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'question_ne_se_pose_plus', 'cb_a1');
  IF (SELECT ordre FROM constats_besoin_praticien WHERE id = 'cb_a2') <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''un acte au suivant.';
  END IF;
  PERFORM pg_temp.refuse('4 pose qui désigne une tête dépassée',
    $q$SELECT pg_temp.poser('x4d', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'hors_population', 'cb_a1')$q$,
    'P0001', 'porte un constat en vigueur (cb_a2)');
  -- Le même besoin dans un autre dossier est indépendant.
  PERFORM pg_temp.poser('cb_b1', 'PAT_CONTRAT_CB_B', 2, 'sans_objet', 'hors_population', NULL, NULL, 'autre.praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'constats_besoin_praticien' AND indexname = 'constats_besoin_praticien_id_constat_remplace_key'
    AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat_remplace)' AND indexdef NOT LIKE '%WHERE%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 4 : l''unicité du successeur est absente.';
  END IF;

  -- ── 5. Un retrait vise la tête seule ─────────────────────────────────────
  PERFORM pg_temp.refuse('5 retrait d''un constat remplacé',
    $q$SELECT pg_temp.retirer('x5a', 'PAT_CONTRAT_CB_A', 2, 'cb_a1')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.refuse('5 retrait sans tête',
    $q$SELECT pg_temp.retirer('x5b', 'PAT_CONTRAT_CB_A', 7, 'cb_a2')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.retirer('cb_a3', 'PAT_CONTRAT_CB_A', 2, 'cb_a2');
  PERFORM pg_temp.refuse('5 retrait d''un retrait',
    $q$SELECT pg_temp.retirer('x5c', 'PAT_CONTRAT_CB_A', 2, 'cb_a3')$q$,
    'P0001', 'seul le constat en vigueur');
  PERFORM pg_temp.refuse('5 après retrait, une pose qui remplace',
    $q$SELECT pg_temp.poser('x5d', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'hors_population', 'cb_a2')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  PERFORM pg_temp.poser('cb_a4', 'PAT_CONTRAT_CB_A', 2, 'sans_objet', 'hors_population', NULL);

  -- ── 6. La forme de chaque acte ───────────────────────────────────────────
  PERFORM pg_temp.refuse('6 pose sans verdict',
    $q$SELECT pg_temp.poser_sur_tete('x6a', 2, NULL, NULL)$q$,
    '23514', 'constats_besoin_praticien_forme_pose');
  PERFORM pg_temp.refuse('6 retrait avec verdict',
    $q$INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, verdict, id_constat_remplace, praticien_email)
       VALUES ('x6c', 'PAT_CONTRAT_CB_A', 'retrait', 2, 'a_soutenir', 'cb_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_besoin_praticien_forme_retrait');
  -- Le motif vient avec un verdict qui l'admet : seul `forme_retrait` juge
  -- (un motif sans verdict tomberait aussi sous `motif_selon_verdict`).
  PERFORM pg_temp.refuse('6 retrait avec motif',
    $q$INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, verdict, motif, id_constat_remplace, praticien_email)
       VALUES ('x6m', 'PAT_CONTRAT_CB_A', 'retrait', 2, 'sans_objet', 'hors_population', 'cb_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_besoin_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 retrait avec note',
    $q$INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, note, id_constat_remplace, praticien_email)
       VALUES ('x6d', 'PAT_CONTRAT_CB_A', 'retrait', 2, 'note', 'cb_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_besoin_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 retrait avec date',
    $q$INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, a_revoir_le, id_constat_remplace, praticien_email)
       VALUES ('x6e', 'PAT_CONTRAT_CB_A', 'retrait', 2, DATE '2027-01-01', 'cb_a4', 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_besoin_praticien_forme_retrait');
  PERFORM pg_temp.refuse('6 acte inconnu',
    $q$INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, praticien_email)
       VALUES ('x6g', 'PAT_CONTRAT_CB_A', 'modification', 6, 'praticien@wellneuro.fr')$q$,
    '23514', 'constats_besoin_praticien_acte_check');

  -- ── 7. Le besoin ─────────────────────────────────────────────────────────
  -- Les quatre admis passent (le 2 et le 11 sont déjà posés plus haut).
  PERFORM pg_temp.poser('cb_b6', 'PAT_CONTRAT_CB_A', 6, 'non_evaluable', 'non_aborde', NULL);
  PERFORM pg_temp.poser('cb_b7', 'PAT_CONTRAT_CB_A', 7, 'non_evaluable', 'non_aborde', NULL);
  -- Tout autre numéro est refusé : les huit besoins scorés, et hors bornes.
  FOREACH b IN ARRAY ARRAY[0, 1, 3, 4, 5, 8, 9, 10, 12, 13, -2] LOOP
    PERFORM pg_temp.refuse('7 besoin ' || b,
      format($q$SELECT pg_temp.poser('x7_%s', 'PAT_CONTRAT_CB_A', %s, 'non_evaluable', 'non_aborde', NULL)$q$, i, b),
      '23514', 'constats_besoin_praticien_besoin_check');
    i := i + 1;
  END LOOP;
  i := 0;

  -- ── 8. Verdicts et motifs fermés ─────────────────────────────────────────
  -- Chaque couple admis passe, en remplaçant la tête du besoin 6.
  FOREACH couple SLICE 1 IN ARRAY ARRAY[
    ARRAY['a_soutenir', NULL],
    ARRAY['non_retenu', 'non_ressorti_entretien'],
    ARRAY['non_retenu', 'autre_besoin_d_abord'],
    ARRAY['non_retenu', 'deja_accompagne'],
    ARRAY['non_retenu', 'autre'],
    ARRAY['non_evaluable', 'non_aborde'],
    ARRAY['non_evaluable', 'piece_attendue_manquante'],
    ARRAY['non_evaluable', 'donnee_a_verifier'],
    ARRAY['non_evaluable', 'autre'],
    ARRAY['sans_objet', 'hors_population'],
    ARRAY['sans_objet', 'question_ne_se_pose_plus'],
    ARRAY['sans_objet', 'autre']
  ] LOOP
    i := i + 1;
    PERFORM pg_temp.poser_sur_tete('cb_v' || i, 6, couple[1], couple[2],
                                   CASE WHEN couple[2] = 'autre' THEN 'note de contrat' END);
  END LOOP;
  IF (SELECT count(*) FROM constats_besoin_praticien WHERE id LIKE 'cb\_v%') <> 12 THEN
    RAISE EXCEPTION 'CONTRAT — 8 : les douze couples admis ne sont pas tous écrits.';
  END IF;
  PERFORM pg_temp.refuse('8 verdict inconnu',
    $q$SELECT pg_temp.poser_sur_tete('x8a', 6, 'satisfait', NULL)$q$,
    '23514', 'constats_besoin_praticien_verdict_check');
  PERFORM pg_temp.refuse('8 verdict de D-331',
    $q$SELECT pg_temp.poser_sur_tete('x8a2', 6, 'confirmee', NULL)$q$,
    '23514', 'constats_besoin_praticien_verdict_check');
  PERFORM pg_temp.refuse('8 motif sur a_soutenir',
    $q$SELECT pg_temp.poser_sur_tete('x8b', 6, 'a_soutenir', 'non_ressorti_entretien')$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 non_retenu sans motif',
    $q$SELECT pg_temp.poser_sur_tete('x8c', 6, 'non_retenu', NULL)$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 non_evaluable sans motif',
    $q$SELECT pg_temp.poser_sur_tete('x8d', 6, 'non_evaluable', NULL)$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 sans_objet sans motif',
    $q$SELECT pg_temp.poser_sur_tete('x8e', 6, 'sans_objet', NULL)$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 motif d''un autre verdict',
    $q$SELECT pg_temp.poser_sur_tete('x8f', 6, 'sans_objet', 'non_aborde')$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 motif de D-331',
    $q$SELECT pg_temp.poser_sur_tete('x8g', 6, 'non_retenu', 'pieces_ne_soutiennent_pas')$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');
  PERFORM pg_temp.refuse('8 motif inconnu',
    $q$SELECT pg_temp.poser_sur_tete('x8h', 6, 'non_retenu', 'carence')$q$,
    '23514', 'constats_besoin_praticien_motif_selon_verdict');

  -- ── 9. La note ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('9 autre sans note',
    $q$SELECT pg_temp.poser_sur_tete('x9a', 6, 'sans_objet', 'autre')$q$,
    '23514', 'constats_besoin_praticien_note_avec_autre');
  PERFORM pg_temp.refuse('9 note de blancs non-espace',
    $q$SELECT pg_temp.poser_sur_tete('x9b', 6, 'sans_objet', 'hors_population', E'\t\r\n ')$q$,
    '23514', 'constats_besoin_praticien_note_forme');
  PERFORM pg_temp.refuse('9 note trop longue',
    $q$SELECT pg_temp.poser_sur_tete('x9c', 6, 'sans_objet', 'hors_population', repeat('n', 2001))$q$,
    '23514', 'constats_besoin_praticien_note_forme');
  PERFORM pg_temp.poser_sur_tete('cb_n4', 6, 'sans_objet', 'hors_population', repeat('n', 2000));

  -- ── 10. Une pièce appartient à une pose de son dossier, écrite avec elle ─
  PERFORM pg_temp.refuse('10 constat d''un autre dossier',
    $q$SELECT pg_temp.piece_q('x10a', 'cb_b1', 'PAT_CONTRAT_CB_A', 'cbq_valid')$q$,
    'P0001', 'n''est pas un constat sur un besoin de ce dossier');
  PERFORM pg_temp.refuse('10 constat inexistant',
    $q$SELECT pg_temp.piece_q('x10b', 'cb_absent', 'PAT_CONTRAT_CB_A', 'cbq_valid')$q$,
    'P0001', 'n''est pas un constat sur un besoin de ce dossier');
  PERFORM pg_temp.refuse('10 pièce d''un retrait',
    $q$SELECT pg_temp.piece_q('x10c', 'cb_a3', 'PAT_CONTRAT_CB_A', 'cbq_valid')$q$,
    'P0001', 'un retrait ne porte pas de pièce');
  -- Un constat écrit dans un point de sauvegarde reste de la transaction :
  -- ses pièces, écrites hors du point, passent. Une pièce écrite après le
  -- COMMIT de son constat ne se figure pas ici : la transaction fournie est
  -- écrasée par la base (cas 2) ; le banc à deux sessions l'éprouve, et le
  -- cas 15 relit la règle sur la fonction.
  BEGIN
    PERFORM pg_temp.poser_sur_tete('cb_t1', 7, 'a_soutenir', NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
  PERFORM pg_temp.piece_q('cbp_t1', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_valid');

  -- ── 11. La pièce elle-même ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 résultat d''un autre dossier',
    $q$SELECT pg_temp.piece_res('x11a', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_b')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');
  PERFORM pg_temp.refuse('11 résultat corrigé',
    $q$SELECT pg_temp.piece_res('x11b', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_2')$q$,
    'P0001', 'seule la tête du fil se cite');
  PERFORM pg_temp.refuse('11 fil annulé',
    $q$SELECT pg_temp.piece_res('x11c', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_3')$q$,
    'P0001', 'porte une annulation active');
  PERFORM pg_temp.refuse('11 réponse d''un autre dossier',
    $q$SELECT pg_temp.piece_q('x11d', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_b')$q$,
    'P0001', 'n''est pas une réponse de questionnaire de ce dossier');
  PERFORM pg_temp.refuse('11 passation INVALID',
    $q$SELECT pg_temp.piece_q('x11e', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_inv')$q$,
    'P0001', 'exclue du raisonnement (INVALID)');
  PERFORM pg_temp.refuse('11 passation SUPERSEDED',
    $q$SELECT pg_temp.piece_q('x11f', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_sup')$q$,
    'P0001', 'exclue du raisonnement (SUPERSEDED)');
  PERFORM pg_temp.refuse('11 passation HISTORICAL_ONLY',
    $q$SELECT pg_temp.piece_q('x11g', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_hist')$q$,
    'P0001', 'exclue du raisonnement (HISTORICAL_ONLY)');
  PERFORM pg_temp.refuse('11 ni résultat ni réponse',
    $q$INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient) VALUES ('x11h', 'cb_t1', 'PAT_CONTRAT_CB_A')$q$,
    '23514', 'pieces_constats_besoin_praticien_une_piece');
  PERFORM pg_temp.refuse('11 résultat et réponse',
    $q$INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient, id_resultat, id_questionnaire_reponse)
       VALUES ('x11i', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_1', 'cbq_amb')$q$,
    '23514', 'pieces_constats_besoin_praticien_une_piece');
  -- Les pièces admises : la tête d'un fil (la correction), une ligne seule,
  -- une passation AMBIGUOUS (la VALID est déjà citée, cas 10).
  PERFORM pg_temp.piece_res('cbp_t1_a', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_2_corr');
  PERFORM pg_temp.piece_res('cbp_t1_b', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_1');
  PERFORM pg_temp.piece_q('cbp_t1_c', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_amb');
  PERFORM pg_temp.refuse('11 résultat cité deux fois',
    $q$SELECT pg_temp.piece_res('x11j', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbr_1')$q$,
    '23505', 'pieces_constats_besoin_praticien_constat_resultat_key');
  PERFORM pg_temp.refuse('11 réponse citée deux fois',
    $q$SELECT pg_temp.piece_q('x11k', 'cb_t1', 'PAT_CONTRAT_CB_A', 'cbq_valid')$q$,
    '23505', 'pieces_constats_besoin_praticien_constat_reponse_key');

  -- ── 12. Les pièces sont facultatives ─────────────────────────────────────
  -- Les douze couples du cas 8 sont posés sans pièce, chacun des quatre
  -- verdicts compris. TOUS les contrôles différés de la transaction sont
  -- joués sur-le-champ (`ALL`, pas seulement les deux suppressions
  -- nommées) : aucun ne refuse. Le cas 15 compte en outre exactement deux
  -- triggers de contrainte sur les deux tables.
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  SELECT count(*) INTO nb FROM constats_besoin_praticien c
  WHERE c.id LIKE 'cb\_v%'
    AND NOT EXISTS (SELECT 1 FROM pieces_constats_besoin_praticien p WHERE p.id_constat = c.id);
  IF nb <> 12 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % pose(s) sans pièce sur 12 ont tenu.', nb;
  END IF;

  -- ── 13. Figées ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('13 UPDATE constat',
    $q$UPDATE constats_besoin_praticien SET verdict = 'a_soutenir', motif = NULL WHERE id = 'cb_a4'$q$,
    'P0001', 'un constat sur un besoin et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 TRUNCATE constats',
    $q$TRUNCATE constats_besoin_praticien CASCADE$q$,
    'P0001', 'un constat sur un besoin et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 UPDATE pièce',
    $q$UPDATE pieces_constats_besoin_praticien SET id_resultat = 'cbr_1' WHERE id = 'cbp_t1_c'$q$,
    'P0001', 'un constat sur un besoin et ses pièces sont figés');
  PERFORM pg_temp.refuse('13 TRUNCATE pièces',
    $q$TRUNCATE pieces_constats_besoin_praticien$q$,
    'P0001', 'un constat sur un besoin et ses pièces sont figés');

  -- ── 14. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('14 pièce supprimée hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('pieces_constats_besoin_praticien', 'cbp_t1_c')$q$,
    'P0001', 'pieces_constats_besoin_praticien : suppression refusée');
  PERFORM pg_temp.refuse('14 constat supprimé hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('constats_besoin_praticien', 'cb_b1')$q$,
    'P0001', 'constats_besoin_praticien : suppression refusée');
  PERFORM pg_temp.refuse('14 résultat effacé avant ses pièces',
    $q$DELETE FROM resultats_biologiques WHERE id = 'cbr_1'$q$,
    '23503', 'pieces_constats_besoin_praticien_id_resultat_fkey');
  PERFORM pg_temp.refuse('14 réponse effacée avant ses pièces',
    $q$DELETE FROM questionnaire_reponses WHERE id = 'cbq_valid'$q$,
    '23503', 'pieces_constats_besoin_praticien_id_questionnaire_reponse_fkey');
  PERFORM pg_temp.refuse('14 constat effacé avant ses pièces',
    $q$DELETE FROM constats_besoin_praticien WHERE id = 'cb_t1'$q$,
    '23503', 'pieces_constats_besoin_praticien_id_constat_fkey');
  DELETE FROM pieces_constats_besoin_praticien WHERE id_patient = 'PAT_CONTRAT_CB_A';
  DELETE FROM constats_besoin_praticien WHERE id_patient = 'PAT_CONTRAT_CB_A';
  SELECT count(*) INTO nb FROM constats_besoin_praticien WHERE id_patient = 'PAT_CONTRAT_CB_A';
  SELECT nb + count(*) INTO nb FROM pieces_constats_besoin_praticien WHERE id_patient = 'PAT_CONTRAT_CB_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : l''effacement a laissé % ligne(s).', nb;
  END IF;
  -- Le reste du dossier, puis le dossier : le contrôle différé ne refuse
  -- plus rien (le dossier ne survit pas).
  DELETE FROM questionnaire_reponses WHERE id_patient = 'PAT_CONTRAT_CB_A';
  DELETE FROM annulations_resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_CB_A';
  DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_CB_A';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_CB_A';
  PERFORM pg_temp.clore();

  -- ── 15. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f'
    AND ((conrelid = 'public.constats_besoin_praticien'::regclass
          AND conname = 'constats_besoin_praticien_id_patient_fkey' AND confdeltype = 'r')
      OR (conrelid = 'public.constats_besoin_praticien'::regclass
          AND conname = 'constats_besoin_praticien_id_constat_remplace_fkey' AND confdeltype = 'a')
      OR (conrelid = 'public.pieces_constats_besoin_praticien'::regclass AND confdeltype = 'r'
          AND conname IN ('pieces_constats_besoin_praticien_id_constat_fkey',
                          'pieces_constats_besoin_praticien_id_patient_fkey',
                          'pieces_constats_besoin_praticien_id_resultat_fkey',
                          'pieces_constats_besoin_praticien_id_questionnaire_reponse_fkey')));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % clé(s) étrangère(s) sur 6 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conrelid = 'public.constats_besoin_praticien'::regclass AND conname IN (
           'constats_besoin_praticien_acte_check', 'constats_besoin_praticien_besoin_check',
           'constats_besoin_praticien_forme_pose', 'constats_besoin_praticien_forme_retrait',
           'constats_besoin_praticien_verdict_check', 'constats_besoin_praticien_motif_selon_verdict',
           'constats_besoin_praticien_note_avec_autre', 'constats_besoin_praticien_note_forme',
           'constats_besoin_praticien_ne_se_remplace_pas', 'constats_besoin_praticien_praticien_non_vide'))
      OR (conrelid = 'public.pieces_constats_besoin_praticien'::regclass
          AND conname = 'pieces_constats_besoin_praticien_une_piece'));
  IF nb <> 11 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % CHECK sur 11 sont présents.', nb;
  END IF;
  -- Les CHECK que le trigger devance (voir l'en-tête) : leur clause est
  -- relue, faute de pouvoir les éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.constats_besoin_praticien'::regclass AND contype = 'c'
    AND ((conname = 'constats_besoin_praticien_praticien_non_vide'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'constats_besoin_praticien_ne_se_remplace_pas'
          AND position('id_constat_remplace IS DISTINCT FROM id' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % clause(s) de garde résiduelle sur 2 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((tablename = 'constats_besoin_praticien' AND (
           (indexname = 'constats_besoin_praticien_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
        OR (indexname = 'constats_besoin_praticien_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
        OR (indexname = 'constats_besoin_praticien_patient_besoin_idx' AND indexdef LIKE '%(id_patient, besoin)')))
      OR (tablename = 'pieces_constats_besoin_praticien' AND (
           (indexname = 'pieces_constats_besoin_praticien_constat_resultat_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat, id_resultat)')
        OR (indexname = 'pieces_constats_besoin_praticien_constat_reponse_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat, id_questionnaire_reponse)')
        OR (indexname = 'pieces_constats_besoin_praticien_id_patient_idx' AND indexdef LIKE '%(id_patient)')
        OR (indexname = 'pieces_constats_besoin_praticien_id_resultat_idx' AND indexdef LIKE '%(id_resultat)')
        OR (indexname = 'pieces_constats_besoin_praticien_id_questionnaire_reponse_idx' AND indexdef LIKE '%(id_questionnaire_reponse)'))));
  IF nb <> 8 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % index sur 8 sont présents, sans prédicat.', nb;
  END IF;
  -- Six triggers BEFORE, actifs : insertion et UPDATE par ligne, TRUNCATE par
  -- instruction, sur chaque table.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND t.tgrelid IN ('public.constats_besoin_praticien'::regclass, 'public.pieces_constats_besoin_praticien'::regclass)
    AND ((t.tgname IN ('constats_besoin_praticien_avant_insertion', 'pieces_constats_besoin_praticien_avant_insertion')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname IN ('constats_besoin_praticien_no_update', 'pieces_constats_besoin_praticien_no_update')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname IN ('constats_besoin_praticien_no_truncate', 'pieces_constats_besoin_praticien_no_truncate')
          AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % trigger(s) BEFORE sur 6 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Les deux contrôles de fin de transaction : triggers de CONTRAINTE, AFTER
  -- DELETE par ligne, différables et différés par défaut. Aucun autre
  -- trigger de contrainte : pas de contrôle de pièces requises (§2).
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O' AND t.tgconstraint <> 0
    AND t.tgdeferrable AND t.tginitdeferred
    AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1 AND (t.tgtype & 8) = 8
    AND ((t.tgrelid = 'public.constats_besoin_praticien'::regclass
          AND t.tgname = 'constats_besoin_praticien_suppression_nommee')
      OR (t.tgrelid = 'public.pieces_constats_besoin_praticien'::regclass
          AND t.tgname = 'pieces_constats_besoin_praticien_suppression_nommee'));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % contrôle(s) de fin de transaction sur 2 sont des triggers de contrainte différés.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgconstraint <> 0
    AND t.tgrelid IN ('public.constats_besoin_praticien'::regclass, 'public.pieces_constats_besoin_praticien'::regclass)
    AND NOT t.tgisinternal;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % trigger(s) de contrainte sur les deux tables, 2 attendus (aucune pièce requise).', nb;
  END IF;
  IF pg_get_functiondef('public.pieces_constats_besoin_praticien_avant_insertion()'::regprocedure)
       !~ 'constat_transaction IS DISTINCT FROM pg_current_xact_id\(\)::text::bigint' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la pièce ne compare plus sa transaction à celle du constat.';
  END IF;
  -- Les verrous avant les contrôles (en-tête de la migration). Une session
  -- seule n'éprouve pas la concurrence : elle relit l'appel et sa place.
  IF pg_get_functiondef('public.constats_besoin_praticien_avant_insertion()'::regprocedure)
       !~ '''repeatable read''[^$]*FOR KEY SHARE;[^$]*pg_advisory_xact_lock\(347, hashtext\(NEW\.id_patient[^$]*seul le praticien du dossier[^$]*SELECT c\.id INTO tete' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : REPEATABLE READ refusé, puis dossier et besoin verrouillés AVANT le contrôle de tête : l''ordre n''y est plus.';
  END IF;
  IF pg_get_functiondef('public.pieces_constats_besoin_praticien_avant_insertion()'::regprocedure)
       !~ 'resultats_biologiques_verrouiller_cle\(NEW\.id_patient, cible_analyte, cible_preleve\)[^$]*supersedes_resultat_id = NEW\.id_resultat[^$]*resultats_biologiques_racine_annulee' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : les verrous de clé de BP-09 ne précèdent plus les contrôles de tête et d''annulation.';
  END IF;
  IF pg_get_functiondef('public.pieces_constats_besoin_praticien_avant_insertion()'::regprocedure)
       !~ 'FOR KEY SHARE;[^$]*FROM public\.questionnaire_reponses q[^$]*FOR SHARE;' THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la passation citée n''est plus verrouillée avant le contrôle de validité.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.constats_besoin_praticien_avant_insertion()'::regprocedure,
                  'public.pieces_constats_besoin_praticien_avant_insertion()'::regprocedure,
                  'public.constats_besoin_praticien_suppression_nommee()'::regprocedure,
                  'public.constats_besoin_praticien_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) sur 4 ont le search_path épinglé.', nb;
  END IF;

  -- ── 16. Liste blanche des colonnes, RLS et fonctions ─────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'constats_besoin_praticien';
  IF colonnes <> ARRAY['a_revoir_le', 'acte', 'acte_le', 'besoin', 'id',
                       'id_constat_remplace', 'id_patient', 'motif', 'note', 'ordre',
                       'praticien_email', 'transaction_pose', 'verdict'] THEN
    RAISE EXCEPTION 'CONTRAT — 16 : colonnes inattendues sur les constats : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'pieces_constats_besoin_praticien';
  IF colonnes <> ARRAY['id', 'id_constat', 'id_patient', 'id_questionnaire_reponse', 'id_resultat'] THEN
    RAISE EXCEPTION 'CONTRAT — 16 : colonnes inattendues sur les pièces : %', colonnes;
  END IF;
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid IN ('public.constats_besoin_praticien'::regclass, 'public.pieces_constats_besoin_praticien'::regclass)
    AND relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : la RLS est active sur % table(s) sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('constats_besoin_praticien', 'pieces_constats_besoin_praticien');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('constats_besoin_praticien_figee', 'constats_besoin_praticien_avant_insertion',
                      'pieces_constats_besoin_praticien_avant_insertion',
                      'constats_besoin_praticien_suppression_nommee')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 16 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat constats_besoin_praticien_v1 : seize promesses tenues.';
END;
$$;

ROLLBACK;
