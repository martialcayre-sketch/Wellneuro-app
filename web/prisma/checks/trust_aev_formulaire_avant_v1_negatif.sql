-- Contrat de l'avis du praticien ouvert au formulaire d'avant ([[D-281]] §5,
-- migration `20261014230000_saf_ei_verdict_formulaire_avant_v1`).
--
-- Ce fichier éprouve TOUTES les promesses de la migration :
--   1. les formes valides sont ACCEPTÉES : verdict « non impliqué » sur un
--      signalement lié au programme sans rattachement, sa CORRECTION en
--      « impliqué » désignant un élément du programme, « impliqué » en
--      racine ; le statut de traitement reste modifiable, le patient d'un
--      signalement libre aussi ; l'effacement IDP2 (programme supprimé, donc
--      mis à NULL) PASSE ;
--   2. le trigger du verdict refuse (P0001) : signalement libre (ni rattaché
--      ni lié), programme d'un autre patient (ligne antérieure), élément
--      absent du programme ;
--   3. le trigger du signalement refuse (P0001) : signalement lié au
--      programme d'un autre patient, programme mis à NULL directement, posé
--      après coup sur un signalement libre, re-pointé sur un signalement lié ;
--      patient changé sur un signalement lié.
-- Le contrat du lot 2 (`trust_aer_rattachement_verdict_v1_negatif.sql`)
-- continue d'éprouver le reste, inchangé.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat`, et, si `motif` est donné,
-- un message qui le contient : deux refus P0001 du même trigger ne se
-- distinguent que par leur message, et un cas qui mord sur la garde voisine
-- ne prouve rien de celle qu'il vise.
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, motif text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> etat THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé pour une autre raison (% : %), % attendu', cas, SQLSTATE, SQLERRM, etat;
    END IF;
    IF motif IS NOT NULL AND position(motif IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par « % », motif « % » attendu', cas, SQLERRM, motif;
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
  -- Colonnes communes d'un signalement : le contrat ne vise que le lien.
  COLS CONSTANT text := '(id, id_patient, produit_libelle, symptomes, severite_declaree, orientation, regle_id, regle_version, protocol_draft_id)';
  VALS CONSTANT text := '''produit'', ''symptomes'', ''incertaine'', ''orientation'', ''SAF-EI-01'', ''1''';
  nb integer;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_fa1', 'PAT_CONTRAT_FA1', 'jennifer.martin+fa@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_fa2', 'PAT_CONTRAT_FA2', 'michel.dogne+fa@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- Deux programmes approuvés du premier dossier, un du second.
  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_fa1', 'PAT_CONTRAT_FA1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_fa1_bis', 'PAT_CONTRAT_FA1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_fa2', 'PAT_CONTRAT_FA2', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  VALUES
    ('pda_fa1', 'PAT_CONTRAT_FA1', 'pd_fa1', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'),
    ('pda_fa1_bis', 'PAT_CONTRAT_FA1', 'pd_fa1_bis', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'),
    ('pda_fa2', 'PAT_CONTRAT_FA2', 'pd_fa2', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion');

  -- Le formulaire d'avant : programme renseigné, aucun rattachement.
  EXECUTE 'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES
    (''aer_fa_libre'', ''PAT_CONTRAT_FA1'', ' || VALS || ', NULL),
    (''aer_fa_avant'', ''PAT_CONTRAT_FA1'', ' || VALS || ', ''pd_fa1''),
    (''aer_fa_avant_bis'', ''PAT_CONTRAT_FA1'', ' || VALS || ', ''pd_fa1''),
    (''aer_fa_avant_ter'', ''PAT_CONTRAT_FA1'', ' || VALS || ', ''pd_fa1'')';

  -- Une ligne ANTÉRIEURE à la migration qui viserait le programme d'un autre
  -- patient : la garde d'insertion la refuse désormais (§3), on la pose donc
  -- trigger coupé, pour éprouver la garde du verdict qui la protège encore.
  ALTER TABLE trust_adverse_effect_reports DISABLE TRIGGER trust_aer_rattachement_garde;
  EXECUTE 'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES
    (''aer_fa_etranger'', ''PAT_CONTRAT_FA1'', ' || VALS || ', ''pd_fa2'')';
  ALTER TABLE trust_adverse_effect_reports ENABLE TRIGGER trust_aer_rattachement_garde;

  -- ── 1. ACCEPTÉS ───────────────────────────────────────────────────────────
  UPDATE trust_adverse_effect_reports SET statut_traitement = 'traite' WHERE id = 'aer_fa_avant';
  -- La garde du patient ne s'étend pas au signalement libre.
  UPDATE trust_adverse_effect_reports SET id_patient = 'PAT_CONTRAT_FA2' WHERE id = 'aer_fa_libre';
  UPDATE trust_adverse_effect_reports SET id_patient = 'PAT_CONTRAT_FA1' WHERE id = 'aer_fa_libre';

  -- « Impliqué » d'emblée, en racine.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par)
  VALUES ('aev_fa_ter', 'PAT_CONTRAT_FA1', 'aer_fa_avant_ter', 'implique', 'act_contrat_mag', 'retirer', 'praticien@wellneuro.fr');

  -- Le praticien désigne « aucun »…
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par)
  VALUES ('aev_fa_racine', 'PAT_CONTRAT_FA1', 'aer_fa_avant', 'non_implique', 'praticien@wellneuro.fr');
  -- … puis se corrige : il désigne un élément du programme, impliqué.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id)
  VALUES ('aev_fa_correction', 'PAT_CONTRAT_FA1', 'aer_fa_avant', 'implique', 'act_contrat_rep', 'differer', 'praticien@wellneuro.fr', 'aev_fa_racine');

  SELECT count(*) INTO nb FROM trust_adverse_effect_verdicts WHERE report_id = 'aer_fa_avant';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : la correction devait laisser deux verdicts lisibles, % trouvé(s)', nb;
  END IF;

  -- ── 2. TRIGGER DU VERDICT (P0001) ────────────────────────────────────────
  PERFORM pg_temp.refuse('verdict sur un signalement libre', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_FA1'', ''aer_fa_libre'', ''non_implique'', ''p@w.fr'')',
    'seul un signalement rattaché ou lié à un programme');
  PERFORM pg_temp.refuse('verdict sur un programme d''un autre patient', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_FA1'', ''aer_fa_etranger'', ''non_implique'', ''p@w.fr'')',
    'programme visé n''est pas celui du patient');
  PERFORM pg_temp.refuse('élément absent du programme', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_FA1'', ''aer_fa_avant_bis'', ''implique'', ''act_contrat_absent'', ''retirer'', ''p@w.fr'')',
    'ne figure pas dans le programme visé');

  -- ── 3. TRIGGER DU SIGNALEMENT (P0001) ────────────────────────────────────
  PERFORM pg_temp.refuse('signalement lié au programme d''un autre patient', 'P0001',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_FA1'', ' || VALS || ', ''pd_fa2'')',
    'programme visé n''est pas celui du patient');
  PERFORM pg_temp.refuse('programme mis à NULL directement', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = NULL WHERE id = ''aer_fa_avant_bis''',
    'le programme visé par un signalement est figé');
  PERFORM pg_temp.refuse('programme posé après coup', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = ''pd_fa1'' WHERE id = ''aer_fa_libre''',
    'le programme visé par un signalement est figé');
  PERFORM pg_temp.refuse('programme re-pointé sur le formulaire d''avant', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = ''pd_fa1_bis'' WHERE id = ''aer_fa_avant''',
    'le programme visé par un signalement est figé');
  PERFORM pg_temp.refuse('patient changé sur le formulaire d''avant', 'P0001',
    'UPDATE trust_adverse_effect_reports SET id_patient = ''PAT_CONTRAT_FA2'' WHERE id = ''aer_fa_avant_bis''',
    'le patient d''un signalement lié à un programme est figé');

  -- L'EFFACEMENT IDP2 PASSE : programme supprimé ⇒ `protocol_draft_id` mis à
  -- NULL sur des signalements liés, dont un porte deux verdicts. Joué en
  -- dernier : il détruit le programme des fixtures.
  DELETE FROM protocol_diffusion_approvals WHERE protocol_draft_id = 'pd_fa1';
  DELETE FROM protocol_drafts WHERE id = 'pd_fa1';
  SELECT count(*) INTO nb FROM trust_adverse_effect_reports
   WHERE id IN ('aer_fa_avant', 'aer_fa_avant_bis') AND protocol_draft_id IS NULL;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : les signalements liés devaient survivre au programme supprimé, % sur 2', nb;
  END IF;

  RAISE NOTICE 'CONTRAT trust_aev_formulaire_avant_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
