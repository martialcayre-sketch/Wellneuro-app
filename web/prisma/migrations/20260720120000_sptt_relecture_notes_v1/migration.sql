-- SP-TT LOT-02 / Vague 2 — notes de relecture (gate G3).
-- Gate confirmé explicitement par l'utilisateur le 2026-07-20.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucune suppression de ligne. Aucun backfill :
-- l'absence de ligne signifie « aucune note », ce qui est l'état actuel.
-- Rollback = abandon de la table ; rien d'existant n'en dépend.
--
-- `instant_relu` est une DONNÉE (l'instant que la note commente) ;
-- `cree_le` est le moment de l'écriture, posé par la base (DEFAULT
-- CURRENT_TIMESTAMP), jamais par l'appelant. On n'écrit pas dans le passé, on
-- écrit aujourd'hui à propos du passé.

-- CreateTable
CREATE TABLE "relecture_notes" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "instant_relu" TIMESTAMP(3) NOT NULL,
    "texte" TEXT NOT NULL,
    "supersedes_note_id" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relecture_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sptt_relecture_note_patient_idx" ON "relecture_notes"("id_patient", "cree_le");

-- AddForeignKey
ALTER TABLE "relecture_notes" ADD CONSTRAINT "relecture_notes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, c2a_persistance_v1 et c2a_diffusion_v1.
ALTER TABLE "public"."relecture_notes" ENABLE ROW LEVEL SECURITY;
