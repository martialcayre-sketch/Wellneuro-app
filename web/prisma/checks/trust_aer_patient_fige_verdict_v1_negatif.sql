-- Contrat du patient figé dès qu'un avis existe ([[D-281]] §5, migration
-- `20261015090000_saf_ei_patient_fige_verdict_v1` ; revue CodeRabbit de #1464).
--
-- Ce fichier éprouve la promesse de la migration, de part et d'autre de
-- l'effacement IDP2 :
--   1. AVANT l'effacement, le patient d'un signalement du formulaire d'avant
--      qui porte un avis est figé par la garde existante (signalement lié à
--      un programme) — message inchangé ;
--   2. APRÈS l'effacement (programme supprimé, `protocol_draft_id` mis à
--      NULL), il reste figé, par la garde neuve (signalement qui porte un
--      avis) ;
--   3. la garde neuve ne mord que sur l'avis : le patient d'un signalement
--      délié SANS avis reste modifiable, et le statut de traitement d'un
--      signalement qui porte un avis aussi.
-- Les contrats du lot 2 (`trust_aer_rattachement_verdict_v1_negatif.sql`) et
-- du formulaire d'avant (`trust_aev_formulaire_avant_v1_negatif.sql`)
-- continuent d'éprouver le reste, inchangés.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat` dont le message contient
-- `motif` : deux refus P0001 du même trigger ne se distinguent que par leur
-- message, et un cas qui mord sur la garde voisine ne prouve rien de celle
-- qu'il vise.
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, motif text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> etat THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé pour une autre raison (% : %), % attendu', cas, SQLSTATE, SQLERRM, etat;
    END IF;
    IF position(motif IN SQLERRM) = 0 THEN
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
    jsonb_build_object('actionId', 'act_contrat_mag', 'type', 'supplement_exploration')));
  COLS CONSTANT text := '(id, id_patient, produit_libelle, symptomes, severite_declaree, orientation, regle_id, regle_version, protocol_draft_id)';
  VALS CONSTANT text := '''produit'', ''symptomes'', ''incertaine'', ''orientation'', ''SAF-EI-01'', ''1''';
  nb integer;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_pf1', 'PAT_CONTRAT_PF1', 'sophie.nicola+pf@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_pf2', 'PAT_CONTRAT_PF2', 'jennifer.martin+pf@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_pf1', 'PAT_CONTRAT_PF1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  VALUES
    ('pda_pf1', 'PAT_CONTRAT_PF1', 'pd_pf1', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion');

  -- Deux signalements du formulaire d'avant : programme renseigné, aucun
  -- rattachement ; le premier recevra un avis, le second aucun.
  EXECUTE 'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES
    (''aer_pf_avis'', ''PAT_CONTRAT_PF1'', ' || VALS || ', ''pd_pf1''),
    (''aer_pf_sans'', ''PAT_CONTRAT_PF1'', ' || VALS || ', ''pd_pf1'')';

  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par)
  VALUES ('aev_pf', 'PAT_CONTRAT_PF1', 'aer_pf_avis', 'non_implique', 'praticien@wellneuro.fr');

  -- ── 1. AVANT L'EFFACEMENT : LA GARDE EXISTANTE ───────────────────────────
  PERFORM pg_temp.refuse('patient changé, signalement lié qui porte un avis', 'P0001',
    'UPDATE trust_adverse_effect_reports SET id_patient = ''PAT_CONTRAT_PF2'' WHERE id = ''aer_pf_avis''',
    'le patient d''un signalement lié à un programme est figé');

  -- ── L'EFFACEMENT IDP2 : programme supprimé ⇒ `protocol_draft_id` à NULL ──
  DELETE FROM protocol_diffusion_approvals WHERE protocol_draft_id = 'pd_pf1';
  DELETE FROM protocol_drafts WHERE id = 'pd_pf1';
  SELECT count(*) INTO nb FROM trust_adverse_effect_reports
   WHERE id IN ('aer_pf_avis', 'aer_pf_sans') AND protocol_draft_id IS NULL AND rattachement IS NULL;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : les deux signalements devaient être déliés par l''effacement, % sur 2', nb;
  END IF;

  -- ── 2. APRÈS L'EFFACEMENT : LA GARDE NEUVE ───────────────────────────────
  PERFORM pg_temp.refuse('patient changé, signalement délié qui porte un avis', 'P0001',
    'UPDATE trust_adverse_effect_reports SET id_patient = ''PAT_CONTRAT_PF2'' WHERE id = ''aer_pf_avis''',
    'le patient d''un signalement qui porte un avis est figé');

  -- ── 3. ACCEPTÉS : LA GARDE NEUVE NE MORD QUE SUR L'AVIS ─────────────────
  UPDATE trust_adverse_effect_reports SET statut_traitement = 'traite' WHERE id = 'aer_pf_avis';
  UPDATE trust_adverse_effect_reports SET id_patient = 'PAT_CONTRAT_PF2' WHERE id = 'aer_pf_sans';
  SELECT count(*) INTO nb FROM trust_adverse_effect_reports
   WHERE id = 'aer_pf_sans' AND id_patient = 'PAT_CONTRAT_PF2';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT : le patient d''un signalement délié sans avis devait rester modifiable';
  END IF;

  RAISE NOTICE 'CONTRAT trust_aer_patient_fige_verdict_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
