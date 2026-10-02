-- Contrat des adressages sur signal d'alerte ([[D-257]], LOT-02).
--
-- La table promet DIX-SEPT choses, et ce fichier les éprouve TOUTES :
--   1. un adressage valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ;
--   3. la lettre d'un AUTRE dossier est refusée ;
--   4. une lettre ENTRANTE est refusée ;
--   5. une correspondance SANS ancrage, ou ancrée sur une AUTRE table que la
--      cotation des signaux (biologie), est refusée ;
--   6. la consultation d'un AUTRE dossier est refusée, comme une consultation
--      de ce dossier NON VALIDÉE ;
--   7. un constat d'EFFET INDÉSIRABLE n'est jamais couvert ([[D-257]] §7),
--      comme un identifiant mal formé, un identifiant vide, ou un constat
--      couvert deux fois ;
--   8. une couverture VIDE est refusée ;
--   9. une lettre ne couvre qu'UNE fois ;
--  10. une révocation valide s'écrit ; elle vise un adressage de CE dossier,
--      jamais une révocation, et une seule fois ;
--  11. une révocation exige un motif non vide ;
--  12. chaque acte a sa forme : un adressage ne porte ni motif ni cible de
--      révocation, une révocation ne porte ni lettre, ni consultation, ni
--      constats ; un acte inconnu est refusé ;
--  13. UPDATE et TRUNCATE sont refusés — l'adressage est figé ;
--  14. l'effacement NOMMÉ passe en base, en une instruction (adressage et sa
--      révocation ensemble), et la consultation comme la lettre ne
--      s'effacent pas avant leurs adressages (RESTRICT) ;
--  15. les FK ont la règle annoncée (RESTRICT vers patient, lettre,
--      consultation ; NO ACTION sur la clé interne), les CHECK et les deux
--      index uniques partiels sont présents ;
--  16. la table porte EXACTEMENT ses onze colonnes (liste blanche) : aucun
--      libellé de signal n'y est recopié, et toute colonne neuve s'arbitre ;
--  17. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des deux fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus du trigger est reconnu à son MESSAGE, pas
-- seulement à son code (P0001) : un refus venu d'une autre règle ferait rougir
-- le contrat au lieu de le laisser vert.
--
-- Identités de fixture seulement. Tout se déroule dans une transaction annulée
-- à la fin.
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

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_adr_a', 'PAT_CONTRAT_ADR_A', 'sophie.nicola@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_adr_b', 'PAT_CONTRAT_ADR_B', 'jennifer.martin@example.test', 'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, updated_at) VALUES
  ('cons_a_validee', 'CONS_A_VALIDEE', 'PAT_CONTRAT_ADR_A', 'sophie.nicola@example.test', 'praticien@wellneuro.fr', 'validee', CURRENT_TIMESTAMP),
  ('cons_a_en_cours', 'CONS_A_EN_COURS', 'PAT_CONTRAT_ADR_A', 'sophie.nicola@example.test', 'praticien@wellneuro.fr', 'en_cours', CURRENT_TIMESTAMP),
  ('cons_b_validee', 'CONS_B_VALIDEE', 'PAT_CONTRAT_ADR_B', 'jennifer.martin@example.test', 'praticien@wellneuro.fr', 'validee', CURRENT_TIMESTAMP);

INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version) VALUES
  ('lettre_a_1', 'PAT_CONTRAT_ADR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lettre_a_2', 'PAT_CONTRAT_ADR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lettre_a_bio', 'PAT_CONTRAT_ADR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('b', 64), 'indications-biologie-v1'),
  ('lettre_b', 'PAT_CONTRAT_ADR_B', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1');
INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte) VALUES
  ('lettre_a_main', 'PAT_CONTRAT_ADR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte saisi à la main');
INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version) VALUES
  ('lettre_a_entrante', 'PAT_CONTRAT_ADR_A', 'praticien@wellneuro.fr', 'entrant', 'Dr Test', 'réponse', repeat('a', 64), 'safety-signals-nnpp2-v1');

DO $$
DECLARE
  F1 CONSTANT text := 'safety:anamnese:0123456789abcdef';
  F2 CONSTANT text := 'safety:anamnese:fedcba9876543210';
  ligne record;
  nb integer;
  ecart interval;
  colonnes text[];
