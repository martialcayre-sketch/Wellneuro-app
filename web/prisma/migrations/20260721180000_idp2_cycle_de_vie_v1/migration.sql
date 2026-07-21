-- IDP2 LOT-01a — cycle de vie du dossier patient.
-- Migration confirmée explicitement par l'utilisateur le 2026-07-21.
--
-- ADDITIVE UNIQUEMENT : une colonne nullable et une table nouvelle. Aucune
-- colonne existante modifiée, aucun DROP, aucun renommage, aucun backfill.
-- Rollback = abandon de la table et de la colonne.
--
-- MERGER CETTE MIGRATION N'EFFACE RIEN. Elle crée de quoi effacer sur demande ;
-- aucun dossier n'est touché par son application. `dossiers_effaces` reste vide
-- tant qu'aucun effacement n'a été demandé.
--
-- POURQUOI `suivi_cloture_le` PLUTÔT QUE `actif`. Deux états distincts, et les
-- confondre coûterait au patient : `actif = false` coupe l'accès au portail
-- (api/portail/lien/demande traite un patient inactif comme sans destinataire
-- éligible), alors que la clôture de suivi doit CONSERVER la lecture — le
-- patient garde ses archives, seuls les envois et assignations cessent.
-- Réversible : la reprise remet la colonne à NULL.
--
-- POURQUOI UNE TABLE DE RÉSIDU. L'application promet l'effacement au patient
-- (lib/trust/contenus/registre.ts). L'exécuter supprime la ligne `patients` et
-- ses seize tables filles ; il ne subsiste que cette ligne, dont le seul objet
-- est que les comptages de l'historique clinique ne s'effondrent pas.
--
-- CE QU'ELLE NE PEUT PAS CONTENIR, par construction : aucun identifiant
-- patient, AUCUNE CLÉ ÉTRANGÈRE, aucun prénom, aucune adresse e-mail. Le
-- prénom figurait dans la décision initiale du même jour et en a été retiré :
-- sur quelques dizaines de dossiers, « prénom + trois lettres + année »
-- redevenait rapprochable d'une personne. L'e-mail n'y figure pas davantage,
-- pas même haché — une empreinte à clé reste une pseudonymisation, testable
-- contre une adresse candidate, donc encore une donnée personnelle.
--
-- Cette ligne est aussi la SEULE trace qu'un effacement a eu lieu : la demande
-- enregistrée dans `trust_rights_requests` est supprimée par son propre
-- traitement.

-- AlterTable
ALTER TABLE "patients" ADD COLUMN "suivi_cloture_le" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "dossiers_effaces" (
    "id" TEXT NOT NULL,
    "annee_naissance" INTEGER,
    "initiales_nom" TEXT NOT NULL,
    "efface_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossiers_effaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idp2_dossier_efface_date_idx" ON "dossiers_effaces"("efface_le");

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- trust_v1, les tables C2A, relecture_notes, portail_magic_links et
-- portail_demande_tentatives.
ALTER TABLE "public"."dossiers_effaces" ENABLE ROW LEVEL SECURITY;
