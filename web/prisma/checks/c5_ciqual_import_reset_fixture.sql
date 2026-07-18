-- Nettoyage exclusivement destiné à la base CI éphémère.
-- Aucune commande applicative ou Production n'appelle ce fichier.
DO $$
BEGIN
  IF current_database() <> 'wellneuro_ci' THEN
    RAISE EXCEPTION 'Fixture C5 interdite hors de la base wellneuro_ci';
  END IF;

  EXECUTE 'TRUNCATE TABLE ciqual_nutrient_values';
END $$;
