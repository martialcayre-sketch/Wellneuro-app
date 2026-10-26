-- Catalogue biologie — vingt acides gras et deux rapports du profil d'acides
-- gras (D-370, t45 ; D-356 §6). DONNÉES SEULES : aucune plage, aucune borne,
-- aucune indication (D-059), aucune conversion (D-157), aucune unité ajoutée
-- au vocabulaire (« % » et « ratio » y sont déjà).
--
-- Lus en production et restés « inconnu » (constat par conteneur du
-- 2026-10-25, agrégats ; effectif : 1 dossier, répartition masquée (moins
-- de cinq dossiers), D-298 §3) : un profil de vingt acides en %, l'indice
-- oméga 3, et trois rapports sans unité. L'indice oméga 3 et le rapport
-- AA/EPA ont déjà leur fiche (D-245 §5) : seuls entrent les vingt acides et
-- les deux rapports restants (arbitrage du responsable, 2026-10-25). Le
-- compte rendu ne nomme pas la fraction sanguine analysée : la fiche ne la
-- nomme pas non plus.
--
-- Libellé = nom courant de l'acide, rien de plus (ni notation lipidique, ni
-- famille) : ce que le compte rendu imprime, orthographié. Les deux rapports
-- sont RENDUS TELS QUELS par le laboratoire, jamais calculés par
-- l'application : des analytes en « ratio », prélèvement « autre », comme
-- `BIO_RATIO_AA_EPA` (une unité absente concorde avec « ratio », D-356 §4).
--
-- Même forme que les fiches existantes (20261003150000, 20261024220000) :
-- `saisie_praticien`, « partielle ». AUCUN panel (l'entrée d'un acide dans un
-- panel est clinique : lot et décision à part), AUCUNE composition du profil
-- `BIO_AG_ERYTHROCYTAIRES`, AUCUNE correspondance NABM (aucun acte de la V105
-- ne nomme les acides gras), AUCUN lien clinique. Les libellés lus n'entrent
-- au résolveur signé qu'après l'application constatée de ce fichier :
-- `lignes_biologiques_candidates.analyte_propose` référence
-- `biology_analytes.code`, et un code proposé absent du catalogue ferait
-- échouer l'import entier.
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier n'écrit dans aucune table de
-- résultats.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    ('bioan_ag_myristique', 'BIO_AG_MYRISTIQUE', 'Acide myristique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_palmitique', 'BIO_AG_PALMITIQUE', 'Acide palmitique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_stearique', 'BIO_AG_STEARIQUE', 'Acide stéarique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_laurique', 'BIO_AG_LAURIQUE', 'Acide laurique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_pentadecanoique', 'BIO_AG_PENTADECANOIQUE', 'Acide pentadécanoïque', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_heptadecanoique', 'BIO_AG_HEPTADECANOIQUE', 'Acide heptadécanoïque', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_palmitoleique', 'BIO_AG_PALMITOLEIQUE', 'Acide palmitoléique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_cis_vaccenique', 'BIO_AG_CIS_VACCENIQUE', 'Acide cis-vaccénique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_trans_vaccenique', 'BIO_AG_TRANS_VACCENIQUE', 'Acide trans-vaccénique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_rumenique', 'BIO_AG_RUMENIQUE', 'Acide ruménique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_oleique', 'BIO_AG_OLEIQUE', 'Acide oléique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_nervonique', 'BIO_AG_NERVONIQUE', 'Acide nervonique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_elaidique', 'BIO_AG_ELAIDIQUE', 'Acide élaïdique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_linoleique', 'BIO_AG_LINOLEIQUE', 'Acide linoléique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_gamma_linolenique', 'BIO_AG_GAMMA_LINOLENIQUE', 'Acide gamma-linolénique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_dgla', 'BIO_AG_DGLA', 'Acide dihomo-gamma-linolénique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_arachidonique', 'BIO_AG_ARACHIDONIQUE', 'Acide arachidonique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_alpha_linolenique', 'BIO_AG_ALPHA_LINOLENIQUE', 'Acide alpha-linolénique', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_epa', 'BIO_AG_EPA', 'Acide eicosapentaénoïque', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ag_dha', 'BIO_AG_DHA', 'Acide docosahexaénoïque', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_la_dgla', 'BIO_RATIO_LA_DGLA', 'Rapport acide linoléique / DGLA', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_ratio_omega6_omega3', 'BIO_RATIO_OMEGA6_OMEGA3', 'Rapport oméga 6 / oméga 3', 'ratio', 'autre', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
