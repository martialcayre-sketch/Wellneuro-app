### D/51 : `questionnaires.actif` rattrape le catalogue de code en production (D-395)

- Migration de données `20261029230000_questionnaires_actif_reactives` : un
  seul UPDATE, idempotent, qui passe à `actif = true` les cinq instruments
  réactivés par D-066 (`Q_GEO_03` à `Q_GEO_06`, `Q_NEU_06`) et `Q_ALI_09`
  (drapeau `WN_AGENDA_ALI` allumé en production). La base les disait encore
  suspendus depuis le backfill du 2026-08-06. Arbitrage du responsable du
  2026-10-29 : écrire plutôt que consigner l'écart, et inclure `Q_ALI_09`.
- Aucun changement de schéma, aucune donnée patient, aucun pack touché. Le
  service n'en dépendait pas, car les routes lisent `IDS_SUSPENDUS`. Le
  contrat `packs_instruments_suspendus_v1` lit désormais une base à jour.
- Nouveau banc `questionnaires-actif-rattrapage.migration.test.ts`, qui lit
  le SQL livré : les six identifiants exactement, aucun instrument suspendu
  sans drapeau, une seule instruction hors commentaires, qui est l'UPDATE.
- S'applique par release-db (D-087), puis se constate par conteneur.
