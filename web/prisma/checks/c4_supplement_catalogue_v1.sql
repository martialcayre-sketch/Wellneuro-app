-- Contrat de migration C4 LOT-01 (catalogue produits).
-- Exécuté après `prisma migrate deploy`. Vérifie les invariants structurels que
-- le drift check ne couvre pas (index partiel, CHECK, RLS).
BEGIN;

DO $$
BEGIN
  -- RLS activée sur les trois tables, aucune policy (deny-all).
  IF NOT (
    SELECT bool_and(relrowsecurity)
    FROM pg_class
    WHERE oid IN (
      'public.supplement_products'::regclass,
      'public.supplement_product_compositions'::regclass,
      'public.supplement_product_versions_courantes'::regclass
    )
  ) THEN
    RAISE EXCEPTION 'C4 LOT-01: RLS non activée sur une table du catalogue';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('supplement_products', 'supplement_product_compositions',
                        'supplement_product_versions_courantes')
  ) THEN
    RAISE EXCEPTION 'C4 LOT-01: policy inattendue sur le catalogue';
  END IF;

  -- Index partiel de composition (ferme le trou NULL de l'unicité 3 colonnes).
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'supplement_product_compositions_produit_ingredient_sans_forme'
  ) THEN
    RAISE EXCEPTION 'C4 LOT-01: index partiel (produit, ingrédient, forme NULL) absent';
  END IF;

  -- Les cinq CHECK nommés du catalogue.
  IF (
    SELECT count(*) FROM pg_constraint
    WHERE conname IN (
      'supplement_products_statut_fiche_check',
      'supplement_products_niveau_completude_check',
      'supplement_products_source_provenance_check',
      'supplement_products_contenu_sha256_check',
      'supplement_products_fiche_verifiee_signee_check'
    )
  ) <> 5 THEN
    RAISE EXCEPTION 'C4 LOT-01: un CHECK du catalogue manque';
  END IF;

  -- Le pivot clinique n'a pas été touché : clinical_rules ne référence aucun produit.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_rules'
      AND column_name LIKE '%product%'
  ) THEN
    RAISE EXCEPTION 'C4 LOT-01: clinical_rules référence un produit (pivot violé)';
  END IF;
END $$;

ROLLBACK;
