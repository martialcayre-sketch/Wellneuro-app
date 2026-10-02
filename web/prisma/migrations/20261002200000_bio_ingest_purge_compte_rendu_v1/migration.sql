-- BIO-INGEST — LA PURGE DU COMPTE RENDU DÉPOSÉ, ET L'HEURE LUE
-- ([[D-258]], LOT-02 ; rubrique 8 du dossier RGPD).
--
-- Migration demandée explicitement par le responsable le 2026-10-02 (plan
-- approuvé en séance, après le merge de #1284). MIGRATION SEULE ([[D-087]]) :
-- aucun code ne purge encore. La décision qui purge, la relance refusée sur un
-- document purgé, l'échéance planifiée (`web/cron.json`) et l'écriture de
-- `heure_lue` par l'extraction viendront après l'application constatée par
-- conteneur. Le seul code qui l'accompagne est la lecture du document par la
-- relance d'extraction, qui doit compiler sur un `contenu` devenu nullable.
--
-- ── LA RÈGLE ([[D-258]]) ───────────────────────────────────────────────────
--
-- Le document déposé est purgé dès que toutes les lignes de son extraction
-- courante sont décidées (validées ou écartées), et AU PLUS TARD 30 JOURS
-- après son dépôt — décidées ou non : les lignes restent décidables sans lui.
-- Restent l'empreinte, les extractions et les lignes lues : ce sont elles qui
-- tiennent la provenance des résultats validés (A5). À tenir AVANT la pose de
-- `WN_BIO_INGEST_ENABLED` ; le document patient `donnees_confidentialite` v12
-- le déclare.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- La migration `bio_ingest_staging_v1` figeait le compte rendu : tout UPDATE
-- refusé. Elle ouvre UNE transition, et une seule — le contenu passe de non nul
-- à NULL — que la base juge elle-même, pour qu'aucune route ne purge un
-- document encore utile ni ne le « purge » sans l'effacer :
--
--  1. LE MOTIF EST VÉRIFIÉ, PAS DÉCLARÉ :
--     - `lignes_decidees` exige que l'extraction courante (la plus récente non
--       échouée, la règle de `idExtractionCourante` dans `decisions.ts`) soit
--       terminée et n'ait plus aucune ligne proposée ;
--     - `echeance` exige un dépôt d'au moins 30 jours.
--  2. JAMAIS PENDANT UNE EXTRACTION : un import en cours lit le document.
--     Réciproquement, un import ne s'ouvre plus sur un document purgé. Le
--     verrou de ligne sérialise les deux (FOR SHARE côté import, l'UPDATE
--     côté purge) ; le verrou consultatif du code les sérialise déjà.
--  3. RIEN D'AUTRE NE BOUGE : identité, dossier, type, empreinte, auteur et
--     date de dépôt sont figés ; un document purgé ne change plus ; un dépôt
--     ne naît pas purgé.
--  4. L'INSTANT EST POSÉ PAR LA BASE, en UTC explicite et par
--     `clock_timestamp()`, comme les autres instants du staging.
--
-- Les CHECK de taille et d'empreinte restent : sur un contenu NULL ils sont
-- satisfaits, et l'empreinte, recalculée au dépôt, reste la preuve de ce qui a
-- été lu. L'unicité (dossier, empreinte) reste aussi : redéposer le même
-- document après sa purge rend « déjà déposé ».
--
-- Ce que la purge N'EFFACE PAS : les copies du document dans les sauvegardes de
-- l'hébergeur, jusqu'à expiration de leur rétention, et l'espace disque avant
-- le passage du VACUUM. La rubrique 8 le dit ; cette migration n'en promet pas
-- plus.
--
-- ── L'HEURE LUE ────────────────────────────────────────────────────────────
--
-- Le staging ne gardait que l'instant lu : une heure IMPRIMÉE « 00:00 » se
-- confondait avec une heure absente (minuit de Paris), et la validation la
-- refusait (`heure_absente`, revue Copilot de #1284). `heure_lue` le distingue.
-- Posée par l'extraction à l'insertion, figée ensuite avec ce qui a été lu.
-- DEFAULT false : tant que l'extraction ne l'écrit pas, l'heure reste exigée —
-- le comportement d'avant cette migration, jamais un minuit accepté à tort.

-- AlterTable
ALTER TABLE "comptes_rendus_biologiques"
  ALTER COLUMN "contenu" DROP NOT NULL,
  ADD COLUMN "purge_le" TIMESTAMP(3),
  ADD COLUMN "motif_purge" TEXT;

-- AlterTable
ALTER TABLE "lignes_biologiques_candidates"
  ADD COLUMN "heure_lue" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "comptes_rendus_biologiques"
  ADD CONSTRAINT "comptes_rendus_biologiques_motif_purge_check"
    CHECK ("motif_purge" IN ('lignes_decidees', 'echeance')),
  -- Un contenu NULL est un contenu purgé, daté et motivé — et réciproquement.
  ADD CONSTRAINT "comptes_rendus_biologiques_purge_check"
    CHECK (
      ("contenu" IS NULL) = ("purge_le" IS NOT NULL)
      AND ("purge_le" IS NULL) = ("motif_purge" IS NULL)
    );

ALTER TABLE "lignes_biologiques_candidates"
  ADD CONSTRAINT "lignes_biologiques_candidates_heure_lue_check"
    CHECK ("preleve_le_lu" IS NOT NULL OR NOT "heure_lue");

-- ── LE DÉPÔT : PORTE SON DOCUMENT, NE NAÎT PAS PURGÉ ───────────────────────

CREATE OR REPLACE FUNCTION public.bio_ingest_compte_rendu_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.contenu IS NULL THEN
    RAISE EXCEPTION 'compte rendu refusé : un dépôt porte son document.';
  END IF;
  IF NEW.purge_le IS NOT NULL OR NEW.motif_purge IS NOT NULL THEN
    RAISE EXCEPTION 'compte rendu refusé : un dépôt ne naît pas purgé.';
  END IF;
  NEW.depose_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- ── LA PURGE : LA SEULE MODIFICATION ADMISE ────────────────────────────────

CREATE OR REPLACE FUNCTION public.bio_ingest_compte_rendu_avant_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  import_courant text;
  statut_courant text;
BEGIN
  IF OLD.contenu IS NULL THEN
    RAISE EXCEPTION 'compte rendu figé : son document est déjà purgé (%).', OLD.motif_purge;
  END IF;
  IF NEW.contenu IS NOT NULL THEN
    RAISE EXCEPTION 'compte rendu refusé : seule la purge de son document le modifie.';
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.type_mime, NEW.empreinte_sha256, NEW.depose_par, NEW.depose_le)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.type_mime, OLD.empreinte_sha256, OLD.depose_par, OLD.depose_le) THEN
    RAISE EXCEPTION 'compte rendu refusé : la purge n''efface que le document.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.imports_biologiques i
    WHERE i.id_compte_rendu = OLD.id AND i.statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'purge refusée : une extraction de ce compte rendu est en cours.';
  END IF;
  IF NEW.motif_purge = 'lignes_decidees' THEN
    SELECT i.id, i.statut INTO import_courant, statut_courant
    FROM public.imports_biologiques i
    WHERE i.id_compte_rendu = OLD.id AND i.statut <> 'echec'
    ORDER BY i.lance_le DESC
    LIMIT 1;
    IF statut_courant IS DISTINCT FROM 'extrait' THEN
      RAISE EXCEPTION 'purge refusée : aucune extraction terminée dont les lignes seraient décidées.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.lignes_biologiques_candidates l
      WHERE l.id_import = import_courant AND l.statut = 'proposee'
    ) THEN
      RAISE EXCEPTION 'purge refusée : des lignes de l''extraction courante restent à décider.';
    END IF;
  ELSIF NEW.motif_purge = 'echeance' THEN
    IF OLD.depose_le > (clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days' THEN
      RAISE EXCEPTION 'purge refusée : le dépôt a moins de 30 jours.';
    END IF;
  ELSE
    RAISE EXCEPTION 'purge refusée : motif % inconnu.', NEW.motif_purge;
  END IF;
  NEW.purge_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

DROP TRIGGER "comptes_rendus_biologiques_no_update" ON public.comptes_rendus_biologiques;

CREATE TRIGGER comptes_rendus_biologiques_avant_purge
  BEFORE UPDATE ON public.comptes_rendus_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_compte_rendu_avant_purge();

-- ── L'IMPORT : JAMAIS SUR UN DOCUMENT PURGÉ ────────────────────────────────
--
-- Reprise de la fonction de `bio_ingest_staging_v1`, avec le refus en plus.
-- `contenu IS NULL` se lit sans détoaster le document.

CREATE OR REPLACE FUNCTION public.bio_ingest_import_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  document_purge boolean;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'en_cours' THEN
    RAISE EXCEPTION 'import refusé : une extraction naît en cours (statut %).', NEW.statut;
  END IF;
  IF NEW.laboratoire_lu IS NOT NULL THEN
    RAISE EXCEPTION 'import refusé : le laboratoire est lu par l''extraction, pas posé avant elle.';
  END IF;
  SELECT c.contenu IS NULL INTO document_purge
  FROM public.comptes_rendus_biologiques c
  WHERE c.id = NEW.id_compte_rendu
  FOR SHARE;
  IF document_purge THEN
    RAISE EXCEPTION 'import refusé : le document de ce compte rendu est purgé.';
  END IF;
  NEW.lance_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- ── LA LIGNE : `heure_lue` FIGÉE AVEC CE QUI A ÉTÉ LU ──────────────────────
--
-- Reprise de la fonction de `bio_ingest_staging_v1` ; seule la liste des
-- colonnes figées gagne `heure_lue`.

CREATE OR REPLACE FUNCTION public.bio_ingest_ligne_avant_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  statut_import text;
  fin_import timestamp(3);
  patient_resultat text;
  saisie_resultat timestamp(3);
BEGIN
  IF OLD.statut <> 'proposee' THEN
    RAISE EXCEPTION 'ligne figée : une ligne décidée (%) ne change plus.', OLD.statut;
  END IF;
  IF NEW.statut NOT IN ('validee', 'ecartee') THEN
    RAISE EXCEPTION 'ligne refusée : une ligne proposée ne change que par la décision du praticien.';
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.id_import, NEW.rang, NEW.page, NEW.libelle_lu, NEW.valeur_lue,
      NEW.unite_lue, NEW.preleve_le_lu, NEW.heure_lue, NEW.analyte_propose, NEW.statut_mapping)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_import, OLD.rang, OLD.page, OLD.libelle_lu, OLD.valeur_lue,
      OLD.unite_lue, OLD.preleve_le_lu, OLD.heure_lue, OLD.analyte_propose, OLD.statut_mapping) THEN
    RAISE EXCEPTION 'ligne refusée : ce qui a été lu ne se réécrit pas.';
  END IF;
  SELECT i.statut, i.termine_le INTO statut_import, fin_import
  FROM public.imports_biologiques i
  WHERE i.id = NEW.id_import
  FOR SHARE;
  IF statut_import IS DISTINCT FROM 'extrait' THEN
    RAISE EXCEPTION 'ligne refusée : seule une extraction terminée se valide (%).', statut_import;
  END IF;
  IF NEW.id_resultat IS NOT NULL THEN
    SELECT r.id_patient, r.saisi_le INTO patient_resultat, saisie_resultat
    FROM public.resultats_biologiques r
    WHERE r.id = NEW.id_resultat;
    IF patient_resultat IS DISTINCT FROM NEW.id_patient THEN
      RAISE EXCEPTION 'ligne refusée : le résultat désigné n''appartient pas à ce dossier.';
    END IF;
    IF saisie_resultat < fin_import THEN
      RAISE EXCEPTION 'ligne refusée : le résultat désigné a été saisi avant la fin de l''extraction.';
    END IF;
  END IF;
  NEW.traite_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- Hygiène d'exécution : la nouvelle fonction ne sert qu'au trigger. Les
