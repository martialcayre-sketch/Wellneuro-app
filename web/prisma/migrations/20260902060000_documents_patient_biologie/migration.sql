-- Document patient du régime documentaire biologie (décision F, CB-06, D-122).
--
-- La trace écrite de ce qui a été PROPOSÉ au patient et pourquoi — la
-- demande, JAMAIS le résultat (verrou HDS : aucune colonne de valeur, le
-- contrat `prisma/checks/cb_documents_patient_v1_negatif.sql` fige la liste
-- exacte des colonnes).
--
-- Patron `correspondances_medecin` (D-073), sans le médecin : le texte est
-- généré côté serveur depuis la table d'indications signée, et l'ancrage de
-- provenance vit en COLONNES — un SHA qu'une garde peut comparer, jamais une
-- ancre en prose. Ici `ancrage_*` sont NON NULS : ce document n'existe que
-- dérivé de la table signée, sans ancre il n'a pas de source.
-- Append-only : re-générer fait une ligne de plus, rien ne s'écrase.

-- CreateTable
CREATE TABLE "documents_patient_biologie" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "ancrage_sha256" TEXT NOT NULL,
    "ancrage_version" TEXT NOT NULL,
    "genere_par" TEXT NOT NULL,
    "genere_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_patient_biologie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — la lecture du dossier filtre sur le patient, ordonnée par
-- date de génération.
CREATE INDEX "cb_document_patient_patient_idx"
  ON "documents_patient_biologie"("id_patient", "genere_le");

-- AddForeignKey — RESTRICT : la suppression nommée reste celle de la
-- transaction d'effacement IDP2 (`lib/patient/effacement.ts`), jamais une
-- cascade silencieuse.
ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_id_patient_fkey"
    FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
--
-- `btrim` reçoit sa LISTE DE CARACTÈRES explicite : `btrim/1` ne retire que
-- l'espace ASCII, et un texte réduit à des tabulations passerait un CHECK
-- écrit sans elle (trou constaté sur les CHECK plus anciens du dépôt).
ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_texte_check"
    CHECK (btrim("texte", E' \t\r\n') <> '');

-- L'ancre est un SHA-256 hexadécimal minuscule, comparable par une garde —
-- le format est la contrainte, pas la prose.
ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_ancrage_sha256_check"
    CHECK ("ancrage_sha256" ~ '^[0-9a-f]{64}$');

ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_ancrage_version_check"
    CHECK (btrim("ancrage_version", E' \t\r\n') <> '');

-- `genere_par` est l'e-mail de session, posé côté serveur : un document sans
-- auteur lisible n'est pas attribuable, donc pas relisible. 320 = borne
-- technique d'une adresse e-mail (RFC 5321), aucune sémantique clinique.
ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_genere_par_check"
    CHECK (btrim("genere_par", E' \t\r\n') <> '');

ALTER TABLE "documents_patient_biologie"
  ADD CONSTRAINT "documents_patient_biologie_genere_par_longueur_check"
    CHECK (char_length("genere_par") <= 320);

-- Pas de CHECK « date non future » : Postgres refuse `now()` dans un CHECK
-- (fonction non immutable). `genere_le` est posé par DEFAULT côté base.

-- Sécurité : deny-all RLS par défaut (posture D-005). La table porte du
-- CONTENU nominatif — le texte remis au patient, dérivé de son dossier.
-- L'application accède en connexion Postgres directe via Prisma ; aucun
-- accès Data API n'est requis.
ALTER TABLE "public"."documents_patient_biologie" ENABLE ROW LEVEL SECURITY;
