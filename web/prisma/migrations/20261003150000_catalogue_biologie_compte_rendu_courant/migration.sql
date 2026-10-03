-- Catalogue biologie — les analyses d'un compte rendu courant (D-261, LOT-06
-- de BIO-INGEST). DONNÉES + une unité au vocabulaire : aucune plage, aucune
-- borne, aucune indication (D-059), aucune conversion (D-157).
--
-- La première extraction de production (D-260 : 58 lignes, 6 rapprochées) a
-- montré que le catalogue ignore ce qu'un laboratoire imprime le plus : détail
-- de la NFS, ionogramme, créatinine et DFG, transaminases, lipides détaillés,
-- transferrine. Sans code au catalogue, une ligne lue ne peut pas être validée.
--
-- UNE unité par analyte, en SI (arbitrage du responsable, 2026-10-03) : le
-- laboratoire en imprime souvent deux ; la ligne dans l'autre unité sera
-- écartée, jamais convertie. Hors SI molaire, par usage : la transferrine en
-- g/L (comme l'albumine), les numérations en 10^9/L et 10^12/L.
--
-- La formule leucocytaire entre DEUX fois : en valeur absolue et en
-- pourcentage. Ce sont deux mesures imprimées, pas une conversion.
--
-- Les quatre composites sans unité (BIO_NFS, BIO_IONOGRAMME,
-- BIO_BILAN_HEPATIQUE, BIO_PROFIL_LIPIDIQUE) restent tels quels : les panels
-- PANEL_FATIGUE_1 et PANEL_METABOLIQUE_1 les citent. Ce fichier ne touche à
-- aucun panel.
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier n'écrit dans aucune table de
-- résultats.

-- ── Extension ADDITIVE du vocabulaire d'unités : « mL/min/1,73 m² » (DFG) ──
-- « Défini une fois, appliqué QUATRE fois » (20260817090000, D-122 §2) :
-- l'analyte, les deux tables de plages et les résultats portent la même liste.
-- Les contrats `cb_catalogue_niveau_1_donnees.sql` et
-- `cb_resultats_biologiques_v1_negatif.sql` tiennent l'égalité.
ALTER TABLE "biology_analytes" DROP CONSTRAINT "biology_analytes_unite_check";
ALTER TABLE "biology_analytes" ADD CONSTRAINT "biology_analytes_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²'));
ALTER TABLE "biology_reference_ranges" DROP CONSTRAINT "biology_reference_ranges_unite_check";
ALTER TABLE "biology_reference_ranges" ADD CONSTRAINT "biology_reference_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²'));
ALTER TABLE "biology_functional_ranges" DROP CONSTRAINT "biology_functional_ranges_unite_check";
ALTER TABLE "biology_functional_ranges" ADD CONSTRAINT "biology_functional_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²'));
ALTER TABLE "resultats_biologiques" DROP CONSTRAINT "resultats_biologiques_unite_check";
ALTER TABLE "resultats_biologiques" ADD CONSTRAINT "resultats_biologiques_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²'));

-- ── 36 analytes (composition neutre, zéro indication) ───────────────────────
-- Patron de 20260924090000 : `saisie_praticien`, `partielle`, aucune donnée
-- manquante structurelle, pas de validation médicale requise (arbitrage F.6 :
-- l'insulinémie seule).
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    -- Hémogramme
    ('bioan_hematies', 'BIO_HEMATIES', 'Hématies', '10^12/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_hematocrite', 'BIO_HEMATOCRITE', 'Hématocrite', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_vgm', 'BIO_VGM', 'Volume globulaire moyen (VGM)', 'fL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_tcmh', 'BIO_TCMH', 'Teneur corpusculaire moyenne en hémoglobine (TCMH)', 'pg', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ccmh', 'BIO_CCMH', 'Concentration corpusculaire moyenne en hémoglobine (CCMH)', 'g/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_idr', 'BIO_IDR', 'Indice de distribution des globules rouges (IDR)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_leucocytes', 'BIO_LEUCOCYTES', 'Leucocytes', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_plaquettes', 'BIO_PLAQUETTES', 'Plaquettes', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_vpm', 'BIO_VPM', 'Volume plaquettaire moyen (VPM)', 'fL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Formule leucocytaire : valeur absolue, puis pourcentage
    ('bioan_neutrophiles', 'BIO_NEUTROPHILES', 'Polynucléaires neutrophiles', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_eosinophiles', 'BIO_EOSINOPHILES', 'Polynucléaires éosinophiles', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_basophiles', 'BIO_BASOPHILES', 'Polynucléaires basophiles', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_lymphocytes', 'BIO_LYMPHOCYTES', 'Lymphocytes', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_monocytes', 'BIO_MONOCYTES', 'Monocytes', '10^9/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_neutrophiles_pct', 'BIO_NEUTROPHILES_PCT', 'Polynucléaires neutrophiles (%)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_eosinophiles_pct', 'BIO_EOSINOPHILES_PCT', 'Polynucléaires éosinophiles (%)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_basophiles_pct', 'BIO_BASOPHILES_PCT', 'Polynucléaires basophiles (%)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_lymphocytes_pct', 'BIO_LYMPHOCYTES_PCT', 'Lymphocytes (%)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_monocytes_pct', 'BIO_MONOCYTES_PCT', 'Monocytes (%)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Ionogramme
    ('bioan_sodium', 'BIO_SODIUM', 'Sodium', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_potassium', 'BIO_POTASSIUM', 'Potassium', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_chlore', 'BIO_CHLORE', 'Chlore', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Fonction rénale
    ('bioan_creatinine', 'BIO_CREATININE', 'Créatinine', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_dfg_ckd_epi', 'BIO_DFG_CKD_EPI', 'Débit de filtration glomérulaire estimé (CKD-EPI)', 'mL/min/1,73 m²', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Bilan hépatique
    ('bioan_asat', 'BIO_ASAT', 'ASAT (transaminases TGO)', 'UI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_alat', 'BIO_ALAT', 'ALAT (transaminases TGP)', 'UI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ggt', 'BIO_GGT', 'Gamma-glutamyl transférase (GGT)', 'UI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Lipides détaillés
    ('bioan_cholesterol_total', 'BIO_CHOLESTEROL_TOTAL', 'Cholestérol total', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_hdl', 'BIO_HDL', 'Cholestérol HDL', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ldl_calcule', 'BIO_LDL_CALCULE', 'Cholestérol LDL calculé', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_non_hdl', 'BIO_NON_HDL', 'Cholestérol non-HDL', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_triglycerides', 'BIO_TRIGLYCERIDES', 'Triglycérides', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    -- Fer, vitamine B12, CRP : des formes DISTINCTES de celles déjà au
    -- catalogue (BIO_B12_HOLOTC est la forme active, BIO_CRP_US la mesure
    -- ultrasensible) — jamais confondues.
    ('bioan_transferrine', 'BIO_TRANSFERRINE', 'Transferrine', 'g/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ctf', 'BIO_CTF', 'Capacité totale de fixation de la transferrine', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_vitamine_b12', 'BIO_VITAMINE_B12', 'Vitamine B12', 'pmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_crp', 'BIO_CRP', 'CRP (protéine C réactive)', 'mg/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
