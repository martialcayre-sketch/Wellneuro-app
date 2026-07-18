-- Fixture exclusivement destinée à la base CI éphémère.
-- Elle prouve que l'importeur refuse une version partiellement peuplée.
DO $$
BEGIN
  IF current_database() <> 'wellneuro_ci' THEN
    RAISE EXCEPTION 'Fixture C5 interdite hors de la base wellneuro_ci';
  END IF;

  INSERT INTO ciqual_nutrient_values
    (id, ciqual_code, nutrient_code, value, value_status, unit,
     dataset_version, source_ref, source_hash)
  VALUES
    ('__c5_ciqual_partial_fixture__', '__c5_food__', '25000', 1.000000,
     'exact', 'g/100 g', 'ciqual-2025-v1', '__fixture__', '__fixture__');
END $$;
