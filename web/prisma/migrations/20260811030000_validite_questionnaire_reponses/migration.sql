-- Validité clinique des passations (LOT-00, campagne « chaîne T0 opérationnelle »).
--
-- ADDITIF UNIQUEMENT : cinq colonnes et un index sur questionnaire_reponses,
-- aucune ligne modifiée, aucune colonne existante touchée. Le DEFAULT 'VALID'
-- couvre l'existant sans réécriture de table (PostgreSQL pose la valeur au
-- niveau du catalogue).
--
-- CE QUE ÇA PORTE : statut_validite (VALID | AMBIGUOUS | INVALID | SUPERSEDED
-- | HISTORICAL_ONLY, contrainte CHECK), et la trace d'une invalidation
-- praticien (date, auteur, motif) ou d'un remplacement par re-passation
-- (supersedes_reponse_id — porté par la passation de REMPLACEMENT, pointe
-- vers la passation REMPLACÉE, même sens que supersedes_draft_id).
-- Doctrine : VALID et AMBIGUOUS alimentent le raisonnement clinique
-- (AMBIGUOUS signalé, jamais exclu en silence) ; INVALID, SUPERSEDED et
-- HISTORICAL_ONLY en sortent (synthèse, orientation, équilibre, momentum,
-- protocole) mais la ligne reste pour l'audit — jamais de suppression,
-- jamais d'UPDATE du contenu clinique.
--
-- La reprise du registre en dur (passations non interprétables Q_ALI_03 /
-- Q_SOM_07 antérieures à leur reconstruction) est un script applicatif
-- distinct, pas cette migration : la migration ne décide rien de clinique.

-- AlterTable
ALTER TABLE "questionnaire_reponses"
    ADD COLUMN "statut_validite" TEXT NOT NULL DEFAULT 'VALID',
    ADD COLUMN "invalide_le" TIMESTAMP(3),
    ADD COLUMN "invalide_par" TEXT,
    ADD COLUMN "motif_invalidation" TEXT,
    ADD COLUMN "supersedes_reponse_id" TEXT;

-- La colonne est TEXT (pas d'ENUM PostgreSQL : un statut futur resterait un
-- ajout de valeur, pas un ALTER TYPE), mais l'ensemble est fermé par CHECK :
-- une valeur inattendue (backfill, requête manuelle, bug applicatif) doit
-- échouer ici plutôt que traverser silencieusement le filtre de validité.
ALTER TABLE "questionnaire_reponses"
    ADD CONSTRAINT "questionnaire_reponses_statut_validite_check"
    CHECK ("statut_validite" IN ('VALID', 'AMBIGUOUS', 'INVALID', 'SUPERSEDED', 'HISTORICAL_ONLY'));

-- CreateIndex
CREATE INDEX "questionnaire_reponses_patient_validite_idx"
    ON "questionnaire_reponses"("id_patient", "statut_validite");
