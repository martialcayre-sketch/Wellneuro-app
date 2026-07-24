-- Inbox questionnaires — accusés explicites de lecture praticien.
--
-- ADDITIF UNIQUEMENT : une table nouvelle. L'inbox utilisait auparavant la
-- dernière consultation validée comme ancre ; cela reste vrai, mais le
-- praticien peut maintenant confirmer la lecture d'une réponse précise sans
-- ouvrir toute la fiche-trajectoire.
--
-- CE QU'ELLE PORTE : `id_reponse`, `id_patient`, `praticien_email`, `lu_le`.
-- JAMAIS les réponses, scores, payloads, IP, user-agent ou URL réelle. La
-- donnée clinique reste dans `questionnaire_reponses`; cette table ne porte
-- que l'accusé de lecture.
--
-- RGPD : elle nomme le dossier par `id_patient`. `effacerDossier` la supprime
-- nommément ; la FK vers `questionnaire_reponses.id_reponse` est un garde-fou
-- supplémentaire en cascade, pas le mécanisme principal d'effacement.

-- CreateTable
CREATE TABLE "questionnaire_lectures_praticien" (
    "id" TEXT NOT NULL,
    "id_reponse" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "lu_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_lectures_praticien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_lectures_praticien_id_reponse_key" ON "questionnaire_lectures_praticien"("id_reponse");

-- CreateIndex
CREATE INDEX "questionnaire_lectures_patient_idx" ON "questionnaire_lectures_praticien"("id_patient", "lu_le");

-- CreateIndex
CREATE INDEX "questionnaire_lectures_scan_idx" ON "questionnaire_lectures_praticien"("lu_le");

-- AddForeignKey
ALTER TABLE "questionnaire_lectures_praticien" ADD CONSTRAINT "questionnaire_lectures_praticien_id_reponse_fkey" FOREIGN KEY ("id_reponse") REFERENCES "questionnaire_reponses"("id_reponse") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut. L'application accède via Prisma en
-- connexion Postgres directe ; aucun accès Supabase Data API public n'est
-- nécessaire pour ces accusés de lecture.
ALTER TABLE "public"."questionnaire_lectures_praticien" ENABLE ROW LEVEL SECURITY;
