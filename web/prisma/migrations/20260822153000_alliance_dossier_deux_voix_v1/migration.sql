-- Alliance 6.0-A LOT-01 — le dossier à deux voix (cinq tables événement).
-- Migration confirmée explicitement par le responsable le 2026-08-22 (plan
-- approuvé en session ; gate humain = revue + go explicite avant merge).
--
-- ADDITIVE UNIQUEMENT : cinq tables nouvelles, aucune table existante
-- modifiée, aucun DROP, aucun renommage, aucun backfill — l'absence de ligne
-- signifie « rien n'a encore été négocié/déposé/rédigé », ce qui est l'état
-- actuel de tous les dossiers. Rollback = abandon des tables ; rien
-- d'existant n'en dépend.
--
-- DEUX DATES, jamais confondues (patron relecture_notes) : les dates
-- d'événement (`negocie_le`, `saisi_le`, `redigee_le`, `exprime_le`,
-- `geste_le`, `publiee_le`, `non_traite_depuis_le`) sont des DONNÉES,
-- nullables ; `cree_le` est le moment de l'écriture, posé par la base
-- (DEFAULT CURRENT_TIMESTAMP), jamais par l'appelant — inantidatable.
--
-- APPEND-ONLY PAR CONVENTION (patron supersedes_note_id) : aucune route
-- d'update ; les références de version (`supersedes_*`, `id_synthese`,
-- `id_objectif`) sont SOUPLES, sans FK — existence et appartenance vérifiées
-- aux routes des lots 02/03/04/06.
--
-- AUCUNE COLONNE DE SCORE, SEUIL OU BANDE : l'interdit de forme est tenu par
-- la liste blanche de colonnes du contrat
-- `prisma/checks/alli_dossier_deux_voix_v1_negatif.sql`.

-- CreateTable — l'objectif négocié (énoncé, reformulation, priorité libellé
-- libre, « non traité pour l'instant » daté ; révision = nouvelle ligne).
CREATE TABLE "objectifs_negocies" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "enonce_patient" TEXT NOT NULL,
    "reformulation_praticien" TEXT,
    "priorite" TEXT,
    "non_traite_motif" TEXT,
    "non_traite_depuis_le" TIMESTAMP(3),
    "supersedes_objectif_id" TEXT,
    "negocie_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objectifs_negocies_pkey" PRIMARY KEY ("id")
);

-- CreateTable — « ce qui compte pour moi aujourd'hui » (parole de patient,
-- conservée ; pas de praticien_email).
CREATE TABLE "ce_qui_compte_entrees" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "saisi_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ce_qui_compte_entrees_pkey" PRIMARY KEY ("id")
);

-- CreateTable — « ce que j'ai compris de vous » (lignes immuables : publier
-- un brouillon = nouvelle ligne avec publiee_le posée à l'INSERT).
CREATE TABLE "syntheses_comprehension" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "redigee_le" TIMESTAMP(3),
    "publiee_le" TIMESTAMP(3),
    "supersedes_synthese_id" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "syntheses_comprehension_pkey" PRIMARY KEY ("id")
);

-- CreateTable — le désaccord structuré (« ce n'est pas exactement ça ») sur
-- UNE version précise de synthèse ; id_synthese NOT NULL mais souple.
CREATE TABLE "desaccords_comprehension" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_synthese" TEXT NOT NULL,
    "texte" TEXT,
    "exprime_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desaccords_comprehension_pkey" PRIMARY KEY ("id")
);

