-- Catalogue biologie niveau 1 — DONNÉES (D-068, proposition du 2026-08-15 v5,
-- validée par le praticien ; arbitrages ouverts tranchés en session les
-- 2026-08-16/17). Composition SEULE : aucune indication ici — les règles
-- d'indication vivent dans la table signée `indicationsBiologieV1.ts` (PR-3),
-- jamais en colonnes de catalogue (D-059).
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier ne crée ni ne remplit aucune
-- table de résultats — le verrou HDS est hors de son périmètre.

-- ── Colonne D-068 §4 (arbitrage F.6) : validation médicale requise ──────────
-- Règle de sécurité PRODUIT, posée explicitement : aucun claim ne fonde que
-- l'insulinémie l'exige, et c'est dit (DC-19, chiffre/règle technique identifié).
ALTER TABLE "biology_analytes"
    ADD COLUMN "validation_medicale_requise" BOOLEAN NOT NULL DEFAULT false;

-- ── Extension ADDITIVE du vocabulaire d'unités : µg/mL (BIO_LBP) ────────────
-- Patron prévu par la migration d'origine (« une nouvelle source = une
-- migration additive élargissant ce CHECK »).
-- « Défini une fois, appliqué TROIS fois » (doctrine de la migration d'origine,
-- défaut B4 de sa revue : deux plages en unités divergentes s'affichent côte à
-- côte sans rien signaler). L'extension vaut donc pour l'analyte ET les deux
-- tables de plages — un `µg/mL` accepté sur l'analyte et refusé sur ses plages
-- aurait rendu BIO_LBP à jamais sans plage dans sa propre unité (revue de ce
-- lot, finding MA-1). Le contrat `cb_catalogue_niveau_1_donnees.sql` tient
-- l'égalité des trois vocabulaires.
ALTER TABLE "biology_analytes" DROP CONSTRAINT "biology_analytes_unite_check";
ALTER TABLE "biology_analytes" ADD CONSTRAINT "biology_analytes_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score'));
ALTER TABLE "biology_reference_ranges" DROP CONSTRAINT "biology_reference_ranges_unite_check";
ALTER TABLE "biology_reference_ranges" ADD CONSTRAINT "biology_reference_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score'));
ALTER TABLE "biology_functional_ranges" DROP CONSTRAINT "biology_functional_ranges_unite_check";
ALTER TABLE "biology_functional_ranges" ADD CONSTRAINT "biology_functional_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score'));

