-- BIO-INGEST — LE STAGING D'IMPORT DES COMPTES RENDUS BIOLOGIQUES
-- ([[D-256]] A2/A5, LOT-02).
--
-- Migration demandée explicitement par le responsable le 2026-10-01 (plan du
-- LOT-02 approuvé en séance). MIGRATION SEULE ([[D-087]]) : aucun code ne
-- dépose, n'extrait ni ne valide encore. Le code consommateur (upload,
-- extraction par IA vision, écran de validation, drapeau) ne viendra qu'après
-- l'application constatée par conteneur. Le seul code qui l'accompagne est
-- l'effacement nommé du dossier (`patient/effacement.ts`) : une table qui
-- porte `id_patient` sans y figurer ferait rougir sa garde de complétude, et
-- laisserait de la donnée derrière un dossier « effacé ».
--
-- Préalable RGPD tenu avant cette migration (amendement de [[D-256]] du
-- 2026-10-01) : `usage_ia` v4 et `donnees_confidentialite` v11 publiées,
-- §2 ter du dossier RGPD validé, demande de DPA à Anthropic envoyée. Les trois
-- tables sont nommées à la rubrique 5, sur la ligne « comptes rendus
-- biologiques déposés et lignes candidates » posée avant elles.
--
-- ── L'ENTONNOIR ────────────────────────────────────────────────────────────
--
--   comptes_rendus_biologiques   le document déposé, en entier, figé (A2)
--     └─ imports_biologiques     UNE extraction de ce document
--          └─ lignes_biologiques_candidates   ce que l'extraction a lu
--               └──→ resultats_biologiques   le résultat créé À LA VALIDATION
--
-- A5 : la provenance vit sur le staging, la référence va du staging VERS le
-- résultat — jamais l'inverse. `resultats_biologiques` ne reçoit ici ni
-- colonne, ni index, ni contrainte ; sa liste blanche
-- (`cb_resultats_biologiques_v1_negatif.sql`) n'est pas rouverte.
--
-- ── CE QUE LA v4 PROMET, ET OÙ LE SCHÉMA LE TIENT ──────────────────────────
--
--  - « le modèle utilisé et la version du procédé sont enregistrés à chaque
--    fois » : `imports_biologiques.modele` et `.version_prompt`, NOT NULL dès
--    l'INSERTION — posés avant l'appel au fournisseur, donc présents aussi sur
--    une extraction en échec ;
--  - « l'outil en relève les valeurs, leurs unités et la date du
--    prélèvement » : `valeur_lue`, `unite_lue`, `preleve_le_lu` ;
--  - « le compte rendu est transmis en entier » : aucun masquage n'est promis,
--    et aucune colonne n'en suggère un. Aucun nom de fichier n'est conservé :
--    il porte souvent l'identité du patient.
--
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
-- Une route se contourne ; une ligne lue réécrite après coup, ou validée vers
-- le résultat d'un autre dossier, est une donnée de santé que personne n'a
-- produite (`DC-01`). La base tient donc :
--
--  1. UN SEUL DOSSIER D'UN BOUT À L'AUTRE : clés étrangères COMPOSITES
--     (id, id_patient) du compte rendu à l'import, de l'import à la ligne ; et
--     un trigger pour le résultat validé — une FK composite exigerait un
--     UNIQUE sur `resultats_biologiques`, que A5 laisse intacte.
--  2. LE DOCUMENT EST CE QU'IL DIT ÊTRE : type fermé, taille bornée (10 Mo,
--     arbitrage du 2026-10-01), empreinte RECALCULÉE par la base ; un même
--     document une seule fois par dossier — l'extraire à nouveau crée un
--     nouvel import sur le même compte rendu, pas un second dépôt.
--  3. CE QUI A ÉTÉ LU EST FIGÉ : le compte rendu ne s'UPDATE jamais ; une
--     ligne ne change que par la décision du praticien, une seule fois ; un
--     import ne change que pour se terminer, une seule fois.
--  4. LES INSTANTS SONT POSÉS PAR LA BASE (dépôt, lancement, fin, décision) :
--     une trace antidatable n'en est pas une.
--  5. UNE EXTRACTION EN ÉCHEC NE LAISSE AUCUNE LIGNE, une extraction terminée
--     n'en reçoit plus, et seule une extraction terminée se valide.
--
-- Ce que la base NE juge PAS, et qui reste au code de la PR 2 : le choix de
-- l'analyte (resolver signé, jamais le modèle), le refus d'une unité
-- divergente ou d'une ligne non quantitative ([[D-157]] : aucune conversion),
-- et qu'aucune écriture dans `resultats_biologiques` n'ait lieu sans geste du
-- praticien.
--
-- ── FIGÉES, MAIS EFFAÇABLES ────────────────────────────────────────────────
--
-- UPDATE (hors transitions décrites) et TRUNCATE sont refusés par trigger.
-- DELETE ne l'est PAS : chaque ligne est une donnée patient, et l'effacement
-- d'un dossier les supprime NOMMÉMENT, lignes d'abord (elles retiennent le
-- résultat validé), puis imports, puis comptes rendus. Qu'aucun AUTRE code ne
-- les supprime est tenu par un banc du dépôt
-- (`biology-library/staging.guard.test.ts`), pas par la base.
--
-- Durée de conservation : trou de la rubrique 8 du dossier RGPD, comme pour
-- `resultats_biologiques`. Cette migration n'en invente aucune.

