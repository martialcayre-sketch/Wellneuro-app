-- COLLECTE DOCUMENTAIRE — LES DOCUMENTS DÉPOSÉS PAR LE PATIENT ET LEURS
-- CLASSEMENTS ([[D-330]], fiche H62, J3-collecte).
--
-- Migration demandée explicitement par le responsable le 2026-10-18 (« Oui »,
-- à la question de préparer la migration de J3-collecte), sur quatre
-- arbitrages du même jour : le patient propose une catégorie, le praticien la
-- corrige, chaque changement daté ; un retrait efface le contenu et garde la
-- ligne ; les dépôts paraissent dans « Mes échanges » ; les bornes sont celles
-- du compte rendu biologique ([[D-269]] §5). Trois de plus, après relecture :
-- un doublon est refusé, seule la première consultation est tracée, un retrait
-- ne désigne pas la demande de droit qu'il traite.
-- MIGRATION SEULE ([[D-087]]) : aucun code ne dépose, ne consulte, ne classe ni
-- ne retire encore. La route de dépôt, l'écran du praticien et la ligne
-- « Transmis » viendront après l'application CONSTATÉE par conteneur, sous un
-- drapeau éteint ; l'ouverture est la place 4 de la file C (ACT-4). Le seul
-- code qui l'accompagne est l'effacement nommé du dossier
-- (`patient/effacement.ts`) : le banc de complétude de l'effacement l'exige de
-- toute table qui porte `id_patient`.
--
-- ── DEUX TABLES ────────────────────────────────────────────────────────────
--
--  - `documents_deposes_patient` : UNE ligne par document déposé. Le document
--    est conservé en base HDS, en entier, sans nom de fichier (il porte souvent
--    l'identité du patient) ; aucune IA ne le lit ; seul le praticien du
--    dossier le consulte. La catégorie proposée par le patient au dépôt est
--    figée.
--  - `classements_documents_deposes` : UNE ligne par classement du praticien,
--    en ajout seul. La catégorie COURANTE d'un document est celle de son
--    dernier classement (par `ordre`), à défaut celle que le patient a
--    proposée.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur un document :
--  1. LES BORNES DU COMPTE RENDU : PDF, JPEG, PNG ou WebP ; 1 octet à 10 Mio ;
--     empreinte recalculée et vérifiée égale (CHECK). La signature des octets,
--     le réencodage des images sans métadonnées et les plafonds (10 dépôts par
--     24 heures, 3 non consultés à la fois) restent au code, comme pour le
--     compte rendu — la base ne lit pas un format d'image.
--  2. UNE CATÉGORIE DE LA LISTE : courrier, compte rendu de consultation,
--     traitements ou compléments, autre (CHECK).
--  3. UN DÉPÔT PORTE SON DOCUMENT et NE NAÎT NI CONSULTÉ NI RETIRÉ ; son instant
--     est posé par la base. Un DOUBLON est refusé : la même empreinte, dans le
--     même dossier, sur un document non retiré (« déjà déposé ») ; un document
--     retiré peut être redéposé.
--  4. DEUX TRANSITIONS, ET DEUX SEULES, une par écriture :
--     - la PREMIÈRE CONSULTATION par le praticien du dossier (instant posé par
--       la base ; une seule fois) ;
--     - le RETRAIT par le praticien du dossier, motif `depot_par_erreur` ou
--       `demande_droit` : le contenu passe à NULL, l'instant est posé par la
--       base, et le document ne change plus.
--     Rien d'autre ne bouge : dossier, type, empreinte, catégorie proposée,
--     date de dépôt. Un document retiré ne se consulte plus.
-- Sur un classement :
--  5. LE DOCUMENT EST CELUI DU DOSSIER, ET N'EST PAS RETIRÉ.
--  6. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER (sans égard à la casse, règle
--     de `filtrePatientsDuPraticien`), comme pour la consultation et le
--     retrait.
--
-- CE QUE LA BASE NE TIENT PAS, et qui revient au code (PR suivante) : la garde
-- d'âge et le dossier clos (le dépôt est une surface neuve : fermé à un mineur
-- et à un dossier sans date, [[D-283]] §5, [[D-284]] §3) ; le drapeau ; le
-- refus de la suppression (DELETE) hors de l'effacement nommé — le patient ne
-- supprime pas lui-même un document (G-11), le retrait passe par le praticien.
--
-- ── LES VERROUS ────────────────────────────────────────────────────────────
--
-- L'effacement nommé prend le dossier `FOR UPDATE` en premier, puis supprime
-- classements et documents. Les triggers s'y accordent :
--  - au DÉPÔT : le dossier `FOR KEY SHARE`, puis un verrou consultatif par
--    dossier (`hashtext('documents_deposes:' || id_patient)`) sous lequel se
--    lit le doublon — deux dépôts du même fichier se sérialisent. La route y
--    comptera ses plafonds sous le même verrou ;
--  - au CLASSEMENT : le dossier `FOR KEY SHARE`, puis le document
--    `FOR NO KEY UPDATE` — deux classements du même document se sérialisent,
--    et l'`ordre` tiré ensuite suit l'ordre des validations ; un retrait
--    concurrent attend, ou fait attendre, et le refus 5 lit l'état commis ;
--  - à la CONSULTATION et au RETRAIT (UPDATE) : la ligne du document est déjà
--    verrouillée par PostgreSQL AVANT le trigger. Le trigger lit donc le
--    praticien du dossier SANS verrou : le prendre ensuite inverserait l'ordre
--    de l'effacement et ouvrirait un interblocage (UPDATE du document, puis
--    effacement `FOR UPDATE` du dossier, puis attente croisée). L'effacement,
--    lui, attend la fin de l'UPDATE pour supprimer le document.
-- Aucun refus ne lit une « dernière » ligne : READ COMMITTED n'est pas exigé.
--
-- ── EFFAÇABLES ─────────────────────────────────────────────────────────────
--
-- TRUNCATE refusé. DELETE admis : chaque ligne est une donnée de santé du
-- patient, que l'effacement nommé du dossier supprime — classements, puis
-- documents. Conservation : celle du dossier ([[D-283]] §2 ; texte de collecte
-- de G-11 : « conservés avec votre dossier »).
--
-- Ce que le retrait N'EFFACE PAS : les copies du document dans les sauvegardes
-- de l'hébergeur, jusqu'à expiration de leur rétention, et l'espace disque
-- avant le passage du VACUUM (même limite que la purge du compte rendu,
-- rubrique 8 du dossier RGPD).

