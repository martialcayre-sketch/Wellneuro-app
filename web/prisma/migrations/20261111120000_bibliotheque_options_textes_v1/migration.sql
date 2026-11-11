-- BIBLIOTHÈQUE DES OPTIONS — LE TEXTE D'ACCOMPAGNEMENT, EN BASE, VALIDÉ PAR
-- ACTE, EN AJOUT SEUL ([[D-480]] §3, BP-17, LOT-17, fiche F11).
--
-- Migration demandée par le responsable le 2026-11-11 (PR 2 du découpage
-- accepté, question `20261111-1131-c`), plan de la table confirmé le même
-- jour : neuf rubriques, `auteur` seul, acte sur la dernière version seule.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit ni ne lit
-- encore ces tables. L'atelier vient à la PR 5, après l'application
-- CONSTATÉE par conteneur.
--
-- ── DEUX COUCHES (D-480 §3) ────────────────────────────────────────────────
--
-- La STRUCTURE de la bibliothèque est au dépôt (PR 3) : hypothèses, options
-- à identifiants opaques jamais réattribués, renvois vers les sources. Elle
-- ne porte aucun texte clinique : le dépôt est PUBLIC. Le TEXTE de chaque
-- rubrique d'une option vit ici, en base hébergée HDS ([[D-251]] §4), saisi
-- à l'atelier, jamais par migration ([[D-439]] §5). La migration crée les
-- tables VIDES.
--
-- ── DEUX TABLES ────────────────────────────────────────────────────────────
--
--  - `bibliotheque_options_textes` : une version du texte d'UNE rubrique
--    d'UNE option, numérotée sans trou par couple option × rubrique, avec
--    l'empreinte de son texte (CHECK) et celle de la structure de la
--    bibliothèque qu'elle accompagne, et le compte qui l'a saisie.
--  - `bibliotheque_options_textes_actes` : les gestes du responsable sur
--    une version, `validee` ou `retiree`.
--
-- ── LA LISTE FERMÉE DES RUBRIQUES ──────────────────────────────────────────
--
-- Celle de D-480 §1, sans en ajouter, dans son découpage (arbitrage du
-- 2026-11-11 : produit et statut réglementaire forment UNE rubrique) :
-- `produit_statut_reglementaire`, `dose`, `duree`, `precautions`,
-- `contre_indications`, `interactions`, `surveillance`, `critere_arret`,
-- `role_praticien`. La population reste à BP-12a ([[D-417]] §1) : une option
-- renvoie au vocabulaire `POP_…`, elle n'en rédige aucun. Ajouter une
-- rubrique est une migration, relue.
--
-- ── L'IDENTIFIANT D'OPTION ─────────────────────────────────────────────────
--
-- Un texte sans espace, de 1 à 128 caractères. Son format est fixé par la
-- structure (PR 3) ; un CHECK de format viendra après, s'il le faut. La
-- base ne vérifie pas que l'option existe à la structure : c'est à la route
-- (PR 5), comme l'appartenance d'un conflit au registre signé (D-439).
--
-- ── EN VIGUEUR, ET « À RELIRE » — LE CONTRAT DE LECTURE (pour la PR 5) ─────
--
-- La DERNIÈRE version d'un couple option × rubrique est celle de plus grand
-- `numero`. Seule elle reçoit un acte (arbitrage du 2026-11-11). Le texte
-- d'une rubrique est VALIDÉ si, et seulement si, le dernier acte de la
-- DERNIÈRE version, au sens d'`ordre`, est `validee`. Une version neuve sans
-- acte MASQUE la précédente : une ancienne version validée ne réapparaît
-- jamais d'elle-même (arbitrage du 2026-11-11). Il est « à relire » si son
-- `structure_sha256` n'est plus l'empreinte de la structure signée (D-480
-- §2-3). Rien ne stocke l'état : il se dérive à la lecture.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur une version (trigger `bibliotheque_options_textes_avant_insertion`) :
--  1. un numéro qui ne suit pas le dernier de son couple option × rubrique.
-- Sur un acte (trigger `bibliotheque_options_textes_actes_avant_insertion`) :
--  2. une version inconnue, ou qui n'est plus la dernière de son couple ;
--  3. une empreinte recopiée qui n'est pas celle du texte de la version.
-- Puis les CHECK : identifiant d'option, rubrique et acte fermés, texte
-- visible, empreintes (celle du texte égale au SHA-256 de son texte),
-- auteur et validateur visibles et bornés, relecture intégrale pour valider,
-- motif visible et borné pour retirer.
--
-- ── LE VERROU ──────────────────────────────────────────────────────────────
--
-- Un verrou consultatif par couple option × rubrique (espace 480, clé
-- `bo|<option>|<rubrique>`), pris par une version neuve et par un acte : une
-- version et un acte concurrents se sérialisent, et le second lit l'état
-- laissé par le premier. READ COMMITTED SEUL est admis, comme pour les
-- positions d'expert ([[D-439]], contre-revue Codex de #1871) : en
-- REPEATABLE READ ou SERIALIZABLE, l'instantané précède le verrou et
-- masquerait la version que celui-ci vient de laisser commettre — un acte
-- validerait alors une version déjà remplacée.
--
-- ── FIGÉES ─────────────────────────────────────────────────────────────────
--
-- UPDATE, DELETE et TRUNCATE sont refusés par trigger sur les deux tables :
-- une correction est une version NEUVE, un retrait est un acte NEUF. Limite
-- assumée, celle du patron : le rôle propriétaire peut désactiver un trigger.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `cree_le` et `le` en `clock_timestamp() AT TIME ZONE 'UTC'` (Prisma 7 pose
-- lui-même `@default(now())` côté client ; un `now()` nu suit le fuseau de
-- session), `ordre` tiré de la séquence après le verrou : ni l'un ni l'autre
-- ne s'antidate.
--
-- ── AUCUNE DONNÉE PATIENT ──────────────────────────────────────────────────
--
-- Ni identifiant de dossier, ni texte de dossier : rien à ajouter à
-- l'effacement d'un dossier, ni au registre RGPD. La bibliothèque ne lit
-- aucun dossier (D-480 §5.4). Auteur et validateur sont des comptes du
-- domaine praticien ; aucun code ne les lit pour décider ([[D-459]] §7).

