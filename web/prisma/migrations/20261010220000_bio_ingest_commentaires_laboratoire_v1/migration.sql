-- BIO-INGEST — LES COMMENTAIRES DU LABORATOIRE ([[D-278]] §3, lot de sécurité 11A).
--
-- Arbitrage du responsable du 2026-10-10 : les commentaires que le laboratoire
-- imprime (valeur critique, hémolyse, contrôle souhaité) sont RECOPIÉS TELS
-- QU'IMPRIMÉS, sans les compléter, les reformuler ni en rien conclure. Jusqu'ici
-- la consigne d'extraction les écartait, et ils disparaissaient du dossier à la
-- purge du document ([[D-258]]). MIGRATION SEULE : le code qui les relève et les
-- montre vient après la `release-db` et son constat.
--
-- DEUX PORTÉES, DEUX TABLES :
--   - le commentaire qui porte sur UN résultat va sur sa ligne lue
--     (`lignes_biologiques_candidates.commentaire_lu`) ;
--   - les commentaires qui portent sur le compte rendu entier vont sur
--     l'extraction qui les a lus (`imports_biologiques.commentaires_lus`),
--     posés à la terminaison comme le laboratoire lu.
-- Rien sur `resultats_biologiques` ([[D-256]] A5 intact, comme [[D-267]]).
--
-- CE QUE LA BASE TIENT :
--   1. deux colonnes texte NULLABLES — rien d'imprimé ⇒ NULL ;
--   2. non vides si présentes (`~ '\S'`, jamais `btrim` à un argument) et
--      bornées en longueur. Les bornes sont TECHNIQUES — un commentaire de
--      ligne tient en 1 000 caractères, ceux d'un compte rendu en 4 000 —,
--      aucune n'est clinique ;
--   3. le signal « non transcrit » de [[D-267]] §10, pour chacune : un
--      commentaire plus long que sa borne n'est ni tronqué ni bloquant, il
--      reste NULL et la validation le DIT. Booléen NON NULL, faux par défaut ;
--      vrai seulement à côté d'un commentaire NULL ;
--   4. sur la ligne, figés avec ce qui a été lu : la fonction de modification
--      est reprise de `bio_ingest_transmission_patient_v1`, seule la liste des
--      colonnes figées gagne `commentaire_lu` et `commentaire_non_transcrit` ;
--   5. sur l'import, lus par l'extraction et jamais posés avant elle : la
--      fonction d'insertion est reprise de `bio_ingest_purge_compte_rendu_v1`,
--      le refus du laboratoire pré-posé s'étend aux deux colonnes. Une fois
--      l'extraction terminée, l'import est déjà figé tout entier
--      (`bio_ingest_import_avant_modification`, reprise de
--      `bio_ingest_staging_v1` à l'identique, seul son message de refus
--      nommant désormais les commentaires — revue de la PR #1397) ;
--   6. une extraction en ÉCHEC n'en porte aucun : ce que lit une réponse jugée
--      invalide ne survit pas à la purge (revue de la PR #1397).
--
-- La purge ([[D-258]]) ne vide que `comptes_rendus_biologiques.contenu` : les
-- commentaires survivent avec les lignes et l'import. Les lignes et imports
-- déjà lus (procédé `bio-extraction-v3` et avant) gardent NULL et « rien
-- d'omis » : aucun rattrapage, le document étant purgé ou le relevé antérieur.

-- AlterTable
ALTER TABLE "lignes_biologiques_candidates"
  ADD COLUMN "commentaire_lu" TEXT,
  ADD COLUMN "commentaire_non_transcrit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "lignes_biologiques_candidates"
  ADD CONSTRAINT "lignes_biologiques_candidates_commentaire_lu_check"
    CHECK ("commentaire_lu" ~ '\S' AND char_length("commentaire_lu") <= 1000),
  ADD CONSTRAINT "lignes_biologiques_candidates_commentaire_non_transcrit_check"
    CHECK (NOT "commentaire_non_transcrit" OR "commentaire_lu" IS NULL);

-- AlterTable
ALTER TABLE "imports_biologiques"
  ADD COLUMN "commentaires_lus" TEXT,
  ADD COLUMN "commentaires_non_transcrits" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "imports_biologiques"
  ADD CONSTRAINT "imports_biologiques_commentaires_lus_check"
    CHECK ("commentaires_lus" ~ '\S' AND char_length("commentaires_lus") <= 4000),
  ADD CONSTRAINT "imports_biologiques_commentaires_non_transcrits_check"
    CHECK (NOT "commentaires_non_transcrits" OR "commentaires_lus" IS NULL),
  ADD CONSTRAINT "imports_biologiques_commentaires_echec_check"
    CHECK ("statut" <> 'echec' OR ("commentaires_lus" IS NULL AND NOT "commentaires_non_transcrits"));

-- ── L'IMPORT : LES COMMENTAIRES SONT LUS, PAS POSÉS AVANT L'EXTRACTION ──────
--
-- Reprise de la fonction de `bio_ingest_purge_compte_rendu_v1` ; seul le refus
-- des commentaires pré-posés s'ajoute.

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
  IF NEW.commentaires_lus IS NOT NULL OR NEW.commentaires_non_transcrits THEN
    RAISE EXCEPTION 'import refusé : les commentaires sont lus par l''extraction, pas posés avant elle.';
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

-- Reprise de la fonction de `bio_ingest_staging_v1`, jamais redéfinie depuis :
-- gardes identiques, seul le message nomme ce qui change à la terminaison.

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
    RAISE EXCEPTION 'import refusé : seuls le statut, le motif d''échec, le laboratoire lu, les commentaires lus et la fin changent à la terminaison.';
  END IF;
  IF NEW.statut = 'echec' AND EXISTS (
    SELECT 1 FROM public.lignes_biologiques_candidates l WHERE l.id_import = NEW.id
  ) THEN
    RAISE EXCEPTION 'import refusé : une extraction en échec ne laisse aucune ligne candidate.';
  END IF;
  NEW.termine_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- ── LA LIGNE : LE COMMENTAIRE FIGÉ AVEC CE QUI A ÉTÉ LU ─────────────────────
--
-- Reprise de la fonction de `bio_ingest_transmission_patient_v1` ; seule la
-- liste des colonnes figées gagne `commentaire_lu` et
-- `commentaire_non_transcrit`.

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
      NEW.intervalle_non_transcrit, NEW.marquage_non_transcrit, NEW.commentaire_lu,
      NEW.commentaire_non_transcrit, NEW.analyte_propose, NEW.statut_mapping)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_import, OLD.rang, OLD.page, OLD.libelle_lu, OLD.valeur_lue,
      OLD.unite_lue, OLD.preleve_le_lu, OLD.heure_lue, OLD.intervalle_lu, OLD.marquage_lu,
      OLD.intervalle_non_transcrit, OLD.marquage_non_transcrit, OLD.commentaire_lu,
      OLD.commentaire_non_transcrit, OLD.analyte_propose, OLD.statut_mapping) THEN
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

-- Hygiène d'exécution : les fonctions remplacées par CREATE OR REPLACE gardent
-- leurs droits révoqués ; aucune fonction nouvelle.

-- RETOUR ARRIÈRE (si jamais) : par une NOUVELLE migration compensatrice, relue
-- et approuvée (`release-db`), jamais en réécrivant l'historique. DANS CET
-- ORDRE :
--  1. déployer d'abord le code qui n'écrit ni ne lit plus les quatre colonnes,
--     avec un `schema.prisma` qui ne les porte plus — sinon toute lecture
--     Prisma sans `select` échoue dès les colonnes supprimées ;
--  2. la migration compensatrice reprend les fonctions de
--     `bio_ingest_transmission_patient_v1`, de
--     `bio_ingest_purge_compte_rendu_v1` et de `bio_ingest_staging_v1`, puis supprime les cinq CHECK et les
--     quatre colonnes. Les commentaires recopiés sont alors perdus : ils ne se
--     restaurent pas, le document étant purgé.
