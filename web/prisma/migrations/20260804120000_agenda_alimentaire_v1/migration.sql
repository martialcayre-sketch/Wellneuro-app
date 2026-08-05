-- Agenda alimentaire 21 jours (Q_ALI_09) — recueil longitudinal patient.
--
-- ADDITIF UNIQUEMENT : une table nouvelle, aucune colonne existante touchée,
-- aucune donnée déplacée. Rien à reprendre en arrière si le lot est annulé.
--
-- Une ligne = une journée déclarée par le patient. APPEND-ONLY CHAÎNÉ
-- (supersedes_jour_id) : une correction est une NOUVELLE ligne, jamais un
-- UPDATE — même doctrine que agenda_sommeil_nuits et protocol_checkins.
--
-- CE QU'ELLE PORTE : id_patient, id_assignation, date_jour (AAAA-MM-JJ, journée
-- locale ANCRÉE À 04:00 — une prise à 00:30 appartient à la veille), reponses
-- (JSONB, contrat agenda-alimentaire-v1 : heures HH:MM au quart d'heure, nature
-- repas/hors-repas, quatre présences booléennes pouvant valoir NULL au sens
-- « je ne sais pas »), canal, chaînage, horodatage.
--
-- CE QU'ELLE NE PORTE PAS, ET NE PORTERA PAS : aucune quantité, aucun gramme,
-- aucune kcal, aucun aliment identifié au-delà des présences déclarées, aucun
-- score, aucun indice. Les agrégats ne vivent PAS ici. Frontière JA du registre
-- des frontières.
--
-- PAS DE CONTRAINTE UNIQUE sur (id_assignation, date_jour), délibérément : les
-- lignes supplantées restent, et « lignes − dates distinctes » est le taux de
-- correction, seul signal de friction lisible sans nouvelle migration.
--
-- RGPD : elle nomme le dossier par id_patient. Les deux clés étrangères sont en
-- RESTRICT, donc l'effacement passe par une suppression applicative explicite,
-- AVANT celle des assignations — `effacerDossier` la supprime nommément (cf.
-- lib/patient/effacement.ts, bloc « petits-enfants »).

-- CreateTable
CREATE TABLE "agenda_alimentaire_jours" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_assignation" TEXT NOT NULL,
    "date_jour" TEXT NOT NULL,
    "reponses" JSONB NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'portail',
    "supersedes_jour_id" TEXT,
    "soumis_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_alimentaire_jours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agd_ali_patient_date_idx" ON "agenda_alimentaire_jours"("id_patient", "date_jour");

-- CreateIndex
CREATE INDEX "agd_ali_assignation_date_idx" ON "agenda_alimentaire_jours"("id_assignation", "date_jour");

-- AddForeignKey
ALTER TABLE "agenda_alimentaire_jours" ADD CONSTRAINT "agenda_alimentaire_jours_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_alimentaire_jours" ADD CONSTRAINT "agenda_alimentaire_jours_id_assignation_fkey" FOREIGN KEY ("id_assignation") REFERENCES "assignations"("id_assignation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut. L'application accède via Prisma en
-- connexion Postgres directe ; aucun accès Supabase Data API public n'est
-- nécessaire pour ce recueil.
ALTER TABLE "public"."agenda_alimentaire_jours" ENABLE ROW LEVEL SECURITY;
