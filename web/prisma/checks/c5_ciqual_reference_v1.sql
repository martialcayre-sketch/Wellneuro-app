-- Contrat de migration C5 LOT-02.
-- Exécuté après `prisma migrate deploy`; toutes les fixtures sont annulées.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.ciqual_nutrient_values'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'C5 LOT-02: RLS non activée';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ciqual_nutrient_values'
  ) THEN
    RAISE EXCEPTION 'C5 LOT-02: policy inattendue';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'ciqual_nutrient_values'
      AND grantee IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'C5 LOT-02: grant Data API inattendu';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.nutrient_axis_weight'::regclass
      AND conname = 'nutrient_axis_weight_axis_code_version_mapping_fkey'
      AND contype = 'f'
  ) THEN
    RAISE EXCEPTION 'C5 LOT-02: clé étrangère composite absente';
  END IF;
END $$;

INSERT INTO ciqual_nutrient_values
  (id, ciqual_code, nutrient_code, value, value_status, unit,
   dataset_version, source_ref, source_hash)
VALUES
  ('__c5_ciqual_exact__', '__c5_food__', '25000', 24.500000, 'exact',
   'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__'),
  ('__c5_ciqual_trace__', '__c5_food__', '41833', NULL, 'trace',
   'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');

DO $$
BEGIN
  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_bad_null__', '__c5_bad_1__', '25000', NULL, 'exact',
       'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: exact NULL accepté';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_bad_negative__', '__c5_bad_2__', '25000', -1, 'exact',
       'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: valeur négative acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_bad_unit__', '__c5_bad_3__', '25000', 1, 'exact',
       'kcal', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: unité inconnue acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_bad_status__', '__c5_bad_4__', '25000', NULL, 'estimated',
       'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: statut inconnu accepté';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_trace_with_value__', '__c5_bad_5__', '25000', 0, 'trace',
       'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: trace numérique acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO ciqual_nutrient_values
      (id, ciqual_code, nutrient_code, value, value_status, unit,
       dataset_version, source_ref, source_hash)
    VALUES
      ('__c5_duplicate__', '__c5_food__', '25000', 1, 'exact',
       'g/100 g', '__c5_dataset__', '__c5_source__', '__c5_hash__');
    RAISE EXCEPTION 'C5 LOT-02: doublon Ciqual accepté';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

INSERT INTO neuro_axis
  (id, axis_code, label_patient, label_praticien, niveau_preuve,
   version_mapping, updated_at)
VALUES
  ('__c5_axis_v1__', '__c5_axis__', 'Test', 'Test', 'B', 'v1', NOW()),
  ('__c5_axis_v2__', '__c5_axis__', 'Test', 'Test', 'B', 'v2', NOW());

INSERT INTO nutrient_axis_weight
  (id, axis_code, nutrient_code, direction, poids, source_ref,
   version_mapping, updated_at)
VALUES
  ('__c5_weight_v1__', '__c5_axis__', '25000', 'favorable', 1,
   '__c5_source__', 'v1', NOW()),
  ('__c5_weight_v2__', '__c5_axis__', '25000', 'favorable', 1,
   '__c5_source__', 'v2', NOW());

DO $$
BEGIN
  BEGIN
    INSERT INTO nutrient_axis_weight
      (id, axis_code, nutrient_code, direction, poids, source_ref,
       version_mapping, updated_at)
    VALUES
      ('__c5_weight_bad_version__', '__c5_axis__', '34100', 'favorable', 1,
       '__c5_source__', 'v3', NOW());
    RAISE EXCEPTION 'C5 LOT-02: poids sans axe versionné accepté';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO nutrient_axis_weight
      (id, axis_code, nutrient_code, direction, poids, source_ref,
       version_mapping, updated_at)
    VALUES
      ('__c5_weight_duplicate__', '__c5_axis__', '25000', 'favorable', 1,
       '__c5_source__', 'v1', NOW());
    RAISE EXCEPTION 'C5 LOT-02: doublon de poids versionné accepté';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

ROLLBACK;
