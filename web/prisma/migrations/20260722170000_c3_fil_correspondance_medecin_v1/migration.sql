-- C3 LOT-06 — fil de correspondance médecin V1 (transcription praticien, FM-1).
-- Gate migration confirmé explicitement par l'utilisateur le 2026-07-22
-- (plan approuvé en session, arbitrages FM-1/FM-2 du cadrage C3).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucune suppression de ligne. Aucun backfill :
-- l'absence de ligne signifie « aucune correspondance consignée », ce qui est
-- l'état actuel. Rollback = abandon de la table ; rien d'existant n'en dépend.
--
-- MINIMISATION (données d'un tiers) : le médecin n'est désigné que par
-- `medecin_libelle`, libellé libre — ni adresse e-mail, ni RPPS, ni compte.
-- Texte seul par construction : aucun champ fichier (hors HDS par périmètre
-- de programme — le fil transporte des échanges, jamais de pièce biologique).
--
-- `echange_le` est une DONNÉE (la date de l'échange réel, telle que
-- transcrite, facultative) ; `consigne_le` est le moment de l'écriture, posé
-- par la base (DEFAULT CURRENT_TIMESTAMP), jamais par l'appelant. Une
-- consignation est inantidatable.
--
-- CONSERVATION ALIGNÉE DOSSIER (FM-2) : l'effacement du dossier efface cette
-- table nommément (`effacerDossier`, garde structurelle dans
-- `effacement.test.ts`) ; la clôture de suivi ferme la consignation par la
-- route, pas ici.

-- CreateTable
CREATE TABLE "correspondances_medecin" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "medecin_libelle" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "id_synthese" TEXT,
    "echange_le" TIMESTAMP(3),
    "consigne_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correspondances_medecin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "c3_correspondance_medecin_patient_idx" ON "correspondances_medecin"("id_patient", "consigne_le");

-- AddForeignKey
ALTER TABLE "correspondances_medecin" ADD CONSTRAINT "correspondances_medecin_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app accède
-- via Prisma en connexion Postgres directe qui contourne RLS), cohérent avec
-- relecture_notes, trust_v1, c2a_persistance_v1 et c2a_diffusion_v1.
ALTER TABLE "public"."correspondances_medecin" ENABLE ROW LEVEL SECURITY;
