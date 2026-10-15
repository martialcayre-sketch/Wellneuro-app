-- FICHES D'USAGE — LE TEXTE ET LE VOCABULAIRE, EN BASE, VALIDÉS PAR ACTE ([[D-314]], BP-12a).
--
-- Migration autorisée explicitement par le responsable le 2026-10-15 (D-314,
-- amendée le 2026-10-16, §8 : quatre tables neuves, aucune table existante
-- modifiée). MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code ne
-- consomme encore ces tables. La structure signée, l'ingestion et l'écran de
-- validation viennent dans la seconde PR du lot, après l'application constatée
-- par conteneur.
--
-- ── POURQUOI LE TEXTE VIT EN BASE ──────────────────────────────────────────
--
-- Le dépôt est PUBLIC. La STRUCTURE d'une fiche d'usage est au dépôt, faite
-- d'identifiants (`lib/fiches-usage/` : `FU_…`, `HYP_…`, `POP_…`) ; son TEXTE
-- et les libellés de son vocabulaire vivent ici, en base hébergée HDS
-- ([[D-251]] §4, étendu par D-314 §3). Le patron est celui des fiches
-- d'assiette (`20260926150000_fiches_assiette_catalogue_v1`), avec les écarts
-- arbitrés ci-dessous.
--
-- ── QUATRE TABLES, DEUX PAIRES ─────────────────────────────────────────────
--
-- `fiches_usage_versions` / `fiches_usage_actes` : le texte d'une fiche, et
-- les actes du responsable sur ses rubriques. `fiches_usage_libelles` /
-- `fiches_usage_libelles_actes` : les libellés du vocabulaire signé — les
-- hypothèses du parcours (arbitrage 3) et les populations d'usage (arbitrage
-- 7) —, un libellé par terme, partagé par toutes les fiches, et les actes qui
-- les valident. Chaque table d'actes n'a qu'une cible.
--
-- ── UN ACTE PAR RUBRIQUE (arbitrage 5) ─────────────────────────────────────
--
-- Un acte d'une fiche d'assiette vaut pour une version entière. Ici, il vaut
-- pour UNE rubrique d'une version. Son empreinte est celle du texte de CETTE
-- rubrique, et la base la recalcule elle-même au moment de l'acte : on ne
-- valide pas une rubrique pour en servir une autre. La version est immuable,
-- si bien que « toutes les rubriques sur la même empreinte de version » se
-- lit « tous les actes sur le même `id_version` » ; la validité d'une version
-- (toutes les rubriques que la structure attend, validées au sens du dernier
-- acte par `ordre`) se dérive au serveur, rien ne la stocke.
--
-- ── LA LISTE FERMÉE DES RUBRIQUES ──────────────────────────────────────────
--
-- Celle du cadrage v3, §3.2 (couche texte), moins « explication patient »,
-- hors de ce lot (arbitrage 6) : la base la refuse, si bien qu'aucun texte
-- destiné au patient ne peut y entrer avant le lot qui l'ouvrira (BP-18b).
-- Ajouter une rubrique est une migration, relue.
--
-- ── LE LIEN À LA STRUCTURE (arbitrage 10, étendu au vocabulaire) ───────────
--
-- Chaque version de fiche et chaque libellé portent l'empreinte de la
-- structure signée qu'ils rédigent ou nomment. Une structure re-signée rend
-- texte et libellés « à relire » jusqu'à une version neuve et ses actes :
-- l'état se dérive à la lecture, rien n'est réécrit.
--
-- ── APPEND-ONLY, FACE À L'ACCIDENT ─────────────────────────────────────────
--
-- UPDATE, DELETE et TRUNCATE sont refusés par trigger sur les quatre tables :
-- une correction est une version NEUVE, un retrait est un acte NEUF. Limite
-- assumée, celle du patron : le rôle propriétaire peut désactiver un trigger.
--
-- ── AUCUNE DONNÉE PATIENT ──────────────────────────────────────────────────
--
-- Ni identifiant, ni texte de dossier : rien à ajouter à l'effacement d'un
-- dossier. Aucune valeur clinique non plus (arbitrage 8) : la structure dit
-- la nature attendue d'une valeur, BP-27 apportera les valeurs.

