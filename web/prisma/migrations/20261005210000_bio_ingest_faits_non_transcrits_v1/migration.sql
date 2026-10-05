-- BIO-INGEST LOT-07 — un fait du laboratoire NON TRANSCRIT se dit ([[D-267]] §10).
--
-- Arbitrage du responsable (2026-10-05) : un intervalle imprimé plus long que
-- la borne technique de `intervalle_lu` (300 caractères) n'est ni tronqué (ce
-- serait trahir le verbatim), ni bloquant (tout l'import échouerait), ni
-- l'occasion d'une borne nouvelle : le fait reste NULL, et la ligne le DIT, de
-- façon visible à la validation. Le même traitement vaut pour un marquage plus
-- long que 50 caractères. Sans colonne, le signal mourait avec la requête
-- d'extraction : la validation a lieu plus tard.
--
-- CE QUE LA BASE TIENT :
--   1. deux booléens NON NULL, faux par défaut : les lignes existantes (toutes
--      `bio-extraction-v1`) lisent « rien d'omis », ce qui est vrai — la v1 ne
--      relevait aucun fait ;
--   2. cohérence : un fait dit non transcrit est NULL (un booléen vrai à côté
--      d'un texte présent est refusé) ;
--   3. figés avec ce qui a été lu, comme les faits eux-mêmes : la fonction de
--      modification de la ligne est reprise de
--      `bio_ingest_faits_laboratoire_v1`, seule la liste des colonnes figées
--      gagne les deux booléens.
--
-- Aucune donnée nouvelle n'est conservée : un booléen ne recopie rien du
-- document. Rien sur `resultats_biologiques` ([[D-256]] A5).

-- AlterTable
ALTER TABLE "lignes_biologiques_candidates"
  ADD COLUMN "intervalle_non_transcrit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marquage_non_transcrit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "lignes_biologiques_candidates"
  ADD CONSTRAINT "lignes_biologiques_candidates_intervalle_non_transcrit_check"
    CHECK (NOT "intervalle_non_transcrit" OR "intervalle_lu" IS NULL),
  ADD CONSTRAINT "lignes_biologiques_candidates_marquage_non_transcrit_check"
    CHECK (NOT "marquage_non_transcrit" OR "marquage_lu" IS NULL);

-- ── LA LIGNE : LE SIGNAL FIGÉ AVEC CE QUI A ÉTÉ LU ──────────────────────────

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
-- et approuvée (`release-db`), jamais en réécrivant l'historique. D'abord le
-- code qui n'écrit ni ne lit plus les deux booléens, avec un `schema.prisma`
-- qui ne les porte plus ; puis la fonction de `bio_ingest_faits_laboratoire_v1`
-- reprise telle quelle, puis les deux CHECK et les deux colonnes supprimés. Le
-- signal est alors perdu ; les faits, eux, ne bougent pas.
