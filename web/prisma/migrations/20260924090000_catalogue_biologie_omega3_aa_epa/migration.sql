-- Catalogue biologie — deux analytes pour l'assiette oméga 3 (D-245 §5,
-- LOT-01 du chantier 6, cadrage CADRAGE_PORTE_BIOLOGIQUE_ASSIETTES_2026-09-23).
-- DONNÉES SEULES : aucun changement de schéma, aucune plage, aucune borne.
--
-- Les claims que la porte biologique citera (WN-CL-0294-004, WN-CL-0293-013)
-- nomment l'index oméga 3 et le rapport AA/EPA ; le catalogue n'avait de code
-- pour aucun des deux, donc aucun résultat ne pouvait être saisi.
--
-- DES ANALYTES, PAS DES `biology_ratios` — et c'est la précision que D-245 §5
-- apporte à D-122 §2 (« pas de ratio en V1, ils se calculent »). Ces deux
-- valeurs sont RENDUES TELLES QUELLES par le profil d'acides gras du
-- laboratoire ; l'application ne les calcule pas, et leurs opérandes (AA, EPA,
-- DHA) ne sont pas au catalogue — les décomposer serait inventer. C'est le
-- patron déjà suivi par `BIO_RATIO_KYN_TRP`, `BIO_RATIO_ZINC_CUIVRE` et
-- `BIO_RATIO_HOMA` (migration 20260817090000, « fidélité §A »).
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier ne touche aucune table de
-- résultats.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    ('bioan_index_omega3', 'BIO_INDEX_OMEGA3', 'Index oméga 3', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_aa_epa', 'BIO_RATIO_AA_EPA', 'Rapport AA / EPA', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
