### Outillage : le sondage en boucle n'est plus refusé (autorisation du responsable, 2026-10-24)

- `block-risky-commands.mjs` ne refuse plus les boucles d'attente (`gh pr
  checks --watch`, `gh run watch`, `until … gh …`, `sleep` + `gh`, `sleep` +
  `tail` d'une sortie de tâche) : le responsable autorise le contrôle en
  boucle pour toutes les sessions, notamment pour attendre une revue
  CodeRabbit après un CI vert, qu'aucun outil dédié ne couvre.
- `wn-attendre-ci.mjs` en tâche de fond reste la forme préférée pour un CI.
  Les autres refus du garde (commandes destructives, secrets) sont inchangés.
- Bancs inversés (« sondage permis ») ; CLAUDE.md et la règle des PR à jour.
