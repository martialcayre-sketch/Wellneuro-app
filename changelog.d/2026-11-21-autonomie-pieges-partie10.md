### Release-db : un 504 au lancement d'un one-off ne se tait plus, et ne se lit plus comme une release ratée (autonomie-pieges-restes, partie 10, 2026-11-21)

Le 2026-08-24, la contre-épreuve de `release-db` (« Vérification — migrate
status sur conteneur ») n'a pas pu créer son conteneur : l'API Scalingo a
rendu un 504. Le run était rouge alors que la release avait été appliquée, et
ce rouge se lisait « base non migrée ». Cause dans le workflow : sous
`bash -e`, l'affectation `SORTIE=$(scalingo … run …)` en échec faisait sortir
l'étape sans un mot, la sortie du CLI restant captive.

- **Contre-épreuve** : jusqu'à trois lancements, vingt secondes d'écart. Ce
  one-off ne fait que lire, et un doublon né d'un 504 trompeur est sans effet.
  Chaque échec montre la sortie du CLI. Son refus, faute de conteneur ou de
  sentinelle, rappelle que la release A ÉTÉ APPLIQUÉE (sentinelle
  `WN_RELEASE_DB_OK` liée au run, à l'étape précédente), qu'il ne faut pas la
  relancer, et comment constater par conteneur. Le refus « base PAS à jour »
  (sentinelle `WN_STATUT_DB_ECHEC`) reste dit tel quel, sans ce rappel.
- **Release** : toujours un seul lancement, jamais de nouvelle tentative. Un
  504 peut rendre une erreur alors que le conteneur a démarré, et un second
  lancement serait une seconde release. L'échec montre désormais la sortie du
  CLI et dit l'état INCONNU : lire les one-offs et l'état de la base avant tout
  geste.
- **Banc de comportement** (`scripts/release-db-comportement.test.mjs`) :
  cinq cas, dont les étapes sont jouées avec un `scalingo` factice. Sur le
  workflow d'avant, quatre rougissent ; le cinquième, « base PAS à jour »,
  est une garde de non-régression, verte des deux côtés.
- Aucun chemin déclencheur de `release-db` n'est touché : ce merge ne lance
  aucun run.
