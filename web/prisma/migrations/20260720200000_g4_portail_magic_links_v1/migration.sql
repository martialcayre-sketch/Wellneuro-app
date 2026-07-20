-- IDP LOT-01 / Vague 2 — lien magique d'accès patient (gate G4).
-- Gate confirmé explicitement par l'utilisateur le 2026-07-20.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage. En particulier, `patients.access_token` est
-- CONSERVÉ INTACT : les deux chemins d'accès coexistent pendant la bascule,
-- c'est une exigence du registre (REGISTRE_FRONTIERES.md). Aucun backfill :
-- l'absence de ligne signifie « aucun lien magique émis », l'état de tous les
-- patients aujourd'hui. Rollback = abandon de la table.
--
-- MERGER CETTE MIGRATION N'ACTIVE RIEN. Le gate est derrière le drapeau
-- WN_G4_LIEN_MAGIQUE, absent de l'environnement de production : les routes
-- répondent 404 et cette table reste vide. L'activation avec des données
-- réelles est une décision distincte (gate TRUST, aujourd'hui NO-GO).
--
-- LE JETON N'ENTRE JAMAIS ICI. `jeton_empreinte` est un HMAC-SHA256 du jeton
-- (clé : NEXTAUTH_SECRET, préfixe de domaine « portail-lien-magique: »), calculé
-- par lib/portail/lienMagique.ts. Un dump de cette table ne permet donc pas
-- d'ouvrir un espace patient. L'unicité sert la recherche par empreinte et
-- interdit la collision.
--
-- `consomme_le` porte l'usage unique ; `rejeux_refuses` et
-- `derniere_tentative_le` portent la trace du rejeu, exigée par le registre —
-- en base, parce qu'un log Vercel est purgé et qu'une trace purgée ne prouve
-- plus rien.

-- CreateTable
CREATE TABLE "portail_magic_links" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "jeton_empreinte" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "consomme_le" TIMESTAMP(3),
    "cree_par" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejeux_refuses" INTEGER NOT NULL DEFAULT 0,
    "derniere_tentative_le" TIMESTAMP(3),

    CONSTRAINT "portail_magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portail_magic_links_jeton_empreinte_key" ON "portail_magic_links"("jeton_empreinte");

-- CreateIndex
CREATE INDEX "g4_magic_link_patient_idx" ON "portail_magic_links"("id_patient", "cree_le");

-- AddForeignKey
ALTER TABLE "portail_magic_links" ADD CONSTRAINT "portail_magic_links_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, les tables C2A, relecture_notes et fil_card_rejections.
ALTER TABLE "public"."portail_magic_links" ENABLE ROW LEVEL SECURITY;