-- ═══ A. LES DOCUMENTS DÉPOSÉS ════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "documents_deposes_patient" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "contenu" BYTEA,
    "type_mime" TEXT NOT NULL,
    "empreinte_sha256" TEXT NOT NULL,
    "categorie_proposee" TEXT NOT NULL,
    "depose_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consulte_le" TIMESTAMP(3),
    "consulte_par" TEXT,
    "retire_le" TIMESTAMP(3),
    "retire_par" TEXT,
    "motif_retrait" TEXT,

    CONSTRAINT "documents_deposes_patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- La liste du dossier, et les plafonds du dépôt (par 24 heures, non consultés).
CREATE INDEX "documents_deposes_patient_patient_depose_idx" ON "documents_deposes_patient"("id_patient", "depose_le");

-- AddForeignKey
-- ON DELETE RESTRICT : l'effacement d'un dossier est une suppression NOMMÉE.
ALTER TABLE "documents_deposes_patient" ADD CONSTRAINT "documents_deposes_patient_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents_deposes_patient"
  ADD CONSTRAINT "documents_deposes_patient_type_mime_check"
    CHECK ("type_mime" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "documents_deposes_patient_taille_check"
    CHECK (octet_length("contenu") BETWEEN 1 AND 10485760),
  -- Sur un contenu retiré (NULL), satisfait : l'empreinte reste la preuve de
  -- ce qui a été déposé.
  ADD CONSTRAINT "documents_deposes_patient_empreinte_check"
    CHECK ("empreinte_sha256" = encode(sha256("contenu"), 'hex')),
  ADD CONSTRAINT "documents_deposes_patient_empreinte_forme_check"
    CHECK ("empreinte_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "documents_deposes_patient_categorie_check"
    CHECK ("categorie_proposee" IN ('courrier', 'compte_rendu_consultation', 'traitements_complements', 'autre')),
  ADD CONSTRAINT "documents_deposes_patient_consulte_par_check"
    CHECK ("consulte_par" ~ '\S' AND char_length("consulte_par") <= 320),
  ADD CONSTRAINT "documents_deposes_patient_retire_par_check"
    CHECK ("retire_par" ~ '\S' AND char_length("retire_par") <= 320),
  ADD CONSTRAINT "documents_deposes_patient_motif_retrait_check"
    CHECK ("motif_retrait" IN ('depot_par_erreur', 'demande_droit')),
  -- Une consultation est entière : instant et auteur, ou rien.
  ADD CONSTRAINT "documents_deposes_patient_consultation_check"
    CHECK (("consulte_le" IS NULL) = ("consulte_par" IS NULL)),
  -- Un contenu NULL est un document retiré, daté, motivé, par un auteur — et
  -- réciproquement.
  ADD CONSTRAINT "documents_deposes_patient_retrait_check"
    CHECK (
      ("contenu" IS NULL) = ("retire_le" IS NOT NULL)
      AND ("retire_le" IS NULL) = ("retire_par" IS NULL)
      AND ("retire_le" IS NULL) = ("motif_retrait" IS NULL)
    );

-- ═══ B. LES CLASSEMENTS ══════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "classements_documents_deposes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_document" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "classe_par" TEXT NOT NULL,
    "classe_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classements_documents_deposes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- « Le dernier classement de ce document ».
CREATE INDEX "classements_documents_deposes_document_ordre_idx" ON "classements_documents_deposes"("id_document", "ordre");

-- CreateIndex
CREATE INDEX "classements_documents_deposes_patient_idx" ON "classements_documents_deposes"("id_patient");

-- CreateIndex
CREATE UNIQUE INDEX "classements_documents_deposes_ordre_key" ON "classements_documents_deposes"("ordre");

-- AddForeignKey
ALTER TABLE "classements_documents_deposes" ADD CONSTRAINT "classements_documents_deposes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classements_documents_deposes" ADD CONSTRAINT "classements_documents_deposes_id_document_fkey" FOREIGN KEY ("id_document") REFERENCES "documents_deposes_patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "classements_documents_deposes"
  ADD CONSTRAINT "classements_documents_deposes_categorie_check"
    CHECK ("categorie" IN ('courrier', 'compte_rendu_consultation', 'traitements_complements', 'autre')),
  ADD CONSTRAINT "classements_documents_deposes_classe_par_check"
    CHECK ("classe_par" ~ '\S' AND char_length("classe_par") <= 320);

-- ── AU DÉPÔT ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.documents_deposes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Le dossier d'abord, puis le verrou du dossier (en-tête, « Les verrous »).
  PERFORM 1 FROM public.patients p WHERE p.id_patient = NEW.id_patient FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(hashtext('documents_deposes:' || NEW.id_patient));

  -- 3. Un dépôt porte son document, et ne naît ni consulté ni retiré.
  IF NEW.contenu IS NULL THEN
    RAISE EXCEPTION 'dépôt refusé : un dépôt porte son document.';
  END IF;
  IF NEW.consulte_le IS NOT NULL OR NEW.consulte_par IS NOT NULL THEN
    RAISE EXCEPTION 'dépôt refusé : un dépôt ne naît pas consulté.';
  END IF;
  IF NEW.retire_le IS NOT NULL OR NEW.retire_par IS NOT NULL OR NEW.motif_retrait IS NOT NULL THEN
    RAISE EXCEPTION 'dépôt refusé : un dépôt ne naît pas retiré.';
  END IF;
  -- 3. Pas de doublon d'un document non retiré du même dossier.
  IF EXISTS (
    SELECT 1 FROM public.documents_deposes_patient d
    WHERE d.id_patient = NEW.id_patient
      AND d.empreinte_sha256 = NEW.empreinte_sha256
      AND d.contenu IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'dépôt refusé : ce document est déjà déposé dans ce dossier.';
  END IF;

  NEW.depose_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_deposes_patient_avant_insertion
  BEFORE INSERT ON public.documents_deposes_patient
  FOR EACH ROW EXECUTE FUNCTION public.documents_deposes_avant_insertion();

-- ── LA CONSULTATION ET LE RETRAIT : LES DEUX SEULES MODIFICATIONS ──────────

CREATE OR REPLACE FUNCTION public.documents_deposes_avant_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  consultation boolean;
  retrait boolean;
BEGIN
  -- Sans verrou : la ligne du document est déjà verrouillée (en-tête, « Les
  -- verrous »).
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = OLD.id_patient;

  IF OLD.contenu IS NULL THEN
    RAISE EXCEPTION 'document figé : il est retiré (%).', OLD.motif_retrait;
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.type_mime, NEW.empreinte_sha256, NEW.categorie_proposee, NEW.depose_le)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.type_mime, OLD.empreinte_sha256, OLD.categorie_proposee, OLD.depose_le) THEN
    RAISE EXCEPTION 'document refusé : ce qui a été déposé ne se réécrit pas.';
  END IF;

  consultation := OLD.consulte_par IS NULL AND NEW.consulte_par IS NOT NULL;
  retrait := NEW.contenu IS NULL;

  IF consultation AND retrait THEN
    RAISE EXCEPTION 'document refusé : une écriture consulte OU retire, pas les deux.';
  END IF;

  IF consultation THEN
    -- 4. La première consultation, par le praticien du dossier.
    IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.consulte_par) THEN
      RAISE EXCEPTION 'consultation refusée : seul le praticien du dossier consulte un document déposé.';
    END IF;
    IF NEW.retire_le IS NOT NULL OR NEW.retire_par IS NOT NULL OR NEW.motif_retrait IS NOT NULL THEN
      RAISE EXCEPTION 'consultation refusée : une consultation ne retire pas le document.';
    END IF;
    NEW.consulte_le := clock_timestamp() AT TIME ZONE 'UTC';
    RETURN NEW;
  END IF;

  IF retrait THEN
    -- 4. Le retrait, par le praticien du dossier ; la consultation ne bouge pas.
    IF (NEW.consulte_le, NEW.consulte_par) IS DISTINCT FROM (OLD.consulte_le, OLD.consulte_par) THEN
      RAISE EXCEPTION 'retrait refusé : un retrait ne réécrit pas la consultation.';
    END IF;
    IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.retire_par) THEN
      RAISE EXCEPTION 'retrait refusé : seul le praticien du dossier retire un document déposé.';
    END IF;
    IF NEW.motif_retrait IS NULL THEN
      RAISE EXCEPTION 'retrait refusé : un retrait porte son motif.';
    END IF;
    NEW.retire_le := clock_timestamp() AT TIME ZONE 'UTC';
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'document refusé : seules la première consultation et le retrait le modifient.';
END;
$$;

