-- FICHES D'ASSIETTE — LE CATALOGUE DES VERSIONS ET DES ACTES ([[D-251]], lot 3).
--
-- Migration autorisée explicitement par le responsable le 2026-09-26 (M1 des
-- deux migrations du chantier). MIGRATION SEULE ([[D-087]]) : aucun code ne
-- consomme encore ces tables. L'ingestion (lot 4) ne viendra qu'après
-- l'application constatée par conteneur.
--
-- ── POURQUOI LE TEXTE VIT EN BASE ──────────────────────────────────────────
--
-- Le dépôt est PUBLIC. Le texte d'une Fiche MY, propriété payée du responsable,
-- ne peut vivre ni dans un registre en code, ni dans une PR, ni dans un log de
-- CI. Il vit ici, en base hébergée HDS ([[D-251]] §4). Le code ne porte que
-- l'appariement assiette → fiche (des identifiants).
--
-- ── DEUX TABLES, PARCE QUE DEUX GESTES ─────────────────────────────────────
--
-- `fiches_assiette_versions` reçoit ce que l'outil hors ligne DÉPOSE : une
-- adaptation par IA, qui reste un BROUILLON. `fiches_assiette_actes` reçoit ce
-- que le responsable DÉCIDE : valider ou retirer. `DC-16` exige que les deux ne
-- partagent « jamais le même statut, jamais le même chemin » : une version ne
-- porte aucun champ d'état, et son état est son dernier acte.
--
-- ── APPEND-ONLY, FACE À L'ACCIDENT ─────────────────────────────────────────
--
-- UPDATE, DELETE et TRUNCATE sont refusés par trigger sur les deux tables : une
-- correction est une version NEUVE, un retrait est un acte NEUF. Limite
-- assumée, celle du journal des décisions de claims : le rôle propriétaire peut
-- désactiver un trigger. La preuve forte contre ce rôle reste les sauvegardes.
--
-- ── AUCUNE DONNÉE PATIENT ──────────────────────────────────────────────────
--
-- Ni identifiant, ni texte de dossier. Rien à ajouter à l'effacement d'un
-- dossier. Les remises à un patient sont l'objet de la migration M2, à part.

-- CreateTable
CREATE TABLE "fiches_assiette_versions" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "plate_code" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "contenu" JSONB NOT NULL,
    "contenu_sha256" TEXT NOT NULL,
    "texte_source" TEXT NOT NULL,
    "source_sha256" TEXT NOT NULL,
    "modele_redaction" TEXT NOT NULL,
    "modele_fidelite" TEXT NOT NULL,
    "version_consigne" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_assiette_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_assiette_actes" (
    "id" TEXT NOT NULL,
    "id_version" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "contenu_sha256" TEXT NOT NULL,
    "validateur" TEXT NOT NULL,
    "relecture_integrale" BOOLEAN NOT NULL,
    "motif" TEXT,
    "confirmation_registre" BOOLEAN NOT NULL DEFAULT false,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_assiette_actes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiches_assiette_versions_source_numero_key" ON "fiches_assiette_versions"("source_id", "numero");

-- CreateIndex
CREATE INDEX "fiches_assiette_actes_version_le_idx" ON "fiches_assiette_actes"("id_version", "le");

-- AddForeignKey
-- ON DELETE RESTRICT : un acte ne survit pas à sa version, et une version qui
-- porte un acte ne disparaît pas. Le trigger append-only refuse de toute façon
-- le DELETE ; la contrainte le dit aussi au schéma.
ALTER TABLE "fiches_assiette_actes" ADD CONSTRAINT "fiches_assiette_actes_id_version_fkey" FOREIGN KEY ("id_version") REFERENCES "fiches_assiette_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument, qui ne
-- retire que l'espace ASCII et laisse passer une ligne de tabulations.