BEGIN
  -- ── 1 et 2. Un adressage valide, instant et ordre posés par la base ──────
  INSERT INTO adressages_signal_alerte (id, ordre, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email, acte_le)
  VALUES ('adr_a_1', 999999, 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_1', 'cons_a_validee', ARRAY[F1, F2], 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM adressages_signal_alerte WHERE id = 'adr_a_1';
  IF ligne.finding_ids <> ARRAY[F1, F2] THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la couverture relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;

  -- ── 3 à 5. La lettre ─────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 lettre d''un autre dossier',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x3', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_b', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('4 lettre entrante',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x4', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_entrante', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('5 correspondance sans ancrage',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x5a', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_main', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');
  PERFORM pg_temp.refuse('5 lettre de biologie',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x5b', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_bio', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lettre d''adressage de ce dossier');

  -- ── 6. La consultation ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('6 consultation d''un autre dossier',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x6a', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_b_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une consultation validée de ce dossier');
  PERFORM pg_temp.refuse('6 consultation non validée',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x6b', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_en_cours', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas une consultation validée de ce dossier');

  -- ── 7 et 8. Les constats couverts ────────────────────────────────────────
  PERFORM pg_temp.refuse('7 constat d''effet indésirable',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x7a', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:effet-indesirable:ei_1'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse');
  PERFORM pg_temp.refuse('7 identifiant mal formé (majuscules)',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x7b', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123456789ABCDEF'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse');
  PERFORM pg_temp.refuse('7 identifiant tronqué',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x7c', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse');
  PERFORM pg_temp.refuse('7 identifiant nul',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x7d', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef', NULL], 'p@wellneuro.fr')$q$,
    'P0001', 'un constat couvert est vide');
  PERFORM pg_temp.refuse('7 constat couvert deux fois',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x7e', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef', 'safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'un constat est couvert deux fois');
  PERFORM pg_temp.refuse('8 couverture vide',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x8', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY[]::text[], 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_forme_adressage');

  -- ── 9. Une lettre ne couvre qu'une fois ──────────────────────────────────
  PERFORM pg_temp.refuse('9 seconde couverture de la même lettre',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x9', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_1', 'cons_a_validee', ARRAY['safety:anamnese:aaaaaaaaaaaaaaaa'], 'p@wellneuro.fr')$q$,
    '23505', 'adressages_signal_alerte_une_couverture_par_lettre');

  -- Un second adressage, sur un autre dossier, pour les cas croisés.
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
  VALUES ('adr_b_1', 'PAT_CONTRAT_ADR_B', 'adressage', 'lettre_b', 'cons_b_validee', ARRAY[F1], 'praticien@wellneuro.fr');

  -- ── 10 et 11. La révocation ──────────────────────────────────────────────
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
  VALUES ('rev_a_1', 'PAT_CONTRAT_ADR_A', 'revocation', 'adr_a_1', 'Lettre consignée sur le mauvais dossier.', 'praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM adressages_signal_alerte WHERE id = 'rev_a_1' AND ordre > (SELECT ordre FROM adressages_signal_alerte WHERE id = 'adr_a_1');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 10 : la révocation valide n''est pas écrite après son adressage.';
  END IF;
  PERFORM pg_temp.refuse('10 révocation de l''adressage d''un autre dossier',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
       VALUES ('x10a', 'PAT_CONTRAT_ADR_A', 'revocation', 'adr_b_1', 'motif', 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un adressage de ce dossier');
  PERFORM pg_temp.refuse('10 révocation d''une révocation',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
       VALUES ('x10b', 'PAT_CONTRAT_ADR_A', 'revocation', 'rev_a_1', 'motif', 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un adressage de ce dossier');
  PERFORM pg_temp.refuse('10 seconde révocation du même adressage',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
       VALUES ('x10c', 'PAT_CONTRAT_ADR_A', 'revocation', 'adr_a_1', 'motif', 'p@wellneuro.fr')$q$,
    '23505', 'adressages_signal_alerte_une_revocation_par_adressage');
  PERFORM pg_temp.refuse('11 révocation sans motif',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, praticien_email)
       VALUES ('x11a', 'PAT_CONTRAT_ADR_B', 'revocation', 'adr_b_1', 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_forme_revocation');
  PERFORM pg_temp.refuse('11 révocation au motif blanc',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, praticien_email)
       VALUES ('x11b', 'PAT_CONTRAT_ADR_B', 'revocation', 'adr_b_1', '   ', 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_forme_revocation');

  -- ── 12. La forme de chaque acte ──────────────────────────────────────────
  PERFORM pg_temp.refuse('12 adressage qui porte un motif',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, motif, praticien_email)
       VALUES ('x12a', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], 'motif', 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_forme_adressage');
  PERFORM pg_temp.refuse('12 révocation qui porte des constats',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_adressage_revoque, motif, finding_ids, praticien_email)
       VALUES ('x12b', 'PAT_CONTRAT_ADR_B', 'revocation', 'adr_b_1', 'motif', ARRAY['safety:anamnese:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_forme_revocation');
  PERFORM pg_temp.refuse('12 acte inconnu',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, praticien_email)
       VALUES ('x12c', 'PAT_CONTRAT_ADR_A', 'levee', 'p@wellneuro.fr')$q$,
    '23514', 'adressages_signal_alerte_acte_check');
  PERFORM pg_temp.refuse('12 praticien blanc',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('x12d', 'PAT_CONTRAT_ADR_A', 'adressage', 'lettre_a_2', 'cons_a_validee', ARRAY['safety:anamnese:0123456789abcdef'], ' ')$q$,
    '23514', 'adressages_signal_alerte_praticien_non_vide');

  -- ── 13. Figée ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('13 UPDATE',
    $q$UPDATE adressages_signal_alerte SET finding_ids = ARRAY['safety:anamnese:aaaaaaaaaaaaaaaa'] WHERE id = 'adr_a_1'$q$,
    'P0001', 'un adressage est figé');
  PERFORM pg_temp.refuse('13 TRUNCATE',
    $q$TRUNCATE adressages_signal_alerte$q$,
    'P0001', 'un adressage est figé');

  -- ── 14. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('14 consultation effacée avant son adressage',
    $q$DELETE FROM consultations WHERE id = 'cons_a_validee'$q$,
    '23503', 'adressages_signal_alerte_id_consultation_fkey');
  PERFORM pg_temp.refuse('14 lettre effacée avant son adressage',
    $q$DELETE FROM correspondances_medecin WHERE id = 'lettre_a_1'$q$,
    '23503', 'adressages_signal_alerte_id_correspondance_fkey');
  DELETE FROM adressages_signal_alerte WHERE id_patient = 'PAT_CONTRAT_ADR_A';
  SELECT count(*) INTO nb FROM adressages_signal_alerte WHERE id_patient = 'PAT_CONTRAT_ADR_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : l''effacement en une instruction a laissé % ligne(s).', nb;
  END IF;
  DELETE FROM consultations WHERE id_patient = 'PAT_CONTRAT_ADR_A';
  DELETE FROM correspondances_medecin WHERE id_patient = 'PAT_CONTRAT_ADR_A';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_ADR_A';

  -- ── 15. Clés, CHECK et index ─────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.adressages_signal_alerte'::regclass AND contype = 'f'
    AND ((conname IN ('adressages_signal_alerte_id_patient_fkey',
                      'adressages_signal_alerte_id_correspondance_fkey',
                      'adressages_signal_alerte_id_consultation_fkey') AND confdeltype = 'r')
      OR (conname = 'adressages_signal_alerte_id_adressage_revoque_fkey' AND confdeltype = 'a'));
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % clé(s) étrangère(s) sur 4 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.adressages_signal_alerte'::regclass AND contype = 'c'
    AND conname IN ('adressages_signal_alerte_acte_check', 'adressages_signal_alerte_forme_adressage',
                    'adressages_signal_alerte_forme_revocation', 'adressages_signal_alerte_praticien_non_vide');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % CHECK sur 4 sont présents.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'adressages_signal_alerte'
    AND indexname IN ('adressages_signal_alerte_une_couverture_par_lettre', 'adressages_signal_alerte_une_revocation_par_adressage')
    AND indexdef LIKE 'CREATE UNIQUE INDEX%WHERE%';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % index unique(s) partiel(s) sur 2 sont présents.', nb;
  END IF;

  -- ── 16. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'adressages_signal_alerte';
  IF colonnes <> ARRAY['acte', 'acte_le', 'finding_ids', 'id', 'id_adressage_revoque', 'id_consultation',
                       'id_correspondance', 'id_patient', 'motif', 'ordre', 'praticien_email'] THEN
    RAISE EXCEPTION 'CONTRAT — 16 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 17. RLS et fonctions ─────────────────────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.adressages_signal_alerte'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 17 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'adressages_signal_alerte';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 17 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('adressages_signal_alerte_figee', 'adressages_signal_alerte_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 17 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat adressages_signal_alerte_v1 : dix-sept promesses tenues.';
END;
$$;

ROLLBACK;
