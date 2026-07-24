-- Catalogue de produits commerciaux C4A (campagne C4 « Compléments clean
-- label », LOT-01). Décision praticien du 2026-07-24 : catalogue
-- DGCCRF/Compl'Alim complet, importé en brouillons, vérification praticien
-- pour activation.
--
-- ADDITIVE UNIQUEMENT : trois tables nouvelles, aucune table existante
-- modifiée, aucun DROP, aucun renommage, aucun backfill — l'absence de ligne
-- signifie « aucun produit au catalogue », état actuel. Rollback = abandon
-- des trois tables.
--
-- CE QUE CES TABLES NE DÉCLENCHENT PAS : aucun lien clinique automatique.
-- Le pivot clinique reste supplement_ingredients : les règles
-- (clinical_rules), seuils (ingredient_functional_thresholds) et alertes
-- (supplement_safety_alerts) ne référencent jamais un produit. Une source
-- externe (import Compl'Alim) ne peut créer que des fiches en statut
-- 'importee' ; le passage à 'verifiee' est un geste praticien signé
-- (verifie_par + verifie_le obligatoires, CHECK fiche_verifiee_signee).
-- Append-only garanti par l'application (l'import ne fait jamais d'UPDATE de
-- composition) ; la base ne l'interdit pas — même posture que
-- clinical_rules.version_regle.

-- CreateTable
CREATE TABLE "supplement_products" (
    "id" TEXT NOT NULL,
    "nom_commercial" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "marche" TEXT NOT NULL DEFAULT 'FR',
    "version_formulation" INTEGER NOT NULL DEFAULT 1,
    "source_provenance" TEXT NOT NULL,
    "source_identifiant" TEXT NOT NULL,
    "source_url" TEXT,
    "date_derniere_verification" TIMESTAMP(3),
    "statut_fiche" TEXT NOT NULL DEFAULT 'importee',
    "niveau_completude" TEXT NOT NULL,
    "contenu_sha256" TEXT,
    "donnees_manquantes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incertitudes" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifie_par" TEXT,
    "verifie_le" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplement_products_statut_fiche_check"
        CHECK ("statut_fiche" IN ('importee', 'verifiee', 'inactive')),
    CONSTRAINT "supplement_products_niveau_completude_check"
        CHECK ("niveau_completude" IN ('bien_documentee', 'partielle', 'lacunaire')),
    -- R-5 : provenance à vocabulaire fermé (idempotence de l'import). Une
    -- nouvelle source = une migration additive élargissant ce CHECK.
    CONSTRAINT "supplement_products_source_provenance_check"
        CHECK ("source_provenance" IN ('complalim', 'dgccrf', 'saisie_praticien')),
    -- R-1 : empreinte de formulation (idempotence des ré-imports), même format
    -- que content_sha256 des claims corpus.
    CONSTRAINT "supplement_products_contenu_sha256_check"
        CHECK ("contenu_sha256" IS NULL OR "contenu_sha256" ~ '^[a-f0-9]{64}$'),
    -- Une fiche vérifiée porte obligatoirement signataire et date (même motif
    -- que valide_signe sur rag_corpus_claims).
    CONSTRAINT "supplement_products_fiche_verifiee_signee_check"
        CHECK ("statut_fiche" <> 'verifiee'
               OR ("verifie_par" IS NOT NULL AND "verifie_le" IS NOT NULL))
);

-- CreateTable
CREATE TABLE "supplement_product_compositions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "forme_id" TEXT,
    "dose_par_portion" DOUBLE PRECISION,
    "unite" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_product_compositions_pkey" PRIMARY KEY ("id"),
    -- Une dose renseignée porte son unité (et réciproquement) : jamais un
    -- nombre nu ni une unité orpheline.
    CONSTRAINT "supplement_product_compositions_dose_unite_check"
        CHECK (("dose_par_portion" IS NULL) = ("unite" IS NULL)),
    -- R-4 : vocabulaire d'unités canonique — la sentinelle de cumul compare des
    -- doses entre produits, des unités hétérogènes rendraient tout rapprochement
    -- faux. Unité non mappable à l'import → dose NULL + entrée donnees_manquantes.
    CONSTRAINT "supplement_product_compositions_unite_check"
        CHECK ("unite" IS NULL OR "unite" IN ('µg', 'mg', 'g', 'mL', 'UI'))
);

-- CreateTable — pointeur « version courante » (R-2) : désigne LA formulation
-- courante d'un produit source, par unicité native, sans index partiel.
-- L'import déplace le pointeur dans la même transaction que l'insertion d'une
-- nouvelle version ; catalogue et sentinelle ne lisent que via ce pointeur.
CREATE TABLE "supplement_product_versions_courantes" (
    "id" TEXT NOT NULL,
    "source_provenance" TEXT NOT NULL,
    "source_identifiant" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_product_versions_courantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplement_products_source_version_key"
    ON "supplement_products"("source_provenance", "source_identifiant", "version_formulation");

-- CreateIndex
CREATE INDEX "supplement_products_marque_nom_idx"
    ON "supplement_products"("marque", "nom_commercial");

-- CreateIndex
CREATE INDEX "supplement_products_statut_idx"
    ON "supplement_products"("statut_fiche", "actif");

-- CreateIndex — l'unicité (produit, ingrédient, forme) tolère les doublons à
-- forme NULL (sémantique Postgres) ; l'index partiel ci-dessous ferme ce trou.
CREATE UNIQUE INDEX "supplement_product_compositions_produit_ingredient_forme_key"
    ON "supplement_product_compositions"("product_id", "ingredient_id", "forme_id");

CREATE UNIQUE INDEX "supplement_product_compositions_produit_ingredient_sans_forme"
    ON "supplement_product_compositions"("product_id", "ingredient_id")
    WHERE "forme_id" IS NULL;

-- CreateIndex
CREATE INDEX "supplement_product_compositions_ingredient_idx"
    ON "supplement_product_compositions"("ingredient_id");

-- CreateIndex — unicité du pointeur : un produit source n'a qu'une version
-- courante, une version n'est courante que d'un produit source.
CREATE UNIQUE INDEX "supplement_product_versions_courantes_source_key"
    ON "supplement_product_versions_courantes"("source_provenance", "source_identifiant");

CREATE UNIQUE INDEX "supplement_product_versions_courantes_product_id_key"
    ON "supplement_product_versions_courantes"("product_id");

-- AddForeignKey
ALTER TABLE "supplement_product_versions_courantes"
    ADD CONSTRAINT "supplement_product_versions_courantes_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "supplement_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "supplement_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_ingredient_id_fkey"
    FOREIGN KEY ("ingredient_id") REFERENCES "supplement_ingredients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — RESTRICT et non SET NULL (écart assumé avec
-- clinical_rules.forme_preferee_id, R-7) : dans une composition de catalogue,
-- perdre la forme falsifierait la fiche d'un produit réel. On protège
-- l'intégrité du catalogue.
ALTER TABLE "supplement_product_compositions"
    ADD CONSTRAINT "supplement_product_compositions_forme_id_fkey"
    FOREIGN KEY ("forme_id") REFERENCES "supplement_ingredient_formes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app
-- accède via Prisma en connexion Postgres directe qui contourne RLS),
-- cohérent avec cabinet_instruments et les tables du moteur d'intention.
ALTER TABLE "public"."supplement_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_product_compositions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_product_versions_courantes" ENABLE ROW LEVEL SECURITY;
