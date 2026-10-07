-- BIO-INGEST — LA TRANSMISSION DU COMPTE RENDU PAR LE PATIENT
-- ([[D-269]], LOT-04 ; DOSSIER_RGPD §2 ter, rubriques 5 et 8).
--
-- Migration confirmée explicitement par le responsable le 2026-10-07, après
-- le merge de `D-269` et du registre RGPD (#1350). MIGRATION SEULE
-- ([[D-087]]) : aucun code ne dépose encore pour le patient ni n'écarte. La
-- route du portail, le geste « Écarter » et leurs écrans viendront après
-- l'application constatée par conteneur, sous `WN_BIO_PORTAIL_ENABLED` éteint.
-- Le seul code qui l'accompagne est le type de lecture du compte rendu, qui
-- doit compiler sur un `depose_par` devenu nullable.
--
-- ── CE QUI S'AJOUTE ────────────────────────────────────────────────────────
--
-- 1. L'ORIGINE (§2) : `praticien` ou `patient`, posée au dépôt, figée. Les
--    lignes existantes prennent `praticien` (DEFAULT) : ce sont toutes des
--    dépôts du praticien. Un dépôt patient ne porte PAS d'e-mail de praticien :
--    `depose_par` devient nullable, et la base tient l'équivalence
--    « praticien ⇔ auteur nommé ».
-- 2. L'ÉCART (§3) : le praticien écarte un document TRANSMIS PAR LE PATIENT,
--    motif fermé `illisible` | `document_non_conforme`, sans texte libre. Une
--    seule écriture pose l'écart et purge le contenu, motif `ecarte`. La base
--    juge, comme pour la purge ([[D-258]]) :
--     - seul un document d'origine `patient` s'écarte ;
--     - jamais si une ligne d'une de ses extractions est validée (provenance,
--       [[D-256]] A5) ;
--     - jamais pendant une extraction en cours ;
--     - irréversible : un document purgé ne change plus (déjà tenu) ;
--     - l'instant est posé par la base, en UTC explicite ;
--     - un motif de purge autre que `ecarte` ne pose aucun écart, et
--       l'écart n'existe pas sans ce motif ;
--     - réciproquement, plus aucune ligne de ce document ne se VALIDE après
--       l'écart (elle peut encore s'écarter).
-- 3. UN INDEX (dossier, origine, date de dépôt) : la liste du patient et ses
--    plafonds (3 en attente ou reçus, 10 par 24 h, §5) se lisent par lui.
--
-- Ce que la base NE tient PAS, et qui revient au code (PR suivante) : le
-- refus du RETRAIT (DELETE) d'un document d'origine patient — l'effacement
-- nommé du dossier doit, lui, pouvoir le supprimer ; un banc du dépôt
-- (`staging.guard.test.ts`) tient déjà la liste des auteurs de suppression.
-- Les plafonds, l'accusé `usage_ia` et le dossier ouvert relèvent aussi de
-- la route.

-- AlterTable
ALTER TABLE "comptes_rendus_biologiques"
  ADD COLUMN "origine" TEXT NOT NULL DEFAULT 'praticien',
  ALTER COLUMN "depose_par" DROP NOT NULL,
  ADD COLUMN "ecarte_le" TIMESTAMP(3),
  ADD COLUMN "ecarte_par" TEXT,
  ADD COLUMN "motif_ecart" TEXT;

-- CreateIndex
CREATE INDEX "comptes_rendus_biologiques_patient_origine_idx"
  ON "comptes_rendus_biologiques"("id_patient", "origine", "depose_le");