CREATE TRIGGER documents_deposes_patient_avant_modification
  BEFORE UPDATE ON public.documents_deposes_patient
  FOR EACH ROW EXECUTE FUNCTION public.documents_deposes_avant_modification();

-- ── AU CLASSEMENT ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.classements_documents_deposes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  document_patient text;
  document_retire boolean;
BEGIN
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;

  -- 5. Le document du dossier, non retiré (lu sous verrou de ligne, exclusif
  -- entre classements du même document).
  SELECT d.id_patient, d.contenu IS NULL INTO document_patient, document_retire
  FROM public.documents_deposes_patient d
  WHERE d.id = NEW.id_document
  FOR NO KEY UPDATE;
  IF document_patient IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'classement refusé : le document % ne porte pas sur ce dossier.', NEW.id_document;
  END IF;
  IF document_retire THEN
    RAISE EXCEPTION 'classement refusé : le document % est retiré.', NEW.id_document;
  END IF;

  -- 6. Le praticien du dossier.
  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.classe_par) THEN
    RAISE EXCEPTION 'classement refusé : seul le praticien du dossier classe un document déposé.';
  END IF;

  NEW.classe_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.classements_documents_deposes', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER classements_documents_deposes_avant_insertion
  BEFORE INSERT ON public.classements_documents_deposes
  FOR EACH ROW EXECUTE FUNCTION public.classements_documents_deposes_avant_insertion();

