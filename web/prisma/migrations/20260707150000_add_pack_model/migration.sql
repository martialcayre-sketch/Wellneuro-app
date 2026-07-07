-- CreateTable
CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "id_pack" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "thematique" TEXT,
    "description" TEXT,
    "qids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packs_id_pack_key" ON "packs"("id_pack");

-- Sécurité : deny-all RLS par défaut, cohérent avec la migration
-- enable_rls_security (aucune policy volontairement ; l'app accède via Prisma
-- en connexion Postgres directe qui contourne RLS).
ALTER TABLE "public"."packs" ENABLE ROW LEVEL SECURITY;
