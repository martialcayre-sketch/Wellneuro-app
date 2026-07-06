-- AlterTable
ALTER TABLE "assignations" ADD COLUMN     "consentement" TEXT NOT NULL DEFAULT 'non_donne',
ADD COLUMN     "consentement_horodatage" TIMESTAMP(3),
ADD COLUMN     "consentement_retrait_date" TIMESTAMP(3),
ADD COLUMN     "consentement_version" TEXT,
ADD COLUMN     "date_derniere_modification" TIMESTAMP(3),
ADD COLUMN     "statut_reponses" TEXT NOT NULL DEFAULT 'non_rempli';