-- CreateTable
CREATE TABLE "comptes_rendus_biologiques" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "type_mime" TEXT NOT NULL,
    "empreinte_sha256" TEXT NOT NULL,
    "depose_par" TEXT NOT NULL,
    "depose_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comptes_rendus_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports_biologiques" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_compte_rendu" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "version_prompt" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "motif_echec" TEXT,
    "lance_par" TEXT NOT NULL,
    "lance_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "imports_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_biologiques_candidates" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_import" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "page" INTEGER NOT NULL,
    "libelle_lu" TEXT NOT NULL,
    "valeur_lue" TEXT NOT NULL,
    "unite_lue" TEXT,
    "preleve_le_lu" TIMESTAMP(3),
    "analyte_propose" TEXT,
    "statut_mapping" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'proposee',
    "motif_ecart" TEXT,
    "id_resultat" TEXT,
    "traite_par" TEXT,
    "traite_le" TIMESTAMP(3),

    CONSTRAINT "lignes_biologiques_candidates_pkey" PRIMARY KEY ("id")
);

-- Le document est déjà compressé (PDF, JPEG, PNG, WebP) : EXTERNAL le range
-- hors ligne sans tenter de le recompresser. Prisma ne modélise pas le
-- stockage — aucune dérive au `migrate diff`.
ALTER TABLE "comptes_rendus_biologiques" ALTER COLUMN "contenu" SET STORAGE EXTERNAL;

-- CreateIndex
-- « Les comptes rendus de ce dossier », du plus récent au plus ancien.
CREATE INDEX "comptes_rendus_biologiques_patient_depose_idx" ON "comptes_rendus_biologiques"("id_patient", "depose_le");

-- CreateIndex
-- Un même document une seule fois par dossier : le second dépôt est un P2002.
CREATE UNIQUE INDEX "comptes_rendus_biologiques_patient_empreinte_key" ON "comptes_rendus_biologiques"("id_patient", "empreinte_sha256");

-- CreateIndex
-- Cible des clés composites : un import ne désigne qu'un compte rendu de SON
-- dossier.
CREATE UNIQUE INDEX "comptes_rendus_biologiques_id_patient_key" ON "comptes_rendus_biologiques"("id", "id_patient");

-- CreateIndex
CREATE INDEX "imports_biologiques_compte_rendu_idx" ON "imports_biologiques"("id_compte_rendu");

-- CreateIndex
CREATE INDEX "imports_biologiques_patient_idx" ON "imports_biologiques"("id_patient");

-- CreateIndex
CREATE UNIQUE INDEX "imports_biologiques_id_patient_key" ON "imports_biologiques"("id", "id_patient");

-- CreateIndex
-- Un résultat naît d'au plus une ligne ; sert aussi la vérification de la FK
-- quand l'effacement supprime les résultats.
CREATE UNIQUE INDEX "lignes_biologiques_candidates_id_resultat_key" ON "lignes_biologiques_candidates"("id_resultat");

-- CreateIndex
CREATE INDEX "lignes_biologiques_candidates_patient_idx" ON "lignes_biologiques_candidates"("id_patient");

-- CreateIndex
-- L'ordre de lecture d'une extraction, et l'index de sa FK.
CREATE UNIQUE INDEX "lignes_biologiques_candidates_import_rang_key" ON "lignes_biologiques_candidates"("id_import", "rang");

