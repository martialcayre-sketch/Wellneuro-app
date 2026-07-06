-- CreateTable
CREATE TABLE "supplement_ingredients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom_fr" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_ingredient_formes" (
    "id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_ingredient_formes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_source_references" (
    "id" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "lien_url" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_safety_alerts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message_fr" TEXT NOT NULL,
    "niveau_alerte" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_safety_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_intent_tags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "synonymes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes_internes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_intent_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_criteria" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "categorie" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "functional_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "functional_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_rules" (
    "id" TEXT NOT NULL,
    "intent_tag_id" TEXT NOT NULL,
    "type_regle" TEXT NOT NULL,
    "poids" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "condition_supplementaire" JSONB,
    "ingredient_id" TEXT NOT NULL,
    "forme_preferee_id" TEXT,
    "dose_cible_basse" DOUBLE PRECISION,
    "dose_cible_haute" DOUBLE PRECISION,
    "grade_preuve_scientifique" TEXT NOT NULL,
    "source_reference_id" TEXT NOT NULL,
    "version_regle" INTEGER NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valide_par" TEXT,
    "valide_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_functional_thresholds" (
    "id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "categorie_fonctionnelle_id" TEXT NOT NULL,
    "seuil_dose_basse" DOUBLE PRECISION,
    "seuil_dose_haute" DOUBLE PRECISION,
    "unite" TEXT NOT NULL,
    "contexte_additionnel" JSONB,
    "grade_preuve_scientifique" TEXT NOT NULL,
    "source_reference_id" TEXT NOT NULL,
    "bascule_risque" BOOLEAN NOT NULL DEFAULT false,
    "safety_alert_id" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_functional_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_review_flags" (
    "id" TEXT NOT NULL,
    "protocol_draft_id" TEXT NOT NULL,
    "type_flag" TEXT NOT NULL,
    "ingredients_concernes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "niveau_alerte" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion_action" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "justification_praticien" TEXT,
    "traite_par" TEXT,
    "traite_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocol_review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplement_ingredients_code_key" ON "supplement_ingredients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supplement_ingredient_formes_ingredient_id_code_key" ON "supplement_ingredient_formes"("ingredient_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "supplement_safety_alerts_code_key" ON "supplement_safety_alerts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_intent_tags_code_key" ON "clinical_intent_tags"("code");

-- CreateIndex
CREATE INDEX "clinical_intent_tags_categorie_idx" ON "clinical_intent_tags"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_criteria_code_key" ON "clinical_criteria"("code");

-- CreateIndex
CREATE UNIQUE INDEX "functional_categories_code_key" ON "functional_categories"("code");

-- CreateIndex
CREATE INDEX "clinical_rules_intent_tag_id_idx" ON "clinical_rules"("intent_tag_id");

-- CreateIndex
CREATE INDEX "clinical_rules_ingredient_id_idx" ON "clinical_rules"("ingredient_id");

-- CreateIndex
CREATE INDEX "ingredient_functional_thresholds_ingredient_id_categorie_fo_idx" ON "ingredient_functional_thresholds"("ingredient_id", "categorie_fonctionnelle_id");

-- CreateIndex
CREATE INDEX "protocol_review_flags_protocol_draft_id_idx" ON "protocol_review_flags"("protocol_draft_id");

-- AddForeignKey
ALTER TABLE "supplement_ingredient_formes" ADD CONSTRAINT "supplement_ingredient_formes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "supplement_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_intent_tag_id_fkey" FOREIGN KEY ("intent_tag_id") REFERENCES "clinical_intent_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "supplement_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_forme_preferee_id_fkey" FOREIGN KEY ("forme_preferee_id") REFERENCES "supplement_ingredient_formes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "supplement_source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_functional_thresholds" ADD CONSTRAINT "ingredient_functional_thresholds_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "supplement_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_functional_thresholds" ADD CONSTRAINT "ingredient_functional_thresholds_categorie_fonctionnelle_i_fkey" FOREIGN KEY ("categorie_fonctionnelle_id") REFERENCES "functional_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_functional_thresholds" ADD CONSTRAINT "ingredient_functional_thresholds_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "supplement_source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_functional_thresholds" ADD CONSTRAINT "ingredient_functional_thresholds_safety_alert_id_fkey" FOREIGN KEY ("safety_alert_id") REFERENCES "supplement_safety_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
