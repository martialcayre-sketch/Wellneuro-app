-- C5 LOT-02 — référentiel Ciqual 2025 V1 et identité clinique append-only.
-- Gate migration confirmé explicitement par Martial CAYRE le 2026-07-18.
-- Cette migration ne charge aucune donnée Ciqual et n'active aucune surface C5.

BEGIN;
SET LOCAL lock_timeout = '10s';

-- Refuser atomiquement toute donnée historique qui ne respecte pas encore
-- l'identité versionnée. Aucun correctif ou rapprochement implicite n'est
-- autorisé par cette migration de structure.
LOCK TABLE "neuro_axis", "nutrient_axis_weight" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "nutrient_axis_weight" AS w
    LEFT JOIN "neuro_axis" AS a
      ON a."axis_code" = w."axis_code"
     AND a."version_mapping" = w."version_mapping"
    WHERE a."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'C5 LOT-02: nutrient_axis_weight contient une version sans neuro_axis correspondant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "nutrient_axis_weight"
    GROUP BY "axis_code", "version_mapping", "nutrient_code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'C5 LOT-02: doublon axis/version/nutrient dans nutrient_axis_weight';
  END IF;
END $$;

-- L'identité d'un axe clinique inclut désormais sa version de mapping.
ALTER TABLE "nutrient_axis_weight"
  DROP CONSTRAINT "nutrient_axis_weight_axis_code_fkey";

DROP INDEX "neuro_axis_axis_code_key";

CREATE UNIQUE INDEX "neuro_axis_axis_version_key"
  ON "neuro_axis"("axis_code", "version_mapping");

CREATE UNIQUE INDEX "nutrient_axis_weight_axis_version_nutrient_key"
  ON "nutrient_axis_weight"("axis_code", "version_mapping", "nutrient_code");

ALTER TABLE "nutrient_axis_weight"
  ADD CONSTRAINT "nutrient_axis_weight_axis_code_version_mapping_fkey"
  FOREIGN KEY ("axis_code", "version_mapping")
  REFERENCES "neuro_axis"("axis_code", "version_mapping")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Distribution complète Ciqual pour les seuls constituants validés en LOT-01.
CREATE TABLE "ciqual_nutrient_values" (
  "id" TEXT NOT NULL,
  "ciqual_code" TEXT NOT NULL,
  "nutrient_code" TEXT NOT NULL,
  "value" DECIMAL(14,6),
  "value_status" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "dataset_version" TEXT NOT NULL,
  "source_ref" TEXT NOT NULL,
  "source_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ciqual_nutrient_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ciqual_nutrient_values_value_nonnegative_check"
    CHECK ("value" IS NULL OR "value" >= 0),
  CONSTRAINT "ciqual_nutrient_values_status_check"
    CHECK ("value_status" IN ('exact', 'trace', 'below_limit', 'missing')),
  CONSTRAINT "ciqual_nutrient_values_unit_check"
    CHECK ("unit" IN ('g/100 g', 'mg/100 g')),
  CONSTRAINT "ciqual_nutrient_values_value_status_consistency_check"
    CHECK (
      ("value_status" = 'exact' AND "value" IS NOT NULL)
      OR
      ("value_status" <> 'exact' AND "value" IS NULL)
    )
);

CREATE UNIQUE INDEX "ciqual_nutrient_values_dataset_food_nutrient_key"
  ON "ciqual_nutrient_values"("dataset_version", "ciqual_code", "nutrient_code");

CREATE INDEX "ciqual_nutrient_values_dataset_food_idx"
  ON "ciqual_nutrient_values"("dataset_version", "ciqual_code");

-- Table du schéma public : RLS obligatoire. Aucun accès Data API C5 V1.
ALTER TABLE "public"."ciqual_nutrient_values" ENABLE ROW LEVEL SECURITY;

-- Les rôles Data API existent sur Supabase, mais pas sur le PostgreSQL nu de
-- la CI. Révoquer lorsqu'ils existent maintient une migration reproductible
-- dans les deux environnements sans jamais leur accorder de privilège.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "public"."ciqual_nutrient_values" FROM "anon";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "public"."ciqual_nutrient_values" FROM "authenticated";
  END IF;
END $$;

COMMIT;
