-- Contrat de la migration 20261107230000_identite_auteur_protocoles_v1
-- (BP-14, LOT-14, F10 ; D-459 §2, §4, §5). Exécuté après `prisma migrate
-- deploy` ; toutes les fixtures sont annulées (ROLLBACK).
--
-- La base du CI est construite VIDE : la reprise y est un no-op, et le CI seul
-- n'en prouverait rien. Ce banc rappelle la FONCTION que la migration appelle,
-- `identite_auteur_protocoles_reprise()`, sur des fixtures — pas une copie de
-- son prédicat. Il suppose une base sans auteur posé et sans praticien : c'est
-- celle du CI.
--
-- Il éprouve :
--   0. la forme : `cree_par` et `valide_par` existent, `text`, NULLABLES, sans
--      défaut ; `approved_by` est intact ; EXECUTE est retiré à PUBLIC sur les
--      deux fonctions ;
--   1. les insertions existantes, qui ne nomment pas les deux colonnes,
--      passent toujours, et laissent les deux colonnes nulles ;
--   2. la casse ne fait pas deux praticiens : le même e-mail en majuscules
--      dans le journal d'accès compte pour un ;
--   3. DEUX PRATICIENS DISTINCTS FONT ÉCHOUER LA REPRISE, SANS RIEN ÉCRIRE —
--      que le second vienne du journal d'accès ou des dossiers ;
--   4. une version relue (`practitioner_reviewed`) est remplie, en minuscules ;
--   5. une approbation est remplie ;
--   6. une version `draft` reste nulle ;
--   7. `updated_at` n'est pas touché par la reprise ;
--   8. aucune seconde reprise : rappelée, la fonction refuse ;
--   9. le verrou mord aussi quand seule une approbation porte un auteur ;
--  10. un dossier dont le `praticien_email` est blanc ne compte pas comme un
--      praticien, et ses lignes restent nulles.
--
-- CE QUE CE BANC NE PROUVE PAS, sur « sans rien écrire » (3) : il vérifie que
-- les lignes sont restées nulles après le refus, mais l'erreur est attrapée
-- dans un sous-bloc, qui annule de toute façon ce qu'il contient. La garantie
-- tient ailleurs : la garde passe AVANT toute écriture, dans la migration
-- comme dans la fonction (lecture du code), et une migration qui lève est
-- annulée en entier par Postgres (transaction implicite du script). Le banc
-- vérifie le refus et son code, pas l'ordre des instructions.
--
-- ERRCODE sentinelle WN459 (celui de la migration), attrapé seulement là où le
-- refus est attendu.
BEGIN;

DO $$
DECLARE
  H CONSTANT text := repeat('a', 64);
  EMAIL_A CONSTANT text := 'Praticien.Contrat@Example.test';
  r record;
  nb integer;
  v_cree text;
  v_draft text;
  v_valide text;
  maj_avant timestamp;
  maj_apres timestamp;
  refuse boolean;
