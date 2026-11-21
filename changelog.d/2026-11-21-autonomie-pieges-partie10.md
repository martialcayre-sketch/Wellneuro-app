### Release-db : un 504 au lancement d'un one-off ne se tait plus, et ne se lit plus comme une release ratée (autonomie-pieges-restes, partie 10, 2026-11-21)

Le 2026-08-24, la contre-épreuve de `release-db` (« Vérification — migrate
status sur conteneur ») n'a pas pu créer son conteneur : l'API Scalingo a
rendu un 504. Le run était rouge alors que la release avait été appliquée, et
ce rouge se lisait « base non migrée ». Cause dans le workflow : sous
`bash -e`, l'affectation `SORTIE=$(scalingo … run …)` en échec faisait sortir
l'étape sans un mot, la sortie du CLI restant captive.

- **Contre-épreuve** : jusqu'à trois lancements, vingt secondes d'écart. Ce
  one-off ne fait que lire, et un doublon né d'un 504 trompeur est sans effet.
  Chaque échec montre la sortie du CLI et son code. Son refus, faute
  d'identifiant ou de sentinelle, rappelle que la release A ÉTÉ APPLIQUÉE
  (sentinelle de ce run, à l'étape précédente) et qu'il ne faut pas la
  relancer à l'aveugle. Il dit aussi comment constater par conteneur, et que la
  sonde gèle les chemins déclencheurs : un run ainsi conclu se classe
  « inconnu ». La sortie du gel est un `workflow_dispatch` humain (D-520 §5).
  Le refus « base PAS à jour » (sentinelle `WN_STATUT_DB_ECHEC`) reste dit tel
  quel, sans ce rappel.
- **Release** : toujours un seul lancement, jamais de nouvelle tentative. Un
  504 peut rendre une erreur alors que le conteneur a démarré, et un second
  lancement serait une seconde release. L'échec du CLI, comme une sortie sans
  identifiant de conteneur, montre la sortie du CLI et dit l'état INCONNU :
  lire les one-offs et l'état de la base avant tout geste.
- **Invariant « sentinelles liées au run »** (`release-db-invariants.test.mjs`)
  ancré sur le `grep -q` lui-même. Un message qui citait la sentinelle avec son
  id le gardait vert, alors qu'un grep nu lisait le mot seul (revue
  `wn-reviewer`).
- **Banc de comportement** (`scripts/release-db-comportement.test.mjs`) : dix
  cas, joués avec un `scalingo` factice :
  - 504 passager ou persistant ;
  - contre-épreuve muette ;
  - « base PAS à jour » ;
  - CLI en échec qui rend quand même un identifiant ;
  - sentinelle de statut d'un autre run, qui ne conclut jamais au vert ;
  - et, pour la release, 504, sortie sans identifiant, sentinelle de ce run,
    et sentinelle d'un autre run, qui ne conclut jamais au vert.
- Aucun chemin déclencheur de `release-db` n'est touché : ce merge ne lance
  aucun run.
