### `release-db` attend qu'aucun build ne soit en vol avant de déclencher un déploiement (D-248, prérequis du lot 3) (2026-09-25)

- L'étape « Déclenchement » attend jusqu'à 20 minutes qu'aucun déploiement
  Scalingo ne soit en cours, puis refuse sans écriture. Le job de déploiement
  de GitHub Actions (D-248) déclenche la même commande : deux déclenchements
  rapprochés lançaient deux builds en parallèle, et le dernier à finir passait
  en service.
- Une liste des déploiements illisible n'est plus lue comme calme.
- Borne du job `release` : 45 → 70 minutes.
