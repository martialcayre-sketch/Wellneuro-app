-- CreateTable
CREATE TABLE "neuro_axis" (
    "id" TEXT NOT NULL,
    "axis_code" TEXT NOT NULL,
    "label_patient" TEXT NOT NULL,
    "label_praticien" TEXT NOT NULL,
    "description" TEXT,
    "besoin_niveau1" INTEGER,
    "besoin_niveau2" INTEGER,
    "niveau_preuve" TEXT NOT NULL,
    "version_mapping" TEXT NOT NULL DEFAULT 'v1',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neuro_axis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrient_axis_weight" (
    "id" TEXT NOT NULL,
    "axis_code" TEXT NOT NULL,
    "nutrient_code" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "cofacteur_group" TEXT,
    "source_ref" TEXT NOT NULL,
    "seuil_reference" TEXT,
    "version_mapping" TEXT NOT NULL DEFAULT 'v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrient_axis_weight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "neuro_axis_axis_code_key" ON "neuro_axis"("axis_code");

-- AddForeignKey
ALTER TABLE "nutrient_axis_weight" ADD CONSTRAINT "nutrient_axis_weight_axis_code_fkey" FOREIGN KEY ("axis_code") REFERENCES "neuro_axis"("axis_code") ON DELETE RESTRICT ON UPDATE CASCADE;
