-- Catalogue biologie — deux fiches de coagulation : le taux de prothrombine et
-- l'INR (D-357, t44 ; D-356 §6). DONNÉES SEULES : aucune plage, aucune borne,
-- aucune indication (D-059), aucune conversion (D-157), aucune unité ajoutée
-- au vocabulaire.
--
-- Lus en production et restés « inconnu » (constat par conteneur du
-- 2026-10-24, agrégats) : « Taux de prothrombine » en %, « INR » sans unité,
-- « Temps de Quick patient » et « Temps de Quick témoin » en secondes. Le
-- laboratoire mesure le temps de Quick et en dérive le TP et l'INR : seules
-- ces deux expressions entrent (arbitrage du responsable, 2026-10-24). Le
-- temps en secondes dépend du réactif et ne se lit qu'à côté du témoin, qui
-- est un contrôle du laboratoire, jamais une mesure du patient : ni l'un ni
-- l'autre n'a de fiche, et « s » n'entre pas au vocabulaire.
--
-- L'INR est un rapport normalisé : unité « ratio », avec laquelle seule une
-- unité absente concorde (D-356 §4). NULL marquerait un composite lacunaire.
--
-- Même forme que les fiches existantes (20261003150000, 20261018100100) :
-- `saisie_praticien`, « partielle », prélèvement « sang ». AUCUNE
-- correspondance NABM (0126, 0127, 1128 sont proposés au code, signés par le
-- praticien dans la Bibliothèque), AUCUN lien clinique, AUCUNE composition.
-- Les libellés lus n'entrent au résolveur signé qu'après l'application
-- constatée de ce fichier : `lignes_biologiques_candidates.analyte_propose`
-- référence `biology_analytes.code`, et un code proposé absent du catalogue
-- ferait échouer l'import entier.
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier n'écrit dans aucune table de
-- résultats.
INSERT INTO "biology_analytes"
    ("id", "code", "libelle", "unite", "type_prelevement", "source_provenance",
     "niveau_completude", "donnees_manquantes", "validation_medicale_requise", "updated_at")
VALUES
    ('bioan_tp', 'BIO_TP', 'Taux de prothrombine (TP)', '%', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP),
    ('bioan_inr', 'BIO_INR', 'INR (International Normalized Ratio)', 'ratio', 'sang', 'saisie_praticien', 'partielle', ARRAY[]::TEXT[], false, CURRENT_TIMESTAMP);