-- AddForeignKey
-- ON DELETE RESTRICT partout : l'effacement d'un dossier est une suppression
-- NOMMÉE (`patient/effacement.ts`). En CASCADE, elles partiraient en silence.
ALTER TABLE "comptes_rendus_biologiques" ADD CONSTRAINT "comptes_rendus_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports_biologiques" ADD CONSTRAINT "imports_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports_biologiques" ADD CONSTRAINT "imports_biologiques_id_compte_rendu_id_patient_fkey" FOREIGN KEY ("id_compte_rendu", "id_patient") REFERENCES "comptes_rendus_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_biologiques_candidates" ADD CONSTRAINT "lignes_biologiques_candidates_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_biologiques_candidates" ADD CONSTRAINT "lignes_biologiques_candidates_id_import_id_patient_fkey" FOREIGN KEY ("id_import", "id_patient") REFERENCES "imports_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_biologiques_candidates" ADD CONSTRAINT "lignes_biologiques_candidates_analyte_propose_fkey" FOREIGN KEY ("analyte_propose") REFERENCES "biology_analytes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_biologiques_candidates" ADD CONSTRAINT "lignes_biologiques_candidates_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument (qui ne
-- retire que l'espace ASCII). Les auteurs sont l'e-mail du praticien, posé
-- côté serveur, borné comme `resultats_biologiques.saisi_par`. Les bornes de
-- longueur sont techniques (une ligne de compte rendu, pas un texte libre) ;
-- aucune n'est clinique.

