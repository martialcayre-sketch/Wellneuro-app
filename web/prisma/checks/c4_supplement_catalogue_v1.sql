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

  -- Les CHECK de la COMPOSITION (ajoutés au contrat le 2026-07-31, avec la
  -- migration qui les modifie). Ils n'étaient gardés nulle part : `migrate
  -- diff` ne voit pas les CHECK, et un DROP CONSTRAINT serait passé vert.
  --
  -- `_dose_unite_check` : dose et unité vont ensemble. Sans lui, un nombre nu
  -- entre en base, et la sentinelle de cumul additionne des grandeurs dont une
  -- n'a pas d'unité.
  IF (
    SELECT count(*) FROM pg_constraint
    WHERE conname IN (
      'supplement_product_compositions_dose_unite_check',
      'supplement_product_compositions_unite_check',
      'supplement_products_composition_source_lignes_check'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'C4: un CHECK de composition manque (dose/unité, vocabulaire, compte source)';
  END IF;

  -- Le vocabulaire d'unités est CLOS, et son contenu exact compte. L'élargir en
  -- base pour débloquer un import — y admettre `ml` en plus de `mL`, ou une
  -- unité hors nomenclature — ferait comparer à la sentinelle des colonnes
  -- qu'elle croit distinctes. Six valeurs, ni plus ni moins.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplement_product_compositions_unite_check'
      AND pg_get_constraintdef(oid) LIKE '%''µg''%'
      AND pg_get_constraintdef(oid) LIKE '%''mg''%'
      AND pg_get_constraintdef(oid) LIKE '%''mL''%'
      AND pg_get_constraintdef(oid) LIKE '%''UI''%'
      AND pg_get_constraintdef(oid) LIKE '%''UFC''%'
      AND pg_get_constraintdef(oid) NOT LIKE '%''ml''%'
  ) THEN
    RAISE EXCEPTION 'C4: le vocabulaire d''unités a dérivé (six valeurs canoniques attendues, sans doublon de graphie)';
  END IF;

  -- La colonne de dose porte la grandeur qu'elle contient. Une colonne nommée
  -- « par portion » qui stocke une DJR se trompe d'un facteur égal au nombre de
  -- prises, dans le sens rassurant.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'supplement_product_compositions'
      AND column_name = 'dose_par_djr'
  ) THEN
    RAISE EXCEPTION 'C4: supplement_product_compositions.dose_par_djr absente';
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