-- CreateTable — la ratification d'une version précise d'objectif ; un
-- changement d'avis est une nouvelle ligne, jamais un retrait.
CREATE TABLE "ratifications_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_objectif" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "geste_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratifications_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- par table.
CREATE INDEX "alli_objectif_negocie_patient_idx" ON "objectifs_negocies"("id_patient", "cree_le");
CREATE INDEX "alli_ce_qui_compte_patient_idx" ON "ce_qui_compte_entrees"("id_patient", "cree_le");
CREATE INDEX "alli_synthese_comprehension_patient_idx" ON "syntheses_comprehension"("id_patient", "cree_le");
CREATE INDEX "alli_desaccord_patient_idx" ON "desaccords_comprehension"("id_patient", "cree_le");
CREATE INDEX "alli_ratification_patient_idx" ON "ratifications_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est
-- un geste NOMMÉ (`effacerDossier`, garde de complétude d'effacement.test.ts),
-- pas un effet de bord de FK. Une FK en CASCADE rendrait ce code mort en
-- silence (contrat : volet FK du fichier alli_..._negatif.sql).
ALTER TABLE "objectifs_negocies" ADD CONSTRAINT "objectifs_negocies_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ce_qui_compte_entrees" ADD CONSTRAINT "ce_qui_compte_entrees_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "syntheses_comprehension" ADD CONSTRAINT "syntheses_comprehension_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "desaccords_comprehension" ADD CONSTRAINT "desaccords_comprehension_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ratifications_objectif" ADD CONSTRAINT "ratifications_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
--
-- L'e-mail praticien est l'e-mail de session, posé côté serveur : un écrit
-- sans auteur lisible n'est pas attribuable, donc pas relisible. 320 est la
-- longueur maximale d'une adresse e-mail (RFC 5321) — borne PUREMENT
-- TECHNIQUE, aucune sémantique clinique.
ALTER TABLE "objectifs_negocies"
  ADD CONSTRAINT "objectifs_negocies_praticien_email_check"
    CHECK (btrim("praticien_email") <> '' AND char_length("praticien_email") <= 320);
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "syntheses_comprehension_praticien_email_check"
    CHECK (btrim("praticien_email") <> '' AND char_length("praticien_email") <= 320);

-- Les textes porteurs ne sont pas des chaînes vides : un énoncé vide n'est
-- pas un énoncé, une synthèse vide n'est pas une synthèse. (`texte` du
-- désaccord reste nullable ET libre : le geste « ce n'est pas exactement ça »
-- vaut sans mot ; `ce_qui_compte` non vide — un dépôt vide est un silence,
-- il ne s'enregistre pas, DC-24.)
ALTER TABLE "objectifs_negocies"
  ADD CONSTRAINT "objectifs_negocies_enonce_check"
    CHECK (btrim("enonce_patient") <> '');
ALTER TABLE "ce_qui_compte_entrees"
  ADD CONSTRAINT "ce_qui_compte_entrees_texte_check"
    CHECK (btrim("texte") <> '');
ALTER TABLE "syntheses_comprehension"
  ADD CONSTRAINT "syntheses_comprehension_texte_check"
    CHECK (btrim("texte") <> '');

-- `sens` : taxonomie de GESTE (deux valeurs), aucune sémantique clinique.
ALTER TABLE "ratifications_objectif"
  ADD CONSTRAINT "ratifications_objectif_sens_check"
    CHECK ("sens" IN ('ratifie', 'conteste'));

-- Pas de CHECK « date non future » : Postgres refuse `now()` dans un CHECK
-- (fonction non immutable). Cette borne se garde côté route (lots 02/03/04),
-- dette nommée aux fichiers de lot.

-- Sécurité : deny-all RLS par défaut — défense en profondeur (posture D-005),
-- cohérente avec toutes les tables patient du schéma, et assertée par le
-- contrat alli_..._negatif.sql. Depuis le cutover Scalingo (2026-08-22),
-- aucune API de données managée n'expose `public` — la RLS ne garde plus un
-- chemin PostgREST, elle garde l'uniformité de la posture : toute connexion
-- non-Prisma future trouve des tables fermées. Ces cinq tables portent la
-- parole du patient et la compréhension du praticien — le contenu le plus
-- nominatif du dossier.
ALTER TABLE "public"."objectifs_negocies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ce_qui_compte_entrees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."syntheses_comprehension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."desaccords_comprehension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ratifications_objectif" ENABLE ROW LEVEL SECURITY;
