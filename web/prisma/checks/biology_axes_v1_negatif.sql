-- Tests NÉGATIFS du référentiel d'axes biologiques (F52, D-348 §2 et §7).
--
-- La migration `20261024100000_biology_axes_liste_fermee_v1` ferme la cible
-- `axe` de `biology_analyte_links` sur dix codes. Ce fichier vérifie que la
-- fermeture MORD, dans les deux sens :
--   - les dix codes signés entrent (sans ce cas positif, un CHECK devenu trop
--     serré passerait vert et le premier lien F79 casserait en production) ;
--   - la liste en base est exactement celle de D-348 §2 (un onzième code
--     ajouté sans décision rougit ici) ;
--   - un axe inconnu, mal casé ou préfixé est refusé, par CE check ;
--   - un lien sans claim est refusé, par le bon motif ;
--   - les autres cibles ne sont pas touchées par la liste.
--
-- Tout se déroule dans une transaction annulée à la fin : l'analyte de test
-- et les liens acceptés ne survivent pas.
BEGIN;

DO $$
DECLARE
  attendus CONSTANT text[] := ARRAY[
    'acides_gras_polyinsatures', 'barriere_intestinale', 'corticotrope',
    'energie_mitochondriale', 'inflammation', 'methylation',
    'microbiote_cerveau', 'regulation_glycemique', 'stress_oxydant',
    'thyreotrope'
  ];
  en_base text[];
  code text;
  n integer := 0;
  refuse boolean;
  etat text;
  contrainte text;
  colonne text;

  -- Chaque entrée : un cible_code d'axe qui DOIT être refusé, et pourquoi.
  inconnus CONSTANT text[][] := ARRAY[
    ['axe hors liste',                 'axe_inconnu'],
    ['préfixe redondant (D-348 §2)',   'axe_methylation'],
    ['casse différente',               'Methylation'],
    ['espace final',                   'methylation '],
    ['code vide',                      '']
  ];
BEGIN
  -- ── La liste en base est celle de D-348 §2, ni plus ni moins ──────────
  SELECT array_agg(m[1] ORDER BY m[1]) INTO en_base
  FROM pg_constraint c,
       regexp_matches(pg_get_constraintdef(c.oid), '''([^'']*)''', 'g') AS m
  WHERE c.conrelid = 'public.biology_analyte_links'::regclass
    AND c.conname = 'biology_analyte_links_cible_axe_check'
    AND m[1] <> 'axe';

  IF en_base IS NULL THEN
    RAISE EXCEPTION 'F52 test négatif: contrainte biology_analyte_links_cible_axe_check absente';
  END IF;
  IF en_base IS DISTINCT FROM attendus THEN
    RAISE EXCEPTION 'F52 test négatif: liste d''axes en base % ≠ liste signée %', en_base, attendus;
  END IF;

  INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
  VALUES ('f52_a', 'BIO_TEST_F52', 'x', 'sang', 'saisie_praticien', 'partielle', now());

  -- ── Cas positifs : les dix codes signés entrent ───────────────────────
  FOREACH code IN ARRAY attendus LOOP
    n := n + 1;
    INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
    VALUES ('f52_ok_' || n, 'BIO_TEST_F52', 'axe', code, 'bas_evocateur', 'WN-CL-0000-000', 'v1.0', 'C');
  END LOOP;

  -- La liste ne vise que la cible `axe` : un code de nutriment reste libre.
  INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
  VALUES ('f52_ok_nut', 'BIO_TEST_F52', 'nutriment', 'axe_inconnu', 'bas_evocateur', 'WN-CL-0000-000', 'v1.0', 'C');

  -- ── Cas négatifs : un axe inconnu, refusé par CE check ────────────────
  -- Le bon motif est exigé (23514 ET nom de contrainte) : sans le nom, un
  -- autre CHECK qui mordrait par accident garderait le test vert même si la
  -- liste avait disparu.
  FOR i IN 1 .. array_length(inconnus, 1) LOOP
    refuse := false;
    BEGIN
      INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
      VALUES ('f52_ko_' || i, 'BIO_TEST_F52', 'axe', inconnus[i][2], 'bas_evocateur', 'WN-CL-0000-000', 'v1.0', 'C');
    EXCEPTION WHEN others THEN
      GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, contrainte = CONSTRAINT_NAME;
      IF etat <> '23514' OR contrainte IS DISTINCT FROM 'biology_analyte_links_cible_axe_check' THEN
        RAISE EXCEPTION
          'F52 test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, contrainte %)',
          inconnus[i][1], etat, contrainte;
      END IF;
      refuse := true;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION 'F52 test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', inconnus[i][1];
    END IF;
  END LOOP;

  -- ── Cas négatifs : un lien d'axe sans claim ───────────────────────────
  -- Claim absent : la colonne est NOT NULL.
  refuse := false;
  BEGIN
    INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
    VALUES ('f52_ko_null', 'BIO_TEST_F52', 'axe', 'methylation', 'haut_evocateur', NULL, 'v1.0', 'C');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, colonne = COLUMN_NAME;
    IF etat <> '23502' OR colonne IS DISTINCT FROM 'claim_id' THEN
      RAISE EXCEPTION
        'F52 test négatif: lien d''axe à claim absent rejeté pour le mauvais motif (SQLSTATE %, colonne %)',
        etat, colonne;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F52 test négatif: lien d''axe à claim absent ACCEPTÉ';
  END IF;

  -- Claim blanc : le CHECK de non-vacuité.
  refuse := false;
  BEGIN
    INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
    VALUES ('f52_ko_blanc', 'BIO_TEST_F52', 'axe', 'methylation', 'haut_evocateur', '  ', 'v1.0', 'C');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, contrainte = CONSTRAINT_NAME;
    IF etat <> '23514' OR contrainte IS DISTINCT FROM 'biology_analyte_links_claim_non_vide_check' THEN
      RAISE EXCEPTION
        'F52 test négatif: lien d''axe à claim blanc rejeté pour le mauvais motif (SQLSTATE %, contrainte %)',
        etat, contrainte;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F52 test négatif: lien d''axe à claim blanc ACCEPTÉ';
  END IF;

  RAISE NOTICE 'F52: % axes acceptés, % inconnus et 2 liens sans claim rejetés pour le bon motif.',
    array_length(attendus, 1), array_length(inconnus, 1);
END $$;

-- Rien de ce qui précède ne survit : ni l'analyte de test, ni les liens
-- acceptés.
ROLLBACK;