-- ── 47 analytes (§A de la proposition — composition neutre, zéro indication) ─
-- `source_provenance = 'saisie_praticien'` : contenu validé par le praticien.
-- `niveau_completude = 'partielle'` : la fiche complète attend plages et
-- préanalytique, qui viendront par leurs lots — seul le manque STRUCTUREL
-- (une unité absente) est déclaré en `donnees_manquantes`, l'état normal d'un
-- catalogue niveau 1 n'étant pas une « donnée manquante » (finding MI-1).
-- Blocs (NFS, bilan hépatique, ionogramme, profil lipidique) livrés SANS unité
-- — la source ne détaille pas leurs composantes, on n'en invente pas —
-- `niveau_completude = 'lacunaire'` et la donnée manquante est déclarée.
-- Les quatre entrées « rapport/indice » sont des ANALYTES (fidélité §A) : leurs
-- opérandes ne sont pas tous au catalogue, les décomposer serait inventer.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    ('bioan_ferritine', 'BIO_FERRITINE', 'Ferritine', 'ng/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_fer_serique', 'BIO_FER_SERIQUE', 'Fer sérique', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_coef_saturation', 'BIO_COEF_SATURATION', 'Coefficient de saturation de la sidérophiline', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_zinc_plasmatique', 'BIO_ZINC_PLASMATIQUE', 'Zinc plasmatique', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_magnesium_erythrocytaire', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 'Magnésium érythrocytaire', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_vitamine_d_25oh', 'BIO_VITAMINE_D_25OH', 'Vitamine D (25-OH)', 'ng/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_folates_erythrocytaires', 'BIO_FOLATES_ERYTHROCYTAIRES', 'Folates érythrocytaires', 'nmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_b12_holotc', 'BIO_B12_HOLOTC', 'Vitamine B12 active (holotranscobalamine)', 'pmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_selenium', 'BIO_SELENIUM', 'Sélénium plasmatique', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_iodurie', 'BIO_IODURIE', 'Iodurie', 'µg/24h', 'urine', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_cuivre', 'BIO_CUIVRE', 'Cuivre', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_zinc_cuivre', 'BIO_RATIO_ZINC_CUIVRE', 'Rapport zinc / cuivre', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_glycemie_jeun', 'BIO_GLYCEMIE_JEUN', 'Glycémie à jeun', 'mmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_insulinemie', 'BIO_INSULINEMIE', 'Insulinémie à jeun', 'mUI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP),
    ('bioan_ratio_homa', 'BIO_RATIO_HOMA', 'Indice HOMA', 'score', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_hba1c', 'BIO_HBA1C', 'Hémoglobine glyquée', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_erythrocytaires', 'BIO_AG_ERYTHROCYTAIRES', 'Statut des acides gras érythrocytaires', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_profil_lipidique', 'BIO_PROFIL_LIPIDIQUE', 'Profil lipidique', NULL, 'sang', 'saisie_praticien', 'lacunaire', ARRAY['unite']::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_albumine', 'BIO_ALBUMINE', 'Albumine', 'g/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_crp_us', 'BIO_CRP_US', 'CRP ultrasensible', 'mg/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_homocysteine', 'BIO_HOMOCYSTEINE', 'Homocystéine', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_nfs', 'BIO_NFS', 'Numération formule sanguine', NULL, 'sang', 'saisie_praticien', 'lacunaire', ARRAY['unite']::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_tsh_us', 'BIO_TSH_US', 'TSH ultrasensible', 'mUI/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_hemoglobine', 'BIO_HEMOGLOBINE', 'Hémoglobine', 'g/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_bilan_hepatique', 'BIO_BILAN_HEPATIQUE', 'Bilan hépatique', NULL, 'sang', 'saisie_praticien', 'lacunaire', ARRAY['unite']::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ionogramme', 'BIO_IONOGRAMME', 'Ionogramme sanguin', NULL, 'sang', 'saisie_praticien', 'lacunaire', ARRAY['unite']::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_acide_urique', 'BIO_ACIDE_URIQUE', 'Acide urique', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_anti_tpo', 'BIO_ANTI_TPO', 'Anticorps anti-TPO', 'UI/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_t3_reverse', 'BIO_T3_REVERSE', 'T3 reverse', 'ng/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_anti_ldl_oxyde', 'BIO_ANTI_LDL_OXYDE', 'Anticorps anti-LDL oxydé', 'UI/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_coenzyme_q10', 'BIO_COENZYME_Q10', 'Coenzyme Q10 plasmatique', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_glutathion', 'BIO_GLUTATHION', 'Glutathion', 'µmol/L', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_kyn_trp', 'BIO_RATIO_KYN_TRP', 'Rapport kynurénine / tryptophane', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_car', 'BIO_CAR', 'Cortisol awakening response', 'nmol/L', 'salive', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_cortisol_8h_20h', 'BIO_CORTISOL_8H_20H', 'Cortisol salivaire 8h / 20h', 'nmol/L', 'salive', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_cortisol_dhea', 'BIO_RATIO_CORTISOL_DHEA', 'Rapport cortisol / DHEA', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_alpha_amylase', 'BIO_ALPHA_AMYLASE', 'Alpha-amylase salivaire', 'UI/L', 'salive', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_iga_salivaire', 'BIO_IGA_SALIVAIRE', 'IgA sécrétoire salivaire', 'mg/L', 'salive', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_6_smt', 'BIO_6_SMT', '6-sulfatoxymélatonine urinaire', 'µg/24h', 'urine', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_hva_urinaire', 'BIO_HVA_URINAIRE', 'HVA urinaire (catabolites dopamine)', 'µg/24h', 'urine', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_bdnf', 'BIO_BDNF', 'Facteur neurotrophique BDNF', 'ng/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_iga_fecales', 'BIO_IGA_FECALES', 'IgA sécrétoires fécales', 'µg/g', 'selles', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_beta_defensine_2', 'BIO_BETA_DEFENSINE_2', 'Bêta-défensines de type 2 fécales', 'µg/g', 'selles', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_agcc_fecaux', 'BIO_AGCC_FECAUX', 'Acides gras à chaîne courte fécaux', 'µg/g', 'selles', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_calprotectine', 'BIO_CALPROTECTINE', 'Calprotectine fécale', 'µg/g', 'selles', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_zonuline', 'BIO_ZONULINE', 'Zonuline', 'ng/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_lbp', 'BIO_LBP', 'LBP (protéine porteuse du LPS)', 'µg/mL', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);

-- ── 15 panels (§B/§C/§D — les panels que les règles de PR-3 référencent) ────
-- Les panels « seconde intention » (…_2) ne sont PAS transcrits : leurs
-- compositions citent des analytes hors §A (écart nommé, PR). Les deux panels
-- non indiqués ont une composition VIDE : ils existent pour porter un motif,
-- pas une prescription — et ce motif est PORTÉ : `objectif` reprend le
-- verbatim des claims WN-CL-0242-007 / WN-CL-0042-007 (revue, finding MA-4 —
-- si la table des règles glisse, la production ne montre pas deux coquilles
-- vides). `niveau` des panels population et non indiqués : 'socle' (choix
-- technique, colonne NOT NULL — DC-20). `PANEL_METABOLIQUE_OPT` :
-- 'approfondissement' — le claim le qualifie de bilan OPTIONNEL, hors première
-- intention, et 'socle' aurait orienté à tort tout tri lisant cette colonne
-- (finding MA-5 ; classement technique identifié comme tel, DC-20).
INSERT INTO "biology_panels" ("id", "code", "libelle", "niveau", "objectif", "updated_at")
VALUES
    ('biopan_humeur_1', 'PANEL_HUMEUR_1', 'Troubles de l''humeur et dépression', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_anxiete_1', 'PANEL_ANXIETE_1', 'Anxiété et troubles anxieux', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_stress_1', 'PANEL_STRESS_1', 'Stress, adaptation, surmenage', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_sommeil_1', 'PANEL_SOMMEIL_1', 'Troubles du sommeil', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_memoire_1', 'PANEL_MEMOIRE_1', 'Troubles de la mémoire et cognition', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_digestif_1', 'PANEL_DIGESTIF_1', 'Troubles fonctionnels intestinaux', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_fatigue_1', 'PANEL_FATIGUE_1', 'Fatigue', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_neurodeg_1', 'PANEL_NEURODEG_1', 'Neurodégénératif et vieillissement cérébral', 'approfondissement', NULL, CURRENT_TIMESTAMP),
    ('biopan_metabolique_1', 'PANEL_METABOLIQUE_1', 'Insulinorésistance et syndrome métabolique', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_metabolique_opt', 'PANEL_METABOLIQUE_OPT', 'Insulinorésistance et syndrome métabolique — bilan optionnel', 'approfondissement', NULL, CURRENT_TIMESTAMP),
    ('biopan_sjsr', 'PANEL_SJSR', 'Syndrome des jambes sans repos', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_pop_femme', 'PANEL_POP_FEMME', 'Femme — population à risque de déficit martial', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_pop_agee', 'PANEL_POP_AGEE', 'Personne âgée', 'socle', NULL, CURRENT_TIMESTAMP),
    ('biopan_mg_plasmatique', 'PANEL_MG_PLASMATIQUE', 'Magnésium plasmatique', 'socle', 'Non indiqué actuellement — WN-CL-0242-007, verbatim : « Le dosage plasmatique du magnésium circulant n''est pas recommandé en première intention : seulement 1 % du pool magnésien se trouve sous cette forme. L''exploration pertinente est le magnésium érythrocytaire. »', CURRENT_TIMESTAMP),
    ('biopan_cortisol_isole', 'PANEL_CORTISOL_ISOLE', 'Cortisol matinal isolé', 'socle', 'Non indiqué actuellement — WN-CL-0042-007, verbatim : « Une mesure matinale unique de cortisol est peu fiable en raison des variations inter-individuelles et des rythmes biologiques ; l''exploration pertinente est le cortisol awakening response, qui repose sur deux mesures matinales. »', CURRENT_TIMESTAMP);

-- Écarts de composition nommés (jamais comblés) : l'apoprotéine de
-- WN-CL-0178-054 (PANEL_METABOLIQUE_1) et « les IgA sécrétoires » de
-- WN-CL-0178-055 (PANEL_METABOLIQUE_OPT — le claim ne dit pas le site de
-- prélèvement, salivaire et fécales existent toutes deux) n'ont pas de code
-- §A : lignes omises, à rouvrir si une source les précise.
INSERT INTO "biology_panel_items" ("id", "panel_code", "analyte_code", "position")
VALUES
    ('biopi_humeur_1_01', 'PANEL_HUMEUR_1', 'BIO_FERRITINE', 1),
    ('biopi_humeur_1_02', 'PANEL_HUMEUR_1', 'BIO_ZINC_PLASMATIQUE', 2),
    ('biopi_humeur_1_03', 'PANEL_HUMEUR_1', 'BIO_VITAMINE_D_25OH', 3),
    ('biopi_humeur_1_04', 'PANEL_HUMEUR_1', 'BIO_IODURIE', 4),
    ('biopi_humeur_1_05', 'PANEL_HUMEUR_1', 'BIO_AG_ERYTHROCYTAIRES', 5),
    ('biopi_humeur_1_06', 'PANEL_HUMEUR_1', 'BIO_FOLATES_ERYTHROCYTAIRES', 6),
    ('biopi_humeur_1_07', 'PANEL_HUMEUR_1', 'BIO_HOMOCYSTEINE', 7),
    ('biopi_humeur_1_08', 'PANEL_HUMEUR_1', 'BIO_B12_HOLOTC', 8),
    ('biopi_humeur_1_09', 'PANEL_HUMEUR_1', 'BIO_FER_SERIQUE', 9),
    ('biopi_anxiete_1_01', 'PANEL_ANXIETE_1', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 1),
    ('biopi_anxiete_1_02', 'PANEL_ANXIETE_1', 'BIO_VITAMINE_D_25OH', 2),
    ('biopi_anxiete_1_03', 'PANEL_ANXIETE_1', 'BIO_FERRITINE', 3),
    ('biopi_anxiete_1_04', 'PANEL_ANXIETE_1', 'BIO_ZINC_PLASMATIQUE', 4),
    ('biopi_anxiete_1_05', 'PANEL_ANXIETE_1', 'BIO_CRP_US', 5),
    ('biopi_stress_1_01', 'PANEL_STRESS_1', 'BIO_CAR', 1),
    ('biopi_stress_1_02', 'PANEL_STRESS_1', 'BIO_CORTISOL_8H_20H', 2),
    ('biopi_stress_1_03', 'PANEL_STRESS_1', 'BIO_RATIO_CORTISOL_DHEA', 3),
    ('biopi_stress_1_04', 'PANEL_STRESS_1', 'BIO_ALPHA_AMYLASE', 4),
    ('biopi_stress_1_05', 'PANEL_STRESS_1', 'BIO_IGA_SALIVAIRE', 5),
    ('biopi_sommeil_1_01', 'PANEL_SOMMEIL_1', 'BIO_6_SMT', 1),
    ('biopi_sommeil_1_02', 'PANEL_SOMMEIL_1', 'BIO_VITAMINE_D_25OH', 2),
    ('biopi_sommeil_1_03', 'PANEL_SOMMEIL_1', 'BIO_FERRITINE', 3),
    ('biopi_sommeil_1_04', 'PANEL_SOMMEIL_1', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 4),
    ('biopi_memoire_1_01', 'PANEL_MEMOIRE_1', 'BIO_FOLATES_ERYTHROCYTAIRES', 1),
    ('biopi_memoire_1_02', 'PANEL_MEMOIRE_1', 'BIO_B12_HOLOTC', 2),
    ('biopi_memoire_1_03', 'PANEL_MEMOIRE_1', 'BIO_CRP_US', 3),
    ('biopi_memoire_1_04', 'PANEL_MEMOIRE_1', 'BIO_AG_ERYTHROCYTAIRES', 4),
    ('biopi_memoire_1_05', 'PANEL_MEMOIRE_1', 'BIO_FERRITINE', 5),
    ('biopi_memoire_1_06', 'PANEL_MEMOIRE_1', 'BIO_ZINC_PLASMATIQUE', 6),
    ('biopi_memoire_1_07', 'PANEL_MEMOIRE_1', 'BIO_HVA_URINAIRE', 7),
    ('biopi_memoire_1_08', 'PANEL_MEMOIRE_1', 'BIO_CAR', 8),
    ('biopi_memoire_1_09', 'PANEL_MEMOIRE_1', 'BIO_VITAMINE_D_25OH', 9),
    ('biopi_memoire_1_10', 'PANEL_MEMOIRE_1', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 10),
    ('biopi_memoire_1_11', 'PANEL_MEMOIRE_1', 'BIO_HOMOCYSTEINE', 11),
    ('biopi_digestif_1_01', 'PANEL_DIGESTIF_1', 'BIO_IGA_FECALES', 1),
    ('biopi_digestif_1_02', 'PANEL_DIGESTIF_1', 'BIO_BETA_DEFENSINE_2', 2),
    ('biopi_digestif_1_03', 'PANEL_DIGESTIF_1', 'BIO_CRP_US', 3),
    ('biopi_digestif_1_04', 'PANEL_DIGESTIF_1', 'BIO_AGCC_FECAUX', 4),
    ('biopi_digestif_1_05', 'PANEL_DIGESTIF_1', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 5),
    ('biopi_fatigue_1_01', 'PANEL_FATIGUE_1', 'BIO_NFS', 1),
    ('biopi_fatigue_1_02', 'PANEL_FATIGUE_1', 'BIO_HEMOGLOBINE', 2),
    ('biopi_fatigue_1_03', 'PANEL_FATIGUE_1', 'BIO_CRP_US', 3),
    ('biopi_fatigue_1_04', 'PANEL_FATIGUE_1', 'BIO_FERRITINE', 4),
    ('biopi_fatigue_1_05', 'PANEL_FATIGUE_1', 'BIO_FER_SERIQUE', 5),
    ('biopi_fatigue_1_06', 'PANEL_FATIGUE_1', 'BIO_COEF_SATURATION', 6),
    ('biopi_fatigue_1_07', 'PANEL_FATIGUE_1', 'BIO_VITAMINE_D_25OH', 7),
    ('biopi_fatigue_1_08', 'PANEL_FATIGUE_1', 'BIO_MAGNESIUM_ERYTHROCYTAIRE', 8),
    ('biopi_fatigue_1_09', 'PANEL_FATIGUE_1', 'BIO_TSH_US', 9),
    ('biopi_fatigue_1_10', 'PANEL_FATIGUE_1', 'BIO_CAR', 10),
    ('biopi_fatigue_1_11', 'PANEL_FATIGUE_1', 'BIO_BILAN_HEPATIQUE', 11),
    ('biopi_fatigue_1_12', 'PANEL_FATIGUE_1', 'BIO_GLYCEMIE_JEUN', 12),
    ('biopi_fatigue_1_13', 'PANEL_FATIGUE_1', 'BIO_IONOGRAMME', 13),
    ('biopi_fatigue_1_14', 'PANEL_FATIGUE_1', 'BIO_ACIDE_URIQUE', 14),
    ('biopi_neurodeg_1_01', 'PANEL_NEURODEG_1', 'BIO_ZINC_PLASMATIQUE', 1),
    ('biopi_neurodeg_1_02', 'PANEL_NEURODEG_1', 'BIO_SELENIUM', 2),
    ('biopi_neurodeg_1_03', 'PANEL_NEURODEG_1', 'BIO_VITAMINE_D_25OH', 3),
    ('biopi_neurodeg_1_04', 'PANEL_NEURODEG_1', 'BIO_HOMOCYSTEINE', 4),
    ('biopi_neurodeg_1_05', 'PANEL_NEURODEG_1', 'BIO_ANTI_LDL_OXYDE', 5),
    ('biopi_neurodeg_1_06', 'PANEL_NEURODEG_1', 'BIO_CRP_US', 6),
    ('biopi_metabolique_1_01', 'PANEL_METABOLIQUE_1', 'BIO_RATIO_HOMA', 1),
    ('biopi_metabolique_1_02', 'PANEL_METABOLIQUE_1', 'BIO_PROFIL_LIPIDIQUE', 2),
    ('biopi_metabolique_1_03', 'PANEL_METABOLIQUE_1', 'BIO_CRP_US', 3),
    ('biopi_metabolique_1_04', 'PANEL_METABOLIQUE_1', 'BIO_FERRITINE', 4),
    ('biopi_metabolique_1_05', 'PANEL_METABOLIQUE_1', 'BIO_ZINC_PLASMATIQUE', 5),
    ('biopi_metabolique_1_06', 'PANEL_METABOLIQUE_1', 'BIO_VITAMINE_D_25OH', 6),
    ('biopi_metabolique_1_07', 'PANEL_METABOLIQUE_1', 'BIO_ANTI_LDL_OXYDE', 7),
    ('biopi_metabolique_1_08', 'PANEL_METABOLIQUE_1', 'BIO_CAR', 8),
    ('biopi_metabolique_opt_01', 'PANEL_METABOLIQUE_OPT', 'BIO_BDNF', 1),
    ('biopi_metabolique_opt_02', 'PANEL_METABOLIQUE_OPT', 'BIO_LBP', 2),
    ('biopi_metabolique_opt_03', 'PANEL_METABOLIQUE_OPT', 'BIO_BETA_DEFENSINE_2', 3),
    ('biopi_metabolique_opt_04', 'PANEL_METABOLIQUE_OPT', 'BIO_AG_ERYTHROCYTAIRES', 4),
    ('biopi_sjsr_01', 'PANEL_SJSR', 'BIO_FERRITINE', 1),
    ('biopi_pop_femme_01', 'PANEL_POP_FEMME', 'BIO_FERRITINE', 1),
    ('biopi_pop_agee_01', 'PANEL_POP_AGEE', 'BIO_VITAMINE_D_25OH', 1),
    ('biopi_pop_agee_02', 'PANEL_POP_AGEE', 'BIO_ZINC_PLASMATIQUE', 2),
    ('biopi_pop_agee_03', 'PANEL_POP_AGEE', 'BIO_SELENIUM', 3),
    ('biopi_pop_agee_04', 'PANEL_POP_AGEE', 'BIO_TSH_US', 4),
    ('biopi_pop_agee_05', 'PANEL_POP_AGEE', 'BIO_AG_ERYTHROCYTAIRES', 5);

-- ── Plages fonctionnelles (§F.5, textes des claims relus le 2026-08-17) ────
-- CONDITIONNELLES À LEUR CLAIM (barrière D-003 exécutée À L'INSERTION) : la
-- ligne n'entre que si son claim est VALIDE et actif dans le corpus. En CI
-- (corpus vide), zéro ligne — le contrat de données reste vert par vacuité ;
-- en production, les deux claims sont vérifiés présents. Une plage qui ne
-- s'insère pas est un ÉCART à lire en vérification post-release, pas un oubli.
-- Ferritine — WN-CL-0044-003 : « zone de confort entre 50 et 80 ng/ml ».
INSERT INTO "biology_functional_ranges"
    ("id", "analyte_code", "borne_min", "borne_max", "unite", "claim_id", "version_claim", "niveau_preuve")
SELECT 'biofr_ferritine', 'BIO_FERRITINE', 50, 80, 'ng/mL', 'WN-CL-0044-003', 'v1.0', 'C'
WHERE EXISTS (SELECT 1 FROM rag_corpus_claims c
              WHERE c.claim_id = 'WN-CL-0044-003' AND c.version_claim = 'v1.0'
                AND c.statut = 'VALIDE' AND c.active);
-- Vitamine D — le claim cité est CELUI QUI FONDE LA FORME (revue, finding
-- BL-1) : WN-CL-0154-054, « la valeur optimale souhaitée de vitamine D est
-- > 45 ng/ml » — un intervalle [45, +∞) est sa transcription littérale.
-- WN-CL-0239-004 (« valeur-cible idéale … proche de 45 ng/mL ») CONCORDE mais
-- énonce une cible ponctuelle, pas une borne : il est cité ici, pas stocké.
-- ABSENCE DE PLAFOND, NOMMÉE : aucun claim du dossier ne borne le haut —
-- WN-CL-0239-005 (60 ng/mL) se déclare lui-même non consensuel (et la base le
-- porte non prescriptif). La ligne dit « ≥ 45 est la zone souhaitée », jamais
-- « rien n'est trop haut » : le plafond manquant est un écart de corpus
-- (D-068 §2), pas une affirmation. Le « < 10 » de WN-CL-0239-010 est un seuil
-- de DÉFICIT PROFOND avec conduite associée — pas une borne de plage : nommé,
-- non transcrit.
INSERT INTO "biology_functional_ranges"
    ("id", "analyte_code", "borne_min", "borne_max", "unite", "claim_id", "version_claim", "niveau_preuve")
SELECT 'biofr_vitamine_d', 'BIO_VITAMINE_D_25OH', 45, NULL, 'ng/mL', 'WN-CL-0154-054', 'v1.0', 'C'
WHERE EXISTS (SELECT 1 FROM rag_corpus_claims c
              WHERE c.claim_id = 'WN-CL-0154-054' AND c.version_claim = 'v1.0'
                AND c.statut = 'VALIDE' AND c.active);

-- MA-6 : le résultat conditionnel SE RAPPORTE — le log de release-db dit
-- combien de plages sont entrées, au lieu de laisser « appliquée » couvrir
-- 0, 1 ou 2 lignes indistinctement.
DO $$
DECLARE nb int;
BEGIN
  SELECT count(*) INTO nb FROM biology_functional_ranges
  WHERE id IN ('biofr_ferritine', 'biofr_vitamine_d');
  RAISE NOTICE 'D-068 : % plage(s) fonctionnelle(s) insérée(s) sur 2 attendues en production (0 attendu en CI, corpus vide).', nb;
END $$;