-- Le CHECK de `depose_par` (`~ '\S'`, 320 au plus) reste : sur NULL il est
-- satisfait, et c'est le CHECK d'origine qui dit QUAND NULL est admis.
ALTER TABLE "comptes_rendus_biologiques"
  DROP CONSTRAINT "comptes_rendus_biologiques_motif_purge_check",
  ADD CONSTRAINT "comptes_rendus_biologiques_motif_purge_check"
    CHECK ("motif_purge" IN ('lignes_decidees', 'echeance', 'ecarte')),
  ADD CONSTRAINT "comptes_rendus_biologiques_origine_check"
    CHECK ("origine" IN ('praticien', 'patient')),
  ADD CONSTRAINT "comptes_rendus_biologiques_origine_auteur_check"
    CHECK (("origine" = 'praticien') = ("depose_par" IS NOT NULL)),
  ADD CONSTRAINT "comptes_rendus_biologiques_motif_ecart_check"
    CHECK ("motif_ecart" IN ('illisible', 'document_non_conforme')),
  ADD CONSTRAINT "comptes_rendus_biologiques_ecarte_par_check"
    CHECK ("ecarte_par" ~ '\S' AND char_length("ecarte_par") <= 320),
  -- L'écart est entier ou absent : date, auteur et motif ensemble.
  ADD CONSTRAINT "comptes_rendus_biologiques_ecart_entier_check"
    CHECK (
      ("ecarte_le" IS NULL) = ("ecarte_par" IS NULL)
      AND ("ecarte_le" IS NULL) = ("motif_ecart" IS NULL)
    ),
  -- Seul un document transmis par le patient s'écarte ; le praticien qui
  -- s'est trompé de dossier RETIRE son propre dépôt (LOT-02).
  ADD CONSTRAINT "comptes_rendus_biologiques_ecart_origine_check"
    CHECK ("ecarte_le" IS NULL OR "origine" = 'patient'),
  -- Écart ⇔ purge motivée `ecarte`. `coalesce` : un motif NULL n'est pas
  -- `ecarte`, et le CHECK ne doit pas être satisfait par une inconnue.
  ADD CONSTRAINT "comptes_rendus_biologiques_ecart_purge_check"
    CHECK ((coalesce("motif_purge", '') = 'ecarte') = ("ecarte_le" IS NOT NULL));

-- ── LE DÉPÔT : NE NAÎT NI PURGÉ NI ÉCARTÉ ──────────────────────────────────
--
-- Reprise de la fonction de `bio_ingest_purge_compte_rendu_v1`, avec le refus
-- de l'écart à l'insertion en plus.

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
  IF NEW.ecarte_le IS NOT NULL OR NEW.ecarte_par IS NOT NULL OR NEW.motif_ecart IS NOT NULL THEN
    RAISE EXCEPTION 'compte rendu refusé : un dépôt ne naît pas écarté.';
  END IF;
  NEW.depose_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- ── LA PURGE, ET L'ÉCART QUI EN EST UNE : LA SEULE MODIFICATION ADMISE ─────
--
-- Reprise de la fonction de `bio_ingest_purge_compte_rendu_v1`. Ce qui
-- change : `origine` rejoint les colonnes figées ; le motif `ecarte` est
-- jugé ; un autre motif ne pose aucun écart.

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
  IF (NEW.id, NEW.id_patient, NEW.type_mime, NEW.empreinte_sha256, NEW.depose_par, NEW.depose_le, NEW.origine)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.type_mime, OLD.empreinte_sha256, OLD.depose_par, OLD.depose_le, OLD.origine) THEN
    RAISE EXCEPTION 'compte rendu refusé : la purge n''efface que le document.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.imports_biologiques i
    WHERE i.id_compte_rendu = OLD.id AND i.statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'purge refusée : une extraction de ce compte rendu est en cours.';
  END IF;
  IF NEW.motif_purge IS DISTINCT FROM 'ecarte'
     AND (NEW.ecarte_le IS NOT NULL OR NEW.ecarte_par IS NOT NULL OR NEW.motif_ecart IS NOT NULL) THEN
    RAISE EXCEPTION 'purge refusée : seul le motif « ecarte » pose un écart.';
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
  ELSIF NEW.motif_purge = 'ecarte' THEN
    IF OLD.origine IS DISTINCT FROM 'patient' THEN
      RAISE EXCEPTION 'écart refusé : seul un document transmis par le patient s''écarte.';
    END IF;
    IF NEW.ecarte_par IS NULL OR NEW.motif_ecart IS NULL THEN
      RAISE EXCEPTION 'écart refusé : l''écart porte son auteur et son motif.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.lignes_biologiques_candidates l
      JOIN public.imports_biologiques i ON i.id = l.id_import
      WHERE i.id_compte_rendu = OLD.id AND l.statut = 'validee'
    ) THEN
      RAISE EXCEPTION 'écart refusé : une ligne de ce compte rendu est validée.';
    END IF;
    NEW.ecarte_le := clock_timestamp() AT TIME ZONE 'UTC';
  ELSE
    RAISE EXCEPTION 'purge refusée : motif % inconnu.', NEW.motif_purge;
  END IF;
  NEW.purge_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- Le trigger `comptes_rendus_biologiques_avant_purge` reste branché sur la
-- fonction remplacée ; ses droits révoqués sont conservés par CREATE OR
-- REPLACE.