ALTER TABLE "comptes_rendus_biologiques"
  ADD CONSTRAINT "comptes_rendus_biologiques_type_mime_check"
    CHECK ("type_mime" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "comptes_rendus_biologiques_taille_check"
    CHECK (octet_length("contenu") BETWEEN 1 AND 10485760),
  ADD CONSTRAINT "comptes_rendus_biologiques_empreinte_check"
    CHECK ("empreinte_sha256" = encode(sha256("contenu"), 'hex')),
  ADD CONSTRAINT "comptes_rendus_biologiques_depose_par_check"
    CHECK ("depose_par" ~ '\S' AND char_length("depose_par") <= 320);

ALTER TABLE "imports_biologiques"
  ADD CONSTRAINT "imports_biologiques_statut_check"
    CHECK ("statut" IN ('en_cours', 'extrait', 'echec')),
  ADD CONSTRAINT "imports_biologiques_motif_echec_check"
    CHECK ("motif_echec" IN ('erreur_fournisseur', 'reponse_invalide', 'document_illisible', 'delai_depasse')),
  ADD CONSTRAINT "imports_biologiques_echec_motive_check"
    CHECK (("statut" = 'echec') = ("motif_echec" IS NOT NULL)),
  ADD CONSTRAINT "imports_biologiques_termine_check"
    CHECK (("statut" = 'en_cours') = ("termine_le" IS NULL)),
  ADD CONSTRAINT "imports_biologiques_modele_check"
    CHECK ("modele" ~ '\S' AND char_length("modele") <= 100),
  ADD CONSTRAINT "imports_biologiques_version_prompt_check"
    CHECK ("version_prompt" ~ '\S' AND char_length("version_prompt") <= 50),
  ADD CONSTRAINT "imports_biologiques_lance_par_check"
    CHECK ("lance_par" ~ '\S' AND char_length("lance_par") <= 320);

ALTER TABLE "lignes_biologiques_candidates"
  ADD CONSTRAINT "lignes_biologiques_candidates_rang_check" CHECK ("rang" >= 1),
  ADD CONSTRAINT "lignes_biologiques_candidates_page_check" CHECK ("page" >= 1),
  ADD CONSTRAINT "lignes_biologiques_candidates_libelle_lu_check"
    CHECK ("libelle_lu" ~ '\S' AND char_length("libelle_lu") <= 300),
  ADD CONSTRAINT "lignes_biologiques_candidates_valeur_lue_check"
    CHECK ("valeur_lue" ~ '\S' AND char_length("valeur_lue") <= 100),
  ADD CONSTRAINT "lignes_biologiques_candidates_unite_lue_check"
    CHECK ("unite_lue" ~ '\S' AND char_length("unite_lue") <= 50),
  ADD CONSTRAINT "lignes_biologiques_candidates_statut_mapping_check"
    CHECK ("statut_mapping" IN ('resolu', 'ambigu', 'inconnu')),
  -- `resolu` désigne un analyte ; `inconnu` n'en désigne aucun ; `ambigu` peut
  -- porter un candidat, que l'écran marque comme tel. Deux implications, pour
  -- qu'un statut hors liste ne tombe que sous le CHECK de la liste.
  ADD CONSTRAINT "lignes_biologiques_candidates_mapping_coherent_check"
    CHECK (
      ("statut_mapping" <> 'resolu' OR "analyte_propose" IS NOT NULL)
      AND ("statut_mapping" <> 'inconnu' OR "analyte_propose" IS NULL)
    ),
  ADD CONSTRAINT "lignes_biologiques_candidates_statut_check"
    CHECK ("statut" IN ('proposee', 'validee', 'ecartee')),
  ADD CONSTRAINT "lignes_biologiques_candidates_motif_ecart_check"
    CHECK ("motif_ecart" IN ('non_quantitative', 'unite_divergente', 'analyte_non_reconnu', 'ecartee_par_praticien')),
  ADD CONSTRAINT "lignes_biologiques_candidates_validee_check"
    CHECK (("statut" = 'validee') = ("id_resultat" IS NOT NULL)),
  ADD CONSTRAINT "lignes_biologiques_candidates_ecartee_check"
    CHECK (("statut" = 'ecartee') = ("motif_ecart" IS NOT NULL)),
  ADD CONSTRAINT "lignes_biologiques_candidates_traitee_check"
    CHECK (
      ("statut" = 'proposee') = ("traite_par" IS NULL)
      AND ("statut" = 'proposee') = ("traite_le" IS NULL)
    ),
  ADD CONSTRAINT "lignes_biologiques_candidates_traite_par_check"
    CHECK ("traite_par" ~ '\S' AND char_length("traite_par") <= 320);

-- ── LE COMPTE RENDU : HORODATÉ PAR LA BASE, PUIS FIGÉ ──────────────────────

CREATE OR REPLACE FUNCTION public.bio_ingest_compte_rendu_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.depose_le := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER comptes_rendus_biologiques_avant_insertion
  BEFORE INSERT ON public.comptes_rendus_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_compte_rendu_avant_insertion();

CREATE OR REPLACE FUNCTION public.bio_ingest_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : ligne figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER comptes_rendus_biologiques_no_update
  BEFORE UPDATE ON public.comptes_rendus_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_figee();

CREATE TRIGGER comptes_rendus_biologiques_no_truncate
  BEFORE TRUNCATE ON public.comptes_rendus_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.bio_ingest_figee();

CREATE TRIGGER imports_biologiques_no_truncate
  BEFORE TRUNCATE ON public.imports_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.bio_ingest_figee();

CREATE TRIGGER lignes_biologiques_candidates_no_truncate
  BEFORE TRUNCATE ON public.lignes_biologiques_candidates
  FOR EACH STATEMENT EXECUTE FUNCTION public.bio_ingest_figee();

-- ── L'IMPORT : NAÎT EN COURS, SE TERMINE UNE FOIS ──────────────────────────

CREATE OR REPLACE FUNCTION public.bio_ingest_import_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM 'en_cours' THEN
    RAISE EXCEPTION 'import refusé : une extraction naît en cours (statut %).', NEW.statut;
  END IF;
  NEW.lance_le := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER imports_biologiques_avant_insertion
  BEFORE INSERT ON public.imports_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_import_avant_insertion();

CREATE OR REPLACE FUNCTION public.bio_ingest_import_avant_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.statut <> 'en_cours' THEN
    RAISE EXCEPTION 'import figé : une extraction terminée (%) ne change plus.', OLD.statut;
  END IF;
  IF NEW.statut NOT IN ('extrait', 'echec') THEN
    RAISE EXCEPTION 'import refusé : une extraction en cours ne peut que se terminer (statut %).', NEW.statut;
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.id_compte_rendu, NEW.modele, NEW.version_prompt, NEW.lance_par, NEW.lance_le)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_compte_rendu, OLD.modele, OLD.version_prompt, OLD.lance_par, OLD.lance_le) THEN
    RAISE EXCEPTION 'import refusé : seuls le statut, le motif d''échec et la fin changent à la terminaison.';
  END IF;
  IF NEW.statut = 'echec' AND EXISTS (
    SELECT 1 FROM public.lignes_biologiques_candidates l WHERE l.id_import = NEW.id
  ) THEN
    RAISE EXCEPTION 'import refusé : une extraction en échec ne laisse aucune ligne candidate.';
  END IF;
  NEW.termine_le := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER imports_biologiques_avant_modification
  BEFORE UPDATE ON public.imports_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_import_avant_modification();

