-- Contrat des positions d'expert et des arbitrages de conflits ([[D-439]],
-- BP-12b, migration seule).
--
-- Les trois tables promettent QUINZE choses, et ce fichier éprouve chacune.
-- Quatre CHECK n'y rougissent pas seuls, masqués par un trigger ou par la
-- clé primaire, qui refusent avant eux : le format de l'empreinte d'un acte,
-- `contenu` objet, et « ne se révise / ne se remplace pas » ; ils restent en
-- filet. Les quinze promesses :
--   1. une version, un acte, une pose, un remplacement et une révocation
--      valides s'écrivent ;
--   2. les instants sont posés par la BASE, en UTC — joué sous un fuseau de
--      session Europe/Paris — sur les trois tables ;
--   3. les formats sont fermés : `WN-PE-NNNN`, `vN.M`, `FU_…`, `CS-…`,
--      `identifiant@version`, empreintes ; le dossier de preuve est en liste
--      fermée (un dossier hors liste est refusé ; la liste elle-même est
--      éprouvée par `positions_expert_dossiers_v2_negatif.sql`, D-464) ;
--   4. le contenu a EXACTEMENT les quatre rubriques, chacune un texte visible ;
--   5. une version sans claim d'appui est refusée (vide ou NULL), comme un
--      appui mal formé ou cité deux fois ;
--   6. une révision désigne la version courante, reste dans son dossier et la
--      suit strictement ; une première version ne révise rien ;
--   7. SIGNER exige la relecture intégrale ; RETIRER exige un motif visible,
--      NULL compris ;
--   8. l'empreinte d'un acte est celle du contenu, recalculée par la base
--      selon la formule de la migration (recalculée ici indépendamment) ;
--      une version inconnue est refusée sous son nom ; une version révisée ne
--      reçoit plus d'acte ;
--   9. une pose retient UNE position et atteste ses deux empreintes ; une
--      révocation ne retient rien ; le motif est obligatoire pour les deux ;
--  10. une tête par couple conflit × fiche : une pose qui ne remplace pas la
--      tête, ou qui en remplace une quand il n'y en a pas, est refusée ; une
--      révocation qui ne vise pas la tête aussi ; deux fiches d'un même
--      conflit ont chacune leur tête (A2) ;
--  11. seule une position EN VIGUEUR se retient : non signée, retirée ou
--      révisée, elle est refusée ;
--  12. `ordre` est posé par la base ;
--  13. UPDATE, DELETE et TRUNCATE sont refusés sur les trois tables, chacune
--      par son PROPRE trigger TRUNCATE ;
--  14. les FK vers les versions sont en ON DELETE RESTRICT ;
--  15. la RLS deny-all est active et sans policy (posture `D-005`), et AUCUNE
--      colonne ne désigne un patient.
--
-- Ce que la base ne vérifie pas — l'appartenance d'un conflit bien formé au
-- registre signé, d'une fiche à sa liste, d'un claim retenu au conflit —
-- est à la route (D-439 §3, A2), éprouvé par les bancs de la PR suivante.
--
-- TEXTE SYNTHÉTIQUE SEULEMENT : aucune phrase de position n'entre dans le
-- dépôt, qui est public ([[D-251]] §4).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

SET LOCAL TimeZone TO 'Europe/Paris';

