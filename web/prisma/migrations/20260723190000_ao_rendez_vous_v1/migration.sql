-- Accueil Observatoire LOT-04 — rendez-vous praticien V1 (dé-différé du
-- workflow RDV, R6 produit / E5 du registre §4).
-- Gate migration confirmé explicitement par l'utilisateur le 2026-07-23
-- (question de session « Le LOT-D crée le modèle RendezVous » → « Oui »).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucune suppression de ligne. Aucun backfill :
-- l'absence de ligne signifie « aucun rendez-vous planifié », l'état actuel.
-- Rollback = abandon de la table ; rien d'existant n'en dépend.
--
-- PÉRIMÈTRE MINIMAL (registre : workflow RDV différé jusqu'ici) : ni
-- récurrence, ni notification, ni durée, ni surface patient. La table alimente
-- les cartes « Pré-vol prêt » du Fil et l'écran agenda ; le pré-vol lui-même
-- reste ancré sur `Consultation.dateValidation` (SP-COP), inchangé.
--
-- `date_heure` est une DONNÉE (le moment planifié, saisi par le praticien) ;
-- `cree_le` est le moment de l'écriture, posé par la base
-- (DEFAULT CURRENT_TIMESTAMP), jamais par l'appelant. L'annulation est un
-- STATUT (`annule`) daté par `annule_le`, JAMAIS une suppression : le
-- rendez-vous reste une trace.
--
-- CONSERVATION ALIGNÉE DOSSIER : l'effacement du dossier efface cette table
-- nommément (`effacerDossier`, garde structurelle dans `effacement.test.ts` :
-- toute table portant `id_patient` doit y figurer). La FK est en
-- ON DELETE RESTRICT — sans cet effacement, la suppression du patient
-- échouerait.

-- CreateTable
CREATE TABLE "rendez_vous" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "date_heure" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'planifie',
    "annule_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rendez_vous_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ao_rendez_vous_praticien_date_idx" ON "rendez_vous"("praticien_email", "date_heure");

-- CreateIndex
CREATE INDEX "ao_rendez_vous_patient_date_idx" ON "rendez_vous"("id_patient", "date_heure");

-- AddForeignKey
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- relecture_notes, trust_v1, c2a_persistance_v1 et correspondances_medecin.
ALTER TABLE "public"."rendez_vous" ENABLE ROW LEVEL SECURITY;