-- CreateTable
CREATE TABLE "bibliotheque_options_textes" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "rubrique" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "texte_sha256" TEXT NOT NULL,
    "structure_sha256" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bibliotheque_options_textes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bibliotheque_options_textes_actes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_texte" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "validateur" TEXT NOT NULL,
    "relecture_integrale" BOOLEAN NOT NULL,
    "motif" TEXT,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bibliotheque_options_textes_actes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bibliotheque_options_textes_option_rubrique_numero_key" ON "bibliotheque_options_textes"("option_id", "rubrique", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "bibliotheque_options_textes_actes_ordre_key" ON "bibliotheque_options_textes_actes"("ordre");

-- CreateIndex
-- « Le dernier acte » d'une version se lit par `ordre`, jamais par `le`.
CREATE INDEX "bibliotheque_options_textes_actes_texte_ordre_idx" ON "bibliotheque_options_textes_actes"("id_texte", "ordre");

-- AddForeignKey
-- ON DELETE RESTRICT : ce qui porte un acte ne disparaît pas. Le trigger
-- append-only refuse de toute façon le DELETE ; la contrainte le dit aussi
-- au schéma.
ALTER TABLE "bibliotheque_options_textes_actes" ADD CONSTRAINT "bibliotheque_options_textes_actes_id_texte_fkey" FOREIGN KEY ("id_texte") REFERENCES "bibliotheque_options_textes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument, qui ne
-- retire que l'espace ASCII et laisse passer une ligne de tabulations.

