-- COMPOSITION SIGNÉE DES ANALYSES GROUPÉES ET DES VALEURS CALCULÉES
-- (F80, D-323 §1).
--
-- Migration demandée explicitement par le responsable (plan du lot F80
-- approuvé le 2026-10-18, « PR 1 — migration seule »). MIGRATION SEULE
-- ([[D-087]], [[D-266]] §11) : aucun code n'écrit ni ne lit encore ces
-- tables. La liste préparée, la signature et l'affichage viennent dans la
-- PR 2, après l'application CONSTATÉE par conteneur ; la proposition, le
-- courrier et le document patient dans la PR 3.
--
-- ── CE QUE LA MIGRATION POSE ───────────────────────────────────────────────
--
-- Un analyte de groupe (NFS, ionogrammes, profil lipidique, bilan hépatique)
-- ou une valeur calculée (HOMA, non-HDL, DFG, zinc/cuivre) dit DE QUELS
-- ANALYTES il est fait. Jamais une formule ni une constante : l'application
-- ne calcule rien, la valeur se lit sur le compte rendu (D-323 §1).
-- `biology_ratios` (deux opérandes, une constante) est écarté : ni le DFG
-- (âge, sexe), ni les soustractions, et une constante y serait un nombre
-- clinique sans provenance.
--
-- ── SIGNÉE, EN AJOUT SEUL ──────────────────────────────────────────────────
--
-- Une composition n'existe pas en base avant sa signature : la liste
-- préparée vit dans le code, comme les candidats NABM (M-3b). Elle se signe
-- EN UNE FOIS — l'en-tête et ses éléments dans la même transaction —, ne se
-- modifie pas en place, et se retire par un acte daté (`retiree_par`,
-- `retiree_le`), posé une seule fois. Une nouvelle signature après retrait
-- crée une composition neuve : l'historique reste lisible. Au plus une
-- composition active par analyte (index partiel, SQL seul).
--
-- AUCUNE REPRISE : aucune composition ne s'écrit par migration.
--
-- ── DATES POSÉES PAR LA BASE ───────────────────────────────────────────────
--
-- `verifie_le` et `retiree_le` sont posés par trigger en
-- `clock_timestamp() AT TIME ZONE 'UTC'` : `@default(now())` de Prisma 7
-- s'écrit côté client.

-- ═══ LES TABLES (forme de Prisma, parité de schéma) ═════════════════════════

