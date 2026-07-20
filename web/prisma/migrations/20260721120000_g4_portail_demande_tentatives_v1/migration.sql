-- IDP LOT-02 / Vague 2 — limitation par origine réseau du canal de redemande (gate G4).
-- Migration confirmée explicitement par l'utilisateur le 2026-07-21.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill. Rollback = abandon de la table.
--
-- MERGER CETTE MIGRATION N'ACTIVE RIEN. Le canal de redemande est derrière
-- WN_G4_REDEMANDE_PATIENT, absent de la production : la route répond 404 et
-- cette table reste vide.
--
-- POURQUOI UNE TABLE. Le plafond par patient (3/heure) ne borne pas
-- l'énumération : qui essaie mille adresses inconnues n'atteint le plafond
-- d'aucun patient, puisqu'il n'en touche aucun. Il faut compter les tentatives
-- elles-mêmes. Un compteur en mémoire ne le peut pas — plusieurs instances
-- serverless répondent en parallèle — et `portail_magic_links` non plus, une
-- adresse inconnue n'y créant aucune ligne.
--
-- AUCUNE RELATION VERS `patients`, DÉLIBÉRÉMENT. Ni clé étrangère, ni colonne
-- d'identifiant patient : aucune jointure ne doit pouvoir relier une origine
-- réseau à un dossier. Cette table sait combien, jamais pour qui.
--
-- L'ADRESSE IP N'ENTRE PAS ICI. `empreinte_ip` est un HMAC-SHA256 du premier
-- élément de `x-forwarded-for` (clé : NEXTAUTH_SECRET, préfixe de domaine
-- « portail-demande-ip: »), calculé par lib/portail/lienMagique.ts. Une IP est
-- une donnée personnelle : on garde de quoi compter, pas de quoi identifier.
-- Les lignes se purgent au-delà de 24 h (`g4_demande_purge_idx`) — passé la
-- fenêtre de comptage d'une heure, elles ne seraient plus qu'une trace
-- d'origine réseau conservée sans usage.

-- CreateTable
CREATE TABLE "portail_demande_tentatives" (
    "id" TEXT NOT NULL,
    "empreinte_ip" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portail_demande_tentatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "g4_demande_ip_idx" ON "portail_demande_tentatives"("empreinte_ip", "cree_le");

-- CreateIndex
CREATE INDEX "g4_demande_purge_idx" ON "portail_demande_tentatives"("cree_le");

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, les tables C2A, relecture_notes et portail_magic_links.
ALTER TABLE "public"."portail_demande_tentatives" ENABLE ROW LEVEL SECURITY;
