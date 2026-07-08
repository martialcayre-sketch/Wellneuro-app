-- P6 : traçabilité du consentement groupé (RGPD)
-- Finalité du consentement recueilli au niveau de la consultation.
ALTER TABLE "consultations" ADD COLUMN "finalite_consentement" TEXT;
-- Lien souple (id métier, sans FK) vers la consultation dont le consentement couvre l'assignation.
ALTER TABLE "assignations" ADD COLUMN "id_consultation" TEXT;

-- P5 : demande de correction enrichie
-- Commentaire facultatif du patient précisant ce qu'il souhaite corriger + horodatage.
ALTER TABLE "assignations" ADD COLUMN "correction_commentaire" TEXT;
ALTER TABLE "assignations" ADD COLUMN "correction_demandee_date" TIMESTAMP(3);
