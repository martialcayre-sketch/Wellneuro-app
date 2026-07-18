-- Préflight C5 LOT-02 sur la base cible, strictement en lecture seule.
-- À exécuter avant `prisma migrate deploy`; aucune donnée n'est modifiée.
BEGIN READ ONLY;

SELECT COUNT(*) AS axes_existants
FROM public.neuro_axis;

SELECT COUNT(*) AS poids_existants
FROM public.nutrient_axis_weight;

SELECT COUNT(*) AS poids_version_incompatible
FROM public.nutrient_axis_weight AS w
LEFT JOIN public.neuro_axis AS a
  ON a.axis_code = w.axis_code
 AND a.version_mapping = w.version_mapping
WHERE a.id IS NULL;

SELECT COUNT(*) AS doublons_poids_versionnes
FROM (
  SELECT axis_code, version_mapping, nutrient_code
  FROM public.nutrient_axis_weight
  GROUP BY axis_code, version_mapping, nutrient_code
  HAVING COUNT(*) > 1
) AS duplicates;

SELECT COUNT(*) AS verrous_non_accordes_sur_mapping
FROM pg_locks
WHERE NOT granted
  AND relation IN (
    'public.neuro_axis'::regclass,
    'public.nutrient_axis_weight'::regclass
  );

SELECT to_regclass('public.ciqual_nutrient_values') IS NOT NULL
  AS table_ciqual_deja_presente;

SELECT COUNT(*) AS migration_c5_deja_appliquee
FROM public._prisma_migrations
WHERE migration_name = '20260718100010_c5_ciqual_reference_v1'
  AND finished_at IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.nutrient_axis_weight AS w
    LEFT JOIN public.neuro_axis AS a
      ON a.axis_code = w.axis_code
     AND a.version_mapping = w.version_mapping
    WHERE a.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'C5 LOT-02: poids historique sans axe/version correspondant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.nutrient_axis_weight
    GROUP BY axis_code, version_mapping, nutrient_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'C5 LOT-02: doublon historique axis/version/nutrient';
  END IF;
END $$;

ROLLBACK;
