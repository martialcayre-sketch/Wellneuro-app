-- `questionnaires.actif` rattrape le catalogue de code pour six instruments
-- (D-395, plan D/51). DONNÉES SEULES : aucun changement de schéma, aucune
-- donnée patient, aucune ligne créée ni supprimée.
--
-- Lu en production le 2026-10-29 (conteneur, lecture seule) : les 67 lignes de
-- `questionnaires` datent toutes du backfill du 2026-08-06, jamais rejoué
-- depuis. Dix y sont suspendues ; six d'entre elles ne le sont plus au
-- catalogue de code :
--   - `Q_GEO_03` à `Q_GEO_06` et `Q_NEU_06`, réactivés par D-066 le
--     2026-08-16 ;
--   - `Q_ALI_09`, dont `actif` suit le drapeau `WN_AGENDA_ALI`, allumé en
--     production. La base suit ici la position du drapeau à la date de cette
--     migration : si le drapeau s'éteint, l'écart revient en sens inverse et
--     se traite par une nouvelle décision (borne nommée par D-395).
-- Les quatre autres (`Q_FIB_03`, `Q_PED_02`, `Q_PED_03`, `Q_URO_02`) restent
-- suspendues, comme au catalogue.
--
-- Le service n'en dépend pas : les routes lisent `IDS_SUSPENDUS`. Le seul
-- lecteur de la colonne est le contrat `packs_instruments_suspendus_v1`, qui
-- prend la base pour source et lisait donc une suspension levée.
--
-- Idempotent et borné : un seul UPDATE, filtré sur les six identifiants et sur
-- `NOT "actif"` ; rejoué, il ne touche plus rien. Sur une base neuve (CI),
-- la table est vide quand les migrations passent : zéro ligne, aucune erreur.
UPDATE "questionnaires"
SET "actif" = true,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "questionnaire_id" IN ('Q_ALI_09', 'Q_GEO_03', 'Q_GEO_04', 'Q_GEO_05', 'Q_GEO_06', 'Q_NEU_06')
  AND NOT "actif";
