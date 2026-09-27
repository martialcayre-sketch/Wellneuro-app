-- Contrat des remises de fiches d'assiette ([[D-251]], lot 7, migration M2).
--
-- La table promet QUATORZE choses, et ce fichier les éprouve TOUTES :
--   1. une remise valide s'écrit et se relit ;
--   2. l'instant est posé par la BASE, pas par l'appelant ;
--   3. une version n'est remise qu'UNE fois à un patient (23505), même par
--      une autre action ;
--   4. une action vide est refusée (23514) ;
--   5. une remise dont l'empreinte n'est PAS celle de la version est refusée ;
--   6. une remise rattachée à l'approbation d'un AUTRE dossier est refusée ;
--   7. un BROUILLON (version sans acte) n'est pas remis ;
--   8. une version validée mais PLUS ANCIENNE que la référence n'est pas
--      remise — jamais de repli (amendement du 2026-09-27, point 3) ;
--   9. une version RETIRÉE n'est pas remise ; la précédente validée redevient
--      la référence, et elle se remet (point 2) ;
--  10. UPDATE et TRUNCATE sont refusés — la remise est figée ;
--  11. DELETE est ADMIS : l'effacement nommé du dossier doit pouvoir la
--      supprimer. C'est l'écart assumé avec M1, qui ne porte aucune donnée
--      patient ;
--  12. les trois FK (patient, approbation, version) sont en ON DELETE
--      RESTRICT, et le format de l'empreinte est fermé par un CHECK ;
--  13. la table porte EXACTEMENT ses sept colonnes (liste blanche) : aucun
--      texte de fiche n'y est recopié, et toute colonne neuve s'arbitre ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`) ; et
--      l'espèce de lecture `fiche_assiette` est admise, sans rouvrir l'espèce.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Sans cela, un refus pourrait venir d'une autre règle, et
-- le contrat resterait vert en ayant perdu celle qu'il prétend tenir.
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
  reelles text[];
  H1 CONSTANT text := repeat('a', 64);
  H2 CONSTANT text := repeat('b', 64);
  H3 CONSTANT text := repeat('c', 64);
  SRC CONSTANT text := 'WN-SRC-9990';

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparaison à un `array_agg(... ORDER BY
  -- column_name)`).
  COLS_REMISES CONSTANT text[] := ARRAY[
    'action_id', 'contenu_sha256', 'id', 'id_approbation', 'id_patient', 'id_version', 'remise_le'
  ];
BEGIN
  -- ── 0. Fixtures — deux dossiers fictifs, un protocole et un clic chacun ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_far1', 'PAT_CONTRAT_FAR1', 'sophie.nicola+remises@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_far2', 'PAT_CONTRAT_FAR2', 'jennifer.martin+remises@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  VALUES
    ('pd_contrat_far1', 'PAT_CONTRAT_FAR1', 'dc_contrat', H1, H1, H1, 'prio_contrat', '{}'::jsonb, H1,
     'c1-protocol-draft-v4', CURRENT_TIMESTAMP),
    ('pd_contrat_far2', 'PAT_CONTRAT_FAR2', 'dc_contrat', H1, H1, H1, 'prio_contrat', '{}'::jsonb, H1,
     'c1-protocol-draft-v4', CURRENT_TIMESTAMP);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash,
     approved_at, confirmation)
  VALUES
    ('pda_contrat_far1', 'PAT_CONTRAT_FAR1', 'pd_contrat_far1', H1, H1, CURRENT_TIMESTAMP,
     'content_approved_for_diffusion'),
    ('pda_contrat_far2', 'PAT_CONTRAT_FAR2', 'pd_contrat_far2', H1, H1, CURRENT_TIMESTAMP,
     'content_approved_for_diffusion');

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

  -- ── 1 et 2. Cas POSITIF, et l'instant posé par la base ───────────────────
  BEGIN
    INSERT INTO fiches_assiette_remises
      (id, id_patient, id_approbation, action_id, id_version, contenu_sha256, remise_le)
    VALUES ('far_1', 'PAT_CONTRAT_FAR1', 'pda_contrat_far1', 'act_alim_1', 'fav_far_1', H1,
            TIMESTAMP '2000-01-01 00:00:00');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: une remise valide a été refusée (%)', SQLERRM;
  END;

  SELECT remise_le INTO instant FROM fiches_assiette_remises WHERE id = 'far_1';
  IF instant IS NULL THEN
    RAISE EXCEPTION 'REMISES FICHES: la remise posée ne se relit pas.';
  END IF;
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise antidatée a gardé sa date (%) — le trigger ne pose plus l''instant.', instant;
  END IF;

  -- ── 3. Une version n'est remise qu'une fois à un patient ─────────────────
  -- Par une AUTRE action : l'unicité porte sur (patient, version), pas sur
  -- l'action. Tout le reste de la ligne est valide.
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_doublon', 'PAT_CONTRAT_FAR1', 'pda_contrat_far1', 'act_alim_2', 'fav_far_1', H1);
  EXCEPTION
    WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: la même version a été remise DEUX fois au même dossier — un clic rejoué remettrait tout.';
  END IF;

  -- ── 4. Une action vide est refusée ───────────────────────────────────────
  -- Pour le second dossier, tout le reste est valide à ce stade.
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_action_vide', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', E' \t', 'fav_far_1', H1);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise SANS action a été acceptée.';
  END IF;

  -- ── 5. L'empreinte recopiée est celle de la version ──────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_autre_texte', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', 'act_alim_1', 'fav_far_1', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise portant l''empreinte d''un AUTRE texte a été acceptée.';
  END IF;

  -- ── 6. L'approbation porte sur ce dossier ────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_autre_dossier', 'PAT_CONTRAT_FAR2', 'pda_contrat_far1', 'act_alim_1', 'fav_far_1', H1);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une remise rattachée au clic posé sur un AUTRE dossier a été acceptée.';
  END IF;

  -- ── 7. Un brouillon n'est pas remis ──────────────────────────────────────
  INSERT INTO fiches_assiette_versions
    (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
     source_sha256, modele_redaction, modele_fidelite, version_consigne)
  VALUES ('fav_far_2', SRC, 'ASSIETTE_CONTRAT', base + 2, '{"titre":"Synthétique 2"}'::jsonb, H2,
          'Texte source synthétique.', H3, 'r', 'f', 'c');

  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_brouillon', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', 'act_alim_1', 'fav_far_2', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: un BROUILLON a été remis — un texte que personne n''a validé part au patient (DC-16).';
  END IF;

  -- ── 8. Jamais de repli sur une version plus ancienne ─────────────────────
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
  VALUES ('faa_far_2', 'fav_far_2', 'validee', H2, 'praticien@wellneuro.fr', true);

  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_repli', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', 'act_alim_1', 'fav_far_1', H1);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: la version 1 a été remise alors que la 2 est la référence — un repli silencieux.';
  END IF;

  -- La référence, elle, se remet.
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_2', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', 'act_alim_1', 'fav_far_2', H2);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: la version de référence a été refusée (%)', SQLERRM;
  END;

  -- ── 9. Une version retirée n'est pas remise ; la précédente reprend ──────
  INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale, motif)
  VALUES ('faa_far_2_retrait', 'fav_far_2', 'retiree', H2, 'praticien@wellneuro.fr', false, 'Motif synthétique.');

  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_retiree', 'PAT_CONTRAT_FAR1', 'pda_contrat_far1', 'act_alim_1', 'fav_far_2', H2);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: une version RETIRÉE a été remise.';
  END IF;

  BEGIN
    INSERT INTO fiches_assiette_remises (id, id_patient, id_approbation, action_id, id_version, contenu_sha256)
    VALUES ('far_reprise', 'PAT_CONTRAT_FAR2', 'pda_contrat_far2', 'act_alim_1', 'fav_far_1', H1);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: après le retrait de la 2, la version 1 validée a été refusée — la précédente ne reprend pas (%)', SQLERRM;
  END;

  -- ── 10. Figée : ni UPDATE ni TRUNCATE ────────────────────────────────────
  refuse := false;
  BEGIN
    UPDATE fiches_assiette_remises SET id_version = 'fav_far_2', contenu_sha256 = H2 WHERE id = 'far_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'REMISES FICHES: une remise a été RÉÉCRITE en place — la version remise n''est plus figée.'; END IF;

  refuse := false;
  BEGIN
    TRUNCATE fiches_assiette_remises;
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'REMISES FICHES: TRUNCATE des remises accepté.'; END IF;

  -- ── 11. DELETE admis : l'effacement nommé du dossier ─────────────────────
  BEGIN
    DELETE FROM fiches_assiette_remises WHERE id_patient = 'PAT_CONTRAT_FAR1';
    GET DIAGNOSTICS nb = ROW_COUNT;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: la suppression d''une remise a été refusée — l''effacement du dossier échouerait (%)', SQLERRM;
  END;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: 1 remise attendue pour le premier dossier, % supprimée(s).', nb;
  END IF;

  -- ── 12. FK en RESTRICT, format d'empreinte fermé ─────────────────────────
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

  -- Le trigger d'insertion refuse une empreinte étrangère AVANT tout CHECK :
  -- ce CHECK-ci ne se voit donc pas à l'insertion. Il reste la garde si le
  -- trigger tombait, et c'est sa présence qui s'éprouve.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class t ON t.oid = con.conrelid
  WHERE t.relname = 'fiches_assiette_remises'
    AND con.contype = 'c'
    AND con.conname = 'fiches_assiette_remises_contenu_sha256_format';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'REMISES FICHES: le CHECK de format de l''empreinte est absent.';
  END IF;

  -- ── 13. Liste blanche de colonnes ────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fiches_assiette_remises';
  IF reelles IS DISTINCT FROM COLS_REMISES THEN
    RAISE EXCEPTION
      'REMISES FICHES: colonnes inattendues (%). Attendu exactement % — toute colonne neuve doit être arbitrée.',
      reelles, COLS_REMISES;
  END IF;

  -- ── 14. RLS deny-all ; l'espèce de lecture `fiche_assiette` ──────────────
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

  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_FAR2', 'fiche_assiette', 'far_2');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'REMISES FICHES: l''accusé de lecture d''une fiche remise a été refusé (%)', SQLERRM;
  END;

  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_FAR2', 'objectif', 'obj_001');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'REMISES FICHES: l''espèce « objectif » a été ACCEPTÉE — ajouter `fiche_assiette` a ouvert l''espèce.';
  END IF;

  RAISE NOTICE 'REMISES FICHES: remise valide acceptée et relue, instant posé par la base, doublon (patient, version) refusé, action vide refusée, empreinte étrangère refusée, approbation d''un autre dossier refusée, brouillon refusé, repli sur une version plus ancienne refusé, version retirée refusée et précédente validée reprise, UPDATE et TRUNCATE refusés, DELETE admis pour l''effacement, 3 FK RESTRICT, CHECK d''empreinte présent, 7 colonnes exactement, RLS deny-all, espèce fiche_assiette admise et espèce toujours fermée.';
END $$;

ROLLBACK;
