-- AlterTable : token d'accès permanent au portail patient
ALTER TABLE "patients" ADD COLUMN "access_token" TEXT,
ADD COLUMN "access_token_revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "access_token_created_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "patients_access_token_key" ON "patients"("access_token");

-- AlterTable : pack de base par défaut
ALTER TABLE "packs" ADD COLUMN "par_defaut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "id_consultation" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'creee',
    "motif" TEXT,
    "consentement" TEXT NOT NULL DEFAULT 'non_donne',
    "consentement_horodatage" TIMESTAMP(3),
    "consentement_version" TEXT,
    "fiche_signaletique" JSONB,
    "anamnese" JSONB,
    "date_validation" TIMESTAMP(3),
    "id_pack_assigne" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_id_consultation_key" ON "consultations"("id_consultation");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut, cohérent avec la migration
-- enable_rls_security (aucune policy volontairement ; l'app accède via Prisma
-- en connexion Postgres directe qui contourne RLS).
ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;