-- CreateTable
CREATE TABLE "fiches_usage_versions" (
    "id" TEXT NOT NULL,
    "fiche_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "contenu" JSONB NOT NULL,
    "structure_sha256" TEXT NOT NULL,
    "modele_redaction" TEXT NOT NULL,
    "modele_contre_lecture" TEXT NOT NULL,
    "version_consigne" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_usage_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_usage_actes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_version" TEXT NOT NULL,
    "rubrique" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "validateur" TEXT NOT NULL,
    "relecture_integrale" BOOLEAN NOT NULL,
    "motif" TEXT,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_usage_actes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_usage_libelles" (
    "id" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "terme_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelle_sha256" TEXT NOT NULL,
    "structure_sha256" TEXT NOT NULL,
    "modele_redaction" TEXT NOT NULL,
    "modele_contre_lecture" TEXT NOT NULL,
    "version_consigne" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_usage_libelles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_usage_libelles_actes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_libelle" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "validateur" TEXT NOT NULL,
    "relecture_integrale" BOOLEAN NOT NULL,
    "motif" TEXT,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_usage_libelles_actes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiches_usage_versions_fiche_numero_key" ON "fiches_usage_versions"("fiche_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "fiches_usage_actes_ordre_key" ON "fiches_usage_actes"("ordre");

-- CreateIndex
-- « Le dernier acte » d'une rubrique se lit par `ordre`, jamais par `le`
-- (constat de revue du patron, #1233).
CREATE INDEX "fiches_usage_actes_version_rubrique_ordre_idx" ON "fiches_usage_actes"("id_version", "rubrique", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "fiches_usage_libelles_terme_numero_key" ON "fiches_usage_libelles"("terme_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "fiches_usage_libelles_actes_ordre_key" ON "fiches_usage_libelles_actes"("ordre");

-- CreateIndex
CREATE INDEX "fiches_usage_libelles_actes_libelle_ordre_idx" ON "fiches_usage_libelles_actes"("id_libelle", "ordre");

-- AddForeignKey
-- ON DELETE RESTRICT : un acte ne survit pas à ce qu'il vise, et ce qui porte
-- un acte ne disparaît pas. Le trigger append-only refuse de toute façon le
-- DELETE ; la contrainte le dit aussi au schéma.
ALTER TABLE "fiches_usage_actes" ADD CONSTRAINT "fiches_usage_actes_id_version_fkey" FOREIGN KEY ("id_version") REFERENCES "fiches_usage_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_usage_libelles_actes" ADD CONSTRAINT "fiches_usage_libelles_actes_id_libelle_fkey" FOREIGN KEY ("id_libelle") REFERENCES "fiches_usage_libelles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument, qui ne
-- retire que l'espace ASCII et laisse passer une ligne de tabulations.

ALTER TABLE "fiches_usage_versions"
  ADD CONSTRAINT "fiches_usage_versions_fiche_format" CHECK ("fiche_id" ~ '^FU_[A-Z0-9_]+$'),
  ADD CONSTRAINT "fiches_usage_versions_numero_positif" CHECK ("numero" >= 1),
  ADD CONSTRAINT "fiches_usage_versions_contenu_objet" CHECK (jsonb_typeof("contenu") = 'object'),
  ADD CONSTRAINT "fiches_usage_versions_structure_sha256_format" CHECK ("structure_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_usage_versions_modele_redaction_non_vide" CHECK ("modele_redaction" ~ '\S'),
  ADD CONSTRAINT "fiches_usage_versions_modele_contre_lecture_non_vide" CHECK ("modele_contre_lecture" ~ '\S'),
  ADD CONSTRAINT "fiches_usage_versions_version_consigne_non_vide" CHECK ("version_consigne" ~ '\S');

ALTER TABLE "fiches_usage_actes"
  ADD CONSTRAINT "fiches_usage_actes_rubrique_fermee" CHECK (
    "rubrique" IN (
      'question', 'population', 'preanalytique_contexte', 'resultats_consequences',
      'interpretations', 'options', 'precautions', 'surveillance_arret', 'limites',
      'argument_preference'
    )
  ),
  ADD CONSTRAINT "fiches_usage_actes_acte_ferme" CHECK ("acte" IN ('validee', 'retiree')),
  ADD CONSTRAINT "fiches_usage_actes_empreinte_format" CHECK ("empreinte" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_usage_actes_validateur_non_vide" CHECK ("validateur" ~ '\S'),
  -- VALIDER, C'EST DÉCLARER AVOIR TOUT LU ([[D-195]] §1) : toute la rubrique.
  ADD CONSTRAINT "fiches_usage_actes_validation_relue" CHECK ("acte" <> 'validee' OR "relecture_integrale"),
  -- UN RETRAIT DIT POURQUOI : rien ne disparaît en silence.
  ADD CONSTRAINT "fiches_usage_actes_retrait_motive" CHECK ("acte" <> 'retiree' OR ("motif" IS NOT NULL AND "motif" ~ '\S'));

ALTER TABLE "fiches_usage_libelles"
  -- LA NATURE ET LE PRÉFIXE SE TIENNENT : une hypothèse est `HYP_…`, une
  -- population `POP_…` — un terme ne se range pas sous l'autre nature.
  ADD CONSTRAINT "fiches_usage_libelles_nature_terme" CHECK (
    ("nature" = 'hypothese' AND "terme_id" ~ '^HYP_[A-Z0-9_]+$')
    OR ("nature" = 'population' AND "terme_id" ~ '^POP_[A-Z0-9_]+$')
  ),
  ADD CONSTRAINT "fiches_usage_libelles_numero_positif" CHECK ("numero" >= 1),
  ADD CONSTRAINT "fiches_usage_libelles_libelle_non_vide" CHECK ("libelle" ~ '\S'),
  -- L'empreinte est celle du libellé, au caractère près : l'acte qui la
  -- recopie porte sur CE libellé-là.
  ADD CONSTRAINT "fiches_usage_libelles_libelle_sha256" CHECK (
    "libelle_sha256" = encode(sha256(convert_to("libelle", 'UTF8')), 'hex')
  ),
  ADD CONSTRAINT "fiches_usage_libelles_structure_sha256_format" CHECK ("structure_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_usage_libelles_modele_redaction_non_vide" CHECK ("modele_redaction" ~ '\S'),
  ADD CONSTRAINT "fiches_usage_libelles_modele_contre_lecture_non_vide" CHECK ("modele_contre_lecture" ~ '\S'),
  ADD CONSTRAINT "fiches_usage_libelles_version_consigne_non_vide" CHECK ("version_consigne" ~ '\S');

ALTER TABLE "fiches_usage_libelles_actes"
  ADD CONSTRAINT "fiches_usage_libelles_actes_acte_ferme" CHECK ("acte" IN ('validee', 'retiree')),
  ADD CONSTRAINT "fiches_usage_libelles_actes_empreinte_format" CHECK ("empreinte" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fiches_usage_libelles_actes_validateur_non_vide" CHECK ("validateur" ~ '\S'),
  ADD CONSTRAINT "fiches_usage_libelles_actes_validation_relue" CHECK ("acte" <> 'validee' OR "relecture_integrale"),
  ADD CONSTRAINT "fiches_usage_libelles_actes_retrait_motive" CHECK ("acte" <> 'retiree' OR ("motif" IS NOT NULL AND "motif" ~ '\S'));

-- ── APPEND-ONLY ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fiches_usage_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% est append-only (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER fiches_usage_versions_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_usage_versions
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_versions_no_truncate
  BEFORE TRUNCATE ON public.fiches_usage_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_actes_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_usage_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_actes_no_truncate
  BEFORE TRUNCATE ON public.fiches_usage_actes
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_libelles_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_usage_libelles
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_libelles_no_truncate
  BEFORE TRUNCATE ON public.fiches_usage_libelles
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_libelles_actes_no_dml
  BEFORE UPDATE OR DELETE ON public.fiches_usage_libelles_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_append_only();

CREATE TRIGGER fiches_usage_libelles_actes_no_truncate
  BEFORE TRUNCATE ON public.fiches_usage_libelles_actes
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_usage_append_only();

-- ── COHÉRENCE AU MOMENT DE L'INSERTION ─────────────────────────────────────
--
-- Les CHECK ne lisent ni d'autres lignes ni d'autres tables :
--  1. les instants sont posés par la base, en `clock_timestamp() AT TIME ZONE
--     'UTC'` (convention de Prisma : un `now()` nu suit le fuseau de session) ;
--     une version, un libellé ou un acte antidatable n'est pas une preuve ;
--  2. une version (un libellé) prend le numéro qui SUIT le dernier de sa fiche
--     (de son terme), sans trou, sous un verrou consultatif par fiche (par
--     terme) — constat de revue du patron, #1233 ;
--  3. le contenu d'une version est un objet NON VIDE dont chaque clé est une
--     rubrique de la liste fermée et chaque valeur un texte visible ;
--  4. un acte porte sur le texte EXACT de sa cible : l'empreinte de la
--     rubrique est recalculée ici, celle du libellé est tenue par son CHECK ;
--     une rubrique absente de la version ne se valide pas ;
--  5. l'`ordre` d'un acte est tiré de la séquence PAR LA BASE, même si
--     l'appelant en fournit un : c'est lui qui dit quel acte est le dernier.

CREATE OR REPLACE FUNCTION public.fiches_usage_versions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  attendu integer;
  cle text;
  valeur jsonb;
BEGIN
  NEW.cree_le := clock_timestamp() AT TIME ZONE 'UTC';
  IF jsonb_typeof(NEW.contenu) <> 'object' OR NEW.contenu = '{}'::jsonb THEN
    RAISE EXCEPTION 'version de % refusée : le contenu doit être un objet non vide de rubriques.', NEW.fiche_id;
  END IF;
  FOR cle, valeur IN SELECT r.key, r.value FROM jsonb_each(NEW.contenu) r LOOP
    IF cle NOT IN (
      'question', 'population', 'preanalytique_contexte', 'resultats_consequences',
      'interpretations', 'options', 'precautions', 'surveillance_arret', 'limites',
      'argument_preference'
    ) THEN
      RAISE EXCEPTION 'version de % refusée : rubrique « % » hors de la liste fermée.', NEW.fiche_id, cle;
    END IF;
    IF jsonb_typeof(valeur) <> 'string' OR NOT ((valeur #>> '{}') ~ '\S') THEN
      RAISE EXCEPTION 'version de % refusée : la rubrique « % » doit être un texte non vide.', NEW.fiche_id, cle;
    END IF;
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtext('fiches_usage_versions:' || NEW.fiche_id));
  SELECT COALESCE(max(v.numero), 0) + 1 INTO attendu
  FROM public.fiches_usage_versions v
  WHERE v.fiche_id = NEW.fiche_id;
  IF NEW.numero <> attendu THEN
    RAISE EXCEPTION 'version % de % refusée : le numéro attendu est %.', NEW.numero, NEW.fiche_id, attendu;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_usage_versions_avant_insertion
  BEFORE INSERT ON public.fiches_usage_versions
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_versions_avant_insertion();

CREATE OR REPLACE FUNCTION public.fiches_usage_actes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  texte text;
BEGIN
  NEW.le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.fiches_usage_actes', 'ordre'));
  SELECT v.contenu ->> NEW.rubrique INTO texte
  FROM public.fiches_usage_versions v
  WHERE v.id = NEW.id_version;
  -- Le trigger passe avant la FK : une cible inconnue se dit telle, au lieu
  -- de se lire « rubrique absente » (revue CodeRabbit, #1488).
  IF NOT FOUND THEN
    RAISE EXCEPTION 'acte refusé : version % inconnue.', NEW.id_version;
  END IF;
  IF texte IS NULL THEN
    RAISE EXCEPTION 'acte refusé : la version % ne porte pas de rubrique « % ».', NEW.id_version, NEW.rubrique;
  END IF;
  IF encode(sha256(convert_to(texte, 'UTF8')), 'hex') IS DISTINCT FROM NEW.empreinte THEN
    RAISE EXCEPTION 'acte refusé : l''empreinte recopiée ne correspond pas au texte de la rubrique « % ».', NEW.rubrique;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_usage_actes_avant_insertion
  BEFORE INSERT ON public.fiches_usage_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_actes_avant_insertion();

CREATE OR REPLACE FUNCTION public.fiches_usage_libelles_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  attendu integer;
BEGIN
  NEW.cree_le := clock_timestamp() AT TIME ZONE 'UTC';
  PERFORM pg_advisory_xact_lock(hashtext('fiches_usage_libelles:' || NEW.terme_id));
  SELECT COALESCE(max(l.numero), 0) + 1 INTO attendu
  FROM public.fiches_usage_libelles l
  WHERE l.terme_id = NEW.terme_id;
  IF NEW.numero <> attendu THEN
    RAISE EXCEPTION 'libellé % de % refusé : le numéro attendu est %.', NEW.numero, NEW.terme_id, attendu;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_usage_libelles_avant_insertion
  BEFORE INSERT ON public.fiches_usage_libelles
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_libelles_avant_insertion();

CREATE OR REPLACE FUNCTION public.fiches_usage_libelles_actes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  attendue text;
BEGIN
  NEW.le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.fiches_usage_libelles_actes', 'ordre'));
  SELECT l.libelle_sha256 INTO attendue
  FROM public.fiches_usage_libelles l
  WHERE l.id = NEW.id_libelle;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'acte refusé : libellé % inconnu.', NEW.id_libelle;
  END IF;
  IF attendue IS DISTINCT FROM NEW.empreinte THEN
    RAISE EXCEPTION 'acte refusé : l''empreinte recopiée ne correspond pas au libellé %.', NEW.id_libelle;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_usage_libelles_actes_avant_insertion
  BEFORE INSERT ON public.fiches_usage_libelles_actes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_usage_libelles_actes_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.fiches_usage_append_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_usage_versions_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_usage_actes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_actes_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_append_only() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_versions_avant_insertion() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_actes_avant_insertion() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_avant_insertion() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_actes_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_append_only() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_versions_avant_insertion() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_actes_avant_insertion() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_avant_insertion() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_usage_libelles_actes_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."fiches_usage_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fiches_usage_actes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fiches_usage_libelles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fiches_usage_libelles_actes" ENABLE ROW LEVEL SECURITY;

-- ROLLBACK (manuel, si jamais) : DROP TABLE "fiches_usage_actes";
-- DROP TABLE "fiches_usage_libelles_actes"; DROP TABLE "fiches_usage_versions";
-- DROP TABLE "fiches_usage_libelles"; puis DROP FUNCTION des cinq fonctions
-- ci-dessus. Aucune donnée patient n'y vit.
