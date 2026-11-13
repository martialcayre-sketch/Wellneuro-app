-- Test négatif du contrat des positions citées par les tables signées
-- ([[D-480]] §5.3, BP-17 PR 4) — `positions_citees_tables_signees_v1.sql`.
--
-- Le contrat ne tourne que contre la production ; ce fichier prouve qu'il
-- MORD, sur une base vide (CI, T2/T3). Il pose ses propres positions, joue le
-- MÊME prédicat (bloc PREDICAT_POSITIONS_CITEES, identique octet pour octet,
-- `positionsCitees.guard.test.ts`) sur des listes fabriquées ici, et annule
-- tout. Il ne tourne JAMAIS contre la production : il écrit.
--
-- Cas éprouvés :
--   1. une position courante dont le dernier acte est une signature : aucune
--      violation (et une liste vide n'en rend aucune) ;
--   2. une position absente (identifiant ou version inconnus) ;
--   3. une version sans aucun acte ;
--   4. une version signée puis RETIRÉE (dernier acte `retiree`) ;
--   5. une version signée puis RÉVISÉE (une version plus récente la révise) ;
--   6. le dernier acte se lit par `ordre`, non par le premier trouvé.
-- L'empreinte d'une signature différente du contenu n'a pas de fixture
-- possible : la base la refuse à l'insertion de l'acte (trigger), et le
-- contenu ne change plus. Le cas 7 le constate.
--
-- Fixtures neutres : `WN-PE-99xx`, contenu synthétique, aucun texte clinique.
-- Transaction annulée.
BEGIN;

CREATE FUNCTION pg_temp.violations_positions_citees(epinglees jsonb)
RETURNS text
LANGUAGE plpgsql
AS $f$
DECLARE
  detail text;
BEGIN
-- >>> PREDICAT_POSITIONS_CITEES
  SELECT string_agg(
           format('%s@%s [%s] (%s)', e.position_id, e.version, e.table_signee,
                  CASE
                    WHEN v.id IS NULL THEN 'absente'
                    WHEN s.id IS NOT NULL THEN 'révisée par ' || s.version
                    WHEN dernier.acte IS NULL THEN 'aucun acte'
                    WHEN dernier.acte IS DISTINCT FROM 'signee' THEN 'dernier acte ' || dernier.acte
                    ELSE 'empreinte de la signature différente de la version'
                  END),
           ', ' ORDER BY e.position_id, e.version, e.table_signee)
    INTO detail
  FROM jsonb_to_recordset(epinglees) AS e(position_id text, version text, table_signee text)
  LEFT JOIN positions_expert_versions v
    ON v.position_id = e.position_id AND v.version = e.version
  LEFT JOIN positions_expert_versions s
    ON s.id_version_revisee = v.id
  LEFT JOIN LATERAL (
    SELECT a.acte, a.empreinte
    FROM positions_expert_actes a
    WHERE a.id_version = v.id
    ORDER BY a.ordre DESC
    LIMIT 1
  ) dernier ON true
  WHERE v.id IS NULL
     OR s.id IS NOT NULL
     OR dernier.acte IS DISTINCT FROM 'signee'
     OR dernier.empreinte IS DISTINCT FROM public.positions_expert_empreinte_contenu(v.contenu);
-- <<< PREDICAT_POSITIONS_CITEES
  RETURN detail;
END;
$f$;

CREATE FUNCTION pg_temp.une(position_id text, version text) RETURNS jsonb
LANGUAGE sql AS $f$
  SELECT jsonb_build_array(jsonb_build_object(
    'position_id', position_id, 'version', version, 'table_signee', 'bibliotheque_options'));
$f$;

CREATE FUNCTION pg_temp.doit_rendre(cas text, epinglees jsonb, motif text) RETURNS void
LANGUAGE plpgsql AS $f$
DECLARE
  detail text := pg_temp.violations_positions_citees(epinglees);
BEGIN
  IF detail IS NULL OR position(motif IN detail) = 0 THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : le cas « % » devait rendre « % », il rend %.', cas, motif, coalesce(detail, 'aucune violation');
  END IF;
END;
$f$;

DO $$
DECLARE
  C1 CONSTANT jsonb := jsonb_build_object(
    'enonce', 'Énoncé synthétique.', 'perimetre', 'Périmètre synthétique.',
    'population', 'Population synthétique.', 'limites', 'Limites synthétiques.');
  C2 CONSTANT jsonb := jsonb_build_object(
    'enonce', 'Énoncé révisé.', 'perimetre', 'Périmètre synthétique.',
    'population', 'Population synthétique.', 'limites', 'Limites synthétiques.');
  H1 text := public.positions_expert_empreinte_contenu(C1);
  H2 text := public.positions_expert_empreinte_contenu(C2);
  detail text;
  refuse boolean;
BEGIN
  -- Fixtures : quatre positions, chacune dans son état.
  INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, auteur)
  VALUES
    ('pcv_signee', 'WN-PE-9901', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-001@v1.0'], 'p'),
    ('pcv_sans_acte', 'WN-PE-9902', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-001@v1.0'], 'p'),
    ('pcv_retiree', 'WN-PE-9903', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-001@v1.0'], 'p'),
    ('pcv_revisee', 'WN-PE-9904', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-001@v1.0'], 'p');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pca_signee', 'pcv_signee', 'signee', H1, 'p', true);
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pca_retiree_1', 'pcv_retiree', 'signee', H1, 'p', true);
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale, motif)
  VALUES ('pca_retiree_2', 'pcv_retiree', 'retiree', H1, 'p', false, 'Motif synthétique.');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pca_revisee', 'pcv_revisee', 'signee', H1, 'p', true);
  INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
  VALUES ('pcv_revisee_2', 'WN-PE-9904', 'v1.1', 'fer', C2, ARRAY['WN-CL-9999-001@v1.0'], 'pcv_revisee', 'p');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pca_revisee_2', 'pcv_revisee_2', 'signee', H2, 'p', true);

  -- 1. Une position courante signée, et une liste vide : aucune violation.
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9901', 'v1.0'));
  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une position courante et signée a été refusée (%).', detail;
  END IF;
  detail := pg_temp.violations_positions_citees('[]'::jsonb);
  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une liste vide a rendu une violation (%).', detail;
  END IF;
  -- La version COURANTE d'une position révisée, signée, passe aussi.
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9904', 'v1.1'));
  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : la version courante signée d''une position révisée a été refusée (%).', detail;
  END IF;

  -- 2. Absente : identifiant inconnu, puis version inconnue.
  PERFORM pg_temp.doit_rendre('identifiant inconnu', pg_temp.une('WN-PE-9999', 'v1.0'), 'absente');
  PERFORM pg_temp.doit_rendre('version inconnue', pg_temp.une('WN-PE-9901', 'v2.0'), 'absente');
  -- 3. Sans acte.
  PERFORM pg_temp.doit_rendre('version sans acte', pg_temp.une('WN-PE-9902', 'v1.0'), 'aucun acte');
  -- 4 et 6. Signée puis retirée : le DERNIER acte, par `ordre`, décide.
  PERFORM pg_temp.doit_rendre('signée puis retirée', pg_temp.une('WN-PE-9903', 'v1.0'), 'dernier acte retiree');
  -- 5. Signée puis révisée : la version épinglée n'est plus la courante.
  PERFORM pg_temp.doit_rendre('signée puis révisée', pg_temp.une('WN-PE-9904', 'v1.0'), 'révisée par v1.1');

  -- Une liste mêlée rend chaque violation, et elle seule.
  detail := pg_temp.violations_positions_citees(
    pg_temp.une('WN-PE-9901', 'v1.0') || pg_temp.une('WN-PE-9902', 'v1.0') || pg_temp.une('WN-PE-9903', 'v1.0'));
  IF detail IS NULL OR position('WN-PE-9901' IN detail) > 0
     OR position('WN-PE-9902' IN detail) = 0 OR position('WN-PE-9903' IN detail) = 0 THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une liste mêlée rend « % ».', coalesce(detail, 'aucune violation');
  END IF;

  -- 7. L'empreinte divergente ne s'écrit pas : la base refuse l'acte.
  refuse := false;
  BEGIN
    INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
    VALUES ('pca_faux', 'pcv_sans_acte', 'signee', H2, 'p', true);
  EXCEPTION
    -- Le refus attendu est celui du déclencheur, pas n'importe quelle erreur
    -- (revue wn-reviewer sur #2060).
    WHEN others THEN refuse := SQLERRM LIKE '%empreinte recopiée ne correspond pas%';
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : un acte à l''empreinte divergente n''a pas été refusé par le déclencheur d''empreinte ; le contrat devrait alors en avoir une fixture.';
  END IF;

  RAISE NOTICE 'POSITIONS CITÉES : contrat négatif vert.';
END $$;

ROLLBACK;
