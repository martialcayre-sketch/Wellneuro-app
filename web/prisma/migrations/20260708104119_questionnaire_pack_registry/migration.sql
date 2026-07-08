-- CreateTable
CREATE TABLE "questionnaire_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "description" TEXT,
    "ordre_affichage" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie_principale_id" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "public_cible" TEXT NOT NULL,
    "version_patient" BOOLEAN NOT NULL DEFAULT true,
    "version_pro" BOOLEAN NOT NULL DEFAULT true,
    "source_md_path" TEXT,
    "conversion_json" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_secondary_categories" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "categorie_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_secondary_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_packs" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "niveau" TEXT NOT NULL,
    "usage_clinique" TEXT,
    "ordre_affichage" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_questionnaires" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "condition_affichage" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_triggers" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "trigger_key" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value_json" JSONB,
    "value_text" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_categories_code_key" ON "questionnaire_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_questionnaire_id_key" ON "questionnaires"("questionnaire_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_slug_key" ON "questionnaires"("slug");

-- CreateIndex
CREATE INDEX "questionnaires_questionnaire_id_idx" ON "questionnaires"("questionnaire_id");

-- CreateIndex
CREATE INDEX "questionnaires_categorie_principale_id_idx" ON "questionnaires"("categorie_principale_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_secondary_categories_questionnaire_id_categorie_id_key" ON "questionnaire_secondary_categories"("questionnaire_id", "categorie_id");

-- CreateIndex
CREATE INDEX "questionnaire_secondary_categories_categorie_id_idx" ON "questionnaire_secondary_categories"("categorie_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_packs_pack_id_key" ON "questionnaire_packs"("pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "pack_questionnaires_pack_id_questionnaire_id_key" ON "pack_questionnaires"("pack_id", "questionnaire_id");

-- CreateIndex
CREATE INDEX "pack_questionnaires_questionnaire_id_idx" ON "pack_questionnaires"("questionnaire_id");

-- CreateIndex
CREATE INDEX "pack_triggers_pack_id_idx" ON "pack_triggers"("pack_id");

-- CreateIndex
CREATE INDEX "pack_triggers_trigger_type_trigger_key_idx" ON "pack_triggers"("trigger_type", "trigger_key");

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_categorie_principale_id_fkey" FOREIGN KEY ("categorie_principale_id") REFERENCES "questionnaire_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_secondary_categories" ADD CONSTRAINT "questionnaire_secondary_categories_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_secondary_categories" ADD CONSTRAINT "questionnaire_secondary_categories_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "questionnaire_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_questionnaires" ADD CONSTRAINT "pack_questionnaires_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "questionnaire_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_questionnaires" ADD CONSTRAINT "pack_questionnaires_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_triggers" ADD CONSTRAINT "pack_triggers_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "questionnaire_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut, cohérent avec les migrations précédentes.
ALTER TABLE "public"."questionnaire_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questionnaires" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questionnaire_secondary_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questionnaire_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pack_questionnaires" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pack_triggers" ENABLE ROW LEVEL SECURITY;
