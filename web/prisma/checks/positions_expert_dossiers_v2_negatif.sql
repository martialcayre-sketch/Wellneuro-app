-- Contrat de la liste fermée des dossiers de preuve des positions d'expert,
-- élargie par la migration `positions_expert_dossiers_v2` ([[D-464]], qui
-- amende [[D-439]] §2 et §5).
--
-- Cinq promesses :
--   1. la contrainte `positions_expert_versions_dossier_ferme` est la SEULE
--      contrainte CHECK de la table qui nomme `dossier`, et sa définition est
--      exactement la liste des sept dossiers (aucun ajouté, aucun omis) ;
--   2. une version s'écrit dans chacun des sept dossiers, dont les deux
--      entrants `iode_selenium` et `polyphenols_antioxydants` ;
--   3. une valeur HORS LISTE est toujours refusée par le CHECK : dossier
--      inconnu, quasi-homonymes, casse, blanc de bord, chaîne vide ;
--   4. un dossier NULL est refusé (NOT NULL) ;
--   5. une révision reste dans son dossier, y compris entre les deux
--      entrants (trigger inchangé).
--
-- Le reste des promesses des trois tables est à
-- `positions_expert_v1_negatif.sql`.
--
-- TEXTE SYNTHÉTIQUE SEULEMENT : aucune phrase de position n'entre dans le
-- dépôt, qui est public ([[D-251]] §4).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

SET LOCAL TimeZone TO 'Europe/Paris';

-- Une requête qui DOIT être refusée, avec l'un des états attendus. Le refus
-- d'un autre état fait échouer le contrat : un refus pour une mauvaise
-- raison ne prouve rien. `motif`, s'il est donné, est un fragment du message
-- attendu.
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
        RAISE EXCEPTION 'DOSSIERS POSITIONS: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'DOSSIERS POSITIONS: « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'DOSSIERS POSITIONS: « % » a été accepté.', libelle;
END;
$$;

DO $$
DECLARE
  nb integer;
  def text;
  d text;
  i integer := 0;
  C1 CONSTANT jsonb := jsonb_build_object(
    'enonce', 'Énoncé synthétique.', 'perimetre', 'Périmètre synthétique.',
    'population', 'Population synthétique.', 'limites', 'Limites synthétiques.');
  V CONSTANT text := 'INSERT INTO positions_expert_versions (id, position_id, version, dossier, fiche_id, contenu, claims_appui, id_version_revisee, auteur) VALUES ';
  CL CONSTANT text := '''{WN-CL-0001-001@v1.0}''';
  ATTENDU CONSTANT text := 'CHECK ((dossier = ANY (ARRAY['
    || '''fer''::text, ''vitamine_d''::text, ''zinc''::text, ''magnesium''::text, '
    || '''b9_b12''::text, ''iode_selenium''::text, ''polyphenols_antioxydants''::text])))';