-- ── LA LIGNE : PLUS AUCUNE VALIDATION APRÈS L'ÉCART ────────────────────────
--
-- L'écart est refusé si une ligne est validée ; la RÉCIPROQUE doit tenir aussi
-- (revue `wn-reviewer`, P1) : après l'écart, une ligne encore proposée d'une
-- extraction de ce document reste DÉCIDABLE — elle peut s'écarter — mais ne
-- se valide plus. Sinon une valeur tirée d'un document jugé illisible ou « pas
-- le compte rendu de ce patient » entrerait au dossier, pendant que le patient
-- lit « refusé ».
--
-- LE VERROU CROISE LES DEUX : la validation lit le compte rendu `FOR SHARE`.
-- Un écart en cours (verrou de ligne de l'UPDATE) la fait attendre, puis elle
-- voit le motif `ecarte` et refuse ; une validation en cours fait attendre
-- l'écart, dont le trigger voit alors la ligne validée et refuse.
--
-- Reprise de la fonction de `bio_ingest_faits_non_transcrits_v1` ; seul le
-- refus après écart s'ajoute.

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
  motif_purge_document text;
BEGIN
  IF OLD.statut <> 'proposee' THEN
    RAISE EXCEPTION 'ligne figée : une ligne décidée (%) ne change plus.', OLD.statut;
  END IF;
  IF NEW.statut NOT IN ('validee', 'ecartee') THEN
    RAISE EXCEPTION 'ligne refusée : une ligne proposée ne change que par la décision du praticien.';
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.id_import, NEW.rang, NEW.page, NEW.libelle_lu, NEW.valeur_lue,
      NEW.unite_lue, NEW.preleve_le_lu, NEW.heure_lue, NEW.intervalle_lu, NEW.marquage_lu,
      NEW.intervalle_non_transcrit, NEW.marquage_non_transcrit, NEW.analyte_propose, NEW.statut_mapping)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_import, OLD.rang, OLD.page, OLD.libelle_lu, OLD.valeur_lue,
      OLD.unite_lue, OLD.preleve_le_lu, OLD.heure_lue, OLD.intervalle_lu, OLD.marquage_lu,
      OLD.intervalle_non_transcrit, OLD.marquage_non_transcrit, OLD.analyte_propose, OLD.statut_mapping) THEN
    RAISE EXCEPTION 'ligne refusée : ce qui a été lu ne se réécrit pas.';
  END IF;
  SELECT i.statut, i.termine_le INTO statut_import, fin_import
  FROM public.imports_biologiques i
  WHERE i.id = NEW.id_import
  FOR SHARE;
  IF statut_import IS DISTINCT FROM 'extrait' THEN
    RAISE EXCEPTION 'ligne refusée : seule une extraction terminée se valide (%).', statut_import;
  END IF;
  IF NEW.statut = 'validee' THEN
    SELECT c.motif_purge INTO motif_purge_document
    FROM public.comptes_rendus_biologiques c
    JOIN public.imports_biologiques i ON i.id_compte_rendu = c.id
    WHERE i.id = NEW.id_import
    FOR SHARE OF c;
    IF motif_purge_document = 'ecarte' THEN
      RAISE EXCEPTION 'ligne refusée : le compte rendu dont elle est tirée a été écarté.';
    END IF;
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

-- RETOUR ARRIÈRE (si jamais) : par une NOUVELLE migration compensatrice, relue
-- et approuvée (`release-db`), jamais en réécrivant l'historique. DANS CET
-- ORDRE :
--  1. déployer d'abord le code qui ne dépose plus pour le patient et n'écarte
--     plus, avec un `schema.prisma` qui ne porte plus `origine` ni `ecarte_*`
--     — sinon toute lecture Prisma sans `select` échoue dès les colonnes
--     supprimées ;
--  2. la migration compensatrice reprend les deux fonctions du compte rendu
--     dans leur version `bio_ingest_purge_compte_rendu_v1` et celle de la
--     ligne dans sa version `bio_ingest_faits_non_transcrits_v1`, supprime les
--     sept CHECK ajoutés et
--     l'index, rétablit le CHECK de motif de purge à deux valeurs, puis
--     supprime `origine` et les colonnes `ecarte_*`, et rétablit `depose_par`
--     NOT NULL — SEULEMENT si aucun document d'origine patient n'existe. Sinon
--     ces lignes restent : un document transmis, même écarté, garde son
--     empreinte, qui tient la provenance (A5) et le refus du doublon.
