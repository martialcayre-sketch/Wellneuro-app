### Une migration passe par le nouveau pipeline, et l'observation de D-248 est remplie (2026-09-26)

- **Première migration sous le déployeur GitHub Actions** (#1226, index
  `questionnaire_reponses_id_assignation_idx`) : `release-db` approuvé a
  déployé la tête, appliqué la migration et constaté le schéma à jour ; au CI
  vert, le déployeur s'est abstenu, la tête étant déjà en service. Index
  constaté en production par conteneur.
- **Cinq déploiements verts, dont un avec migration, et l'incident 2 rejoué
  sans recul** : la condition que le responsable avait posée au lot 4 de D-248
  est remplie.
- Non exercé en production : la retenue d'un commit de migration par le
  déployeur (approbation antérieure à la fin du CI) — tenue par les bancs.
