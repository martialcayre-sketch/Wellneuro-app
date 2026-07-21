-- SP-SPI LOT-01 — le chemin retour du pack de réévaluation.
-- Gate confirmé explicitement par l'utilisateur le 2026-07-21.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucune suppression de ligne. Aucun backfill :
-- l'absence de ligne signifie « aucun pack proposé », ce qui est l'état actuel
-- de tous les dossiers. Rollback = abandon de la table.
--
-- POURQUOI CETTE TABLE. Le lot exigeait un pack « proposé et refusable » et
-- s'interdisait en même temps toute écriture. Les deux ne tiennent pas
-- ensemble : un refus qu'on ne persiste pas revient à chaque visite, et une
-- proposition qui revient EST une relance — précisément ce que la campagne
-- s'interdit. La donnée sert à NE PAS REDEMANDER, jamais à insister.
--
-- CE QUE CETTE TABLE NE DÉCLENCHE PAS : aucune assignation (l'assignation reste
-- un geste praticien), aucun envoi d'e-mail, aucun compte à rebours, aucune
-- relance. Un refus reste sans conséquence pour le patient.
--
-- Pas de contrainte d'unicité sur (id_patient, id_pack) : la proposition est
-- append-only chaînée, et la réponse du patient est une SECONDE ligne sur la
-- même clé (supersedes_proposition_id) qui supplante la première. Une unicité
-- rendrait la réponse impossible. Les deux index servent la lecture, ils ne
-- contraignent rien.
--
-- `id_pack` n'est délibérément PAS une clé étrangère vers `packs` : la ligne
-- consigne ce qui a été proposé au moment où ça l'a été, et doit survivre à la
-- désactivation ou au retrait du pack — même principe que `version_score` figée
-- à la mesure. Une clé étrangère ferait dépendre une trace passée d'un
-- référentiel présent.

-- CreateTable
CREATE TABLE "pack_propositions" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_pack" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "acteur_role" TEXT NOT NULL,
    "supersedes_proposition_id" TEXT,
    "enregistre_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_propositions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sp_spi_pack_proposition_patient_idx" ON "pack_propositions"("id_patient", "enregistre_le");

-- CreateIndex
CREATE INDEX "sp_spi_pack_proposition_pack_idx" ON "pack_propositions"("id_patient", "id_pack");

-- AddForeignKey
ALTER TABLE "pack_propositions" ADD CONSTRAINT "pack_propositions_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, les tables C2A et fil_card_rejections.
ALTER TABLE "public"."pack_propositions" ENABLE ROW LEVEL SECURITY;
