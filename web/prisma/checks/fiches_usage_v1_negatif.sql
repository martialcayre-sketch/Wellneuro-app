-- Contrat des fiches d'usage ([[D-314]], BP-12a, migration seule).
--
-- Les quatre tables promettent QUINZE choses, et ce fichier les éprouve
-- TOUTES :
--   1. une version, un libellé et leurs actes valides s'écrivent ;
--   2. les instants sont posés par la BASE, en UTC — joué sous un fuseau de
--      session Europe/Paris, pour qu'un `now()` nu se voie — sur les quatre
--      tables ;
--   3. le numéro SUIT le dernier de sa fiche (de son terme) : un saut est
--      refusé, un doublon aussi ;
--   4. les formats sont fermés : `FU_…`, empreintes, modèles visibles ;
--   5. la nature d'un libellé et le préfixe de son terme se tiennent :
--      `hypothese` ⇔ `HYP_…`, `population` ⇔ `POP_…` ;
--   6. le contenu d'une version est un objet NON VIDE de rubriques de la liste
--      fermée, chacune un texte visible — « explication patient » est refusée
--      (arbitrage 6) ;
--   7. l'empreinte d'un libellé est celle de son texte ;
--   8. l'acte et la rubrique sont FERMÉS — et chaque CHECK doublé par un
--      trigger est éprouvé SEUL, trigger désactivé dans la transaction ;
--   9. VALIDER exige la relecture intégrale ; RETIRER exige un motif visible,
--      NULL compris ;
--  10. l'empreinte d'un acte est celle du texte EXACT visé, recalculée par la
--      base pour une rubrique ; une rubrique absente de la version ne se
--      valide pas ; une cible inconnue est refusée sous son nom ;
--  11. `ordre` est posé par la base et départage deux actes successifs ;
--  12. UPDATE, DELETE et TRUNCATE sont refusés sur les quatre tables — et
--      chaque table porte son PROPRE trigger TRUNCATE (un TRUNCATE … CASCADE
--      serait refusé par celui d'une table voisine) ;
--  13. les FK des actes sont en ON DELETE RESTRICT ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`) ;
--  15. AUCUNE colonne ne désigne un patient.
--
-- TEXTE SYNTHÉTIQUE SEULEMENT : aucune phrase de fiche d'usage, aucun libellé
-- réel n'entre dans le dépôt, qui est public ([[D-251]] §4).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

SET LOCAL TimeZone TO 'Europe/Paris';

DO $$
DECLARE
  refuse boolean;
  nb integer;
  instant timestamp;
  S CONSTANT text := repeat('a', 64);
  T_Q CONSTANT text := 'Question synthétique.';
  T_P CONSTANT text := 'Population synthétique.';
  L1 CONSTANT text := 'Libellé synthétique.';
  H_Q CONSTANT text := encode(sha256(convert_to('Question synthétique.', 'UTF8')), 'hex');
  H_P CONSTANT text := encode(sha256(convert_to('Population synthétique.', 'UTF8')), 'hex');
  H_L1 CONSTANT text := encode(sha256(convert_to('Libellé synthétique.', 'UTF8')), 'hex');
  ordre_validation bigint;
  ordre_retrait bigint;
  ordre_force bigint;
BEGIN
  -- ── 1. Cas POSITIF ───────────────────────────────────────────────────────
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction,
       modele_contre_lecture, version_consigne, cree_le)
    VALUES
      ('fuv_1', 'FU_CONTRAT', 1,
       jsonb_build_object('question', T_Q, 'population', T_P), S,
       'modele-redaction', 'modele-contre-lecture', 'fiche-usage-v1',
       TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256,
       modele_redaction, modele_contre_lecture, version_consigne, cree_le)
    VALUES
      ('ful_1', 'hypothese', 'HYP_CONTRAT', 1, L1, H_L1, S, 'modele-redaction',
       'modele-contre-lecture', 'libelle-v1', TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256,
       modele_redaction, modele_contre_lecture, version_consigne)
    VALUES
      ('ful_pop', 'population', 'POP_CONTRAT', 1, L1, H_L1, S, 'r', 'c', 'v');
    INSERT INTO fiches_usage_actes
      (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale, le)
    VALUES
      ('fua_q', 'fuv_1', 'question', 'validee', H_Q, 'praticien@wellneuro.fr', true,
       TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO fiches_usage_libelles_actes
      (id, id_libelle, acte, empreinte, validateur, relecture_integrale, le)
    VALUES
      ('fula_1', 'ful_1', 'validee', H_L1, 'praticien@wellneuro.fr', true,
       TIMESTAMP '2000-01-01 00:00:00');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FICHES USAGE: une version, un libellé ou un acte valides ont été refusés (%)', SQLERRM;
  END;

  -- ── 2. Les instants sont posés par la base, en UTC ───────────────────────
  -- La session est en Europe/Paris : un `now()` nu écrirait l'heure locale,
  -- une à deux heures après l'UTC — bien au-delà des 300 s de tolérance.
  SELECT cree_le INTO instant FROM fiches_usage_versions WHERE id = 'fuv_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'FICHES USAGE: l''instant d''une version (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT cree_le INTO instant FROM fiches_usage_libelles WHERE id = 'ful_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'FICHES USAGE: l''instant d''un libellé (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT le INTO instant FROM fiches_usage_actes WHERE id = 'fua_q';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'FICHES USAGE: l''instant d''un acte de rubrique (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT le INTO instant FROM fiches_usage_libelles_actes WHERE id = 'fula_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'FICHES USAGE: l''instant d''un acte de libellé (%) n''est pas posé par la base en UTC.', instant;
  END IF;

  -- ── 3. Le numéro suit le dernier ─────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_saut', 'FU_CONTRAT', 3, jsonb_build_object('question', T_Q), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: une version n° 3 a été acceptée après la n° 1.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_doublon', 'FU_CONTRAT', 1, jsonb_build_object('question', T_Q), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN unique_violation OR raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: une seconde version n° 1 de la même fiche a été acceptée.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_saut', 'hypothese', 'HYP_CONTRAT', 3, L1, H_L1, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un libellé n° 3 a été accepté après le n° 1.';
  END IF;

  -- Les n° 2 passent : les refus ci-dessus tiennent au numéro, pas au terme.
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_2', 'FU_CONTRAT', 2, jsonb_build_object('question', 'Autre question.'), S, 'r', 'c', 'v');
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_2', 'hypothese', 'HYP_CONTRAT', 2, 'Autre libellé.',
            encode(sha256(convert_to('Autre libellé.', 'UTF8')), 'hex'), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FICHES USAGE: une version ou un libellé n° 2 a été refusé (%)', SQLERRM;
  END;

  -- ── 4. Formats fermés ────────────────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_fmt', 'FU-TIRET', 1, jsonb_build_object('question', T_Q), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un identifiant de fiche hors format a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_sha', 'FU_SHA', 1, jsonb_build_object('question', T_Q), upper(S), 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une empreinte de structure de version hors format a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_sha', 'hypothese', 'HYP_SHA', 1, L1, H_L1, 'abc', 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une empreinte de structure de libellé hors format a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_modele', 'FU_MODELE', 1, jsonb_build_object('question', T_Q), S, E'\t ', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un modèle de rédaction fait de blancs a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_modele', 'hypothese', 'HYP_MODELE', 1, L1, H_L1, S, 'r', E'\n', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un modèle de contre-lecture fait de blancs a été accepté.'; END IF;

  -- ── 5. Nature et préfixe se tiennent ─────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_croise', 'hypothese', 'POP_CROISE', 1, L1, H_L1, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une population rangée sous la nature « hypothese » a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_croise2', 'population', 'HYP_CROISE', 1, L1, H_L1, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une hypothèse rangée sous la nature « population » a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_nature', 'claim', 'HYP_NATURE', 1, L1, H_L1, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une nature de libellé hors liste a été acceptée.'; END IF;

  -- ── 6. Le contenu : un objet non vide de rubriques fermées ───────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_patient', 'FU_PATIENT', 1, jsonb_build_object('explication_patient', 'Texte.'), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: une rubrique « explication_patient » a été acceptée — hors de ce lot (arbitrage 6).';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_vide', 'FU_VIDE', 1, '{}'::jsonb, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une version sans rubrique a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_blanc', 'FU_BLANC', 1, jsonb_build_object('question', E'\t\n '), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une rubrique faite de blancs a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_objet', 'FU_OBJET', 1, '{"question":{"texte":"Q."}}'::jsonb, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une rubrique qui n''est pas un texte a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_tableau', 'FU_TABLEAU', 1, '["question"]'::jsonb, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation OR raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un contenu qui n''est pas un objet a été accepté.'; END IF;

  -- ── 7. L'empreinte d'un libellé est celle de son texte ───────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_faux', 'hypothese', 'HYP_FAUX', 1, L1, S, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un libellé à l''empreinte étrangère a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles
      (id, nature, terme_id, numero, libelle, libelle_sha256, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('ful_blanc', 'hypothese', 'HYP_BLANC', 1, E'\t ',
            encode(sha256(convert_to(E'\t ', 'UTF8')), 'hex'), S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un libellé fait de blancs a été accepté.'; END IF;

  -- ── 8. Acte et rubrique fermés ───────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_publiee', 'fuv_1', 'question', 'publiee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de rubrique « publiee » a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fula_publiee', 'ful_1', 'publiee', H_L1, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de libellé « publiee » a été accepté.'; END IF;

  -- Deux défenses, l'une derrière l'autre : le trigger ne trouve pas la
  -- rubrique dans la version (qui ne peut pas la porter, point 6), puis le
  -- CHECK de la liste fermée.
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_rub_patient', 'fuv_1', 'explication_patient', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN check_violation OR raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte sur la rubrique « explication_patient » a été accepté.'; END IF;

  -- Les CHECK doublés par un trigger, éprouvés SEULS : le trigger est
  -- désactivé le temps d'une insertion, dans la transaction annulée.
  ALTER TABLE fiches_usage_actes DISABLE TRIGGER fiches_usage_actes_avant_insertion;
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_check_rubrique', 'fuv_1', 'explication_patient', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  ALTER TABLE fiches_usage_actes ENABLE TRIGGER fiches_usage_actes_avant_insertion;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: sans son trigger, le CHECK de la liste fermée des rubriques a laissé passer « explication_patient ».';
  END IF;

  ALTER TABLE fiches_usage_versions DISABLE TRIGGER fiches_usage_versions_avant_insertion;
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_versions
      (id, fiche_id, numero, contenu, structure_sha256, modele_redaction, modele_contre_lecture, version_consigne)
    VALUES ('fuv_check_objet', 'FU_CHECK', 1, '["question"]'::jsonb, S, 'r', 'c', 'v');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  ALTER TABLE fiches_usage_versions ENABLE TRIGGER fiches_usage_versions_avant_insertion;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: sans son trigger, le CHECK « contenu objet » a laissé passer un tableau.';
  END IF;

  -- ── 9. Valider exige la relecture, retirer exige un motif ────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_sans_relecture', 'fuv_1', 'population', 'validee', H_P, 'praticien@wellneuro.fr', false);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une validation de rubrique sans relecture intégrale a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fula_sans_relecture', 'ful_1', 'validee', H_L1, 'praticien@wellneuro.fr', false);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une validation de libellé sans relecture intégrale a été acceptée.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale, motif)
    VALUES ('fua_retrait_blanc', 'fuv_1', 'population', 'retiree', H_P, 'praticien@wellneuro.fr', false, E'\t');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un retrait de rubrique au motif fait de blancs a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale, motif)
    VALUES ('fua_retrait_null', 'fuv_1', 'population', 'retiree', H_P, 'praticien@wellneuro.fr', false, NULL);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un retrait de rubrique sans motif (NULL) a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale, motif)
    VALUES ('fula_retrait_null', 'ful_1', 'retiree', H_L1, 'praticien@wellneuro.fr', false, NULL);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un retrait de libellé sans motif (NULL) a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale, motif)
    VALUES ('fula_retrait_blanc', 'ful_1', 'retiree', H_L1, 'praticien@wellneuro.fr', false, E' \n');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un retrait de libellé au motif fait de blancs a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_validateur', 'fuv_1', 'population', 'validee', H_P, ' ', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de rubrique sans validateur a été accepté.'; END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fula_validateur', 'ful_1', 'validee', H_L1, E'\t', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de libellé sans validateur a été accepté.'; END IF;

  -- ── 10. L'acte porte sur le texte EXACT visé ─────────────────────────────
  refuse := false;
  BEGIN
    -- L'empreinte de la rubrique « question », posée sur « population ».
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_autre_rubrique', 'fuv_1', 'population', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte portant l''empreinte d''une AUTRE rubrique a été accepté.';
  END IF;

  refuse := false;
  BEGIN
    -- « question » de la version 1, posée sur la version 2 dont le texte diffère.
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_autre_version', 'fuv_2', 'question', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte portant le texte d''une AUTRE version a été accepté.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_absente', 'fuv_1', 'limites', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte sur une rubrique absente de la version a été accepté.';
  END IF;

  refuse := false;
  BEGIN
    -- L'empreinte du libellé n° 1, posée sur le n° 2.
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fula_autre', 'ful_2', 'validee', H_L1, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte portant l''empreinte d''un AUTRE libellé a été accepté.';
  END IF;

  -- Une cible inconnue est refusée PAR LE TRIGGER, sous son nom (il passe
  -- avant la FK) : le message doit dire « inconnue », pas « absente » ni
  -- « empreinte » (revue CodeRabbit, #1488).
  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fua_inconnue', 'fuv_inexistante', 'question', 'validee', H_Q, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%version fuv_inexistante inconnue%';
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte sur une version inconnue n''a pas été refusé comme tel.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale)
    VALUES ('fula_inconnu', 'ful_inexistant', 'validee', H_L1, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := SQLERRM LIKE '%libellé ful_inexistant inconnu%';
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES USAGE: un acte sur un libellé inconnu n''a pas été refusé comme tel.';
  END IF;

  -- ── 11. `ordre` posé par la base ─────────────────────────────────────────
  INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
  VALUES ('fua_p_valide', 'fuv_1', 'population', 'validee', H_P, 'praticien@wellneuro.fr', true);
  INSERT INTO fiches_usage_actes (id, id_version, rubrique, acte, empreinte, validateur, relecture_integrale, motif)
  VALUES ('fua_p_retire', 'fuv_1', 'population', 'retiree', H_P, 'praticien@wellneuro.fr', false, 'Motif synthétique.');
  SELECT ordre INTO ordre_validation FROM fiches_usage_actes WHERE id = 'fua_p_valide';
  SELECT ordre INTO ordre_retrait FROM fiches_usage_actes WHERE id = 'fua_p_retire';
  IF NOT (ordre_retrait > ordre_validation) THEN
    RAISE EXCEPTION 'FICHES USAGE: `ordre` ne départage pas deux actes successifs (% puis %).', ordre_validation, ordre_retrait;
  END IF;
  INSERT INTO fiches_usage_actes (id, ordre, id_version, rubrique, acte, empreinte, validateur, relecture_integrale)
  VALUES ('fua_ordre_force', 1, 'fuv_1', 'population', 'validee', H_P, 'praticien@wellneuro.fr', true);
  SELECT ordre INTO ordre_force FROM fiches_usage_actes WHERE id = 'fua_ordre_force';
  IF NOT (ordre_force > ordre_retrait) THEN
    RAISE EXCEPTION 'FICHES USAGE: un `ordre` d''acte de rubrique fourni par l''appelant (1) a été gardé (%).', ordre_force;
  END IF;

  INSERT INTO fiches_usage_libelles_actes (id, id_libelle, acte, empreinte, validateur, relecture_integrale, motif)
  VALUES ('fula_retire', 'ful_1', 'retiree', H_L1, 'praticien@wellneuro.fr', false, 'Motif synthétique.');
  INSERT INTO fiches_usage_libelles_actes (id, ordre, id_libelle, acte, empreinte, validateur, relecture_integrale)
  VALUES ('fula_ordre_force', 1, 'ful_1', 'validee', H_L1, 'praticien@wellneuro.fr', true);
  SELECT ordre INTO ordre_retrait FROM fiches_usage_libelles_actes WHERE id = 'fula_retire';
  SELECT ordre INTO ordre_force FROM fiches_usage_libelles_actes WHERE id = 'fula_ordre_force';
  IF NOT (ordre_force > ordre_retrait) THEN
    RAISE EXCEPTION 'FICHES USAGE: un `ordre` d''acte de libellé fourni par l''appelant (1) a été gardé (%).', ordre_force;
  END IF;

  -- ── 12. Append-only, sur les quatre tables ───────────────────────────────
  refuse := false;
  BEGIN
    UPDATE fiches_usage_versions SET contenu = jsonb_build_object('question', 'Réécrit.') WHERE id = 'fuv_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une version a été RÉÉCRITE en place.'; END IF;

  refuse := false;
  BEGIN
    UPDATE fiches_usage_libelles SET version_consigne = 'x' WHERE id = 'ful_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un libellé a été RÉÉCRIT en place.'; END IF;

  refuse := false;
  BEGIN
    UPDATE fiches_usage_actes SET acte = 'retiree', motif = 'x' WHERE id = 'fua_q';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de rubrique a été RÉÉCRIT en place.'; END IF;

  refuse := false;
  BEGIN
    UPDATE fiches_usage_libelles_actes SET acte = 'retiree', motif = 'x' WHERE id = 'fula_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de libellé a été RÉÉCRIT en place.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_usage_actes WHERE id = 'fua_q';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de rubrique a été SUPPRIMÉ.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_usage_libelles_actes WHERE id = 'fula_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un acte de libellé a été SUPPRIMÉ.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_usage_versions WHERE id = 'fuv_2';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: une version a été SUPPRIMÉE.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_usage_libelles WHERE id = 'ful_2';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: un libellé a été SUPPRIMÉ.'; END IF;

  refuse := false;
  BEGIN
    TRUNCATE fiches_usage_actes;
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: TRUNCATE des actes de rubrique accepté.'; END IF;

  refuse := false;
  BEGIN
    TRUNCATE fiches_usage_libelles_actes;
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES USAGE: TRUNCATE des actes de libellé accepté.'; END IF;

  -- Un TRUNCATE … CASCADE des versions ou des libellés atteint aussi leur
  -- table d'actes, dont le trigger refuserait à lui seul : chaque table doit
  -- porter SON trigger TRUNCATE, ce que le catalogue dit.
  SELECT count(DISTINCT c.relname) INTO nb
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE c.relname IN ('fiches_usage_versions', 'fiches_usage_actes',
                      'fiches_usage_libelles', 'fiches_usage_libelles_actes')
    AND p.proname = 'fiches_usage_append_only'
    AND (t.tgtype & 32) <> 0
    AND t.tgenabled <> 'D';
  IF nb <> 4 THEN
    RAISE EXCEPTION 'FICHES USAGE: % table(s) sur 4 portent leur propre trigger TRUNCATE actif.', nb;
  END IF;

  -- ── 13. Les FK des actes en ON DELETE RESTRICT ───────────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND con.confdeltype = 'r'
    AND ((enfant.relname = 'fiches_usage_actes' AND ref.relname = 'fiches_usage_versions')
      OR (enfant.relname = 'fiches_usage_libelles_actes' AND ref.relname = 'fiches_usage_libelles'));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'FICHES USAGE: FK des actes absentes ou hors ON DELETE RESTRICT (% sur 2).', nb;
  END IF;

  -- ── 14. RLS deny-all ─────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('fiches_usage_versions', 'fiches_usage_actes',
                      'fiches_usage_libelles', 'fiches_usage_libelles_actes')
    AND c.relrowsecurity;
  IF nb <> 4 THEN
    RAISE EXCEPTION 'FICHES USAGE: RLS inactive sur % table(s) sur 4.', 4 - nb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('fiches_usage_versions', 'fiches_usage_actes',
                        'fiches_usage_libelles', 'fiches_usage_libelles_actes')
  ) THEN
    RAISE EXCEPTION 'FICHES USAGE: policy inattendue (deny-all attendu).';
  END IF;

  -- ── 15. Aucune colonne patient ───────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('fiches_usage_versions', 'fiches_usage_actes',
                         'fiches_usage_libelles', 'fiches_usage_libelles_actes')
    AND (c.column_name LIKE '%patient%' OR c.column_name LIKE '%assignation%');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'FICHES USAGE: % colonne(s) désignent un patient — ces tables ne portent AUCUNE donnée patient.', nb;
  END IF;

  RAISE NOTICE 'FICHES USAGE: versions, libellés et actes valides acceptés ; instants posés par la base en UTC sous un fuseau Europe/Paris (quatre tables) ; numéros contigus ; formats fermés ; nature et préfixe tenus ; contenu et rubriques fermés (explication_patient refusée, CHECK éprouvés seuls) ; empreinte de libellé tenue ; relecture et motif (NULL compris) exigés ; empreinte de rubrique recalculée par la base ; ordre posé par la base ; UPDATE/DELETE/TRUNCATE refusés, trigger TRUNCATE propre à chaque table ; FK RESTRICT ; RLS deny-all ; aucune colonne patient.';
END $$;

ROLLBACK;
