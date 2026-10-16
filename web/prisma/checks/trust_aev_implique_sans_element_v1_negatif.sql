-- Contrat de l'avis « impliqué, élément non identifiable » ([[D-281]] §5,
-- arbitrage du 2026-10-16 ; migration
-- `20261016110000_saf_ei_avis_implique_sans_element_v1`).
--
-- Ce fichier éprouve TOUTES les promesses de la migration :
--   1. ACCEPTÉS : « impliqué » sans élément, avec aménagement, sur « Je ne
--      sais pas », sur « un autre produit » et sur le formulaire d'avant ; sa
--      correction en « non impliqué », puis en « impliqué » désignant un
--      élément ;
--   2. CHECK (23514, `trust_aev_coherence_check`) : « impliqué » sans
--      aménagement, avec ou sans élément ; « non impliqué » avec aménagement ;
--   3. TRIGGER (P0001) : « impliqué » sans élément sur un signalement dont le
--      patient a désigné l'élément ; sur un signalement rattaché qui ne vise
--      plus aucun programme (effacement IDP2) ; les gardes voisines tiennent
--      (élément autre que celui du patient, élément absent du programme).
-- « Seulement si le programme visé est illisible » n'est PAS tenu par la
-- base (l'intégrité se juge par une empreinte que seul le code recalcule) :
-- la route du verdict le tient.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat`. Pour un CHECK (23514), la
-- contrainte est nommée ; pour un trigger (P0001), le motif du message : un
-- cas qui mord sur la garde voisine ne prouve rien de celle qu'il vise.
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, attendu text DEFAULT NULL) RETURNS void
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
    IF attendu IS NOT NULL AND etat = '23514' AND nom IS DISTINCT FROM attendu THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par %, % attendue', cas, nom, attendu;
    END IF;
    IF attendu IS NOT NULL AND etat <> '23514' AND position(attendu IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par « % », motif « % » attendu', cas, SQLERRM, attendu;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT « % » : accepté alors qu''il devait être refusé', cas;
END;
$$;

DO $$
DECLARE
  H1 CONSTANT text := repeat('ab', 32);
  PAYLOAD CONSTANT jsonb := jsonb_build_object('actions', jsonb_build_array(
    jsonb_build_object('actionId', 'act_contrat_mag', 'type', 'supplement_exploration'),
    jsonb_build_object('actionId', 'act_contrat_rep', 'type', 'food')));
  COLS CONSTANT text := '(id, id_patient, produit_libelle, symptomes, severite_declaree, orientation, regle_id, regle_version, protocol_draft_id, rattachement, element_action_id)';
  VALS CONSTANT text := '''produit'', ''symptomes'', ''incertaine'', ''orientation'', ''SAF-EI-01'', ''1''';
  nb integer;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_ise', 'PAT_CONTRAT_ISE', 'sophie.nicola+ise@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_ise', 'PAT_CONTRAT_ISE', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_ise_efface', 'PAT_CONTRAT_ISE', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  VALUES
    ('pda_ise', 'PAT_CONTRAT_ISE', 'pd_ise', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'),
    ('pda_ise_efface', 'PAT_CONTRAT_ISE', 'pd_ise_efface', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion');

  EXECUTE 'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES
    (''aer_ise_element'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise'', ''element'', ''act_contrat_mag''),
    (''aer_ise_nsp'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise'', ''ne_sait_pas'', NULL),
    (''aer_ise_autre'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise'', ''autre_produit'', NULL),
    (''aer_ise_avant'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise'', NULL, NULL),
    (''aer_ise_vide'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise'', ''ne_sait_pas'', NULL),
    (''aer_ise_delie'', ''PAT_CONTRAT_ISE'', ' || VALS || ', ''pd_ise_efface'', ''ne_sait_pas'', NULL)';

  -- ── 1. ACCEPTÉS ───────────────────────────────────────────────────────────
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, amenagement, rendu_par)
  VALUES
    ('aev_ise_nsp', 'PAT_CONTRAT_ISE', 'aer_ise_nsp', 'implique', 'retirer', 'praticien@wellneuro.fr'),
    ('aev_ise_autre', 'PAT_CONTRAT_ISE', 'aer_ise_autre', 'implique', 'differer', 'praticien@wellneuro.fr'),
    ('aev_ise_avant', 'PAT_CONTRAT_ISE', 'aer_ise_avant', 'implique', 'reduire', 'praticien@wellneuro.fr');
  -- La correction en « non impliqué », puis en « impliqué » sur un élément.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par, supersedes_verdict_id)
  VALUES ('aev_ise_nsp_2', 'PAT_CONTRAT_ISE', 'aer_ise_nsp', 'non_implique', 'praticien@wellneuro.fr', 'aev_ise_nsp');
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id)
  VALUES ('aev_ise_nsp_3', 'PAT_CONTRAT_ISE', 'aer_ise_nsp', 'implique', 'act_contrat_rep', 'retirer', 'praticien@wellneuro.fr', 'aev_ise_nsp_2');

  SELECT count(*) INTO nb FROM trust_adverse_effect_verdicts WHERE id_patient = 'PAT_CONTRAT_ISE';
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT : cinq avis devaient être écrits, % trouvé(s)', nb;
  END IF;

  -- ── 2. CHECK (23514) ─────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('impliqué sans élément ni aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_vide'', ''implique'', ''p@w.fr'')',
    'trust_aev_coherence_check');
  PERFORM pg_temp.refuse('impliqué avec élément sans aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_vide'', ''implique'', ''act_contrat_mag'', ''p@w.fr'')',
    'trust_aev_coherence_check');
  PERFORM pg_temp.refuse('non impliqué avec aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_vide'', ''non_implique'', ''retirer'', ''p@w.fr'')',
    'trust_aev_coherence_check');

  -- ── 3. TRIGGER (P0001) ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('impliqué sans élément sur un élément désigné par le patient', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_element'', ''implique'', ''retirer'', ''p@w.fr'')',
    'l''élément impliqué est celui que le patient a désigné');
  PERFORM pg_temp.refuse('élément autre que celui du patient', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_element'', ''implique'', ''act_contrat_rep'', ''retirer'', ''p@w.fr'')',
    'l''élément impliqué est celui que le patient a désigné');
  PERFORM pg_temp.refuse('élément absent du programme', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_vide'', ''implique'', ''act_contrat_absent'', ''retirer'', ''p@w.fr'')',
    'ne figure pas dans le programme visé');

  -- Un signalement rattaché délié de son programme par l'effacement IDP2
  -- (`ON DELETE SET NULL`) : « impliqué » sans élément n'y vise plus rien.
  DELETE FROM protocol_diffusion_approvals WHERE protocol_draft_id = 'pd_ise_efface';
  DELETE FROM protocol_drafts WHERE id = 'pd_ise_efface';
  PERFORM pg_temp.refuse('impliqué sans élément sur un signalement délié', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_ISE'', ''aer_ise_delie'', ''implique'', ''retirer'', ''p@w.fr'')',
    'un avis « impliqué » sans élément vise un programme');

  RAISE NOTICE 'CONTRAT trust_aev_implique_sans_element_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
