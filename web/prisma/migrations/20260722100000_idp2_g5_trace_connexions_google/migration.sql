-- IDP2 LOT-03c-trace / Vague 2 — trace durable des entrées par Google (gate G5).
-- Migration confirmée explicitement par l'utilisateur le 2026-07-22.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill. Rollback = abandon de la table.
--
-- MERGER CETTE MIGRATION N'ACTIVE RIEN. Le chemin Google est derrière
-- WN_G5_GOOGLE_PATIENT, absent de la production : la route répond 404 et cette
-- table reste vide jusqu'à l'activation (LOT-03d).
--
-- POURQUOI. Le lien magique laisse une trace en base (`consomme_le`,
-- `rejeux_refuses`) ; le chemin Google n'en laissait aucune, seulement un log
-- Vercel purgeable. La revue adversariale du 2026-07-21 en a fait un NO-GO à
-- l'activation : « qui a ouvert ce dossier, quand, par quel chemin » doit avoir
-- une réponse trois mois plus tard.
--
-- CE QU'ELLE PORTE, ET CE QU'ELLE NE PORTE PAS. `id_patient` (identifiant
-- synthétique, déjà partout ailleurs), l'instant, l'issue, et pour un refus sa
-- catégorie interne. JAMAIS l'adresse e-mail, JAMAIS une empreinte, JAMAIS le
-- jeton. `id_patient` est nullable : un refus sur une adresse inconnue n'a pas
-- de patient à nommer.
--
-- SANS CLÉ ÉTRANGÈRE VERS `patients`, comme `audit_syntheses`/`booklet_envois`.
-- `id_patient` est nullable ; une FK n'aurait rien à contraindre sur les lignes
-- sans patient. En contrepartie, `effacerDossier` efface cette table nommément
-- (et `effacement.test.ts` échoue si on l'oublie) : une trace d'accès ne doit
-- pas survivre à l'effacement du dossier qu'elle nomme.
--
-- PAS DE PURGE AUTOMATIQUE, hors effacement. Contrairement à
-- `portail_demande_tentatives`, compteur de cadence sans valeur passé une heure,
-- ceci est un journal d'accès : durer, tant que le dossier existe, est son objet.
-- La durée de conservation générale est une décision de conformité.

-- CreateTable
CREATE TABLE "portail_connexions_google" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT,
    "issue" TEXT NOT NULL,
    "motif" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portail_connexions_google_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "g5_google_patient_idx" ON "portail_connexions_google"("id_patient", "cree_le");

-- CreateIndex
CREATE INDEX "g5_google_scan_idx" ON "portail_connexions_google"("cree_le");

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, les tables C2A, relecture_notes, portail_magic_links et
-- portail_demande_tentatives.
ALTER TABLE "public"."portail_connexions_google" ENABLE ROW LEVEL SECURITY;