-- Une requête qui DOIT être refusée, avec l'un des états attendus : P0001
-- (trigger), 23514 (CHECK), 23503 (FK), 23505 (unicité). Le refus d'un autre
-- état fait échouer le contrat : un refus pour une mauvaise raison ne
-- prouve rien.
-- `motif`, s'il est donné, est un fragment du message attendu : un refus
-- que le message ne nomme pas ne compte pas (revue `wn-reviewer` : une
-- version inconnue se faisait refuser par l'empreinte, non sous son nom).
CREATE FUNCTION pg_temp.doit_refuser(libelle text, requete text, etats text[], motif text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION
    WHEN others THEN
      IF NOT (SQLSTATE = ANY (etats)) THEN
        RAISE EXCEPTION 'POSITIONS EXPERT: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'POSITIONS EXPERT: « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'POSITIONS EXPERT: « % » a été accepté.', libelle;
END;
$$;

DO $$
DECLARE
  nb integer;
  instant timestamp;
  o1 bigint;
  o2 bigint;
  S CONSTANT text := repeat('a', 64);
  C1 CONSTANT jsonb := jsonb_build_object(
    'enonce', 'Énoncé synthétique.', 'perimetre', 'Périmètre synthétique.',
    'population', 'Population synthétique.', 'limites', 'Limites synthétiques.');
  C2 CONSTANT jsonb := jsonb_build_object(
    'enonce', 'Énoncé révisé.', 'perimetre', 'Périmètre synthétique.',
    'population', 'Population synthétique.', 'limites', 'Limites synthétiques.');
  H1 text;
  H2 text;
  V CONSTANT text := 'INSERT INTO positions_expert_versions (id, position_id, version, dossier, fiche_id, contenu, claims_appui, id_version_revisee, auteur) VALUES ';
  A CONSTANT text := 'INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale, motif) VALUES ';
  R CONSTANT text := 'INSERT INTO arbitrages_conflits_sources (id, conflit_id, fiche_id, acte, id_arbitrage_remplace, claim_retenu, id_position_version, conflit_sha256, structure_sha256, motif, auteur) VALUES ';
  CL CONSTANT text := '''{WN-CL-0001-001@v1.0}''';
BEGIN
  -- L'empreinte, recalculée ICI sans la fonction de la migration.
  H1 := encode(sha256(convert_to(
          encode(sha256(convert_to('Énoncé synthétique.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Périmètre synthétique.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Population synthétique.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Limites synthétiques.', 'UTF8')), 'hex'),
          'UTF8')), 'hex');
  H2 := encode(sha256(convert_to(
          encode(sha256(convert_to('Énoncé révisé.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Périmètre synthétique.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Population synthétique.', 'UTF8')), 'hex')
          || encode(sha256(convert_to('Limites synthétiques.', 'UTF8')), 'hex'),
          'UTF8')), 'hex');

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    INSERT INTO positions_expert_versions
      (id, position_id, version, dossier, fiche_id, contenu, claims_appui, auteur, cree_le)
    VALUES
      ('pev_1', 'WN-PE-0001', 'v1.0', 'fer', 'FU_CONTRAT', C1,
       ARRAY['WN-CL-0001-001@v1.0', 'WN-CL-0002-002@1.0'], 'praticien@wellneuro.fr',
       TIMESTAMP '2000-01-01 00:00:00');
    -- Une position sans fiche d'usage (D-439 §2).
    INSERT INTO positions_expert_versions
      (id, position_id, version, dossier, contenu, claims_appui, auteur)
    VALUES ('pev_sans_fiche', 'WN-PE-0002', 'v1.0', 'zinc', C1, ARRAY['WN-CL-0001-001@v1.0'], 'p');
    INSERT INTO positions_expert_actes
      (id, ordre, id_version, acte, empreinte, auteur, relecture_integrale, le)
    VALUES ('pea_1', 999999, 'pev_1', 'signee', H1, 'praticien@wellneuro.fr', true,
            TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO arbitrages_conflits_sources
      (id, ordre, conflit_id, fiche_id, acte, claim_retenu, conflit_sha256,
       structure_sha256, motif, auteur, le)
    VALUES ('arb_1', 999999, 'CS-BIO-01', 'FU_CONTRAT', 'pose', 'WN-CL-0001-001@v1.0',
            S, S, 'Motif synthétique.', 'praticien@wellneuro.fr',
            TIMESTAMP '2000-01-01 00:00:00');
    -- La même tête remplacée par une position d'expert en vigueur.
    INSERT INTO arbitrages_conflits_sources
      (id, conflit_id, fiche_id, acte, id_arbitrage_remplace, id_position_version,
       conflit_sha256, structure_sha256, motif, auteur)
    VALUES ('arb_2', 'CS-BIO-01', 'FU_CONTRAT', 'pose', 'arb_1', 'pev_1', S, S, 'Motif.', 'p');
    -- Le même conflit, pour une AUTRE fiche : sa propre tête (A2).
    INSERT INTO arbitrages_conflits_sources
      (id, conflit_id, fiche_id, acte, claim_retenu, conflit_sha256, structure_sha256, motif, auteur)
    VALUES ('arb_autre_fiche', 'CS-BIO-01', 'FU_AUTRE', 'pose', 'WN-CL-0002-002@v1.0', S, S, 'Motif.', 'p');
    -- Révocation de la tête : le couple revient à « non arbitré »…
    INSERT INTO arbitrages_conflits_sources
      (id, conflit_id, fiche_id, acte, id_arbitrage_remplace, motif, auteur)
    VALUES ('arb_rev', 'CS-BIO-01', 'FU_CONTRAT', 'revocation', 'arb_2', 'Motif de révocation.', 'p');
    -- … et une pose neuve n'y remplace rien.
    INSERT INTO arbitrages_conflits_sources
      (id, conflit_id, fiche_id, acte, claim_retenu, conflit_sha256, structure_sha256, motif, auteur)
    VALUES ('arb_3', 'CS-BIO-01', 'FU_CONTRAT', 'pose', 'WN-CL-0001-001@v1.0', S, S, 'Motif.', 'p');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'POSITIONS EXPERT: un cas valide a été refusé (%)', SQLERRM;
  END;

  -- ── 2. Les instants sont posés par la base, en UTC ───────────────────────
  SELECT cree_le INTO instant FROM positions_expert_versions WHERE id = 'pev_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: l''instant d''une version (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT le INTO instant FROM positions_expert_actes WHERE id = 'pea_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: l''instant d''un acte (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT le INTO instant FROM arbitrages_conflits_sources WHERE id = 'arb_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: l''instant d''un arbitrage (%) n''est pas posé par la base en UTC.', instant;
  END IF;

  -- ── 3. Formats fermés ────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('identifiant de position mal formé',
    V || '(''x1'', ''WN-PE-01'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('version mal formée',
    V || '(''x2'', ''WN-PE-0003'', ''1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('dossier hors liste fermée',
    V || '(''x3'', ''WN-PE-0003'', ''v1.0'', ''omega_3'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('fiche d''usage mal formée',
    V || '(''x4'', ''WN-PE-0003'', ''v1.0'', ''fer'', ''FU_minuscule'', ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('auteur blanc',
    V || '(''x5'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, E''\t'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('arbitrage d''un conflit mal formé',
    R || '(''y1'', ''CONFLIT-1'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('arbitrage sur une fiche mal formée',
    R || '(''y2'', ''CS-X-01'', ''fiche'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('claim retenu sans version',
    R || '(''y3'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('empreinte du conflit mal formée',
    R || '(''y4'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ''ABC'', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('empreinte de structure mal formée',
    R || '(''y4b'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(upper(S)) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('arbitrage à l''auteur blanc',
    R || '(''y4c'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', E''\n'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('arbitrage au motif trop long',
    R || '(''y4d'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', repeat(''m'', 4001), ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('auteur trop long',
    V || '(''x5b'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, repeat(''p'', 321))', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('acte d''arbitrage hors liste',
    R || '(''y5'', ''CS-X-01'', ''FU_X'', ''confirmation'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('acte de position hors liste',
    A || '(''z0'', ''pev_sans_fiche'', ''validee'', ' || quote_literal(H1) || ', ''p'', true, NULL)', ARRAY['23514']);

  -- ── 4. Le contenu : quatre rubriques, chacune un texte visible ───────────
  PERFORM pg_temp.doit_refuser('contenu sans limites',
    V || '(''x6'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1 - 'limites') || ', ' || CL || ', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('contenu avec une rubrique de plus',
    V || '(''x7'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1 || '{"explication_patient": "x"}'::jsonb) || ', ' || CL || ', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('rubrique faite de blancs',
    V || '(''x8'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(jsonb_set(C1, '{enonce}', to_jsonb(E' \t\n'::text))) || ', ' || CL || ', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('rubrique qui n''est pas un texte',
    V || '(''x9'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(jsonb_set(C1, '{enonce}', '12'::jsonb)) || ', ' || CL || ', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('contenu qui n''est pas un objet',
    V || '(''x10'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ''["a"]''::jsonb, ' || CL || ', NULL, ''p'')', ARRAY['P0001']);

  -- ── 5. Les claims d'appui ────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('version sans claim d''appui (tableau vide)',
    V || '(''x11'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ''{}'', NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('version sans claim d''appui (NULL)',
    V || '(''x12'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', NULL, NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('claim d''appui NULL dans le tableau',
    V || '(''x13'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ARRAY[''WN-CL-0001-001@v1.0'', NULL], NULL, ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('claim d''appui mal formé',
    V || '(''x14'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ''{WN-CL-0001-001}'', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('claim d''appui cité deux fois',
    V || '(''x15'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ''{WN-CL-0001-001@v1.0,WN-CL-0001-001@v1.0}'', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('claims d''appui sur deux dimensions',
    V || '(''x16'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ''{{WN-CL-0001-001@v1.0},{WN-CL-0002-002@v1.0}}'', NULL, ''p'')', ARRAY['23514']);

  -- ── 6. La révision ───────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('première version qui dit en réviser une',
    V || '(''x17'', ''WN-PE-0003'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C1) || ', ' || CL || ', ''pev_1'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('version suivante qui ne révise rien',
    V || '(''x18'', ''WN-PE-0001'', ''v1.1'', ''fer'', NULL, ' || quote_literal(C2) || ', ' || CL || ', NULL, ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révision d''une version d''une autre position',
    V || '(''x19'', ''WN-PE-0001'', ''v1.1'', ''fer'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_sans_fiche'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révision dans un autre dossier',
    V || '(''x20'', ''WN-PE-0001'', ''v1.1'', ''zinc'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_1'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révision qui ne suit pas (v0.9)',
    V || '(''x21'', ''WN-PE-0001'', ''v0.9'', ''fer'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_1'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révision au même numéro',
    V || '(''x22'', ''WN-PE-0001'', ''v1.0'', ''fer'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_1'', ''p'')', ARRAY['P0001']);

  -- ── 7 et 8. Les actes ────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('signature sans relecture intégrale',
    A || '(''z1'', ''pev_sans_fiche'', ''signee'', ' || quote_literal(H1) || ', ''p'', false, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait sans motif (NULL)',
    A || '(''z2'', ''pev_sans_fiche'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait au motif fait de blancs',
    A || '(''z3'', ''pev_sans_fiche'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, E'' \t'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('acte à l''empreinte d''un autre contenu',
    A || '(''z4'', ''pev_sans_fiche'', ''signee'', ' || quote_literal(H2) || ', ''p'', true, NULL)', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('acte sur une version inconnue',
    A || '(''z5'', ''pev_inconnue'', ''signee'', ' || quote_literal(H1) || ', ''p'', true, NULL)', ARRAY['P0001'], 'version pev_inconnue inconnue');
  PERFORM pg_temp.doit_refuser('acte à l''auteur blanc',
    A || '(''z7'', ''pev_sans_fiche'', ''signee'', ' || quote_literal(H1) || ', E'' \t'', true, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait au motif trop long',
    A || '(''z8'', ''pev_sans_fiche'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, repeat(''m'', 4001))', ARRAY['23514']);

  -- Une révision valide : v1.1 révise v1.0, qui ne reçoit plus d'acte.
  INSERT INTO positions_expert_versions
    (id, position_id, version, dossier, fiche_id, contenu, claims_appui, id_version_revisee, auteur)
  VALUES ('pev_2', 'WN-PE-0001', 'v1.1', 'fer', 'FU_CONTRAT', C2, ARRAY['WN-CL-0001-001@v1.0'], 'pev_1', 'p');
  PERFORM pg_temp.doit_refuser('acte sur une version révisée',
    A || '(''z6'', ''pev_1'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, ''Motif.'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('seconde révision de la même version',
    V || '(''x23'', ''WN-PE-0001'', ''v2.0'', ''fer'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_1'', ''p'')', ARRAY['P0001']);

  -- ── 9. La forme d'un arbitrage ───────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('pose qui ne retient rien',
    R || '(''y6'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, NULL, NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('pose sans empreinte de structure',
    R || '(''y8'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', NULL, ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('pose sans empreinte du conflit',
    R || '(''y9'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, NULL, ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('pose au motif fait de blancs',
    R || '(''y10'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', E'' \n'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('révocation qui retient un claim',
    R || '(''y11'', ''CS-BIO-01'', ''FU_CONTRAT'', ''revocation'', ''arb_3'', ''WN-CL-0001-001@v1.0'', NULL, NULL, NULL, ''m'', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('révocation sans motif',
    R || '(''y12'', ''CS-BIO-01'', ''FU_CONTRAT'', ''revocation'', ''arb_3'', NULL, NULL, NULL, NULL, '''', ''p'')', ARRAY['23514']);

  -- ── 10. Une tête par couple ──────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('pose sur un couple arbitré qui ne remplace pas la tête',
    R || '(''y13'', ''CS-BIO-01'', ''FU_CONTRAT'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('pose qui remplace une ancienne tête',
    R || '(''y14'', ''CS-BIO-01'', ''FU_CONTRAT'', ''pose'', ''arb_1'', ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('pose neuve qui dit remplacer, sur un couple non arbitré',
    R || '(''y15'', ''CS-BIO-01'', ''FU_NEUVE'', ''pose'', ''arb_3'', ''WN-CL-0001-001@v1.0'', NULL, ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révocation qui ne vise pas la tête',
    R || '(''y16'', ''CS-BIO-01'', ''FU_CONTRAT'', ''revocation'', ''arb_2'', NULL, NULL, NULL, NULL, ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révocation de la tête d''une autre fiche',
    R || '(''y17'', ''CS-BIO-01'', ''FU_CONTRAT'', ''revocation'', ''arb_autre_fiche'', NULL, NULL, NULL, NULL, ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('révocation sur un couple non arbitré',
    R || '(''y18'', ''CS-BIO-01'', ''FU_NEUVE'', ''revocation'', ''arb_3'', NULL, NULL, NULL, NULL, ''m'', ''p'')', ARRAY['P0001']);
  SELECT count(*) INTO nb FROM arbitrages_conflits_sources a
  WHERE a.conflit_id = 'CS-BIO-01' AND a.acte = 'pose'
    AND NOT EXISTS (SELECT 1 FROM arbitrages_conflits_sources s WHERE s.id_arbitrage_remplace = a.id);
  IF nb <> 2 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: % tête(s) pour CS-BIO-01 ; une par fiche attendue (2).', nb;
  END IF;

  -- ── 11. Seule une position en vigueur se retient ─────────────────────────
  -- pev_2 n'est pas signée ; pev_1 est révisée ; pev_sans_fiche sera retirée.
  PERFORM pg_temp.doit_refuser('arbitrage qui retient une position non signée',
    R || '(''y19'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, NULL, ''pev_2'', ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('arbitrage qui retient une version révisée',
    R || '(''y20'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, NULL, ''pev_1'', ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('arbitrage qui retient une version inconnue',
    R || '(''y21'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, NULL, ''pev_inconnue'', ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001'], 'version de position pev_inconnue inconnue');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pea_s', 'pev_sans_fiche', 'signee', H1, 'p', true);
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale, motif)
  VALUES ('pea_r', 'pev_sans_fiche', 'retiree', H1, 'p', false, 'Motif de retrait.');
  PERFORM pg_temp.doit_refuser('arbitrage qui retient une position retirée',
    R || '(''y22'', ''CS-X-01'', ''FU_X'', ''pose'', NULL, NULL, ''pev_sans_fiche'', ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['P0001']);
  -- Signée de nouveau, elle se retient : le dernier acte fait foi.
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pea_s2', 'pev_sans_fiche', 'signee', H1, 'p', true);
  INSERT INTO arbitrages_conflits_sources
    (id, conflit_id, fiche_id, acte, id_position_version, conflit_sha256, structure_sha256, motif, auteur)
  VALUES ('arb_x', 'CS-X-01', 'FU_X', 'pose', 'pev_sans_fiche', S, S, 'Motif.', 'p');
  -- Position en vigueur ET claim : le CHECK seul refuse (le trigger passe).
  PERFORM pg_temp.doit_refuser('pose qui retient un claim ET une position',
    R || '(''y7'', ''CS-X-02'', ''FU_X'', ''pose'', NULL, ''WN-CL-0001-001@v1.0'', ''pev_sans_fiche'', ' || quote_literal(S) || ', ' || quote_literal(S) || ', ''m'', ''p'')', ARRAY['23514']);

  -- ── 12. `ordre` posé par la base ─────────────────────────────────────────
  SELECT ordre INTO o1 FROM positions_expert_actes WHERE id = 'pea_1';
  SELECT ordre INTO o2 FROM positions_expert_actes WHERE id = 'pea_s';
  IF o1 = 999999 OR o2 <= o1 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: l''ordre des actes n''est pas posé par la base (% puis %).', o1, o2;
  END IF;
  SELECT ordre INTO o1 FROM arbitrages_conflits_sources WHERE id = 'arb_1';
  SELECT ordre INTO o2 FROM arbitrages_conflits_sources WHERE id = 'arb_2';
  IF o1 = 999999 OR o2 <= o1 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: l''ordre des arbitrages n''est pas posé par la base (% puis %).', o1, o2;
  END IF;

  -- ── 13. Append-only ──────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('UPDATE d''une version',
    'UPDATE positions_expert_versions SET auteur = ''q'' WHERE id = ''pev_1''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('DELETE d''une version sans acte',
    'DELETE FROM positions_expert_versions WHERE id = ''pev_2''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('UPDATE d''un acte',
    'UPDATE positions_expert_actes SET motif = ''q'' WHERE id = ''pea_1''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('DELETE d''un acte',
    'DELETE FROM positions_expert_actes WHERE id = ''pea_1''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('UPDATE d''un arbitrage',
    'UPDATE arbitrages_conflits_sources SET motif = ''q'' WHERE id = ''arb_3''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('DELETE d''un arbitrage',
    'DELETE FROM arbitrages_conflits_sources WHERE id = ''arb_3''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('TRUNCATE des versions',
    'TRUNCATE positions_expert_versions CASCADE', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('TRUNCATE des actes',
    'TRUNCATE positions_expert_actes', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('TRUNCATE des arbitrages',
    'TRUNCATE arbitrages_conflits_sources', ARRAY['P0001']);
  -- Les TABLES distinctes qui portent un trigger TRUNCATE ACTIF : la cascade
  -- du TRUNCATE ci-dessus se fait refuser par la première table voisine, si
  -- bien que le sondage seul ne prouve rien pour `positions_expert_versions`
  -- (revue CodeRabbit de #1871). Actif = `O` (origine) ou `A` (toujours) :
  -- un trigger en `R` (ENABLE REPLICA) ne joue pas dans une session normale
  -- (contre-revue Codex de #1871, P2-2).
  SELECT count(DISTINCT c.relname) INTO nb
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname IN ('positions_expert_versions', 'positions_expert_actes', 'arbitrages_conflits_sources')
    AND (t.tgtype & 32) <> 0 AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A');
  IF nb <> 3 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: % trigger(s) TRUNCATE sur 3 — chaque table porte le sien.', nb;
  END IF;

  -- ── 14. FK RESTRICT vers les versions ────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint k
  JOIN pg_class enfant ON enfant.oid = k.conrelid
  JOIN pg_class ref ON ref.oid = k.confrelid
  WHERE k.contype = 'f' AND k.confdeltype = 'r'
    AND ref.relname = 'positions_expert_versions'
    AND enfant.relname IN ('positions_expert_actes', 'arbitrages_conflits_sources');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: FK vers les versions absentes ou hors ON DELETE RESTRICT (% sur 2).', nb;
  END IF;

  -- ── 15. RLS deny-all, aucune colonne patient ─────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('positions_expert_versions', 'positions_expert_actes', 'arbitrages_conflits_sources')
    AND c.relrowsecurity;
  IF nb <> 3 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: RLS inactive sur % table(s) sur 3.', 3 - nb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('positions_expert_versions', 'positions_expert_actes', 'arbitrages_conflits_sources')
  ) THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: policy inattendue (deny-all attendu).';
  END IF;
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('positions_expert_versions', 'positions_expert_actes', 'arbitrages_conflits_sources')
    AND (c.column_name LIKE '%patient%' OR c.column_name LIKE '%assignation%'
         OR c.column_name LIKE '%consultation%' OR c.column_name LIKE '%dossier_id%');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'POSITIONS EXPERT: % colonne(s) désignent un patient — ces tables ne portent AUCUNE donnée patient.', nb;
  END IF;

  -- ── 6 bis. Numéros à deux chiffres : la comparaison est NUMÉRIQUE ────────
  -- Une chaîne à part (WN-PE-0003, qu'aucun cas ne lit après) : `v1.10` suit
  -- `v1.9` et `v10.0` suit `v9.9`, ce qu'une comparaison textuelle refuserait ;
  -- `v1.9` après `v1.10` est refusé, ce qu'elle accepterait (revue CodeRabbit
  -- de #1871).
  BEGIN
    INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, auteur)
    VALUES ('pev_n1', 'WN-PE-0003', 'v1.9', 'magnesium', C1, ARRAY['WN-CL-0001-001@v1.0'], 'p');
    INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
    VALUES ('pev_n2', 'WN-PE-0003', 'v1.10', 'magnesium', C2, ARRAY['WN-CL-0001-001@v1.0'], 'pev_n1', 'p');
    INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
    VALUES ('pev_n3', 'WN-PE-0003', 'v9.9', 'magnesium', C2, ARRAY['WN-CL-0001-001@v1.0'], 'pev_n2', 'p');
    INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
    VALUES ('pev_n4', 'WN-PE-0003', 'v10.0', 'magnesium', C2, ARRAY['WN-CL-0001-001@v1.0'], 'pev_n3', 'p');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'POSITIONS EXPERT: une révision à deux chiffres a été refusée (%)', SQLERRM;
  END;
  PERFORM pg_temp.doit_refuser('révision v9.10 après v10.0',
    V || '(''x30'', ''WN-PE-0003'', ''v9.10'', ''magnesium'', NULL, ' || quote_literal(C2) || ', ' || CL || ', ''pev_n4'', ''p'')',
    ARRAY['P0001'], 'ne suit pas la version courante');

  RAISE NOTICE 'POSITIONS EXPERT: versions, actes, poses, remplacements et révocations valides acceptés ; instants en UTC sous Europe/Paris (trois tables) ; formats et dossier fermés ; contenu à quatre rubriques ; claims d''appui exigés, formés, uniques ; révision de la version courante, même dossier, numéro croissant ; relecture et motif exigés ; empreinte recalculée par la base ; version révisée sans acte ; forme de la pose et de la révocation ; une tête par couple, une par fiche ; seule une position en vigueur se retient ; ordre posé par la base ; UPDATE/DELETE/TRUNCATE refusés, trigger TRUNCATE propre ; FK RESTRICT ; RLS deny-all ; aucune colonne patient.';
END $$;

ROLLBACK;
