-- Contrat du rattachement d'un effet indésirable à un élément et du verdict du
-- praticien ([[D-281]], migration `20261012230000_saf_ei_rattachement_verdict_v1`).
--
-- Ce fichier éprouve TOUTES les promesses de la migration :
--   1. les formes valides sont ACCEPTÉES : signalement sans rattachement,
--      rattaché à un élément, « Je ne sais pas » ; verdict « impliqué », sa
--      CORRECTION chaînée, verdict désignant l'élément quand le patient ne
--      savait pas ; et le statut de traitement reste modifiable ;
--   2. les CHECK mordent (23514) sur les deux tables ;
--   3. les triggers refusent (P0001) : rattachement sans programme, programme
--      d'un autre patient, programme jamais approuvé pour diffusion, élément
--      absent du programme, rattachement ou programme modifiés après coup ; verdict sur un
--      signalement non rattaché ou d'un autre patient, élément impliqué autre
--      que celui du patient, élément absent, correction d'un verdict d'un autre
--      signalement ou de lui-même,
--      UPDATE et TRUNCATE d'un verdict ;
--   4. l'unicité (23505) : une seule racine par signalement, au plus un
--      successeur par verdict ;
--   5. les deux clés des verdicts sont RESTRICT (23503) : seul l'effacement
--      nommé supprime, verdicts d'abord — et cet effacement PASSE : un programme
--      supprimé laisse le signalement, rattachement intact ;
--   6. la table des verdicts porte EXACTEMENT neuf colonnes, et sa RLS
--      deny-all est active et sans policy.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat`. Un refus d'une AUTRE nature
-- fait aussi rougir : un cas qui échoue sur une clé étrangère ne prouve rien
-- du CHECK qu'il prétend viser. Le sous-bloc annule les effets du `sql`.
--
-- Pour un CHECK (23514), la CONTRAINTE elle-même est nommée et vérifiée : deux
-- CHECK de la même table rendent le même code, et un cas qui mord sur la
-- voisine ne prouve rien de celle qu'il vise.
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, contrainte text DEFAULT NULL) RETURNS void
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
    IF contrainte IS NOT NULL AND nom IS DISTINCT FROM contrainte THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par %, % attendue', cas, nom, contrainte;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT « % » : accepté alors qu''il devait être refusé', cas;
END;
$$;

DO $$
DECLARE
  H1 CONSTANT text := repeat('ab', 32);
  -- Les deux derniers identifiants sont MAL FORMÉS, et c'est voulu : présents
  -- au programme, ils passent le trigger, et le CHECK de forme reste le seul
  -- motif de refus possible.
  PAYLOAD CONSTANT jsonb := jsonb_build_object('actions', jsonb_build_array(
    jsonb_build_object('actionId', 'act_contrat_mag', 'type', 'supplement_exploration'),
    jsonb_build_object('actionId', 'act_contrat_rep', 'type', 'food'),
    jsonb_build_object('actionId', E'\t\t', 'type', 'food'),
    jsonb_build_object('actionId', repeat('a', 201), 'type', 'food')));
  -- Colonnes communes d'un signalement : le contrat ne vise que les neuves.
  COLS CONSTANT text := '(id, id_patient, produit_libelle, symptomes, severite_declaree, orientation, regle_id, regle_version, protocol_draft_id, rattachement, element_action_id)';
  VALS CONSTANT text := '''produit'', ''symptomes'', ''incertaine'', ''orientation'', ''SAF-EI-01'', ''1''';
  colonnes text[];
  nb integer;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_aev1', 'PAT_CONTRAT_AEV1', 'michel.dogne+aev@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_aev2', 'PAT_CONTRAT_AEV2', 'sophie.nicola+aev@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- Deux programmes du premier dossier : l'un approuvé pour diffusion,
  -- l'autre jamais ; un programme approuvé du second dossier.
  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_aev1', 'PAT_CONTRAT_AEV1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_aev1_brouillon', 'PAT_CONTRAT_AEV1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_aev2', 'PAT_CONTRAT_AEV2', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  VALUES
    ('pda_aev1', 'PAT_CONTRAT_AEV1', 'pd_aev1', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'),
    ('pda_aev2', 'PAT_CONTRAT_AEV2', 'pd_aev2', H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion');

  -- ── 1. ACCEPTÉS ───────────────────────────────────────────────────────────
  EXECUTE 'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES
    (''aer_libre'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', NULL, NULL, NULL),
    (''aer_element'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''element'', ''act_contrat_mag''),
    (''aer_nsp'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''ne_sait_pas'', NULL),
    (''aer_autre'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''autre_produit'', NULL),
    (''aer_aev2'', ''PAT_CONTRAT_AEV2'', ' || VALS || ', ''pd_aev2'', ''element'', ''act_contrat_rep'')';

  -- Le statut de traitement reste modifiable : seul le rattachement est figé.
  UPDATE trust_adverse_effect_reports SET statut_traitement = 'traite' WHERE id = 'aer_element';

  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par)
  VALUES ('aev_racine', 'PAT_CONTRAT_AEV1', 'aer_element', 'implique', 'act_contrat_mag', 'reduire', 'praticien@wellneuro.fr');
  -- La correction : un nouveau verdict qui supplante, l'ancien reste.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par, supersedes_verdict_id)
  VALUES ('aev_correction', 'PAT_CONTRAT_AEV1', 'aer_element', 'non_implique', 'praticien@wellneuro.fr', 'aev_racine');
  -- « Je ne sais pas » : le praticien désigne un élément du programme visé.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par)
  VALUES ('aev_nsp', 'PAT_CONTRAT_AEV1', 'aer_nsp', 'implique', 'act_contrat_rep', 'differer', 'praticien@wellneuro.fr');
  -- « Un autre produit » : le praticien désigne « aucun ».
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par)
  VALUES ('aev_autre', 'PAT_CONTRAT_AEV1', 'aer_autre', 'non_implique', 'praticien@wellneuro.fr');
  -- … puis se corrige : il désigne un élément, impliqué.
  INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id)
  VALUES ('aev_autre_corrige', 'PAT_CONTRAT_AEV1', 'aer_autre', 'implique', 'act_contrat_mag', 'retirer', 'praticien@wellneuro.fr', 'aev_autre');

  SELECT count(*) INTO nb FROM trust_adverse_effect_verdicts WHERE report_id = 'aer_element';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : la correction devait laisser deux verdicts lisibles, % trouvé(s)', nb;
  END IF;

  -- ── 2. CHECK DU SIGNALEMENT (23514) ──────────────────────────────────────
  PERFORM pg_temp.refuse('rattachement hors liste', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''programme'', NULL)', 'trust_aer_rattachement_check');
  PERFORM pg_temp.refuse('élément sans rattachement', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', NULL, ''act_contrat_mag'')', 'trust_aer_rattachement_coherence_check');
  PERFORM pg_temp.refuse('rattachement element sans élément', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''element'', NULL)', 'trust_aer_rattachement_coherence_check');
  PERFORM pg_temp.refuse('ne_sait_pas avec élément', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''ne_sait_pas'', ''act_contrat_mag'')', 'trust_aer_rattachement_coherence_check');
  PERFORM pg_temp.refuse('élément réduit à des tabulations', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''element'', E''\t\t'')', 'trust_aer_element_action_id_check');
  PERFORM pg_temp.refuse('élément au-delà de 200', '23514',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''element'', repeat(''a'', 201))', 'trust_aer_element_action_id_check');

  -- ── 3a. TRIGGER DU SIGNALEMENT (P0001) ───────────────────────────────────
  PERFORM pg_temp.refuse('rattaché sans programme', 'P0001',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', NULL, ''ne_sait_pas'', NULL)');
  PERFORM pg_temp.refuse('programme d''un autre patient', 'P0001',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev2'', ''ne_sait_pas'', NULL)');
  PERFORM pg_temp.refuse('programme jamais approuvé pour diffusion', 'P0001',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1_brouillon'', ''ne_sait_pas'', NULL)');
  PERFORM pg_temp.refuse('élément absent du programme', 'P0001',
    'INSERT INTO trust_adverse_effect_reports ' || COLS || ' VALUES (''x'', ''PAT_CONTRAT_AEV1'', ' || VALS || ', ''pd_aev1'', ''element'', ''act_contrat_absent'')');
  PERFORM pg_temp.refuse('rattachement posé après coup', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = ''pd_aev1'', rattachement = ''ne_sait_pas'' WHERE id = ''aer_libre''');
  PERFORM pg_temp.refuse('élément changé après coup', 'P0001',
    'UPDATE trust_adverse_effect_reports SET element_action_id = ''act_contrat_rep'' WHERE id = ''aer_element''');
  PERFORM pg_temp.refuse('programme re-pointé après coup', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = ''pd_aev1_brouillon'' WHERE id = ''aer_element''');
  PERFORM pg_temp.refuse('programme re-pointé vers un autre patient', 'P0001',
    'UPDATE trust_adverse_effect_reports SET protocol_draft_id = ''pd_aev2'' WHERE id = ''aer_nsp''');
  PERFORM pg_temp.refuse('signalement rattaché passé à un autre patient', 'P0001',
    'UPDATE trust_adverse_effect_reports SET id_patient = ''PAT_CONTRAT_AEV2'' WHERE id = ''aer_nsp''');

  -- Index de la clé vers `patients` : l'effacement supprime par `id_patient`.
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                  WHERE schemaname = 'public' AND tablename = 'trust_adverse_effect_verdicts'
                    AND indexname = 'trust_aev_patient_idx'
                    AND indexdef LIKE '%(id_patient)') THEN
    RAISE EXCEPTION 'CONTRAT : index trust_aev_patient_idx (id_patient) absent';
  END IF;

  -- ── 2b. CHECK DU VERDICT (23514) ─────────────────────────────────────────
  PERFORM pg_temp.refuse('verdict hors liste', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_aev2'', ''traite'', ''p@w.fr'')', 'trust_aev_verdict_check');
  PERFORM pg_temp.refuse('aménagement « augmenter »', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', ''act_contrat_mag'', ''augmenter'', ''p@w.fr'')', 'trust_aev_amenagement_check');
  PERFORM pg_temp.refuse('aménagement « reconduire »', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', ''act_contrat_mag'', ''reconduire'', ''p@w.fr'')', 'trust_aev_amenagement_check');
  PERFORM pg_temp.refuse('impliqué sans aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', ''act_contrat_mag'', ''p@w.fr'')', 'trust_aev_coherence_check');
  -- « Impliqué » SANS ÉLÉMENT est admis depuis la migration
  -- `20261016110000_saf_ei_avis_implique_sans_element_v1` (D-281 §5,
  -- arbitrage du 2026-10-16), avec un aménagement : son contrat est
  -- `trust_aev_implique_sans_element_v1_negatif.sql`. Reste refusé ici :
  -- sans élément NI aménagement.
  PERFORM pg_temp.refuse('impliqué sans élément ni aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', ''p@w.fr'')', 'trust_aev_coherence_check');
  PERFORM pg_temp.refuse('non impliqué avec aménagement', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''non_implique'', ''retirer'', ''p@w.fr'')', 'trust_aev_coherence_check');
  PERFORM pg_temp.refuse('non impliqué avec élément', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''non_implique'', ''act_contrat_mag'', ''p@w.fr'')', 'trust_aev_coherence_check');
  PERFORM pg_temp.refuse('auteur réduit à des tabulations', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_aev2'', ''non_implique'', E''\t'')', 'trust_aev_rendu_par_check');
  -- Les deux identifiants mal formés FIGURENT au programme : le trigger passe,
  -- le CHECK de forme reste le seul motif de refus.
  PERFORM pg_temp.refuse('élément du verdict réduit à des tabulations', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', E''\t\t'', ''retirer'', ''p@w.fr'', ''aev_nsp'')', 'trust_aev_element_action_id_check');
  PERFORM pg_temp.refuse('élément du verdict au-delà de 200', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', repeat(''a'', 201), ''retirer'', ''p@w.fr'', ''aev_nsp'')', 'trust_aev_element_action_id_check');
  PERFORM pg_temp.refuse('auteur au-delà de 320', '23514',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_aev2'', ''non_implique'', repeat(''a'', 321))', 'trust_aev_rendu_par_check');
  PERFORM pg_temp.refuse('verdict qui se supplante lui-même', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_aev2'', ''non_implique'', ''p@w.fr'', ''x'')');

  -- ── 3b. TRIGGERS DU VERDICT (P0001) ──────────────────────────────────────
  PERFORM pg_temp.refuse('verdict sur un signalement non rattaché', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_libre'', ''non_implique'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('verdict d''un autre patient', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_nsp'', ''non_implique'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('verdict sur un signalement inexistant', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_absent'', ''non_implique'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('élément impliqué autre que celui du patient', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV2'', ''aer_aev2'', ''implique'', ''act_contrat_mag'', ''retirer'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('élément désigné absent du programme', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, element_action_id, amenagement, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''implique'', ''act_contrat_absent'', ''retirer'', ''p@w.fr'', ''aev_nsp'')');
  PERFORM pg_temp.refuse('correction d''un verdict d''un autre signalement', 'P0001',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_nsp'', ''non_implique'', ''p@w.fr'', ''aev_autre'')');
  PERFORM pg_temp.refuse('UPDATE d''un verdict', 'P0001',
    'UPDATE trust_adverse_effect_verdicts SET verdict = ''non_implique'', element_action_id = NULL, amenagement = NULL WHERE id = ''aev_nsp''');
  PERFORM pg_temp.refuse('TRUNCATE des verdicts', 'P0001',
    'TRUNCATE trust_adverse_effect_verdicts');

  -- ── 4. UNICITÉ (23505) ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('seconde racine sur le même signalement', '23505',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_element'', ''non_implique'', ''p@w.fr'')');
  PERFORM pg_temp.refuse('second successeur du même verdict', '23505',
    'INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par, supersedes_verdict_id) VALUES (''x'', ''PAT_CONTRAT_AEV1'', ''aer_element'', ''non_implique'', ''p@w.fr'', ''aev_racine'')');

  -- ── 5. RESTRICT (23503) ──────────────────────────────────────────────────
  PERFORM pg_temp.refuse('signalement supprimé avant ses verdicts', '23503',
    'DELETE FROM trust_adverse_effect_reports WHERE id = ''aer_nsp''');

  SELECT count(*) INTO nb FROM information_schema.referential_constraints
   WHERE constraint_schema = 'public'
     AND constraint_name IN ('trust_adverse_effect_verdicts_id_patient_fkey',
                             'trust_adverse_effect_verdicts_report_id_fkey')
     AND delete_rule = 'RESTRICT';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : les deux clés des verdicts doivent être en ON DELETE RESTRICT, % le sont', nb;
  END IF;

  -- L'EFFACEMENT IDP2 PASSE : il supprime les approbations puis les versions
  -- de protocole AVANT les signalements. Le `ON DELETE SET NULL` est un UPDATE
  -- du signalement, que le gel du rattachement doit laisser passer — c'est la
  -- raison pour laquelle la garde est un trigger et pas un CHECK. Joué en
  -- dernier : il détruit le programme des fixtures.
  DELETE FROM protocol_diffusion_approvals WHERE protocol_draft_id = 'pd_aev1';
  DELETE FROM protocol_drafts WHERE id = 'pd_aev1';
  SELECT count(*) INTO nb FROM trust_adverse_effect_reports
   WHERE id = 'aer_element' AND protocol_draft_id IS NULL
     AND rattachement = 'element' AND element_action_id = 'act_contrat_mag';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT : le signalement devait survivre au programme supprimé, rattachement intact';
  END IF;

  -- ── 6. COLONNES ET RLS ───────────────────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'trust_adverse_effect_verdicts';
  IF colonnes IS DISTINCT FROM ARRAY[
    'amenagement', 'element_action_id', 'id', 'id_patient', 'rendu_le',
    'rendu_par', 'report_id', 'supersedes_verdict_id', 'verdict'
  ] THEN
    RAISE EXCEPTION 'CONTRAT : colonnes inattendues sur trust_adverse_effect_verdicts : %', colonnes;
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.trust_adverse_effect_verdicts'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT : RLS inactive sur trust_adverse_effect_verdicts';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'trust_adverse_effect_verdicts';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT : % policy(s) sur trust_adverse_effect_verdicts, deny-all attendu', nb;
  END IF;

  RAISE NOTICE 'CONTRAT trust_aer_rattachement_verdict_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
