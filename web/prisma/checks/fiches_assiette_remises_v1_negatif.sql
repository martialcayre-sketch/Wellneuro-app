-- Contrat des remises de fiches d'assiette ([[D-251]], lot 7, migration M2).
--
-- La table promet SEIZE choses, et ce fichier les éprouve TOUTES :
--   1. une remise valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant ;
--   3. UN CLIC QUI NE CHANGE RIEN NE REMET RIEN : le même clic rejoué, ou la
--      même version sur une autre action, n'insère aucune ligne — sans erreur ;
--   4. une empreinte qui n'est PAS celle de la version est refusée ;
--   5. l'approbation d'un AUTRE dossier est refusée ;
--   6. une action absente du protocole approuvé, qui porte une AUTRE assiette,
--      ou aucune, est refusée ;
--   7. un BROUILLON n'est pas remis ;
--   8. une version validée mais PLUS ANCIENNE que la référence n'est pas
--      remise — jamais de repli (amendement du 2026-09-27, point 3) ;
--   9. une version RETIRÉE n'est pas remise ;
--  10. LE CAS TRANCHÉ LE 2026-09-28 : v1 remise, puis v2 ; la v2 retirée, le
--      clic suivant REMET la v1 — une version déjà remise se remet si une autre
--      l'a remplacée depuis ; et ce clic rejoué ne remet rien de plus ;
--  11. une version retirée puis revalidée redevient la référence, et se remet ;
--  12. UPDATE et TRUNCATE sont refusés — la remise est figée ;
--  13. l'effacement NOMMÉ passe en base, dans son ordre : accusés de lecture,
--      remises, approbations, protocoles, patient ; et une approbation qui a
--      remis une fiche ne s'efface pas avant ses remises (RESTRICT) ;
--  14. les trois FK (patient, approbation, version) sont en ON DELETE
--      RESTRICT, et les deux CHECK sont présents ;
--  15. la table porte EXACTEMENT ses huit colonnes (liste blanche) : aucun
--      texte de fiche n'y est recopié, et toute colonne neuve s'arbitre ;
--  16. la RLS deny-all est active et sans policy (posture `D-005`) ; l'espèce
--      de lecture `fiche_assiette` est admise, sans rouvrir l'espèce.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Et chaque refus du trigger est reconnu à son MESSAGE,
-- pas seulement à son code (P0001) : un refus venu d'une autre règle ferait
-- rougir le contrat au lieu de le laisser vert.
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR : la sérialisation avec la décision du
-- responsable (verrou consultatif). Une seule session ne rejoue pas une course.
--
-- TEXTE SYNTHÉTIQUE SEULEMENT, et une fiche SYNTHÉTIQUE (`WN-SRC-9990`,
-- hors du registre) : aucune phrase d'une Fiche MY n'entre dans le dépôt,
-- qui est public ([[D-251]] §4). Identités de fixture seulement.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  instant timestamp;
  base integer;
  message text;
  reelles text[];
  ordres text[];
  en_cours text;
  H1 CONSTANT text := repeat('a', 64);
  H2 CONSTANT text := repeat('b', 64);
  H3 CONSTANT text := repeat('c', 64);
  SRC CONSTANT text := 'WN-SRC-9990';
  PAYLOAD CONSTANT jsonb := '{"actions": [
      {"actionId": "act_alim_1", "recommendedPlateRef": {"plateCode": "ASSIETTE_CONTRAT"}},
      {"actionId": "act_alim_2", "recommendedPlateRef": {"plateCode": "ASSIETTE_CONTRAT"}},
      {"actionId": "act_autre", "recommendedPlateRef": {"plateCode": "ASSIETTE_AUTRE"}},
      {"actionId": "act_libre"}
    ]}';

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparaison à un `array_agg(... ORDER BY
  -- column_name)`).
  COLS_REMISES CONSTANT text[] := ARRAY[
    'action_id', 'contenu_sha256', 'id', 'id_approbation', 'id_patient', 'id_version', 'ordre', 'remise_le'
  ];
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  -- Deux dossiers fictifs. Le premier reçoit quatre clics « Valider pour
  -- diffusion » sur le même protocole ; le second, un seul.
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_far1', 'PAT_CONTRAT_FAR1', 'sophie.nicola+remises@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_far2', 'PAT_CONTRAT_FAR2', 'jennifer.martin+remises@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_contrat_far1', 'PAT_CONTRAT_FAR1', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1,
     'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_contrat_far2', 'PAT_CONTRAT_FAR2', 'dc_contrat', H1, H1, H1, 'prio_contrat', PAYLOAD, H1,
     'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash,
     approved_at, confirmation)
  SELECT c.id, c.patient, c.draft, H1, H1, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'
  FROM (VALUES
    ('pda_far1_a', 'PAT_CONTRAT_FAR1', 'pd_contrat_far1'),
    ('pda_far1_b', 'PAT_CONTRAT_FAR1', 'pd_contrat_far1'),
    ('pda_far1_c', 'PAT_CONTRAT_FAR1', 'pd_contrat_far1'),
    ('pda_far1_d', 'PAT_CONTRAT_FAR1', 'pd_contrat_far1'),
    ('pda_far2', 'PAT_CONTRAT_FAR2', 'pd_contrat_far2')
  ) AS c(id, patient, draft);

  -- Une fiche synthétique, sa version 1 validée. Le numéro suit ce que la base
  -- contiendrait déjà pour cette fiche : le trigger de M1 refuse un trou.
  SELECT COALESCE(max(numero), 0) INTO base FROM fiches_assiette_versions WHERE source_id = SRC;
  INSERT INTO fiches_assiette_versions
    (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
     source_sha256, modele_redaction, modele_fidelite, version_consigne)
  VALUES ('fav_far_1', SRC, 'ASSIETTE_CONTRAT', base + 1, '{"titre":"Synthétique"}'::jsonb, H1,
          'Texte source synthétique.', H3, 'r', 'f', 'c');
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
  VALUES ('faa_far_1', 'fav_far_1', 'validee', H1, 'praticien@wellneuro.fr', true);

  -- ── 1 et 2. Cas POSITIF — clic A, la v1 ; instant et ordre posés par la base
  BEGIN
    INSERT INTO fiches_assiette_remises
      (id, ordre, id_patient, id_approbation, action_id, id_version, contenu_sha256, remise_le)
    VALUES ('far_1', 0, 'PAT_CONTRAT_FAR1', 'pda_far1_a', 'act_alim_1', 'fav_far_1', H1,
            TIMESTAMP '2000-01-01 00:00:00');
    GET DIAGNOSTICS nb = ROW_COUNT;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: une remise valide a été refusée (%)', SQLERRM;
  END;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: la première remise n''a pas été écrite (% ligne[s]).', nb;
  END IF;

  SELECT remise_le INTO instant FROM fiches_assiette_remises WHERE id = 'far_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise antidatée a gardé sa date (%) — le trigger ne pose plus l''instant.', instant;
  END IF;
  SELECT count(*) INTO nb FROM fiches_assiette_remises WHERE id = 'far_1' AND ordre > 0;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: l''`ordre` fourni par l''appelant (0) a été gardé — la remise en cours deviendrait falsifiable.';
  END IF;

  -- ── 3. Un clic qui ne change rien ne remet rien ──────────────────────────
  -- Le même clic rejoué, puis la même version sur une autre action du même
  -- protocole : aucune ligne, et AUCUNE erreur.
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_rejeu', 'PAT_CONTRAT_FAR1', 'pda_far1_a', 'act_alim_1', 'fav_far_1', H1);
    GET DIAGNOSTICS nb = ROW_COUNT;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: un clic rejoué a levé une erreur au lieu de ne rien remettre (%)', SQLERRM;
  END;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'REMISES FICHES: un clic rejoué a remis la même version une seconde fois.';
  END IF;

  INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
  VALUES ('far_autre_action', 'PAT_CONTRAT_FAR1', 'pda_far1_a', 'act_alim_2', 'fav_far_1', H1);
  GET DIAGNOSTICS nb = ROW_COUNT;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'REMISES FICHES: la même assiette sur une seconde action a remis la fiche deux fois.';
  END IF;

  -- ── 4. L'empreinte recopiée est celle de la version ──────────────────────
  -- Pour le second dossier, tout le reste est valide à ce stade.
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_autre_texte', 'PAT_CONTRAT_FAR2', 'pda_far2', 'act_alim_1', 'fav_far_1', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%empreinte%'; message := SQLERRM;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise portant l''empreinte d''un AUTRE texte n''a pas été refusée pour ce motif (%).', message;
  END IF;

  -- ── 5. L'approbation porte sur ce dossier ────────────────────────────────
  refuse := false; message := NULL;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_autre_dossier', 'PAT_CONTRAT_FAR2', 'pda_far1_a', 'act_alim_1', 'fav_far_1', H1);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%dossier%'; message := SQLERRM;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise rattachée au clic d''un AUTRE dossier n''a pas été refusée pour ce motif (%).', message;
  END IF;

  -- ── 6. L'action existe dans le protocole approuvé, et porte cette assiette ─
  DECLARE
    actions text[] := ARRAY['act_inconnue', 'act_autre', 'act_libre'];
    i integer;
  BEGIN
    FOR i IN 1 .. array_length(actions, 1) LOOP
      refuse := false; message := NULL;
      BEGIN
        INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
        VALUES ('far_action_' || i, 'PAT_CONTRAT_FAR2', 'pda_far2', actions[i], 'fav_far_1', H1);
      EXCEPTION
        WHEN raise_exception THEN refuse := SQLERRM LIKE '%action%'; message := SQLERRM;
      END;
      IF NOT refuse THEN
        RAISE EXCEPTION 'REMISES FICHES: l''action « % » (absente, autre assiette ou sans assiette) n''a pas été refusée pour ce motif (%).', actions[i], message;
      END IF;
    END LOOP;
  END;

  -- ── 7. Un brouillon n'est pas remis ──────────────────────────────────────
  INSERT INTO fiches_assiette_versions
    (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
     source_sha256, modele_redaction, modele_fidelite, version_consigne)
  VALUES ('fav_far_2', SRC, 'ASSIETTE_CONTRAT', base + 2, '{"titre":"Synthétique 2"}'::jsonb, H2,
          'Texte source synthétique.', H3, 'r', 'f', 'c');

  refuse := false; message := NULL;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_brouillon', 'PAT_CONTRAT_FAR2', 'pda_far2', 'act_alim_1', 'fav_far_2', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%référence%'; message := SQLERRM;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: un BROUILLON n''a pas été refusé comme non-référence (%) — un texte que personne n''a validé partirait (DC-16).', message;
  END IF;

  -- ── 8. Jamais de repli sur une version plus ancienne ─────────────────────
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
  VALUES ('faa_far_2', 'fav_far_2', 'validee', H2, 'praticien@wellneuro.fr', true);

  refuse := false; message := NULL;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_repli', 'PAT_CONTRAT_FAR2', 'pda_far2', 'act_alim_1', 'fav_far_1', H1);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%référence%'; message := SQLERRM;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: la v1 n''a pas été refusée alors que la v2 est la référence — un repli silencieux (%).', message;
  END IF;

  -- Clic B : la référence, elle, se remet au premier dossier.
  INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
  VALUES ('far_2', 'PAT_CONTRAT_FAR1', 'pda_far1_b', 'act_alim_1', 'fav_far_2', H2);
  GET DIAGNOSTICS nb = ROW_COUNT;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: la v2, devenue la référence, n''a pas été remise (% ligne[s]).', nb;
  END IF;

  -- ── 9. Une version retirée n'est pas remise ──────────────────────────────
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale, motif)
  VALUES ('faa_far_2_retrait', 'fav_far_2', 'retiree', H2, 'praticien@wellneuro.fr', false, 'Motif synthétique.');

  refuse := false; message := NULL;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_retiree', 'PAT_CONTRAT_FAR2', 'pda_far2', 'act_alim_1', 'fav_far_2', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%référence%'; message := SQLERRM;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une version RETIRÉE n''a pas été refusée (%).', message;
  END IF;

  -- ── 10. LE CAS TRANCHÉ : le clic C remet la v1 ───────────────────────────
  -- Le premier dossier a reçu la v1 (clic A), puis la v2 (clic B). La v2 est
  -- retirée, la v1 redevient la référence : le clic suivant la lui REMET.
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_3', 'PAT_CONTRAT_FAR1', 'pda_far1_c', 'act_alim_1', 'fav_far_1', H1);
    GET DIAGNOSTICS nb = ROW_COUNT;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: la v1, redevenue la référence, a été refusée au clic suivant (%)', SQLERRM;
  END;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: la v1 déjà remise au clic A n''a pas été remise à nouveau après le retrait de la v2 — le patient resterait sur une fiche retirée.';
  END IF;

  -- Et ce clic rejoué ne remet rien de plus.
  INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
  VALUES ('far_3_rejeu', 'PAT_CONTRAT_FAR1', 'pda_far1_c', 'act_alim_1', 'fav_far_1', H1);
  GET DIAGNOSTICS nb = ROW_COUNT;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'REMISES FICHES: le clic C rejoué a remis la v1 une seconde fois.';
  END IF;

  -- ── 11. Retirée puis revalidée : redevient la référence, et se remet ─────
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
  VALUES ('faa_far_2_revalidee', 'fav_far_2', 'validee', H2, 'praticien@wellneuro.fr', true);

  INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
  VALUES ('far_4', 'PAT_CONTRAT_FAR1', 'pda_far1_d', 'act_alim_1', 'fav_far_2', H2);
  GET DIAGNOSTICS nb = ROW_COUNT;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: la v2 revalidée n''a pas été remise (% ligne[s]).', nb;
  END IF;

  -- L'histoire du premier dossier, dans l'ordre des gestes : v1, v2, v1, v2 —
  -- et la remise en cours est la dernière.
  SELECT array_agg(id ORDER BY ordre) INTO ordres FROM fiches_assiette_remises WHERE id_patient = 'PAT_CONTRAT_FAR1';
  IF ordres IS DISTINCT FROM ARRAY['far_1', 'far_2', 'far_3', 'far_4'] THEN
    RAISE EXCEPTION 'REMISES FICHES: histoire inattendue du dossier (%) — attendu far_1, far_2, far_3, far_4 dans l''ordre des gestes.', ordres;
  END IF;
  SELECT id_version INTO en_cours FROM fiches_assiette_remises
  WHERE id_patient = 'PAT_CONTRAT_FAR1' ORDER BY ordre DESC LIMIT 1;
  IF en_cours IS DISTINCT FROM 'fav_far_2' THEN
    RAISE EXCEPTION 'REMISES FICHES: la remise en cours devrait porter la v2 revalidée, elle porte %.', en_cours;
  END IF;

  -- ── 12. Figée : ni UPDATE ni TRUNCATE ────────────────────────────────────
  refuse := false; message := NULL;
  BEGIN
    UPDATE fiches_assiette_remises SET id_version = 'fav_far_2', contenu_sha256 = H2 WHERE id = 'far_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%figée%'; message := SQLERRM;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'REMISES FICHES: une remise a été RÉÉCRITE en place — la version remise n''est plus figée (%).', message; END IF;

  refuse := false; message := NULL;
  BEGIN
    TRUNCATE fiches_assiette_remises;
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%figée%'; message := SQLERRM;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'REMISES FICHES: TRUNCATE des remises accepté (%).', message; END IF;

  -- ── 16 (espèce), avant l'effacement qui emporte l'accusé ─────────────────
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_FAR1', 'fiche_assiette', 'far_3');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: l''accusé de lecture d''une fiche remise a été refusé (%)', SQLERRM;
  END;

  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_FAR1', 'objectif', 'obj_001');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: l''espèce « objectif » a été ACCEPTÉE — ajouter `fiche_assiette` a ouvert l''espèce.';
  END IF;

  -- ── 13. L'effacement nommé, en base ──────────────────────────────────────
  -- D'abord ce que la FK RESTRICT interdit : effacer les approbations AVANT
  -- les remises qu'elles ont produites.
  refuse := false;
  BEGIN
    DELETE FROM protocol_diffusion_approvals WHERE id_patient = 'PAT_CONTRAT_FAR1';
  EXCEPTION
    WHEN foreign_key_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: des approbations ont été effacées avant leurs remises — la FK ne retient plus rien.';
  END IF;

  -- Puis la chaîne de `effacement.ts`, dans son ordre.
  BEGIN
    DELETE FROM portail_lectures_patient WHERE id_patient = 'PAT_CONTRAT_FAR1';
    DELETE FROM fiches_assiette_remises WHERE id_patient = 'PAT_CONTRAT_FAR1';
    GET DIAGNOSTICS nb = ROW_COUNT;
    DELETE FROM protocol_diffusion_approvals WHERE id_patient = 'PAT_CONTRAT_FAR1';
    DELETE FROM protocol_drafts WHERE id_patient = 'PAT_CONTRAT_FAR1';
    DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_FAR1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: l''effacement d''un dossier qui a reçu des fiches a échoué (%)', SQLERRM;
  END;
  IF nb <> 4 THEN
    RAISE EXCEPTION 'REMISES FICHES: 4 remises attendues pour le premier dossier, % supprimée(s).', nb;
  END IF;

  -- ── 14. FK en RESTRICT, CHECK présents ───────────────────────────────────
  -- `confdeltype = 'r'`, invisible du drift check.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'fiches_assiette_remises'
    AND ref.relname IN ('patients', 'protocol_diffusion_approvals', 'fiches_assiette_versions')
    AND con.confdeltype = 'r';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'REMISES FICHES: 3 FK en ON DELETE RESTRICT attendues (patient, approbation, version), % trouvée(s).', nb;
  END IF;

  -- Le trigger refuse une action ou une empreinte étrangère AVANT tout CHECK :
  -- ces deux CHECK ne se voient donc pas à l'insertion. Ils restent la garde si
  -- le trigger tombait, et c'est leur présence qui s'éprouve.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class t ON t.oid = con.conrelid
  WHERE t.relname = 'fiches_assiette_remises'
    AND con.contype = 'c'
    AND con.conname IN ('fiches_assiette_remises_contenu_sha256_format', 'fiches_assiette_remises_action_non_vide');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'REMISES FICHES: % CHECK présent(s) sur 2 (format d''empreinte, action non vide).', nb;
  END IF;

  -- ── 15. Liste blanche de colonnes ────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fiches_assiette_remises';
  IF reelles IS DISTINCT FROM COLS_REMISES THEN
    RAISE EXCEPTION
      'REMISES FICHES: colonnes inattendues (%). Attendu exactement % — toute colonne neuve doit être arbitrée.',
      reelles, COLS_REMISES;
  END IF;

  -- ── 16. RLS deny-all ─────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'fiches_assiette_remises' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: RLS inactive sur fiches_assiette_remises.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fiches_assiette_remises'
  ) THEN
    RAISE EXCEPTION 'REMISES FICHES: policy inattendue (deny-all attendu).';
  END IF;

  RAISE NOTICE 'REMISES FICHES: remise valide écrite, instant et ordre posés par la base, clic rejoué et seconde action sans effet ni erreur, empreinte étrangère, autre dossier, action absente / autre assiette / sans assiette, brouillon, repli et version retirée refusés chacun pour son motif, v1 remise à nouveau après le retrait de la v2 puis rejeu sans effet, v2 revalidée remise, histoire v1-v2-v1-v2 dans l''ordre, UPDATE et TRUNCATE refusés, approbations retenues par leurs remises, effacement nommé passant, 3 FK RESTRICT, 2 CHECK présents, 8 colonnes exactement, RLS deny-all, espèce fiche_assiette admise et espèce toujours fermée.';
END $$;

ROLLBACK;
