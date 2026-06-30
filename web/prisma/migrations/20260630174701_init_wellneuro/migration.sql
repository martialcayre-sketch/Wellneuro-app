-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "date_naissance" TEXT,
    "telephone" TEXT,
    "praticien_email" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignations" (
    "id" TEXT NOT NULL,
    "id_assignation" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email_patient" TEXT NOT NULL,
    "id_questionnaire" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date_assignation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_limite" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_reponses" (
    "id" TEXT NOT NULL,
    "id_reponse" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email_patient" TEXT NOT NULL,
    "id_assignation" TEXT,
    "id_questionnaire" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date_reponse" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scores_json" JSONB NOT NULL,
    "score_principal" DOUBLE PRECISION,
    "interpretation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_reponses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syntheses_ia" (
    "id" TEXT NOT NULL,
    "id_synthese" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email_patient" TEXT NOT NULL,
    "date_generation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modele" TEXT NOT NULL,
    "version_prompt" TEXT NOT NULL DEFAULT 'v1',
    "donnees_entree" JSONB NOT NULL,
    "synthese_json" JSONB NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon_IA',
    "date_validation" TIMESTAMP(3),
    "notes_praticien" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syntheses_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_syntheses" (
    "id" TEXT NOT NULL,
    "date_generation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_synthese" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "version_prompt" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "erreur_courte" TEXT,

    CONSTRAINT "audit_syntheses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booklet_envois" (
    "id" TEXT NOT NULL,
    "date_envoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_synthese" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "email_patient_masque" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "relecture_confirmee" BOOLEAN NOT NULL DEFAULT false,
    "erreur_courte" TEXT,

    CONSTRAINT "booklet_envois_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_id_patient_key" ON "patients"("id_patient");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assignations_id_assignation_key" ON "assignations"("id_assignation");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_reponses_id_reponse_key" ON "questionnaire_reponses"("id_reponse");

-- CreateIndex
CREATE UNIQUE INDEX "syntheses_ia_id_synthese_key" ON "syntheses_ia"("id_synthese");

-- AddForeignKey
ALTER TABLE "assignations" ADD CONSTRAINT "assignations_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_reponses" ADD CONSTRAINT "questionnaire_reponses_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syntheses_ia" ADD CONSTRAINT "syntheses_ia_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_syntheses" ADD CONSTRAINT "audit_syntheses_id_synthese_fkey" FOREIGN KEY ("id_synthese") REFERENCES "syntheses_ia"("id_synthese") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booklet_envois" ADD CONSTRAINT "booklet_envois_id_synthese_fkey" FOREIGN KEY ("id_synthese") REFERENCES "syntheses_ia"("id_synthese") ON DELETE RESTRICT ON UPDATE CASCADE;