BEGIN
  -- ── 0. Forme ─────────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'protocol_drafts' AND column_name = 'cree_par')
      OR (table_name = 'protocol_diffusion_approvals' AND column_name = 'valide_par'))
    AND data_type = 'text' AND is_nullable = 'YES' AND column_default IS NULL;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT 0 : attendu cree_par et valide_par text, nullables, sans défaut ; trouvé %', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'protocol_diffusion_approvals'
    AND column_name = 'approved_by' AND data_type = 'text' AND is_nullable = 'NO'
    AND column_default LIKE '''practitioner''%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 0 : approved_by doit rester text NOT NULL DEFAULT practitioner';
  END IF;

  IF has_function_privilege('public', 'public.identite_auteur_protocoles_reprise()', 'EXECUTE')
     OR has_function_privilege('public', 'public.identite_auteur_praticiens_distincts()', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRAT 0 : EXECUTE doit être retiré à PUBLIC sur les deux fonctions';
  END IF;

  IF public.identite_auteur_praticiens_distincts() <> 0
     OR EXISTS (SELECT 1 FROM protocol_drafts WHERE cree_par IS NOT NULL)
     OR EXISTS (SELECT 1 FROM protocol_diffusion_approvals WHERE valide_par IS NOT NULL) THEN
    RAISE EXCEPTION 'CONTRAT 0 : ce banc suppose la base vide du CI (aucun praticien, aucun auteur posé)';
  END IF;

  -- ── 1. Fixtures, insérées SANS les deux colonnes ────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_ida1', 'PAT_CONTRAT_IDA1', 'sophie.nicola+auteur@example.test',
     'Sophie', 'Nicola', EMAIL_A, CURRENT_TIMESTAMP),
    -- Praticien blanc (10) : la colonne est NOT NULL sans CHECK « non vide ».
    ('pat_contrat_ida3', 'PAT_CONTRAT_IDA3', 'jennifer.martin+auteur@example.test',
     'Jennifer', 'Martin', E' \t ', CURRENT_TIMESTAMP);

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, status, payload, input_hash, contract_version,
     reviewed_at, updated_at)
  VALUES
    ('pd_contrat_ida_relue', 'PAT_CONTRAT_IDA1', 'dc_contrat', H, H, H, 'prio_contrat',
     'practitioner_reviewed', '{}'::jsonb, H, 'c1-protocol-draft-v4',
     CURRENT_TIMESTAMP, TIMESTAMP '2026-01-02 03:04:05'),
    ('pd_contrat_ida_draft', 'PAT_CONTRAT_IDA1', 'dc_contrat', H, H, H, 'prio_contrat',
     'draft', '{"actor": "patient"}'::jsonb, H, 'ja-food-observation-v1',
     NULL, TIMESTAMP '2026-01-02 03:04:05'),
    ('pd_contrat_ida_blanc', 'PAT_CONTRAT_IDA3', 'dc_contrat', H, H, H, 'prio_contrat',
     'practitioner_reviewed', '{}'::jsonb, H, 'c1-protocol-draft-v4',
     CURRENT_TIMESTAMP, TIMESTAMP '2026-01-02 03:04:05');

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash,
     approved_at, confirmation)
  VALUES
    ('pda_contrat_ida', 'PAT_CONTRAT_IDA1', 'pd_contrat_ida_relue', H, H,
     CURRENT_TIMESTAMP, 'content_approved_for_diffusion'),
    ('pda_contrat_ida_blanc', 'PAT_CONTRAT_IDA3', 'pd_contrat_ida_blanc', H, H,
     CURRENT_TIMESTAMP, 'content_approved_for_diffusion');

  IF EXISTS (SELECT 1 FROM protocol_drafts WHERE id LIKE 'pd_contrat_ida%' AND cree_par IS NOT NULL)
     OR EXISTS (SELECT 1 FROM protocol_diffusion_approvals WHERE id LIKE 'pda_contrat_ida%' AND valide_par IS NOT NULL) THEN
    RAISE EXCEPTION 'CONTRAT 1 : une insertion sans les colonnes doit les laisser nulles';
  END IF;
  IF (SELECT approved_by FROM protocol_diffusion_approvals WHERE id = 'pda_contrat_ida') <> 'practitioner' THEN
    RAISE EXCEPTION 'CONTRAT 1 : approved_by doit toujours valoir practitioner par défaut';
  END IF;

  -- ── 2. La casse ne fait pas deux praticiens ─────────────────────────────
  INSERT INTO journal_acces_dossiers (id, id_patient, praticien_email, route, methode) VALUES
    ('jad_contrat_ida_casse', 'PAT_CONTRAT_IDA1', upper(EMAIL_A), '/contrat', 'GET');
  nb := public.identite_auteur_praticiens_distincts();
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 2/10 : le même e-mail à la casse près compte pour un, un praticien blanc pour aucun ; trouvé %', nb;
  END IF;

  -- ── 3a. Un second praticien dans le journal d'accès : refus ─────────────
  refuse := false;
  BEGIN
    INSERT INTO journal_acces_dossiers (id, id_patient, praticien_email, route, methode) VALUES
      ('jad_contrat_ida_autre', 'PAT_CONTRAT_IDA1', 'autre.praticien@example.test', '/contrat', 'GET');
    PERFORM * FROM public.identite_auteur_protocoles_reprise();
  EXCEPTION WHEN SQLSTATE 'WN459' THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'CONTRAT 3a : un second praticien dans le journal d''accès doit faire refuser la reprise';
  END IF;

  -- ── 3b. Un second praticien dans les dossiers : refus ───────────────────
  refuse := false;
  BEGIN
    INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
      ('pat_contrat_ida2', 'PAT_CONTRAT_IDA2', 'michel.dogne+auteur@example.test',
       'Michel', 'Dogné', 'autre.praticien@example.test', CURRENT_TIMESTAMP);
    PERFORM * FROM public.identite_auteur_protocoles_reprise();
  EXCEPTION WHEN SQLSTATE 'WN459' THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'CONTRAT 3b : un second praticien dans les dossiers doit faire refuser la reprise';
  END IF;

  -- … et les lignes sont restées nulles (voir l'en-tête : ce que cela prouve).
  IF EXISTS (SELECT 1 FROM protocol_drafts WHERE id LIKE 'pd_contrat_ida%' AND cree_par IS NOT NULL)
     OR EXISTS (SELECT 1 FROM protocol_diffusion_approvals WHERE id LIKE 'pda_contrat_ida%' AND valide_par IS NOT NULL) THEN
    RAISE EXCEPTION 'CONTRAT 3 : un refus ne doit rien écrire';
  END IF;

  -- ── 4 à 7. Un seul praticien : la reprise remplit ce qu'elle doit ────────
  SELECT updated_at INTO maj_avant FROM protocol_drafts WHERE id = 'pd_contrat_ida_relue';
  SELECT * INTO r FROM public.identite_auteur_protocoles_reprise();
  IF r.versions_remplies <> 1 OR r.approbations_remplies <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 4-5 : attendu 1 version et 1 approbation remplies, trouvé % et %',
      r.versions_remplies, r.approbations_remplies;
  END IF;

  SELECT cree_par, updated_at INTO v_cree, maj_apres FROM protocol_drafts WHERE id = 'pd_contrat_ida_relue';
  IF v_cree IS DISTINCT FROM lower(EMAIL_A) THEN
    RAISE EXCEPTION 'CONTRAT 4 : la version relue doit porter l''e-mail du praticien du dossier, en minuscules';
  END IF;

  SELECT valide_par INTO v_valide FROM protocol_diffusion_approvals WHERE id = 'pda_contrat_ida';
  IF v_valide IS DISTINCT FROM lower(EMAIL_A) THEN
    RAISE EXCEPTION 'CONTRAT 5 : l''approbation doit porter l''e-mail du praticien du dossier, en minuscules';
  END IF;

  SELECT cree_par INTO v_draft FROM protocol_drafts WHERE id = 'pd_contrat_ida_draft';
  IF v_draft IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT 6 : une version draft doit rester nulle';
  END IF;

  IF maj_apres IS DISTINCT FROM maj_avant THEN
    RAISE EXCEPTION 'CONTRAT 7 : la reprise ne doit pas toucher updated_at';
  END IF;

  IF EXISTS (SELECT 1 FROM protocol_drafts WHERE id = 'pd_contrat_ida_blanc' AND cree_par IS NOT NULL)
     OR EXISTS (SELECT 1 FROM protocol_diffusion_approvals WHERE id = 'pda_contrat_ida_blanc' AND valide_par IS NOT NULL) THEN
    RAISE EXCEPTION 'CONTRAT 10 : un dossier au praticien blanc doit laisser ses lignes nulles';
  END IF;

  -- ── 8. Aucune seconde reprise ───────────────────────────────────────────
  refuse := false;
  BEGIN
    PERFORM * FROM public.identite_auteur_protocoles_reprise();
  EXCEPTION WHEN SQLSTATE 'WN459' THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'CONTRAT 8 : une seconde reprise doit être refusée';
  END IF;

  -- ── 9. Le verrou mord sur l'approbation seule ───────────────────────────
  refuse := false;
  BEGIN
    UPDATE protocol_drafts SET cree_par = NULL WHERE id LIKE 'pd_contrat_ida%';
    PERFORM * FROM public.identite_auteur_protocoles_reprise();
  EXCEPTION WHEN SQLSTATE 'WN459' THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'CONTRAT 9 : une approbation qui porte un auteur doit suffire à refuser la reprise';
  END IF;

  RAISE NOTICE 'CONTRAT identite_auteur_protocoles_v1 : les onze promesses tiennent.';
END $$;

ROLLBACK;
