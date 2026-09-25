### La production est déployée par GitHub Actions, et ne peut plus reculer (D-248, lot 3) (2026-09-25)

- **L'auto-déploiement Scalingo est coupé.** Le job `deploiement` part quand
  le CI de `main` a conclu au vert, et déploie la tête — jamais un commit plus
  ancien, jamais pendant un autre build. Un run dépassé juge la tête et la
  livre si son CI est vert : la tête ne peut plus être perdue quand les CI
  concluent dans le désordre.
- **Comme sous l'auto-déploiement, un commit porteur d'un run `release-db`
  n'est déployé qu'à l'approbation** (par `release-db` lui-même). Un commit
  SANS migration mergé après lui part au déploiement avec son code — régime
  D-087 inchangé.
- Si la branche livre un commit plus neuf que celui jugé et que ce commit n'est
  pas vérifié (CI ou `release-db`), le run rougit.
- La garde finale anti-réveil (lot 2) est désactivée avec le déclencheur :
  plus aucun vert ne réveille un déploiement.
