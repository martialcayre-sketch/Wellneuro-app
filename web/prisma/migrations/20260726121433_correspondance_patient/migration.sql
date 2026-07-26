-- Registre transversal des communications patient.
-- Aucun corps d'e-mail ni adresse n'est conservé dans cette table.
CREATE TABLE "correspondances_patient" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'email',
    "sens" TEXT NOT NULL DEFAULT 'sortant',
    "type" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "source_type" TEXT,
    "source_id" TEXT,
    "erreur_courte" TEXT,
    "enregistre_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correspondances_patient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "correspondances_patient_source_key"
ON "correspondances_patient"("source_type", "source_id");

CREATE INDEX "correspondances_patient_patient_idx"
ON "correspondances_patient"("id_patient", "enregistre_le");

ALTER TABLE "correspondances_patient"
ADD CONSTRAINT "correspondances_patient_id_patient_fkey"
FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Deny-all via l'API Data Supabase. L'application utilise Prisma avec le rôle
-- propriétaire des tables, comme les autres tables patient du dépôt.
ALTER TABLE "public"."correspondances_patient" ENABLE ROW LEVEL SECURITY;

-- Les booklets sont la seule correspondance patient historiquement auditée
-- avec une issue d'envoi fiable. On les reprend pour que le nouveau fil soit
-- utile dès son ouverture, sans déduire d'anciens e-mails non journalisés.
INSERT INTO "correspondances_patient" (
    "id",
    "id_patient",
    "type",
    "objet",
    "statut",
    "reference_type",
    "reference_id",
    "source_type",
    "source_id",
    "erreur_courte",
    "enregistre_le"
)
SELECT
    'legacy_booklet_' || "id",
    "id_patient",
    'booklet',
    CASE WHEN "operation" = 'Renvoi'
        THEN 'Renvoi du bilan neuronutritionnel'
        ELSE 'Envoi du bilan neuronutritionnel'
    END,
    "statut",
    'synthese',
    "id_synthese",
    'booklet_envoi',
    "id",
    "erreur_courte",
    "date_envoi"
FROM "booklet_envois";
