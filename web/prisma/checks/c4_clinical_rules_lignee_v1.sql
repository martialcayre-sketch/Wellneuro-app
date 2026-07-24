-- Contrat de migration C4 LOT-03b (contraintes de lignée clinical_rules).
-- Exécuté après `prisma migrate deploy`. Vérifie les index partiels et le CHECK
-- que le drift check ne couvre pas.
BEGIN;

DO $$
BEGIN
  -- Les trois index d'unicité de lignée.
  IF (
    SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'clinical_rules_lignee_version_key',
        'clinical_rules_un_brouillon_actif_par_lignee',
        'clinical_rules_une_validee_active_par_lignee'
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'C4 LOT-03b: un index d''unicité de lignée manque';
  END IF;

  -- Le CHECK de désactivation tracée.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clinical_rules_desactivation_tracee_check'
  ) THEN
    RAISE EXCEPTION 'C4 LOT-03b: CHECK de désactivation tracée absent';
  END IF;

  -- Les trois colonnes de traçabilité.
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_rules'
      AND column_name IN ('raison_desactivation', 'desactive_par', 'desactive_le')
  ) <> 3 THEN
    RAISE EXCEPTION 'C4 LOT-03b: une colonne de traçabilité de désactivation manque';
  END IF;
END $$;

ROLLBACK;
