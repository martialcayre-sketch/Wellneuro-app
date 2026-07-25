-- Agenda du sommeil 21 nuits (Q_SOM_09) — recueil longitudinal patient.
--
-- ADDITIF UNIQUEMENT : une table nouvelle, aucune colonne existante touchée.
-- Une ligne = une nuit déclarée un matin par le patient. Append-only chaîné
-- (supersedes_nuit_id) : une correction est une NOUVELLE ligne, jamais un
-- UPDATE — même doctrine que protocol_checkins.
--
-- CE QU'ELLE PORTE : id_patient, id_assignation, date_nuit (AAAA-MM-JJ, matin
-- du réveil, horloge murale locale), reponses (JSONB, contrat
-- agenda-sommeil-v1 : heures HH:MM locales, classes qualitatives — JAMAIS de
-- minutes exactes ni de fuseau), canal, chaînage, horodatage. Les agrégats et
-- le score ne vivent PAS ici : ils sont produits à la clôture dans une
-- questionnaire_reponses standard.
--
-- RGPD : elle nomme le dossier par id_patient. `effacerDossier` la supprime
-- nommément (FK RESTRICT vers patients/assignations — l'effacement doit passer
-- par la suppression applicative, cf. lib/patient/effacement.ts).

-- CreateTable
CREATE TABLE "agenda_sommeil_nuits" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_assignation" TEXT NOT NULL,
    "date_nuit" TEXT NOT NULL,
    "reponses" JSONB NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'portail',
    "supersedes_nuit_id" TEXT,
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_sommeil_nuits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agd_som_patient_date_idx" ON "agenda_sommeil_nuits"("id_patient", "date_nuit");

-- CreateIndex
CREATE INDEX "agd_som_assignation_date_idx" ON "agenda_sommeil_nuits"("id_assignation", "date_nuit");

-- AddForeignKey
ALTER TABLE "agenda_sommeil_nuits" ADD CONSTRAINT "agenda_sommeil_nuits_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_sommeil_nuits" ADD CONSTRAINT "agenda_sommeil_nuits_id_assignation_fkey" FOREIGN KEY ("id_assignation") REFERENCES "assignations"("id_assignation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut. L'application accède via Prisma en
-- connexion Postgres directe ; aucun accès Supabase Data API public n'est
-- nécessaire pour ce recueil.
ALTER TABLE "public"."agenda_sommeil_nuits" ENABLE ROW LEVEL SECURITY;