BEGIN
  -- ── 1. La contrainte, seule et exacte ────────────────────────────────────
  -- Par la colonne référencée (`conkey`), pas par le texte de la définition.
  SELECT count(*) INTO nb
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.positions_expert_versions'::regclass
    AND c.contype = 'c'
    AND a.attname = 'dossier';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'DOSSIERS POSITIONS: % contrainte(s) CHECK sur `dossier` ; une seule attendue.', nb;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.positions_expert_versions'::regclass
    AND c.conname = 'positions_expert_versions_dossier_ferme'
    AND c.contype = 'c';
  IF def IS NULL THEN
    RAISE EXCEPTION 'DOSSIERS POSITIONS: la contrainte `positions_expert_versions_dossier_ferme` est absente.';
  END IF;
  IF def <> ATTENDU THEN
    RAISE EXCEPTION 'DOSSIERS POSITIONS: définition inattendue de la liste fermée (reçu : %).', def;
  END IF;

  -- ── 2. Les sept dossiers s'écrivent ──────────────────────────────────────
  FOREACH d IN ARRAY ARRAY['fer', 'vitamine_d', 'zinc', 'magnesium', 'b9_b12',
                           'iode_selenium', 'polyphenols_antioxydants'] LOOP
    i := i + 1;
    BEGIN
      INSERT INTO positions_expert_versions
        (id, position_id, version, dossier, contenu, claims_appui, auteur)
      VALUES ('pev_d' || i, 'WN-PE-' || (9000 + i)::text, 'v1.0', d, C1,
              ARRAY['WN-CL-0001-001@v1.0'], 'p');
    EXCEPTION
      WHEN others THEN
        RAISE EXCEPTION 'DOSSIERS POSITIONS: le dossier « % » a été refusé (%).', d, SQLERRM;
    END;
  END LOOP;
  SELECT count(DISTINCT dossier) INTO nb FROM positions_expert_versions WHERE id LIKE 'pev\_d%';
  IF nb <> 7 THEN
    RAISE EXCEPTION 'DOSSIERS POSITIONS: % dossier(s) écrits sur 7.', nb;
  END IF;

  -- ── 3. Hors liste : toujours refusé, par le CHECK ────────────────────────
  PERFORM pg_temp.doit_refuser('dossier inconnu',
    V || '(''h1'', ''WN-PE-9101'', ''v1.0'', ''omega_3'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('quasi-homonyme « polyphenols »',
    V || '(''h2'', ''WN-PE-9102'', ''v1.0'', ''polyphenols'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('quasi-homonyme « iode_et_selenium »',
    V || '(''h3'', ''WN-PE-9103'', ''v1.0'', ''iode_et_selenium'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('casse « IODE_SELENIUM »',
    V || '(''h4'', ''WN-PE-9104'', ''v1.0'', ''IODE_SELENIUM'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('espace final « polyphenols_antioxydants »',
    V || '(''h5'', ''WN-PE-9105'', ''v1.0'', ''polyphenols_antioxydants '', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('tabulation initiale « iode_selenium »',
    V || '(''h6'', ''WN-PE-9106'', ''v1.0'', E''\tiode_selenium'', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');
  PERFORM pg_temp.doit_refuser('chaîne vide',
    V || '(''h7'', ''WN-PE-9107'', ''v1.0'', '''', NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23514'], 'positions_expert_versions_dossier_ferme');

  -- ── 4. NULL refusé ───────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('dossier NULL',
    V || '(''h8'', ''WN-PE-9108'', ''v1.0'', NULL, NULL, ' || quote_literal(C1) || ', ' || CL || ', NULL, ''p'')', ARRAY['23502']);

  -- ── 5. Une révision reste dans son dossier ───────────────────────────────
  -- `pev_d6` est la version courante de WN-PE-9006, dossier `iode_selenium`.
  PERFORM pg_temp.doit_refuser('révision d''iode et sélénium vers polyphénols',
    V || '(''r1'', ''WN-PE-9006'', ''v1.1'', ''polyphenols_antioxydants'', NULL, ' || quote_literal(C1) || ', ' || CL || ', ''pev_d6'', ''p'')', ARRAY['P0001'], 'dossier de preuve');
  BEGIN
    INSERT INTO positions_expert_versions
      (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
    VALUES ('r2', 'WN-PE-9007', 'v1.1', 'polyphenols_antioxydants', C1,
            ARRAY['WN-CL-0001-001@v1.0'], 'pev_d7', 'p');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'DOSSIERS POSITIONS: une révision dans le dossier polyphénols a été refusée (%).', SQLERRM;
  END;

  RAISE NOTICE 'DOSSIERS POSITIONS: une seule contrainte sur `dossier`, définition exacte (sept dossiers) ; les sept s''écrivent ; inconnu, quasi-homonymes, casse, blancs de bord et chaîne vide refusés par le CHECK ; NULL refusé ; une révision reste dans son dossier.';
END;
$$;

ROLLBACK;
