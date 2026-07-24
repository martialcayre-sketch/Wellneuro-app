-- Instruments du cabinet (décision utilisateur du 2026-07-23 : « instruments
-- du cabinet complets d'emblée ») : un praticien crée ou importe un
-- questionnaire privé à son cabinet, avec grille de score et interprétation.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill : l'absence de ligne signifie
-- « aucun instrument de cabinet », ce qui est l'état actuel de tous les
-- cabinets. Rollback = abandon de la table.
--
-- CE QUE CETTE TABLE NE DÉCLENCHE PAS : aucune assignation ni e-mail à la
-- création d'un instrument — un instrument n'est JAMAIS certifié
-- automatiquement, et sa grille doit être relue puis publiée
-- (statut_relecture = 'valide') avant d'être assignable par la file d'envoi.
-- La relecture de grille est un geste praticien explicite ; pas de cron,
-- pas de publication automatique.
--
-- Pas de FK praticien : le praticien n'existe que par l'email de session
-- (hypothèse mono-praticien du dépôt) — même patron que envoi_brouillons.
-- Les ids d'instrument (CAB_xxx) ne sont référencés par les assignations que
-- comme chaînes, à l'image du catalogue en code (QUESTIONNAIRE_CATALOGUE) :
-- la validation se fait à l'écriture et à l'envoi, jamais par contrainte.
-- Cette référence par chaîne est compensée applicativement, des deux côtés :
-- le PATCH praticien GÈLE le contenu (definition_json/scoring_json) tant
-- qu'une assignation non verrouillée référence l'instrument, et le chemin
-- patient résout la définition en mode passation (l'assignation fait
-- autorité : un envoi déjà parti reste rendu et scoré même si l'instrument
-- a été désactivé ou dépublié entre-temps — aucune ligne n'est supprimée).

-- CreateTable
CREATE TABLE "cabinet_instruments" (
    "id" TEXT NOT NULL,
    "id_instrument" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'Cabinet',
    "description" TEXT,
    "definition_json" JSONB NOT NULL,
    "scoring_json" JSONB NOT NULL,
    "statut_relecture" TEXT NOT NULL DEFAULT 'brouillon',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinet_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cabinet_instruments_id_instrument_key" ON "cabinet_instruments"("id_instrument");

-- CreateIndex
CREATE INDEX "cabinet_instrument_praticien_idx" ON "cabinet_instruments"("praticien_email", "actif");

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app
-- accède via Prisma en connexion Postgres directe qui contourne RLS),
-- cohérent avec envoi_brouillons, pack_propositions et les tables C2A.
ALTER TABLE "public"."cabinet_instruments" ENABLE ROW LEVEL SECURITY;