-- ── LA LIGNE : LUE PENDANT L'EXTRACTION, DÉCIDÉE UNE FOIS ──────────────────
--
-- Le verrou partagé sur l'import (FOR SHARE) sérialise une insertion ou une
-- décision avec la terminaison de son extraction : ni ligne ajoutée à une
-- extraction qui se termine, ni décision sur une extraction qui passe en échec.

CREATE OR REPLACE FUNCTION public.bio_ingest_ligne_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  statut_import text;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'proposee' THEN
    RAISE EXCEPTION 'ligne refusée : une ligne lue naît proposée (statut %).', NEW.statut;
  END IF;
  SELECT i.statut INTO statut_import
  FROM public.imports_biologiques i
  WHERE i.id = NEW.id_import
  FOR SHARE;
  IF statut_import IS DISTINCT FROM 'en_cours' THEN
    RAISE EXCEPTION 'ligne refusée : son extraction n''est plus en cours (%).', statut_import;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lignes_biologiques_candidates_avant_insertion
  BEFORE INSERT ON public.lignes_biologiques_candidates
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_ligne_avant_insertion();

CREATE OR REPLACE FUNCTION public.bio_ingest_ligne_avant_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  statut_import text;
  patient_resultat text;
BEGIN
  IF OLD.statut <> 'proposee' THEN
    RAISE EXCEPTION 'ligne figée : une ligne décidée (%) ne change plus.', OLD.statut;
  END IF;
  IF NEW.statut NOT IN ('validee', 'ecartee') THEN
    RAISE EXCEPTION 'ligne refusée : une ligne proposée ne change que par la décision du praticien.';
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.id_import, NEW.rang, NEW.page, NEW.libelle_lu, NEW.valeur_lue,
      NEW.unite_lue, NEW.preleve_le_lu, NEW.analyte_propose, NEW.statut_mapping)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_import, OLD.rang, OLD.page, OLD.libelle_lu, OLD.valeur_lue,
      OLD.unite_lue, OLD.preleve_le_lu, OLD.analyte_propose, OLD.statut_mapping) THEN
    RAISE EXCEPTION 'ligne refusée : ce qui a été lu ne se réécrit pas.';
  END IF;
  SELECT i.statut INTO statut_import
  FROM public.imports_biologiques i
  WHERE i.id = NEW.id_import
  FOR SHARE;
  IF statut_import IS DISTINCT FROM 'extrait' THEN
    RAISE EXCEPTION 'ligne refusée : seule une extraction terminée se valide (%).', statut_import;
  END IF;
  IF NEW.id_resultat IS NOT NULL THEN
    SELECT r.id_patient INTO patient_resultat
    FROM public.resultats_biologiques r
    WHERE r.id = NEW.id_resultat;
    IF patient_resultat IS DISTINCT FROM NEW.id_patient THEN
      RAISE EXCEPTION 'ligne refusée : le résultat désigné n''appartient pas à ce dossier.';
    END IF;
  END IF;
  NEW.traite_le := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lignes_biologiques_candidates_avant_modification
  BEFORE UPDATE ON public.lignes_biologiques_candidates
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_ligne_avant_modification();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_import_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_import_avant_modification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_ligne_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_ligne_avant_modification() FROM PUBLIC;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_avant_insertion() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_figee() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_import_avant_insertion() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_import_avant_modification() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_ligne_avant_insertion() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_ligne_avant_modification() FROM %I', role_name);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."comptes_rendus_biologiques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."imports_biologiques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lignes_biologiques_candidates" ENABLE ROW LEVEL SECURITY;

-- ROLLBACK (manuel, si jamais, et seulement tant qu'aucun compte rendu n'a été
-- déposé), DANS CET ORDRE :
--  1. déployer d'abord le code sans l'effacement de ces trois tables
--     (`patient/effacement.ts`) et sans leurs modèles dans `schema.prisma` —
--     sinon tout effacement de dossier échoue sur une table absente ;
--  2. DROP TABLE "lignes_biologiques_candidates", "imports_biologiques",
--     "comptes_rendus_biologiques" (dans cet ordre) ; DROP FUNCTION des six
--     fonctions `bio_ingest_*` ci-dessus ;
--  3. `prisma migrate resolve --rolled-back 20261001210000_bio_ingest_staging_v1`.