-- fonctions remplacées par CREATE OR REPLACE gardent leurs droits révoqués.
REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_avant_purge() FROM PUBLIC;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_avant_purge() FROM %I', role_name);
    END IF;
  END LOOP;
END $$;

-- RETOUR ARRIÈRE (si jamais) : par une NOUVELLE migration compensatrice, relue
-- et approuvée (`release-db`), jamais en réécrivant l'historique. Elle ne peut
-- rendre `contenu` NOT NULL que tant qu'aucun document n'a été purgé — un
-- document purgé ne se restaure pas. DANS CET ORDRE :
--  1. déployer d'abord le code qui ne purge plus et n'écrit plus `heure_lue`,
--     avec un `schema.prisma` qui ne porte plus `purge_le`, `motif_purge` ni
--     `heure_lue` — sinon toute lecture Prisma sans `select` échoue dès les
--     colonnes supprimées ;
--  2. la migration compensatrice recrée le trigger
--     `comptes_rendus_biologiques_no_update` (`bio_ingest_figee`), supprime
--     `comptes_rendus_biologiques_avant_purge` et sa fonction, reprend les
--     trois fonctions remplacées dans leur version `bio_ingest_staging_v1`,
--     puis supprime les deux CHECK, les colonnes `purge_le`, `motif_purge` et
--     `heure_lue` (et son CHECK), et rétablit `contenu` NOT NULL — SEULEMENT
--     si aucun document n'est purgé. Sinon `contenu` reste nullable, avec
--     `purge_le` et `motif_purge` : une ligne purgée ne se supprime pas sans
--     perdre la provenance de ses résultats (A5).
