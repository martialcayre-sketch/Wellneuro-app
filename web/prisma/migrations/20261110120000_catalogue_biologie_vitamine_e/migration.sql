-- Catalogue biologie — la vitamine E sanguine entre au catalogue (D-473 ;
-- restes du dossier polyphénols et antioxydants, H15). DONNÉES SEULES :
-- aucune plage, aucune borne, aucune indication (D-059), aucune conversion
-- (D-157), aucune unité ajoutée au vocabulaire (« µmol/L » y est déjà).
--
-- Lu en production le 2026-11-10 (conteneurs détachés, lecture seule,
-- agrégats) : aucun analyte de vitamine E au catalogue (116 analytes) ;
-- aucune ligne de compte rendu importée ne la nomme ; un seul acte de la
-- nomenclature V105 la nomme (7302, actif).
--
-- Unité : celle du passage de la source WN-SRC-0649 au corpus, seule unité
-- portée par un claim VALIDE sur la vitamine E (D-473 §2) — aucun compte rendu
-- lu ne la fonde. Libellé : nom de l'analyte et forme dosée, arbitrés par le
-- responsable le 2026-11-10 (D-473 §3).
--
-- Même forme que les fiches existantes (20261025140000) : `saisie_praticien`,
-- « partielle », prélèvement « sang ». AUCUN panel (l'entrée dans un panel
-- est clinique : lot et décision à part), AUCUNE composition, AUCUN lien
-- d'axe, AUCUNE correspondance NABM en base (le candidat 7302 est proposé par
-- `candidatsNabm.ts` et n'entre qu'à la signature du praticien, M-3). Le
-- libellé n'entre au résolveur signé qu'après l'application constatée de ce
-- fichier (clé étrangère d'`analyte_propose`, D-376 §7, D-473 §6).
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier n'écrit dans aucune table de
-- résultats.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    ('bioan_vitamine_e', 'BIO_VITAMINE_E', 'Vitamine E (alpha-tocophérol)', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