-- ── NI TRUNCATE, NI CLASSEMENT RÉÉCRIT ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.documents_deposes_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : la collecte documentaire est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER documents_deposes_patient_no_truncate
  BEFORE TRUNCATE ON public.documents_deposes_patient
  FOR EACH STATEMENT EXECUTE FUNCTION public.documents_deposes_figee();

CREATE TRIGGER classements_documents_deposes_no_update
  BEFORE UPDATE ON public.classements_documents_deposes
  FOR EACH ROW EXECUTE FUNCTION public.documents_deposes_figee();

CREATE TRIGGER classements_documents_deposes_no_truncate
  BEFORE TRUNCATE ON public.classements_documents_deposes
  FOR EACH STATEMENT EXECUTE FUNCTION public.documents_deposes_figee();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.documents_deposes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.documents_deposes_avant_modification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.classements_documents_deposes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.documents_deposes_figee() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.documents_deposes_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.documents_deposes_avant_modification() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.classements_documents_deposes_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.documents_deposes_figee() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."documents_deposes_patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classements_documents_deposes" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans
-- l'effacement des deux tables et sans leurs modèles ; puis DROP TABLE
-- (classements, puis documents) et DROP FUNCTION des quatre fonctions. Tant
-- qu'aucun document n'est déposé — la collecte reste fermée jusqu'à ACT-4 —,
-- rien ne se perd ; après le premier dépôt, le DROP efface des documents de
-- santé du patient : le retour arrière devient une décision.
