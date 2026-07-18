-- C2A DIFFUSION V1 — approbation praticien « pour diffusion » du protocole.
-- Migration ADDITIVE (1 nouvelle table, aucune table existante modifiée),
-- gate confirmé par l'utilisateur le 2026-07-17. Append-only (supersedes).

-- CreateTable
CREATE TABLE "protocol_diffusion_approvals" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "protocol_draft_id" TEXT NOT NULL,
    "decision_card_input_hash" TEXT NOT NULL,
    "protocol_draft_input_hash" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL,
    "approved_by" TEXT NOT NULL DEFAULT 'practitioner',
    "confirmation" TEXT NOT NULL,
    "supersedes_approval_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_diffusion_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "c2a_diffusion_patient_idx" ON "protocol_diffusion_approvals"("id_patient");

-- CreateIndex
CREATE INDEX "c2a_diffusion_draft_idx" ON "protocol_diffusion_approvals"("protocol_draft_id");

-- AddForeignKey
ALTER TABLE "protocol_diffusion_approvals" ADD CONSTRAINT "protocol_diffusion_approvals_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_diffusion_approvals" ADD CONSTRAINT "protocol_diffusion_approvals_protocol_draft_id_fkey" FOREIGN KEY ("protocol_draft_id") REFERENCES "protocol_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1 et c2a_persistance_v1.
ALTER TABLE "public"."protocol_diffusion_approvals" ENABLE ROW LEVEL SECURITY;