ALTER TABLE "bibliotheque_options_textes"
  -- Sans espace d'aucune sorte (`\s` couvre tabulation et retour à la ligne).
  ADD CONSTRAINT "bibliotheque_options_textes_option_format"
    CHECK ("option_id" ~ '^\S+$' AND char_length("option_id") <= 128),
  ADD CONSTRAINT "bibliotheque_options_textes_rubrique_fermee"
    CHECK (
      "rubrique" IN (
        'produit_statut_reglementaire', 'dose', 'duree', 'precautions',
        'contre_indications', 'interactions', 'surveillance', 'critere_arret',
        'role_praticien'
      )
    ),
  ADD CONSTRAINT "bibliotheque_options_textes_numero_positif"
    CHECK ("numero" >= 1),
  ADD CONSTRAINT "bibliotheque_options_textes_texte_non_vide"
    CHECK ("texte" ~ '\S'),
  -- L'empreinte est celle du texte, au caractère près : l'acte qui la
  -- recopie porte sur CE texte-là.
  ADD CONSTRAINT "bibliotheque_options_textes_texte_sha256"
    CHECK ("texte_sha256" = encode(sha256(convert_to("texte", 'UTF8')), 'hex')),
  ADD CONSTRAINT "bibliotheque_options_textes_structure_sha256_format"
    CHECK ("structure_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "bibliotheque_options_textes_auteur_non_vide"
    CHECK ("auteur" ~ '\S' AND char_length("auteur") <= 320);

ALTER TABLE "bibliotheque_options_textes_actes"
  ADD CONSTRAINT "bibliotheque_options_textes_actes_acte_ferme"
    CHECK ("acte" IN ('validee', 'retiree')),
  ADD CONSTRAINT "bibliotheque_options_textes_actes_empreinte_format"
    CHECK ("empreinte" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "bibliotheque_options_textes_actes_validateur_non_vide"
    CHECK ("validateur" ~ '\S' AND char_length("validateur") <= 320),
  -- VALIDER, C'EST DÉCLARER AVOIR TOUT LU ([[D-195]] §1).
  ADD CONSTRAINT "bibliotheque_options_textes_actes_validation_relue"
    CHECK ("acte" <> 'validee' OR "relecture_integrale"),
  -- UN RETRAIT DIT POURQUOI : rien ne disparaît en silence.
  ADD CONSTRAINT "bibliotheque_options_textes_actes_retrait_motive"
    CHECK ("acte" <> 'retiree' OR ("motif" IS NOT NULL AND "motif" ~ '\S')),
  ADD CONSTRAINT "bibliotheque_options_textes_actes_motif_borne"
    CHECK ("motif" IS NULL OR char_length("motif") <= 4000);

-- ── FIGÉES : NI UPDATE, NI DELETE, NI TRUNCATE ─────────────────────────────

CREATE OR REPLACE FUNCTION public.bibliotheque_options_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% est append-only (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER bibliotheque_options_textes_no_dml
  BEFORE UPDATE OR DELETE ON public.bibliotheque_options_textes
  FOR EACH ROW EXECUTE FUNCTION public.bibliotheque_options_append_only();

CREATE TRIGGER bibliotheque_options_textes_no_truncate
  BEFORE TRUNCATE ON public.bibliotheque_options_textes
  FOR EACH STATEMENT EXECUTE FUNCTION public.bibliotheque_options_append_only();

CREATE TRIGGER bibliotheque_options_textes_actes_no_dml
  BEFORE UPDATE OR DELETE ON public.bibliotheque_options_textes_actes
  FOR EACH ROW EXECUTE FUNCTION public.bibliotheque_options_append_only();

CREATE TRIGGER bibliotheque_options_textes_actes_no_truncate
  BEFORE TRUNCATE ON public.bibliotheque_options_textes_actes
  FOR EACH STATEMENT EXECUTE FUNCTION public.bibliotheque_options_append_only();

-- ── LA VERSION, À L'INSERTION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bibliotheque_options_textes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  attendu integer;
BEGIN
  IF current_setting('transaction_isolation') IN ('repeatable read', 'serializable') THEN
    RAISE EXCEPTION 'texte de bibliothèque refusé en % : la dernière version exige READ COMMITTED.', upper(current_setting('transaction_isolation'));
  END IF;

  PERFORM pg_advisory_xact_lock(480, hashtext('bo|' || NEW.option_id || '|' || NEW.rubrique));

  SELECT COALESCE(max(t.numero), 0) + 1 INTO attendu
  FROM public.bibliotheque_options_textes t
  WHERE t.option_id = NEW.option_id AND t.rubrique = NEW.rubrique;
  IF NEW.numero IS DISTINCT FROM attendu THEN
    RAISE EXCEPTION 'texte % de % × % refusé : le numéro attendu est %.', NEW.numero, NEW.option_id, NEW.rubrique, attendu;
  END IF;

  NEW.cree_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER bibliotheque_options_textes_avant_insertion
  BEFORE INSERT ON public.bibliotheque_options_textes
  FOR EACH ROW EXECUTE FUNCTION public.bibliotheque_options_textes_avant_insertion();

-- ── L'ACTE, À L'INSERTION ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bibliotheque_options_textes_actes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cible_option text;
  cible_rubrique text;
  cible_numero integer;
  cible_sha256 text;
BEGIN
  IF current_setting('transaction_isolation') IN ('repeatable read', 'serializable') THEN
    RAISE EXCEPTION 'acte de bibliothèque refusé en % : la dernière version exige READ COMMITTED.', upper(current_setting('transaction_isolation'));
  END IF;

  SELECT t.option_id, t.rubrique, t.numero, t.texte_sha256
    INTO cible_option, cible_rubrique, cible_numero, cible_sha256
  FROM public.bibliotheque_options_textes t
  WHERE t.id = NEW.id_texte;
  -- Le trigger passe avant la FK : une cible inconnue se dit telle.
  IF cible_option IS NULL THEN
    RAISE EXCEPTION 'acte refusé : texte de bibliothèque % inconnu.', NEW.id_texte;
  END IF;

  PERFORM pg_advisory_xact_lock(480, hashtext('bo|' || cible_option || '|' || cible_rubrique));

  IF EXISTS (
    SELECT 1 FROM public.bibliotheque_options_textes t
    WHERE t.option_id = cible_option
      AND t.rubrique = cible_rubrique
      AND t.numero > cible_numero
  ) THEN
    RAISE EXCEPTION 'acte refusé : le texte % n''est plus la dernière version de % × % ; seule la dernière reçoit un acte.', NEW.id_texte, cible_option, cible_rubrique;
  END IF;

  IF cible_sha256 IS DISTINCT FROM NEW.empreinte THEN
    RAISE EXCEPTION 'acte refusé : l''empreinte recopiée ne correspond pas au texte %.', NEW.id_texte;
  END IF;

  NEW.le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.bibliotheque_options_textes_actes', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER bibliotheque_options_textes_actes_avant_insertion
  BEFORE INSERT ON public.bibliotheque_options_textes_actes
  FOR EACH ROW EXECUTE FUNCTION public.bibliotheque_options_textes_actes_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_append_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_textes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_textes_actes_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_append_only() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_textes_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bibliotheque_options_textes_actes_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."bibliotheque_options_textes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bibliotheque_options_textes_actes" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans les modèles
-- `BibliothequeOptionTexte` et `BibliothequeOptionTexteActe` ; puis DROP
-- TABLE "bibliotheque_options_textes_actes", "bibliotheque_options_textes"
-- (dans cet ordre) et DROP FUNCTION des trois fonctions ci-dessus. Aucune
-- donnée patient n'y vit ; après le premier versement, le DROP efface des
-- actes du responsable : le retour arrière devient une décision.
