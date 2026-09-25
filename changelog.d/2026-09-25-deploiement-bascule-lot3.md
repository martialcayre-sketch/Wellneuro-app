### La production est déployée par GitHub Actions, et ne peut plus reculer (D-248, lot 3) (2026-09-25)

- **L'auto-déploiement Scalingo est coupé.** Le job `deploiement` part quand
  le CI de `main` a conclu au vert, et déploie la tête — jamais un commit
  dépassé, jamais pendant un autre build.
- **Un commit porteur d'un run `release-db` non conclu au vert est retenu** :
  `release-db` le déploie à l'approbation, comme sous l'auto-déploiement. Le
  code d'une migration n'est jamais servi avant son schéma.
- La garde finale anti-réveil (lot 2) est désactivée avec le déclencheur :
  plus aucun vert ne réveille un déploiement.
