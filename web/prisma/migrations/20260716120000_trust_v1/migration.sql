-- TRUST V1 — traçabilité du cadre d'information patient.
-- Migration ADDITIVE (5 nouvelles tables, aucune table existante modifiée),
-- confirmée explicitement le 2026-07-16. Événements append-only.

-- CreateTable
CREATE TABLE "trust_acknowledgements" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "document_key" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'portail',
    "acteur_role" TEXT NOT NULL DEFAULT 'patient',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_choice_events" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "finalite" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "supersedes_event_id" TEXT,
    "acteur_role" TEXT NOT NULL DEFAULT 'patient',
    "enregistre_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_choice_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_adverse_effect_reports" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "produit_libelle" TEXT NOT NULL,
    "dose_declaree" TEXT,
    "debut_prise" TEXT,
    "symptomes" TEXT NOT NULL,
    "debut_symptomes" TEXT,
    "produits_concomitants" TEXT,
    "action_prise" TEXT NOT NULL DEFAULT 'ne_sait_pas',
    "severite_declaree" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "regle_id" TEXT NOT NULL,
    "regle_version" TEXT NOT NULL,
    "statut_traitement" TEXT NOT NULL DEFAULT 'recu',
    "examine_le" TIMESTAMP(3),
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_adverse_effect_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_privacy_incidents" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut_traitement" TEXT NOT NULL DEFAULT 'recu',
    "examine_le" TIMESTAMP(3),
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_privacy_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_rights_requests" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "statut_traitement" TEXT NOT NULL DEFAULT 'recu',
    "reponse" TEXT,
    "examine_le" TIMESTAMP(3),
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_rights_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trust_ack_patient_doc_version_type_key" ON "trust_acknowledgements"("id_patient", "document_key", "document_version", "type");

-- CreateIndex
CREATE INDEX "trust_choice_patient_finalite_idx" ON "trust_choice_events"("id_patient", "finalite");

-- CreateIndex
CREATE INDEX "trust_aer_statut_idx" ON "trust_adverse_effect_reports"("statut_traitement");

-- CreateIndex
CREATE INDEX "trust_incident_statut_idx" ON "trust_privacy_incidents"("statut_traitement");

-- CreateIndex
CREATE INDEX "trust_droits_statut_idx" ON "trust_rights_requests"("statut_traitement");

-- AddForeignKey
ALTER TABLE "trust_acknowledgements" ADD CONSTRAINT "trust_acknowledgements_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_choice_events" ADD CONSTRAINT "trust_choice_events_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_adverse_effect_reports" ADD CONSTRAINT "trust_adverse_effect_reports_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_privacy_incidents" ADD CONSTRAINT "trust_privacy_incidents_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_rights_requests" ADD CONSTRAINT "trust_rights_requests_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut, cohérent avec les migrations
-- précédentes (aucune policy volontairement ; l'app accède via Prisma en
-- connexion Postgres directe qui contourne RLS).
ALTER TABLE "public"."trust_acknowledgements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_choice_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_adverse_effect_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_privacy_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_rights_requests" ENABLE ROW LEVEL SECURITY;
