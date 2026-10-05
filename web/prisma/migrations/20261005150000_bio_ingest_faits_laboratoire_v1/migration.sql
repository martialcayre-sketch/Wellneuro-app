-- BIO-INGEST LOT-07 — les faits du laboratoire ([[D-267]]).
--
-- L'intervalle de référence et le marquage d'anomalie TELS QU'IMPRIMÉS sont
-- transcrits sur la ligne lue, jamais sur `resultats_biologiques` ([[D-256]]
-- A5 intact : la liste blanche de `cb_resultats_biologiques_v1_negatif.sql`
-- n'est pas rouverte). Ce sont des faits du document, pas des plages : aucune
-- borne min/max n'est dérivée, aucun marquage n'est calculé ([[D-157]]).
--
-- CE QUE LA BASE TIENT :
--   1. deux colonnes texte NULLABLES — absent de l'impression ⇒ NULL ;
--   2. non vides si présentes (`~ '\S'`, jamais `btrim` à un argument, qui ne
--      retire que l'espace ASCII ; la portée de `\S` au-delà de l'ASCII dépend
--      de la locale de la base : une valeur faite d'espaces insécables seules
--      passerait — le parseur, qui écrit seul ces colonnes, la rogne avant) et
--      bornées en longueur. Les bornes sont
--      techniques (un intervalle par âge ou par sexe tient sur une ligne de
--      compte rendu), aucune n'est clinique ;
--   3. figées avec ce qui a été lu : la décision du praticien ne les réécrit
--      pas. La fonction de modification de la ligne est reprise de
--      `bio_ingest_purge_compte_rendu_v1` ; seule la liste des colonnes
--      figées gagne `intervalle_lu` et `marquage_lu`.
--
-- La purge ([[D-258]]) ne vide que `comptes_rendus_biologiques.contenu` : les
-- lignes et leurs faits survivent, sans rien à ajouter ici.
--
-- Les lignes déjà lues (`bio-extraction-v1`) gardent NULL : aucun rattrapage.

-- AlterTable
ALTER TABLE "lignes_biologiques_candidates"
  ADD COLUMN "intervalle_lu" TEXT,
  ADD COLUMN "marquage_lu" TEXT;

ALTER TABLE "lignes_biologiques_candidates"
  ADD CONSTRAINT "lignes_biologiques_candidates_intervalle_lu_check"
    CHECK ("intervalle_lu" ~ '\S' AND char_length("intervalle_lu") <= 300),
  ADD CONSTRAINT "lignes_biologiques_candidates_marquage_lu_check"
    CHECK ("marquage_lu" ~ '\S' AND char_length("marquage_lu") <= 50);

-- ── LA LIGNE : LES FAITS DU LABORATOIRE FIGÉS AVEC CE QUI A ÉTÉ LU ──────────

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
      NEW.unite_lue, NEW.preleve_le_lu, NEW.heure_lue, NEW.intervalle_lu, NEW.marquage_lu,
      NEW.analyte_propose, NEW.statut_mapping)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_import, OLD.rang, OLD.page, OLD.libelle_lu, OLD.valeur_lue,
      OLD.unite_lue, OLD.preleve_le_lu, OLD.heure_lue, OLD.intervalle_lu, OLD.marquage_lu,
      OLD.analyte_propose, OLD.statut_mapping) THEN
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

-- Hygiène d'exécution : la fonction remplacée par CREATE OR REPLACE garde ses
-- droits révoqués ; aucune fonction nouvelle.

-- RETOUR ARRIÈRE (si jamais) : par une NOUVELLE migration compensatrice, relue
-- et approuvée (`release-db`), jamais en réécrivant l'historique. DANS CET
-- ORDRE :
--  1. déployer d'abord le code qui n'écrit ni ne lit plus `intervalle_lu` ni
--     `marquage_lu`, avec un `schema.prisma` qui ne les porte plus — sinon
--     toute lecture Prisma sans `select` échoue dès les colonnes supprimées ;
--  2. la migration compensatrice reprend la fonction de
--     `bio_ingest_purge_compte_rendu_v1` (liste figée sans les deux colonnes),
--     puis supprime les deux CHECK et les deux colonnes. Les faits transcrits
--     sont alors perdus : ils ne se restaurent pas, le document étant purgé.
