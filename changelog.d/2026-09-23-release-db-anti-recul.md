### `release-db` ne peut plus faire reculer la production, et sait en sortir (2026-09-23)

- **Garde anti-recul** : un run dont la tête de `main` a dépassé le commit
  conclut désormais en échec VOLONTAIRE, après la release et sa vérification.
  Son vert levait le dernier check du vieux commit, que l'auto-déploiement
  Scalingo redéployait par-dessus la tête — constaté le 2026-09-23 (run
  35563094380) : quatre lots retirés de la production pendant six heures,
  aucune écriture en base.
- **Déclenchement** : l'étape ne s'abstient plus que si le déploiement LE PLUS
  RÉCENT porte le commit. Chercher le SHA n'importe où dans l'historique
  rendait le recul irrattrapable par `release-db` (run 35854104186, boucle
  rompue par un déploiement manuel).
- Trois bancs de comportement, chacun vérifié par mutation ; sixième piège
  ajouté à `.claude/rules/pr-revue-et-release-db.md`.
