-- SP-FIL / Vague 2 — refus persisté des cartes du Fil (gate G1).
-- Gate confirmé explicitement par l'utilisateur le 2026-07-20.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucune suppression de ligne. Aucun backfill :
-- l'absence de ligne signifie « carte non refusée », ce qui est l'état actuel
-- de toutes les cartes. Rollback = abandon de la table.
--
-- Pas de contrainte d'unicité sur (id_patient, carte_cle) : le refus est
-- append-only chaîné, et son annulation est une SECONDE ligne sur la même clé
-- (refusee = false) qui supplante la première. Une unicité rendrait
-- l'annulation impossible — or le garde-fou 5.0 exige un refus réversible.
-- L'index (id_patient, carte_cle) sert la lecture, il ne contraint rien.

-- CreateTable
CREATE TABLE "fil_card_rejections" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "carte_cle" TEXT NOT NULL,
    "refusee" BOOLEAN NOT NULL DEFAULT true,
    "refuse_par" TEXT NOT NULL,
    "supersedes_rejection_id" TEXT,
    "refuse_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fil_card_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "g1_fil_rejection_patient_idx" ON "fil_card_rejections"("id_patient", "refuse_le");

-- CreateIndex
CREATE INDEX "g1_fil_rejection_cle_idx" ON "fil_card_rejections"("id_patient", "carte_cle");

-- AddForeignKey
ALTER TABLE "fil_card_rejections" ADD CONSTRAINT "fil_card_rejections_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1 et les tables C2A.
ALTER TABLE "public"."fil_card_rejections" ENABLE ROW LEVEL SECURITY;
