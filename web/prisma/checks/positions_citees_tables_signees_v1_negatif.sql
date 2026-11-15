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
-- Les CLAIMS D'APPUI ([[D-525]]) — chaque appui, sur sa paire exacte :
--   8. un appui absent du corpus (identifiant inconnu) ;
--   9. un appui dont la VERSION n'est pas au corpus, l'identifiant y étant :
--      la paire, pas l'identifiant seul ;
--  10. un appui REJETÉ, puis un appui EN ATTENTE DE VALIDATION ;
--  11. un appui désactivé (`active = false`) ;
--  12. un appui remplacé (`superseded_at`) ;
--  13. une position à deux appuis, l'un sain, l'autre non : seul le second
--      est rendu ;
--  14. un appui NON PRESCRIPTIF ne fait rien rougir, même sous une table de
--      dose : D-525 §1 n'exige pas `prescriptif` d'un appui. Le décor le
--      prouve déjà (le claim d'appui des positions saines est descriptif) ;
--      le cas 14 le dit sous la table de dose ;
--  15. les appuis se lisent sur la version ÉPINGLÉE : une v1.0 révisée à
--      l'appui rejeté rend les deux motifs, sa v1.1 courante à l'appui sain
--      ne rend rien.
--
-- Fixtures neutres : `WN-PE-99xx`, `WN-CL-9999-0xx`, contenu synthétique,
-- aucun texte clinique. Transaction annulée.
BEGIN;

CREATE FUNCTION pg_temp.violations_positions_citees(epinglees jsonb)
RETURNS text
LANGUAGE plpgsql
AS $f$
DECLARE
  detail text;
BEGIN
-- >>> PREDICAT_POSITIONS_CITEES
  -- Deux familles de violations, réunies en un seul détail. La POSITION
  -- d'abord (D-480 §5.3) : présente, courante, dernier acte une signature
  -- d'empreinte égale. Puis ses CLAIMS D'APPUI ([[D-525]]) : chacun, sur sa
  -- paire exacte `identifiant@version`, présent au corpus, `VALIDE`, actif et
  -- non remplacé — les trois propriétés de [[D-046]], dans toute rubrique, la
  -- dose comprise. `prescriptif` n'est PAS exigé d'un appui : la signature de
  -- la position porte seule son caractère prescriptif (D-525 §1). Les appuis
  -- se lisent sur la version ÉPINGLÉE, même révisée ; une position absente
  -- n'en a aucun à lire, et sa seule absence la refuse déjà.
  SELECT string_agg(
           format('%s@%s [%s] (%s)', x.position_id, x.version, x.table_signee, x.motif),
           ', ' ORDER BY x.position_id, x.version, x.table_signee, x.famille, x.appui)
    INTO detail
  FROM (
    SELECT e.position_id, e.version, e.table_signee, 1 AS famille, ''::text AS appui,
           CASE
             WHEN v.id IS NULL THEN 'absente'
             WHEN s.id IS NOT NULL THEN 'révisée par ' || s.version
             WHEN dernier.acte IS NULL THEN 'aucun acte'
             WHEN dernier.acte IS DISTINCT FROM 'signee' THEN 'dernier acte ' || dernier.acte
             ELSE 'empreinte de la signature différente de la version'
           END AS motif
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
       OR dernier.empreinte IS DISTINCT FROM public.positions_expert_empreinte_contenu(v.contenu)
    UNION ALL
    SELECT e.position_id, e.version, e.table_signee, 2 AS famille, appui.cle AS appui,
           'appui ' || appui.cle || ' : ' ||
           CASE
             WHEN c.claim_id IS NULL THEN 'absent du corpus'
             WHEN c.statut IS DISTINCT FROM 'VALIDE' THEN 'statut ' || coalesce(c.statut, '?')
             WHEN c.active IS NOT TRUE THEN 'active = false'
             ELSE 'remplacé (superseded_at)'
           END AS motif
    FROM jsonb_to_recordset(epinglees) AS e(position_id text, version text, table_signee text)
    JOIN positions_expert_versions v
      ON v.position_id = e.position_id AND v.version = e.version
    CROSS JOIN LATERAL unnest(v.claims_appui) AS appui(cle)
    -- La jointure porte sur LA PAIRE, comme au contrat de fraîcheur : un appui
    -- relu en v1.0 ne se tient pas par une v2.0 du même claim.
    LEFT JOIN public.rag_corpus_claims c
      ON c.claim_id = split_part(appui.cle, '@', 1)
     AND c.version_claim = split_part(appui.cle, '@', 2)
    WHERE c.claim_id IS NULL
       OR c.statut IS DISTINCT FROM 'VALIDE'
       OR c.active IS NOT TRUE
       OR c.superseded_at IS NOT NULL
  ) AS x;
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
  -- Les claims d'appui au corpus, chacun dans son état. `001` est SAIN et
  -- DESCRIPTIF (`prescriptif = false`) : il appuie toutes les positions dont
  -- l'appui ne doit rien rendre, si bien qu'un prédicat qui exigerait
  -- `prescriptif` d'un appui ferait rougir les cas 1 et 14. `005` est sain et
  -- prescriptif. `VALIDE` exige validateur et date (`rag_corpus_claims_valide_signe`).
  INSERT INTO public.rag_corpus_claims
    (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
     typologie_lecture, prescriptif, statut, validateur, valide_at, active, superseded_at,
     metadata, embedding_model, embedding_dimensions, embedding)
  SELECT '__positions_appui_' || f.claim_id, f.claim_id, 'WN-SRC-0000', 'v1.0',
         'Fixture de contrat — appui de position citée.', md5(f.claim_id) || md5('v1.0'),
         'déclaré', f.prescriptif, f.statut,
         CASE WHEN f.statut = 'VALIDE' THEN 'contrat' END,
         CASE WHEN f.statut = 'VALIDE' THEN now() END,
         f.active, f.superseded_at,
         '{"fixture": "positions_citees"}'::jsonb,
         'contrat', 1536, ('[' || repeat('0,', 1535) || '0]')::extensions.vector
  FROM (VALUES
    ('WN-CL-9999-001', false, 'VALIDE', true, NULL::timestamptz),
    ('WN-CL-9999-002', false, 'REJETE', true, NULL::timestamptz),
    ('WN-CL-9999-003', false, 'VALIDE', false, NULL::timestamptz),
    ('WN-CL-9999-004', false, 'VALIDE', true, now()),
    ('WN-CL-9999-005', true, 'VALIDE', true, NULL::timestamptz),
    ('WN-CL-9999-006', false, 'EN_ATTENTE_VALIDATION', true, NULL::timestamptz)
  ) AS f(claim_id, prescriptif, statut, active, superseded_at);

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

  -- Six positions courantes et signées, qui ne diffèrent que par leurs appuis.
  INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, auteur)
  VALUES
    ('pcv_appui_absent', 'WN-PE-9905', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-009@v1.0'], 'p'),
    ('pcv_appui_version', 'WN-PE-9906', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-001@v2.0'], 'p'),
    ('pcv_appui_rejete', 'WN-PE-9907', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-002@v1.0'], 'p'),
    ('pcv_appui_inactif', 'WN-PE-9908', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-003@v1.0'], 'p'),
    ('pcv_appui_remplace', 'WN-PE-9909', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-004@v1.0'], 'p'),
    ('pcv_appui_mele', 'WN-PE-9910', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-005@v1.0', 'WN-CL-9999-002@v1.0'], 'p'),
    ('pcv_appui_attente', 'WN-PE-9911', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-006@v1.0'], 'p'),
    ('pcv_appui_epinglee', 'WN-PE-9912', 'v1.0', 'fer', C1, ARRAY['WN-CL-9999-002@v1.0'], 'p');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  SELECT 'pca_' || substr(v.id, 5), v.id, 'signee', H1, 'p', true
  FROM positions_expert_versions v
  WHERE v.id IN ('pcv_appui_absent', 'pcv_appui_version', 'pcv_appui_rejete',
                 'pcv_appui_inactif', 'pcv_appui_remplace', 'pcv_appui_mele',
                 'pcv_appui_attente', 'pcv_appui_epinglee');
  -- `WN-PE-9912` est révisée : la v1.0 épinglée s'appuie sur un claim
  -- rejeté, la v1.1 courante sur un claim sain (cas 15).
  INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
  VALUES ('pcv_appui_epinglee_2', 'WN-PE-9912', 'v1.1', 'fer', C2, ARRAY['WN-CL-9999-001@v1.0'], 'pcv_appui_epinglee', 'p');
  INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale)
  VALUES ('pca_appui_epinglee_2', 'pcv_appui_epinglee_2', 'signee', H2, 'p', true);

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

  -- 8 à 12. Un appui que le corpus ne tient plus, sur une position par
  -- ailleurs courante et signée : la position est refusée par son appui.
  PERFORM pg_temp.doit_rendre('appui absent', pg_temp.une('WN-PE-9905', 'v1.0'),
    'appui WN-CL-9999-009@v1.0 : absent du corpus');
  PERFORM pg_temp.doit_rendre('appui d''une version absente', pg_temp.une('WN-PE-9906', 'v1.0'),
    'appui WN-CL-9999-001@v2.0 : absent du corpus');
  PERFORM pg_temp.doit_rendre('appui rejeté', pg_temp.une('WN-PE-9907', 'v1.0'),
    'appui WN-CL-9999-002@v1.0 : statut REJETE');
  PERFORM pg_temp.doit_rendre('appui en attente de validation', pg_temp.une('WN-PE-9911', 'v1.0'),
    'appui WN-CL-9999-006@v1.0 : statut EN_ATTENTE_VALIDATION');
  PERFORM pg_temp.doit_rendre('appui désactivé', pg_temp.une('WN-PE-9908', 'v1.0'),
    'appui WN-CL-9999-003@v1.0 : active = false');
  PERFORM pg_temp.doit_rendre('appui remplacé', pg_temp.une('WN-PE-9909', 'v1.0'),
    'appui WN-CL-9999-004@v1.0 : remplacé (superseded_at)');

  -- 13. Deux appuis, l'un sain et prescriptif, l'autre rejeté : seul le
  -- second est rendu, et la position n'est rendue qu'une fois.
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9910', 'v1.0'));
  IF detail IS DISTINCT FROM 'WN-PE-9910@v1.0 [bibliotheque_options] (appui WN-CL-9999-002@v1.0 : statut REJETE)' THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une position à un appui sain et un appui rejeté rend « % ».', coalesce(detail, 'aucune violation');
  END IF;

  -- 14. Un appui descriptif ne fait rien rougir, même sous la table de dose
  -- (D-525 §1) : `prescriptif` n'est pas exigé d'un appui.
  detail := pg_temp.violations_positions_citees(jsonb_build_array(jsonb_build_object(
    'position_id', 'WN-PE-9901', 'version', 'v1.0', 'table_signee', 'bibliotheque_options_dose')));
  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une position signée à l''appui descriptif a été refusée sous la table de dose (%).', detail;
  END IF;

  -- Une position révisée garde la lecture de ses appuis : sa version épinglée
  -- est rendue pour sa révision, et rien d'autre puisque son appui est sain.
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9904', 'v1.0'));
  IF detail IS DISTINCT FROM 'WN-PE-9904@v1.0 [bibliotheque_options] (révisée par v1.1)' THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une position révisée à l''appui sain rend « % ».', coalesce(detail, 'aucune violation');
  END IF;

  -- 15. Les appuis se lisent sur la version ÉPINGLÉE, non sur la courante :
  -- la v1.0 épinglée rend sa révision ET son appui rejeté ; la v1.1 courante,
  -- à l'appui sain, ne rend rien.
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9912', 'v1.0'));
  IF detail IS DISTINCT FROM
     'WN-PE-9912@v1.0 [bibliotheque_options] (révisée par v1.1), WN-PE-9912@v1.0 [bibliotheque_options] (appui WN-CL-9999-002@v1.0 : statut REJETE)' THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une version épinglée révisée, à l''appui rejeté, rend « % ».', coalesce(detail, 'aucune violation');
  END IF;
  detail := pg_temp.violations_positions_citees(pg_temp.une('WN-PE-9912', 'v1.1'));
  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : la version courante, à l''appui sain, a été refusée (%).', detail;
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
