-- Bibliothèque — file d'envoi de questionnaires (arbitrage utilisateur du
-- 2026-07-23 : « file simple, envoi au clic »).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill : l'absence de ligne signifie
-- « aucune file en cours », ce qui est l'état actuel de tous les dossiers.
-- Rollback = abandon de la table.
--
-- CE QUE CETTE TABLE NE DÉCLENCHE PAS : aucune assignation ni e-mail à
-- l'écriture d'un brouillon — l'envoi reste un clic praticien explicite
-- (« Préparer les envois »), qui crée alors les assignations en transaction
-- (patron packs/assign) et passe la ligne à `statut = 'parti'`. Pas de cron,
-- pas de relance automatique.
--
-- `qids` ne sont PAS des clés étrangères : le catalogue de questionnaires vit
-- en code (QUESTIONNAIRE_CATALOGUE), pas en table. La validation des ids se
-- fait à l'écriture et à l'envoi, jamais par contrainte.
--
-- Pas de contrainte d'unicité sur (praticien_email, id_patient) : la ligne
-- « parti » est une trace conservée, et un nouveau brouillon rouvre une ligne
-- neuve sur la même clé. L'unicité du brouillon ACTIF est applicative.

-- CreateTable
CREATE TABLE "envoi_brouillons" (
    "id" TEXT NOT NULL,
    "id_brouillon" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "qids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "date_limite" TEXT,
    "notes" TEXT,
    "date_envoi" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envoi_brouillons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "envoi_brouillons_id_brouillon_key" ON "envoi_brouillons"("id_brouillon");

-- CreateIndex
CREATE INDEX "bibliotheque_envoi_brouillon_praticien_idx" ON "envoi_brouillons"("praticien_email", "statut");

-- CreateIndex
CREATE INDEX "bibliotheque_envoi_brouillon_patient_idx" ON "envoi_brouillons"("id_patient", "statut");

-- AddForeignKey
ALTER TABLE "envoi_brouillons" ADD CONSTRAINT "envoi_brouillons_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app
-- accède via Prisma en connexion Postgres directe qui contourne RLS),
-- cohérent avec pack_propositions et les tables C2A.
ALTER TABLE "public"."envoi_brouillons" ENABLE ROW LEVEL SECURITY;
