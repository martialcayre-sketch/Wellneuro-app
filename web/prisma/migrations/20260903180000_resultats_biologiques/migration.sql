-- Résultats biologiques réels du dossier (étage 2 du rayon, CB-09, D-122 §2).
--
-- La MESURE, par analyte seulement — pas de ratio en V1 (ils se calculent),
-- entité distincte, jamais un champ de la proposition. Hors de `tables_cb` du
-- verrou structurel (comme les autres tables patient du rayon) : le nom est
-- français, hors préfixe `biology_`.
--
-- `valeur` en numeric (exact) — V1 quantitative seulement : un résultat
-- qualitatif n'a pas de colonne, il attendra sa propre décision plutôt qu'un
-- champ libre. `unite` porte le vocabulaire d'unités PARTAGÉ du catalogue
-- (CHECK identique à `biology_analytes_unite_check`), nullable comme lui.

-- CreateTable
CREATE TABLE "resultats_biologiques" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "valeur" DECIMAL(65,30) NOT NULL,
    "unite" TEXT,
    "preleve_le" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "saisi_par" TEXT NOT NULL,
    "saisi_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultats_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — la lecture est la série d'un analyte dans un dossier
-- (estimé ↔ mesuré) : patient, puis analyte, ordonnée par date de
-- prélèvement, avec une mesure par analyte et date.
CREATE UNIQUE INDEX "cb_resultat_bio_patient_analyte_idx"
  ON "resultats_biologiques"("id_patient", "analyte_code", "preleve_le");

-- AddForeignKey — RESTRICT : la suppression nommée reste celle de la
-- transaction d'effacement IDP2 (`lib/patient/effacement.ts`), jamais une
-- cascade silencieuse.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_id_patient_fkey"
    FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — le code d'analyte pointe le pivot clinique du rayon ;
-- RESTRICT : un analyte porteur de résultats ne se supprime pas.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
--
-- `source` est bornée aux deux origines nommées par la décision D-122 §2 —
-- une provenance, pas une liste inventée.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_source_check"
    CHECK ("source" IN ('saisie_praticien', 'import_labo'));

-- `btrim` reçoit sa LISTE DE CARACTÈRES explicite : `btrim/1` ne retire que
-- l'espace ASCII, et un champ réduit à des tabulations passerait un CHECK
-- écrit sans elle (trou constaté sur les CHECK plus anciens du dépôt).
--
-- `saisi_par` est l'e-mail de session, posé côté serveur : un résultat sans
-- auteur lisible n'est pas attribuable, donc pas relisible. 320 = borne
-- technique d'une adresse e-mail (RFC 5321), aucune sémantique clinique.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_saisi_par_check"
    CHECK (btrim("saisi_par", E' \t\r\n') <> '');

ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_saisi_par_longueur_check"
    CHECK (char_length("saisi_par") <= 320);

-- Le vocabulaire d'unités PARTAGÉ (D-122 §2) : la liste du catalogue,
-- « défini une fois, appliqué trois fois » (analyte + deux tables de plages,
-- doctrine de 20260725/20260817) — QUATRE désormais. Une nouvelle unité =
-- une migration additive élargissant les quatre CHECK ensemble ; le contrat
-- `cb_resultats_biologiques_v1_negatif.sql` tient l'égalité avec le
-- catalogue. NULLABLE comme sur l'analyte : un analyte du catalogue peut être
-- sans unité, son résultat aussi — on n'en invente pas.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score'));

-- Pas de CHECK « date non future » sur `preleve_le` : Postgres refuse `now()`
-- dans un CHECK (fonction non immutable) — la borne se garde côté route
-- (D-122 §2). Aucune borne de valeur : un seuil serait inventé (DC-19/DC-20).

-- Sécurité : deny-all RLS par défaut (posture D-005). La table porte des
-- DONNÉES DE SANTÉ nominatives — les résultats biologiques du dossier.
-- L'application accède en connexion Postgres directe via Prisma ; aucun
-- accès Data API n'est requis.
ALTER TABLE "public"."resultats_biologiques" ENABLE ROW LEVEL SECURITY;