-- CreateTable
CREATE TABLE "biology_analyte_compositions" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "verifie_par" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiree_par" TEXT,
    "retiree_le" TIMESTAMP(3),
    "transaction_id" BIGINT NOT NULL DEFAULT txid_current(),

    CONSTRAINT "biology_analyte_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biology_analyte_composition_items" (
    "id" TEXT NOT NULL,
    "composition_id" TEXT NOT NULL,
    "composant_code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "biology_analyte_composition_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biology_analyte_compositions_analyte_idx" ON "biology_analyte_compositions"("analyte_code");

-- CreateIndex
CREATE UNIQUE INDEX "biology_analyte_composition_items_composant_key" ON "biology_analyte_composition_items"("composition_id", "composant_code");

-- CreateIndex
CREATE UNIQUE INDEX "biology_analyte_composition_items_position_key" ON "biology_analyte_composition_items"("composition_id", "position");

-- CreateIndex
CREATE INDEX "biology_analyte_composition_items_composant_idx" ON "biology_analyte_composition_items"("composant_code");

-- AddForeignKey
ALTER TABLE "biology_analyte_compositions" ADD CONSTRAINT "biology_analyte_compositions_analyte_code_fkey" FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biology_analyte_composition_items" ADD CONSTRAINT "biology_analyte_composition_items_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "biology_analyte_compositions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biology_analyte_composition_items" ADD CONSTRAINT "biology_analyte_composition_items_composant_code_fkey" FOREIGN KEY ("composant_code") REFERENCES "biology_analytes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── SQL SEUL : au plus une composition active par analyte ──────────────────
CREATE UNIQUE INDEX "biology_analyte_compositions_une_active"
    ON "biology_analyte_compositions"("analyte_code")
    WHERE "retiree_le" IS NULL;

-- ── LES CHECK ──────────────────────────────────────────────────────────────

ALTER TABLE "biology_analyte_compositions"
  ADD CONSTRAINT "biology_analyte_compositions_type_check"
    CHECK ("type" IN ('groupe', 'calcul', 'regroupement')),
  ADD CONSTRAINT "biology_analyte_compositions_verifie_par_non_vide"
    CHECK ("verifie_par" ~ '\S' AND char_length("verifie_par") <= 320),
  ADD CONSTRAINT "biology_analyte_compositions_retrait_forme"
    CHECK (("retiree_par" IS NULL) = ("retiree_le" IS NULL)),
  ADD CONSTRAINT "biology_analyte_compositions_retiree_par_non_vide"
    CHECK ("retiree_par" ~ '\S' AND char_length("retiree_par") <= 320);

ALTER TABLE "biology_analyte_composition_items"
  ADD CONSTRAINT "biology_analyte_composition_items_position_check"
    CHECK ("position" >= 0);

-- ═══ L'EN-TÊTE ══════════════════════════════════════════════════════════════

-- À l'insertion : signée maintenant, jamais retirée d'emblée.
CREATE OR REPLACE FUNCTION public.biology_analyte_compositions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.retiree_par IS NOT NULL OR NEW.retiree_le IS NOT NULL THEN
    RAISE EXCEPTION 'biology_analyte_compositions : une composition ne naît pas retirée.';
  END IF;
  NEW.verifie_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.transaction_id := txid_current();
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_compositions_avant_insertion
  BEFORE INSERT ON public.biology_analyte_compositions
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_avant_insertion();

-- Mise à jour : le seul geste admis est le retrait, une fois.
CREATE OR REPLACE FUNCTION public.biology_analyte_compositions_avant_maj()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.retiree_le IS NOT NULL THEN
    RAISE EXCEPTION 'biology_analyte_compositions : une composition retirée est figée.';
  END IF;
  IF (NEW.id, NEW.analyte_code, NEW.type, NEW.verifie_par, NEW.verifie_le, NEW.transaction_id)
     IS DISTINCT FROM (OLD.id, OLD.analyte_code, OLD.type, OLD.verifie_par, OLD.verifie_le, OLD.transaction_id) THEN
    RAISE EXCEPTION 'biology_analyte_compositions : une composition signée ne se modifie pas (retrait puis nouvelle signature).';
  END IF;
  IF NEW.retiree_par IS NULL THEN
    RAISE EXCEPTION 'biology_analyte_compositions : seul le retrait, signé, est admis.';
  END IF;
  NEW.retiree_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_compositions_avant_maj
  BEFORE UPDATE ON public.biology_analyte_compositions
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_avant_maj();

CREATE OR REPLACE FUNCTION public.biology_analyte_compositions_fige()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : la composition est en ajout seul (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER biology_analyte_compositions_no_delete
  BEFORE DELETE ON public.biology_analyte_compositions
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_fige();

CREATE TRIGGER biology_analyte_compositions_no_truncate
  BEFORE TRUNCATE ON public.biology_analyte_compositions
  FOR EACH STATEMENT EXECUTE FUNCTION public.biology_analyte_compositions_fige();

-- Au COMMIT : une composition a au moins un élément.
CREATE OR REPLACE FUNCTION public.biology_analyte_compositions_exige_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.biology_analyte_composition_items i
    WHERE i.composition_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'biology_analyte_compositions : la composition de % n''a aucun élément.', NEW.analyte_code;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER biology_analyte_compositions_exige_items
  AFTER INSERT ON public.biology_analyte_compositions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_exige_items();

-- ═══ LES ÉLÉMENTS ═══════════════════════════════════════════════════════════

-- À l'insertion : dans la transaction de la signature, jamais l'analyte
-- composé lui-même, jamais sous une composition retirée.
CREATE OR REPLACE FUNCTION public.biology_analyte_composition_items_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.biology_analyte_compositions%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.biology_analyte_compositions WHERE id = NEW.composition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'biology_analyte_composition_items : composition % introuvable.', NEW.composition_id;
  END IF;
  IF c.transaction_id <> txid_current() THEN
    RAISE EXCEPTION 'biology_analyte_composition_items : les éléments s''écrivent avec la signature, jamais après.';
  END IF;
  IF c.retiree_le IS NOT NULL THEN
    RAISE EXCEPTION 'biology_analyte_composition_items : composition retirée.';
  END IF;
  IF NEW.composant_code = c.analyte_code THEN
    RAISE EXCEPTION 'biology_analyte_composition_items : % ne se compose pas de lui-même.', c.analyte_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_composition_items_avant_insertion
  BEFORE INSERT ON public.biology_analyte_composition_items
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_composition_items_avant_insertion();

CREATE TRIGGER biology_analyte_composition_items_no_update
  BEFORE UPDATE ON public.biology_analyte_composition_items
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_fige();

CREATE TRIGGER biology_analyte_composition_items_no_delete
  BEFORE DELETE ON public.biology_analyte_composition_items
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_compositions_fige();

CREATE TRIGGER biology_analyte_composition_items_no_truncate
  BEFORE TRUNCATE ON public.biology_analyte_composition_items
  FOR EACH STATEMENT EXECUTE FUNCTION public.biology_analyte_compositions_fige();

-- ═══ RLS (aucune politique : le client applicatif est propriétaire) ═════════

ALTER TABLE "public"."biology_analyte_compositions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_analyte_composition_items" ENABLE ROW LEVEL SECURITY;
