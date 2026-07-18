-- Fixture exclusivement destinée à la base CI éphémère.
-- Elle simule une valeur modifiée sans changer le statut ni le hash déclaré.
DO $$
DECLARE
  changed_rows integer;
BEGIN
  IF current_database() <> 'wellneuro_ci' THEN
    RAISE EXCEPTION 'Fixture C5 interdite hors de la base wellneuro_ci';
  END IF;

  UPDATE ciqual_nutrient_values
  SET value = value + 1
  WHERE id = 'c5-ciqual-2025-v1-1000-25000';

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Fixture de corruption C5 introuvable';
  END IF;
END $$;