ALTER TABLE "fiches_assiette_versions"
  ADD CONSTRAINT "fiches_assiette_versions_source_format" CHECK ("source_id" ~ '^WN-SRC-[0-9]{4}$'),
  ADD CONSTRAINT "fiches_assiette_versions_plate_format" CHECK ("plate_code" ~ '^ASSIETTE_[A-Z0-9_]+$'),
  ADD CONSTRAINT "fiches_assiette_versions_numero_positif" CHECK ("numero" >= 1),
  ADD CONSTRAINT "fiches_assiette_versions_contenu_objet" CHECK (jsonb_typeof("contenu") = 'object'),
  ADD CONSTRAINT "fiches_assiette_versions_contenu_sha256_format" CHECK ("contenu_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_assiette_versions_source_sha256_format" CHECK ("source_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_assiette_versions_texte_source_non_vide" CHECK ("texte_source" ~ '\S'),
  ADD CONSTRAINT "fiches_assiette_versions_modele_redaction_non_vide" CHECK ("modele_redaction" ~ '\S'),
  ADD CONSTRAINT "fiches_assiette_versions_modele_fidelite_non_vide" CHECK ("modele_fidelite" ~ '\S'),
  ADD CONSTRAINT "fiches_assiette_versions_version_consigne_non_vide" CHECK ("version_consigne" ~ '\S');

ALTER TABLE "fiches_assiette_actes"
  ADD CONSTRAINT "fiches_assiette_actes_acte_ferme" CHECK ("acte" IN ('validee', 'retiree')),
  ADD CONSTRAINT "fiches_assiette_actes_contenu_sha256_format" CHECK ("contenu_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_assiette_actes_validateur_non_vide" CHECK ("validateur" ~ '\S'),
  -- VALIDER, C'EST DÉCLARER AVOIR TOUT LU ([[D-195]] §1, [[D-227]] §8) : pas de
  -- voie rapide, pas d'échantillonnage.
  ADD CONSTRAINT "fiches_assiette_actes_validation_relue" CHECK ("acte" <> 'validee' OR "relecture_integrale"),
  -- UN RETRAIT DIT POURQUOI : rien ne disparaît en silence ([[D-251]] §7).
  ADD CONSTRAINT "fiches_assiette_actes_retrait_motive" CHECK ("acte" <> 'retiree' OR ("motif" IS NOT NULL AND "motif" ~ '\S'));

-- ── APPEND-ONLY ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fiches_assiette_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% est append-only (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER fiches_assiette_versions_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_assiette_versions
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_append_only();

CREATE TRIGGER fiches_assiette_versions_no_truncate
  BEFORE TRUNCATE ON public.fiches_assiette_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_assiette_append_only();

CREATE TRIGGER fiches_assiette_actes_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_assiette_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_append_only();

CREATE TRIGGER fiches_assiette_actes_no_truncate
  BEFORE TRUNCATE ON public.fiches_assiette_actes
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_assiette_append_only();

-- ── COHÉRENCE AU MOMENT DE L'INSERTION ─────────────────────────────────────
--
-- Les CHECK ne lisent ni d'autres lignes ni d'autres tables :
--  1. les instants sont posés par la base — une version ou un acte antidatable
--     n'est pas une preuve ;
--  2. une version prend le numéro qui SUIT le dernier de sa fiche, sans trou :
--     l'histoire d'une fiche se relit d'un seul tenant ;
--  3. un acte porte sur le texte EXACT de sa version : l'empreinte recopiée
--     doit être la sienne. Sans cela, on validerait un texte et on en
--     servirait un autre.

CREATE OR REPLACE FUNCTION public.fiches_assiette_versions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  attendu integer;
BEGIN
  NEW.cree_le := now();
  SELECT COALESCE(max(v.numero), 0) + 1 INTO attendu
  FROM public.fiches_assiette_versions v
  WHERE v.source_id = NEW.source_id;
  IF NEW.numero <> attendu THEN
    RAISE EXCEPTION 'version % de % refusée : le numéro attendu est %.', NEW.numero, NEW.source_id, attendu;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_assiette_versions_avant_insertion
  BEFORE INSERT ON public.fiches_assiette_versions
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_versions_avant_insertion();

CREATE OR REPLACE FUNCTION public.fiches_assiette_actes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  empreinte text;
BEGIN
  NEW.le := now();
  SELECT v.contenu_sha256 INTO empreinte
  FROM public.fiches_assiette_versions v
  WHERE v.id = NEW.id_version;
  IF empreinte IS DISTINCT FROM NEW.contenu_sha256 THEN
    RAISE EXCEPTION 'acte refusé : l''empreinte recopiée ne correspond pas au texte de la version %.', NEW.id_version;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_assiette_actes_avant_insertion
  BEFORE INSERT ON public.fiches_assiette_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_actes_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.fiches_assiette_append_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_assiette_versions_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_assiette_actes_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_append_only() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_versions_avant_insertion() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_actes_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_append_only() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_versions_avant_insertion() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_actes_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."fiches_assiette_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fiches_assiette_actes" ENABLE ROW LEVEL SECURITY;

-- ROLLBACK (manuel, si jamais) : DROP TABLE "fiches_assiette_actes";
-- DROP TABLE "fiches_assiette_versions"; puis DROP FUNCTION des trois
-- fonctions ci-dessus. Aucune donnée patient n'y vit.
