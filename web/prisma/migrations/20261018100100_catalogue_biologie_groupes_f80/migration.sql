-- SEPT FICHES D'ANALYTE POUR LES ANALYSES GROUPÉES (F80, D-323 §6).
--
-- Migration demandée explicitement par le responsable (plan du lot F80
-- approuvé le 2026-10-18). Arbitrage du responsable (2026-10-17) : entrent au
-- catalogue le bilan thyroïdien (T4 libre, T3 libre), l'ionogramme complet
-- (acte 1610, avec ses constituants absents : bicarbonates, protides) et le
-- bilan hépatique complété (bilirubine 1601, phosphatases alcalines 0514, que
-- le motif du bilan hépatique citait sans fiche).
--
-- Même forme que les fiches existantes (20261003150000) : unité usuelle déjà
-- admise par `biology_analytes_unite_check`, niveau « partielle » ;
-- l'ionogramme complet, groupe sans unité, « lacunaire » comme l'ionogramme.
-- AUCUNE plage, AUCUN lien clinique, AUCUNE correspondance NABM, AUCUNE
-- composition : les actes et la composition se signent par le praticien
-- (PR 2). Pas d'analyte « bilan thyroïdien » (D-323 §6). Les alias d'import
-- de compte rendu sont hors de cette migration (résolveur signé) : ces fiches
-- se saisissent à la main.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    -- Bilan thyroïdien
    ('bioan_t4_libre', 'BIO_T4_LIBRE', 'Thyroxine libre (T4L)', 'pmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_t3_libre', 'BIO_T3_LIBRE', 'Triiodothyronine libre (T3L)', 'pmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Ionogramme complet
    ('bioan_ionogramme_complet', 'BIO_IONOGRAMME_COMPLET', 'Ionogramme sanguin complet', NULL, 'sang', 'saisie_praticien', 'lacunaire', ARRAY['unite']::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_bicarbonates', 'BIO_BICARBONATES', 'Bicarbonates (CO2 total)', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_protides', 'BIO_PROTIDES', 'Protides totaux', 'g/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Bilan hépatique complété
    ('bioan_bilirubine', 'BIO_BILIRUBINE', 'Bilirubine', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_phosphatases_alcalines', 'BIO_PHOSPHATASES_ALCALINES', 'Phosphatases alcalines', 'UI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
