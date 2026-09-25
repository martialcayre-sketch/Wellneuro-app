### Deux merges rapprochés ne font plus reculer la production — éprouvé (D-248, lot 3) (2026-09-25)

- **Premier déploiement par GitHub Actions constaté**, auto-déploiement coupé
  (`e43a40b0`) : `integration-link-manual-deploy` fonctionne sans
  l'auto-déploiement.
- **L'incident 2 est rejoué, sans recul.** Deux merges à 2 min 09 s
  d'intervalle, le second pendant le build du premier : son run attend la fin
  de ce build, puis livre la tête. Aucun chevauchement de builds, observation
  conforme, tête en service. Le chemin « run dépassé » n'a pas été exercé en
  production (bancs seulement).
- **Le RUNBOOK décrit le déploiement par Actions** : le dispatch
  `action=deployer` et l'approbation `release-db` livrent la tête sans lire son
  CI ; retour arrière de la bascule dans l'ordre revert du code, puis
  auto-déploiement.
- Reste avant le lot 4 : deux déploiements verts, dont un avec migration.
