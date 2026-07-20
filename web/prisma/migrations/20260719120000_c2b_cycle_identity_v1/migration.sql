-- C2B / Vague 2 — identité de cycle des épisodes (gate G2).
-- Gate confirmé explicitement par l'utilisateur le 2026-07-19.
--
-- ADDITIVE UNIQUEMENT : deux colonnes nullables ajoutées, un index créé.
-- Aucun DROP, aucun renommage, aucune colonne existante modifiée, aucune
-- suppression de ligne. Rollback = ignorer les deux colonnes (le code retombe
-- sur « version inconnue » et sur le rattachement par date).

ALTER TABLE "assessment_episodes" ADD COLUMN "cycle_id" TEXT;
ALTER TABLE "assessment_episodes" ADD COLUMN "version_score" TEXT;

-- Backfill 1 — version de score figée à la mesure.
-- Justification factuelle : VERSION_SCORE_EQUILIBRE vaut 'v1' depuis son
-- introduction (aucun bump dans l'historique du dépôt) et la table
-- `assessment_episodes` lui est postérieure (migration c2a_persistance_v1,
-- 2026-07-17). Toutes les lignes existantes ont donc été confirmées sous v1.
UPDATE "assessment_episodes" SET "version_score" = 'v1' WHERE "version_score" IS NULL;

-- Backfill 2 — un épisode T0 ouvre son propre cycle.
UPDATE "assessment_episodes" SET "cycle_id" = "id" WHERE "milestone" = 'T0' AND "cycle_id" IS NULL;

-- Backfill 3 — un jalon postérieur rejoint le dernier T0 du MÊME patient,
-- antérieur ou égal à sa propre confirmation. Une ligne sans T0 antérieur reste
-- NULL : elle n'est jamais rattachée de force au premier cycle venu.
UPDATE "assessment_episodes" AS e
SET "cycle_id" = (
  SELECT t0."id"
  FROM "assessment_episodes" AS t0
  WHERE t0."id_patient" = e."id_patient"
    AND t0."milestone" = 'T0'
    AND t0."confirmed_at" <= e."confirmed_at"
  ORDER BY t0."confirmed_at" DESC
  LIMIT 1
)
WHERE e."milestone" <> 'T0' AND e."cycle_id" IS NULL;

CREATE INDEX "c2b_episode_cycle_idx" ON "assessment_episodes"("id_patient", "cycle_id");
