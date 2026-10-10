-- Contrat de l'élargissement aux constats de questionnaire ([[D-275]] §2,
-- migration `adressages_signal_alerte_constats_questionnaire_v1`).
--
-- Le contrat `adressages_signal_alerte_v1_negatif.sql` éprouve toujours la
-- table entière ; celui-ci éprouve les DEUX changements de la fonction :
--   1. un constat `safety:questionnaire:` + 16 hexadécimaux est couvert, seul
--      ou avec un constat d'anamnèse ;
--   2. sa forme reste aussi stricte que celle de l'anamnèse : casse, longueur
--      en deçà ou au-delà, préfixe, pluriel, saut de ligne final, et un
--      préfixe étranger accolé au mot `questionnaire` sont refusés ; un
--      constat d'effet indésirable reste refusé ([[D-257]] §7), même à la
--      forme d'une empreinte ; un constat mal formé n'est pas sauvé par un
--      voisin valide ; un constat de questionnaire couvert deux fois est
--      refusé ;
--   3. le tri de la porteuse est total : de deux consultations aux deux
--      mêmes dates, la porteuse est celle de plus grand `id`, comme
--      `ORDRE_CONSULTATION_PORTEUSE` — l'autre est refusée.
--
-- Le cas 3 est éprouvé deux fois : par le comportement, et par le texte de
-- la fonction. Sans troisième terme, l'égalité est tranchée par le moteur SQL,
-- et il peut trancher « juste » par hasard : le comportement seul ne prouve
-- pas le terme.
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
  ('pat_contrat_adr_c', 'PAT_CONTRAT_ADR_C', 'michel.dogne@example.test', 'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

-- Deux consultations validées aux DEUX MÊMES dates : seul l'`id` les départage.
-- `cons_c_2` est insérée la première, pour qu'un ordre d'insertion ne passe
-- pas pour le départage.
INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, anamnese, date_validation, created_at, updated_at) VALUES
  ('cons_c_2', 'CONS_C_2', 'PAT_CONTRAT_ADR_C', 'michel.dogne@example.test', 'praticien@wellneuro.fr', 'validee', '{}'::jsonb, TIMESTAMP '2026-09-01 08:00:00', TIMESTAMP '2026-08-01 08:00:00', CURRENT_TIMESTAMP),
  ('cons_c_1', 'CONS_C_1', 'PAT_CONTRAT_ADR_C', 'michel.dogne@example.test', 'praticien@wellneuro.fr', 'validee', '{}'::jsonb, TIMESTAMP '2026-09-01 08:00:00', TIMESTAMP '2026-08-01 08:00:00', CURRENT_TIMESTAMP);

INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version) VALUES
  ('lettre_c_1', 'PAT_CONTRAT_ADR_C', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lettre_c_2', 'PAT_CONTRAT_ADR_C', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('lettre_c_3', 'PAT_CONTRAT_ADR_C', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64), 'safety-signals-nnpp2-v1');

DO $$
DECLARE
  Q1 CONSTANT text := 'safety:questionnaire:0123456789abcdef';
  Q2 CONSTANT text := 'safety:questionnaire:fedcba9876543210';
  A1 CONSTANT text := 'safety:anamnese:0123456789abcdef';
  ligne record;
  source text;
BEGIN
  -- ── 1. Un constat de questionnaire est couvert ───────────────────────────
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
  VALUES ('adr_c_1', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_1', 'cons_c_2', ARRAY[Q1, A1], 'praticien@wellneuro.fr');
  SELECT * INTO ligne FROM adressages_signal_alerte WHERE id = 'adr_c_1';
  IF ligne.finding_ids <> ARRAY[Q1, A1] THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la couverture mixte relue n''est pas celle écrite.';
  END IF;
  INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
  VALUES ('adr_c_2', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_2', 'cons_c_2', ARRAY[Q2], 'praticien@wellneuro.fr');

  -- ── 2. La forme reste stricte ────────────────────────────────────────────
  PERFORM pg_temp.refuse('2 majuscules',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2a', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:questionnaire:0123456789ABCDEF'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 tronqué',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2b', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:questionnaire:0123'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 trop long (17 hexadécimaux)',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2c', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:questionnaire:0123456789abcdef0'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 préfixé',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2d', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['x:safety:questionnaire:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 pluriel',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2e', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:questionnaires:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 saut de ligne final',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2f', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY[E'safety:questionnaire:0123456789abcdef\n'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  -- L'alternative est groupée : sans parenthèses, `^safety:anamnese` et
  -- `questionnaire:[0-9a-f]{16}$` deviendraient deux motifs indépendants, et
  -- ce constat-ci passerait par la seconde branche.
  PERFORM pg_temp.refuse('2 préfixe étranger accolé à questionnaire',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2g', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['autre:questionnaire:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 effet indésirable à la forme d''une empreinte',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2h', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:effet-indesirable:0123456789abcdef'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 mal formé à côté d''un valide',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2i', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:anamnese:aaaaaaaaaaaaaaaa', 'safety:questionnaire:zzzzzzzzzzzzzzzz'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas un constat de signal d''anamnèse ou de questionnaire');
  PERFORM pg_temp.refuse('2 questionnaire couvert deux fois',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y2j', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_2', ARRAY['safety:questionnaire:aaaaaaaaaaaaaaaa', 'safety:questionnaire:aaaaaaaaaaaaaaaa'], 'p@wellneuro.fr')$q$,
    'P0001', 'un constat est couvert deux fois');

  -- ── 3. Le tri de la porteuse est total ───────────────────────────────────
  PERFORM pg_temp.refuse('3 consultation à égalité de dates, plus petit id',
    $q$INSERT INTO adressages_signal_alerte (id, id_patient, acte, id_correspondance, id_consultation, finding_ids, praticien_email)
       VALUES ('y3', 'PAT_CONTRAT_ADR_C', 'adressage', 'lettre_c_3', 'cons_c_1', ARRAY['safety:questionnaire:aaaaaaaaaaaaaaaa'], 'p@wellneuro.fr')$q$,
    'P0001', 'n''est pas la consultation porteuse de ce dossier');
  SELECT p.prosrc INTO source FROM pg_proc p
  WHERE p.proname = 'adressages_signal_alerte_avant_insertion'
    AND p.pronamespace = 'public'::regnamespace;
  IF position('ORDER BY k.date_validation DESC, k.created_at DESC, k.id DESC' IN source) = 0 THEN
    RAISE EXCEPTION 'CONTRAT — 3 : le tri de la porteuse n''a pas l''id en troisième terme.';
  END IF;

  RAISE NOTICE 'Contrat adressages_signal_alerte_questionnaire_v1 : trois promesses tenues.';
END;
$$;

ROLLBACK;
