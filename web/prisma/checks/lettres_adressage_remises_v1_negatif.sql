-- Contrat des remises de lettre d'adressage au patient ([[D-262]], LOT-01).
--
-- La table promet QUATORZE choses, et ce fichier les éprouve TOUTES :
--   1. une remise valide s'écrit ; l'instant et l'`ordre` sont posés par la
--      BASE, l'empreinte est celle du texte ;
--   2. un clic rejoué ne remet rien (zéro ligne, sans erreur) ;
--   3. une approbation d'un AUTRE dossier, ou croisée (ce dossier, le
--      protocole d'un autre), est refusée ;
--   4. un protocole qui ne s'OUVRE PAS sur l'orientation est refusé — sans
--      action, orientation ailleurs qu'en tête, mauvais type, ou orientation
--      ordinaire (autre identifiant) ;
--   5. la lettre d'un autre dossier, une lettre entrante, une correspondance
--      sans ancrage ou ancrée ailleurs (biologie) sont refusées ;
--   6. un texte qui n'est pas celui de la lettre est refusé ;
--   7. une empreinte qui n'est pas celle du texte est refusée (CHECK) ;
--   8. une lettre qui n'est pas LA lettre due est refusée : sans couverture,
--      couverture révoquée, couverture sur une consultation qui n'est plus la
--      porteuse, ou lettre active mais pas la plus récente ;
--   9. une lettre plus récente se remet et devient la remise en cours ; la
--      précédente se remet de nouveau si la plus récente est révoquée ;
--  10. UPDATE et TRUNCATE sont refusés ;
--  11. l'effacement nommé passe ; approbation et lettre ne s'effacent pas
--      avant leurs remises (RESTRICT) ;
--  12. FK, CHECK et index annoncés présents ;
--  13. la table porte EXACTEMENT ses huit colonnes ;
--  14. RLS deny-all sans policy, fonctions non exécutables par PUBLIC, et
--      l'espèce de lecture `lettre_adressage` admise (une inconnue refusée).
--
-- Chaque refus du trigger est reconnu à son MESSAGE. Identités de fixture
-- seulement ; tout se déroule dans une transaction annulée.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

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

-- Une remise, en SQL : le texte est relu de la lettre, l'empreinte calculée.
CREATE FUNCTION pg_temp.remettre(id_remise text, patient text, approbation text, lettre text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  nb integer;
BEGIN
  INSERT INTO lettres_adressage_remises (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256)
  SELECT id_remise, patient, approbation, c.id, c.texte, encode(sha256(convert_to(c.texte, 'UTF8')), 'hex')
  FROM correspondances_medecin c WHERE c.id = lettre;
  GET DIAGNOSTICS nb = ROW_COUNT;
  RETURN nb;
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_lar_a', 'PAT_CONTRAT_LAR_A', 'sophie.nicola+lettre@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_lar_b', 'PAT_CONTRAT_LAR_B', 'jennifer.martin+lettre@example.test', 'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, anamnese, date_validation, updated_at) VALUES
  ('cons_lar_a', 'CONS_LAR_A', 'PAT_CONTRAT_LAR_A', 'sophie.nicola+lettre@example.test', 'praticien@wellneuro.fr', 'validee', '{}'::jsonb, TIMESTAMP '2026-09-01 08:00:00', CURRENT_TIMESTAMP),
  ('cons_lar_b', 'CONS_LAR_B', 'PAT_CONTRAT_LAR_B', 'jennifer.martin+lettre@example.test', 'praticien@wellneuro.fr', 'validee', '{}'::jsonb, TIMESTAMP '2026-09-01 08:00:00', CURRENT_TIMESTAMP);

INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version) VALUES
  ('lar_a_1', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, première lettre.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lar_a_2', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, seconde lettre.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lar_a_revoquee', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, lettre révoquée.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lar_a_nue', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, lettre sans couverture.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lar_a_bio', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, biologie.', repeat('b', 64), 'indications-biologie-v1'),
  ('lar_a_entrante', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'entrant', 'Dr Test', 'Réponse.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lar_b_1', 'PAT_CONTRAT_LAR_B', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, autre dossier.', repeat('a', 64), 'safety-signals-nnpp2-v1');
INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte) VALUES
  ('lar_a_main', 'PAT_CONTRAT_LAR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Texte saisi à la main.');

-- Les couvertures : même transaction que les lettres (le trigger des adressages l'exige).
INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email) VALUES
  ('cov_a_1', 'PAT_CONTRAT_LAR_A', 'adressage', 'lar_a_1', 'cons_lar_a', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr'),
  ('cov_a_rev', 'PAT_CONTRAT_LAR_A', 'adressage', 'lar_a_revoquee', 'cons_lar_a', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr'),
  ('cov_b_1', 'PAT_CONTRAT_LAR_B', 'adressage', 'lar_b_1', 'cons_lar_b', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr');
INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email) VALUES
  ('rev_a', 'PAT_CONTRAT_LAR_A', 'revocation', 'cov_a_rev', 'Consignée par erreur.', 'p@wellneuro.fr');

DO $$
DECLARE
  H CONSTANT text := repeat('a', 64);
  ORIENTE CONSTANT jsonb := '{"actions": [{"actionId": "orientation-medecin", "type": "medical_referral"}, {"actionId": "a1", "type": "food"}]}';
  SANS_ORIENTATION CONSTANT jsonb := '{"actions": [{"actionId": "a1", "type": "food"}]}';
  ORIENTATION_EN_SECOND CONSTANT jsonb := '{"actions": [{"actionId": "a1", "type": "food"}, {"actionId": "orientation-medecin", "type": "medical_referral"}]}';
  MAUVAIS_TYPE CONSTANT jsonb := '{"actions": [{"actionId": "orientation-medecin", "type": "food"}]}';
  ORIENTATION_ORDINAIRE CONSTANT jsonb := '{"actions": [{"actionId": "a1", "type": "medical_referral"}]}';
  nb integer;
  ligne record;
  colonnes text[];
  en_cours text;
BEGIN
  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_lar_a', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', ORIENTE, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_a_sans', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', SANS_ORIENTATION, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_a_second', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', ORIENTATION_EN_SECOND, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_a_type', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', MAUVAIS_TYPE, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_a_vide', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', '{}'::jsonb, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_a_ordinaire', 'PAT_CONTRAT_LAR_A', 'dc', H, H, H, 'prio', ORIENTATION_ORDINAIRE, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP),
    ('pd_lar_b', 'PAT_CONTRAT_LAR_B', 'dc', H, H, H, 'prio', ORIENTE, H, 'c1-protocol-draft-v1', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  SELECT c.id, c.patient, c.draft, H, H, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'
  FROM (VALUES
    ('pda_lar_a1', 'PAT_CONTRAT_LAR_A', 'pd_lar_a'),
    ('pda_lar_a2', 'PAT_CONTRAT_LAR_A', 'pd_lar_a'),
    ('pda_lar_a3', 'PAT_CONTRAT_LAR_A', 'pd_lar_a'),
    ('pda_lar_a4', 'PAT_CONTRAT_LAR_A', 'pd_lar_a'),
    ('pda_lar_a_sans', 'PAT_CONTRAT_LAR_A', 'pd_lar_a_sans'),
    ('pda_lar_a_second', 'PAT_CONTRAT_LAR_A', 'pd_lar_a_second'),
    ('pda_lar_a_type', 'PAT_CONTRAT_LAR_A', 'pd_lar_a_type'),
    ('pda_lar_a_vide', 'PAT_CONTRAT_LAR_A', 'pd_lar_a_vide'),
    ('pda_lar_a_ordinaire', 'PAT_CONTRAT_LAR_A', 'pd_lar_a_ordinaire'),
    ('pda_lar_b', 'PAT_CONTRAT_LAR_B', 'pd_lar_b'),
    ('pda_lar_croisee', 'PAT_CONTRAT_LAR_B', 'pd_lar_a')
  ) AS c(id, patient, draft);

  -- ── 1. Une remise valide ─────────────────────────────────────────────────
  INSERT INTO lettres_adressage_remises (id, ordre, id_patient, id_approbation, id_correspondance, texte, texte_sha256, remise_le)
  SELECT 'rem_1', 999999, 'PAT_CONTRAT_LAR_A', 'pda_lar_a1', c.id, c.texte,
         encode(sha256(convert_to(c.texte, 'UTF8')), 'hex'), TIMESTAMP '2000-01-01 00:00:00'
  FROM correspondances_medecin c WHERE c.id = 'lar_a_1';
  SELECT * INTO ligne FROM lettres_adressage_remises WHERE id = 'rem_1';
  IF ligne.texte <> 'Docteur, première lettre.' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : le texte relu n''est pas celui remis.';
  END IF;
  IF ligne.ordre = 999999 OR ligne.remise_le = TIMESTAMP '2000-01-01 00:00:00'
     OR abs(extract(epoch FROM (ligne.remise_le - (now() AT TIME ZONE 'UTC')))) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''ordre ou l''instant (UTC) n''ont pas été posés par la base.';
  END IF;

  -- ── 2. Idempotence ───────────────────────────────────────────────────────
  nb := pg_temp.remettre('rem_rejoue', 'PAT_CONTRAT_LAR_A', 'pda_lar_a2', 'lar_a_1');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : un clic rejoué a remis % ligne(s).', nb;
  END IF;

  -- Une seconde lettre est consignée : elle devient la lettre active la plus
  -- récente, et la première, toujours active, n'est plus la lettre due.
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
  VALUES ('cov_a_2', 'PAT_CONTRAT_LAR_A', 'adressage', 'lar_a_2', 'cons_lar_a', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr');

  -- ── 3. Approbation ───────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 approbation d''un autre dossier',
    $q$SELECT pg_temp.remettre('x3a', 'PAT_CONTRAT_LAR_A', 'pda_lar_b', 'lar_a_2')$q$,
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('3 approbation croisée',
    $q$SELECT pg_temp.remettre('x3b', 'PAT_CONTRAT_LAR_B', 'pda_lar_croisee', 'lar_b_1')$q$,
    'P0001', 'ne porte pas sur ce dossier');

  -- ── 4. Protocole ouvert sur l'orientation ────────────────────────────────
  PERFORM pg_temp.refuse('4 sans orientation',
    $q$SELECT pg_temp.remettre('x4a', 'PAT_CONTRAT_LAR_A', 'pda_lar_a_sans', 'lar_a_2')$q$,
    'P0001', 'ne s''ouvre pas sur l''orientation');
  PERFORM pg_temp.refuse('4 orientation en second',
    $q$SELECT pg_temp.remettre('x4b', 'PAT_CONTRAT_LAR_A', 'pda_lar_a_second', 'lar_a_2')$q$,
    'P0001', 'ne s''ouvre pas sur l''orientation');
  PERFORM pg_temp.refuse('4 mauvais type',
    $q$SELECT pg_temp.remettre('x4c', 'PAT_CONTRAT_LAR_A', 'pda_lar_a_type', 'lar_a_2')$q$,
    'P0001', 'ne s''ouvre pas sur l''orientation');
  PERFORM pg_temp.refuse('4 orientation ordinaire (autre identifiant)',
    $q$SELECT pg_temp.remettre('x4e', 'PAT_CONTRAT_LAR_A', 'pda_lar_a_ordinaire', 'lar_a_2')$q$,
    'P0001', 'ne s''ouvre pas sur l''orientation');
  PERFORM pg_temp.refuse('4 sans actions',
    $q$SELECT pg_temp.remettre('x4d', 'PAT_CONTRAT_LAR_A', 'pda_lar_a_vide', 'lar_a_2')$q$,
    'P0001', 'ne s''ouvre pas sur l''orientation');

  -- ── 5. Lettre d'adressage de ce dossier ──────────────────────────────────
  PERFORM pg_temp.refuse('5 lettre d''un autre dossier',
    $q$SELECT pg_temp.remettre('x5a', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_b_1')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('5 lettre entrante',
    $q$SELECT pg_temp.remettre('x5b', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_entrante')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('5 sans ancrage',
    $q$SELECT pg_temp.remettre('x5c', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_main')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('5 lettre de biologie',
    $q$SELECT pg_temp.remettre('x5d', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_bio')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');

  -- ── 6. Texte recopié ─────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('6 texte étranger',
    $q$INSERT INTO lettres_adressage_remises (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256)
       VALUES ('x6', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_2', 'Un autre texte.',
               encode(sha256(convert_to('Un autre texte.', 'UTF8')), 'hex'))$q$,
    'P0001', 'n''est pas celui de la lettre');

  -- ── 7. Empreinte ─────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('7 empreinte fausse',
    $q$INSERT INTO lettres_adressage_remises (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256)
       VALUES ('x7', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_2', 'Docteur, seconde lettre.', repeat('0', 64))$q$,
    '23514', 'lettres_adressage_remises_texte_sha256');

  -- ── 8. Lettre inactive ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('8 sans couverture',
    $q$SELECT pg_temp.remettre('x8a', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_nue')$q$,
    'P0001', 'aucune couverture active');
  PERFORM pg_temp.refuse('8 couverture révoquée',
    $q$SELECT pg_temp.remettre('x8b', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_revoquee')$q$,
    'P0001', 'aucune couverture active');
  PERFORM pg_temp.refuse('8 active mais pas la plus récente',
    $q$SELECT pg_temp.remettre('x8d', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_1')$q$,
    'P0001', 'n''est pas la lettre active la plus récente');

  -- ── 9. Une lettre plus récente devient la remise en cours ────────────────
  nb := pg_temp.remettre('rem_2', 'PAT_CONTRAT_LAR_A', 'pda_lar_a3', 'lar_a_2');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 9 : la seconde lettre n''a pas été remise.';
  END IF;
  -- La seconde est révoquée : la première redevient la lettre due.
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
  VALUES ('rev_a_2', 'PAT_CONTRAT_LAR_A', 'revocation', 'cov_a_2', 'Consignée par erreur.', 'p@wellneuro.fr');
  nb := pg_temp.remettre('rem_3', 'PAT_CONTRAT_LAR_A', 'pda_lar_a4', 'lar_a_1');
  SELECT id_correspondance INTO en_cours FROM lettres_adressage_remises
  WHERE id_patient = 'PAT_CONTRAT_LAR_A' ORDER BY ordre DESC LIMIT 1;
  IF nb <> 1 OR en_cours <> 'lar_a_1' THEN
    RAISE EXCEPTION 'CONTRAT — 9 : la première lettre redevenue la dernière n''est pas la remise en cours (%).', en_cours;
  END IF;

  -- ── 10. Figée ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('10 UPDATE',
    $q$UPDATE lettres_adressage_remises SET texte = 'réécrit' WHERE id = 'rem_1'$q$,
    'P0001', 'une remise est figée');
  PERFORM pg_temp.refuse('10 TRUNCATE',
    $q$TRUNCATE lettres_adressage_remises$q$,
    'P0001', 'une remise est figée');

  -- ── 11. Effacement et RESTRICT ───────────────────────────────────────────
  PERFORM pg_temp.refuse('11 approbation avant ses remises',
    $q$DELETE FROM protocol_diffusion_approvals WHERE id = 'pda_lar_a1'$q$,
    '23503', 'lettres_adressage_remises');
  PERFORM pg_temp.refuse('11 lettre avant ses remises',
    -- La couverture part dans la même instruction : seule la remise retient la lettre.
    $q$WITH c AS (DELETE FROM adressages_signal_alerte WHERE id_correspondance = 'lar_a_2' OR id_adressage_revoque = 'cov_a_2')
       DELETE FROM correspondances_medecin WHERE id = 'lar_a_2'$q$,
    '23503', 'lettres_adressage_remises');

  -- ── 8 (suite). Une consultation porteuse plus récente : la lettre n'est plus active.
  INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, anamnese, date_validation, updated_at)
  VALUES ('cons_lar_b_neuve', 'CONS_LAR_B_NEUVE', 'PAT_CONTRAT_LAR_B', 'jennifer.martin+lettre@example.test', 'praticien@wellneuro.fr',
          'validee', '{}'::jsonb, TIMESTAMP '2026-10-01 08:00:00', CURRENT_TIMESTAMP);
  PERFORM pg_temp.refuse('8 porteuse dépassée',
    $q$SELECT pg_temp.remettre('x8c', 'PAT_CONTRAT_LAR_B', 'pda_lar_b', 'lar_b_1')$q$,
    'P0001', 'aucune couverture active');

  DELETE FROM lettres_adressage_remises WHERE id_patient = 'PAT_CONTRAT_LAR_A';
  SELECT count(*) INTO nb FROM lettres_adressage_remises WHERE id_patient = 'PAT_CONTRAT_LAR_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : l''effacement nommé a laissé % remise(s).', nb;
  END IF;

  -- ── 12. FK, CHECK, index ─────────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.lettres_adressage_remises'::regclass AND contype = 'f' AND confdeltype = 'r';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clé(s) étrangère(s) RESTRICT sur 3.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.lettres_adressage_remises'::regclass AND contype = 'c'
    AND conname IN ('lettres_adressage_remises_texte_non_vide', 'lettres_adressage_remises_texte_sha256');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'lettres_adressage_remises'
    AND indexname IN ('lettres_adressage_remises_ordre_key', 'lettres_adressage_remises_patient_ordre_idx',
                      'lettres_adressage_remises_approbation_idx', 'lettres_adressage_remises_correspondance_idx');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % index sur 4.', nb;
  END IF;

  -- ── 13. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'lettres_adressage_remises';
  IF colonnes <> ARRAY['id', 'id_approbation', 'id_correspondance', 'id_patient', 'ordre', 'remise_le',
                       'texte', 'texte_sha256'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 14. RLS, fonctions, espèce de lecture ────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.lettres_adressage_remises'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'lettres_adressage_remises';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('lettres_adressage_remises_figee', 'lettres_adressage_remises_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet) VALUES ('PAT_CONTRAT_LAR_B', 'lettre_adressage', 'objet');
  PERFORM pg_temp.refuse('14 espèce inconnue',
    $q$INSERT INTO portail_lectures_patient (id_patient, espece, id_objet) VALUES ('PAT_CONTRAT_LAR_B', 'courrier', 'objet')$q$,
    '23514', 'portail_lectures_patient_espece_check');

  RAISE NOTICE 'Contrat lettres_adressage_remises_v1 : quatorze promesses tenues.';
END;
$$;

ROLLBACK;
