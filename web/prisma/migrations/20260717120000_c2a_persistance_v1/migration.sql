-- C2A PERSISTANCE V1 — persistance minimale du suivi 21 jours.
-- Migration ADDITIVE (3 nouvelles tables, aucune table existante modifiée),
-- gate migration confirmé explicitement par l'utilisateur le 2026-07-17
-- (checklist SPEC_LOT-01_MODELE_PERSISTANCE.md §8.11). Snapshot/review/
-- decision-card NON persistés (recalculables) ; provenance ancrée par hashes.
-- Corrections append-only (supersedes_*). Rollback = DROP des 3 tables.

-- CreateTable
CREATE TABLE "assessment_episodes" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "target_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "contract_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_drafts" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "assessment_episode_id" TEXT,
    "decision_card_id" TEXT NOT NULL,
    "decision_card_input_hash" TEXT NOT NULL,
    "snapshot_input_hash" TEXT NOT NULL,
    "review_input_hash" TEXT NOT NULL,
    "selected_priority_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL,
    "input_hash" TEXT NOT NULL,
    "contract_version" TEXT NOT NULL,
    "supersedes_draft_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocol_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_checkins" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_assignation" TEXT NOT NULL,
    "protocol_draft_id" TEXT NOT NULL,
    "point_etape" TEXT NOT NULL,
    "reponses" JSONB NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'portail',
    "supersedes_checkin_id" TEXT,
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "c2a_episode_patient_milestone_idx" ON "assessment_episodes"("id_patient", "milestone");

-- CreateIndex
CREATE INDEX "c2a_episode_patient_confirmed_idx" ON "assessment_episodes"("id_patient", "confirmed_at");

-- CreateIndex
CREATE INDEX "c2a_draft_patient_created_idx" ON "protocol_drafts"("id_patient", "created_at");

-- CreateIndex
CREATE INDEX "c2a_draft_decision_card_idx" ON "protocol_drafts"("decision_card_id");

-- CreateIndex
CREATE INDEX "c2a_draft_supersedes_idx" ON "protocol_drafts"("supersedes_draft_id");

-- CreateIndex
CREATE INDEX "c2a_checkin_patient_point_idx" ON "protocol_checkins"("id_patient", "point_etape");

-- CreateIndex
CREATE INDEX "c2a_checkin_draft_idx" ON "protocol_checkins"("protocol_draft_id");

-- CreateIndex
CREATE INDEX "c2a_checkin_assignation_idx" ON "protocol_checkins"("id_assignation");

-- AddForeignKey
ALTER TABLE "assessment_episodes" ADD CONSTRAINT "assessment_episodes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_drafts" ADD CONSTRAINT "protocol_drafts_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_drafts" ADD CONSTRAINT "protocol_drafts_assessment_episode_id_fkey" FOREIGN KEY ("assessment_episode_id") REFERENCES "assessment_episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_checkins" ADD CONSTRAINT "protocol_checkins_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_checkins" ADD CONSTRAINT "protocol_checkins_id_assignation_fkey" FOREIGN KEY ("id_assignation") REFERENCES "assignations"("id_assignation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_checkins" ADD CONSTRAINT "protocol_checkins_protocol_draft_id_fkey" FOREIGN KEY ("protocol_draft_id") REFERENCES "protocol_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut, cohérent avec les migrations précédentes
-- (aucune policy volontairement ; l'app accède via Prisma en connexion Postgres
-- directe qui contourne RLS). Non émis par Prisma — ajouté à la main, comme trust_v1.
ALTER TABLE "public"."assessment_episodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."protocol_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."protocol_checkins" ENABLE ROW LEVEL SECURITY;
