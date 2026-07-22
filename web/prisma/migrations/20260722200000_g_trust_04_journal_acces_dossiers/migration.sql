-- G-TRUST-04 / exigence 5 — journal des lectures praticien de dossier nommé.
-- Migration confirmée explicitement par l'utilisateur le 2026-07-22 (plan du
-- lot « durcissement G-TRUST-04 et reliquats » approuvé en session, décisions
-- GD-1 à GD-4 de la campagne).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill (l'absence de ligne signifie
-- « aucun accès journalisé », ce qui est l'état actuel). Rollback = abandon
-- de la table ; rien d'existant n'en dépend.
--
-- MERGER CETTE MIGRATION N'ACTIVE RIEN. L'écriture arrive par une PR
-- ultérieure (helper `journaliserAccesDossier` + branchement des routes) ;
-- la table reste vide d'ici là.
--
-- POURQUOI. La journalisation actuelle (`web/src/lib/observability/`) couvre
-- les erreurs et les refus, en console Vercel purgeable. Le dépôt a déjà
-- acté (migration G5) qu'un log purgeable ne vaut pas trace d'accès : « qui
-- a lu quel dossier, quand » doit avoir une réponse trois mois plus tard.
-- Cette table la porte pour le versant praticien — le versant patient est
-- déjà couvert (`portail_connexions_google`, `portail_magic_links.consomme_le`).
--
-- CE QU'ELLE PORTE, ET CE QU'ELLE NE PORTE PAS. Le « qui »
-- (`praticien_email` — un praticien s'authentifie par son adresse
-- `@wellneuro.fr`, c'est son identifiant naturel, déjà présent sur
-- `patients.praticien_email`), le « quel dossier » (`id_patient`,
-- identifiant synthétique), le « quand » (`cree_le`, posé par la base), le
-- « par où » (`route` en gabarit littéral, `methode`). JAMAIS l'URL réelle,
-- JAMAIS de payload, JAMAIS d'adresse IP ni de user-agent, JAMAIS de donnée
-- clinique. `id_patient` NOT NULL, contrairement à G5 : on n'écrit qu'après
-- appartenance établie, il y a toujours un dossier à nommer.
--
-- SANS CLÉ ÉTRANGÈRE VERS `patients`, comme `audit_syntheses` et
-- `portail_connexions_google` : une FK RESTRICT ferait de chaque ligne de
-- journal un obstacle à l'effacement, une FK CASCADE effacerait en silence.
-- En contrepartie, `effacerDossier` efface cette table nommément
-- (`effacement.test.ts` échoue si on l'oublie) : un journal d'accès qui
-- survivrait à l'effacement continuerait à nommer le dossier détruit.
--
-- RÉTENTION : 12 mois glissants, purge opportuniste à l'écriture (décision
-- GD-2 du 2026-07-22, alignée sur `RETENTION_CONNEXIONS_GOOGLE_MS` arbitrée
-- le même jour) — constante applicative, révisable sans migration. Un
-- journal de comportement praticien sans borne deviendrait lui-même un
-- passif.

-- CreateTable
CREATE TABLE "journal_acces_dossiers" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "methode" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_acces_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acces_dossiers_patient_idx" ON "journal_acces_dossiers"("id_patient", "cree_le");

-- CreateIndex
CREATE INDEX "acces_dossiers_scan_idx" ON "journal_acces_dossiers"("cree_le");

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- portail_connexions_google, correspondances_medecin, relecture_notes et les
-- tables TRUST.
ALTER TABLE "public"."journal_acces_dossiers" ENABLE ROW LEVEL SECURITY;
