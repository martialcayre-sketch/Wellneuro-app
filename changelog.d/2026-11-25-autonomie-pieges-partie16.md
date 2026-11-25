### Sessions concurrentes : une session qui démarre dans la copie principale est avertie qu'une autre y est déjà (autonomie-pieges-restes, partie 16, 2026-11-25)

La copie principale n'est réservée à personne. Une autre session peut y
faire un `checkout`, et un commit atterrit alors sur SA branche ; un
`git add -A` y ramasse ses fichiers non suivis (2026-08-23 : un dossier de
campagne entier embarqué dans une PR). Depuis `D-373` §2 et `D-454`, seul
l'intégrateur y travaille. La règle était écrite, mais rien ne disait à une
seconde session qu'une première était déjà là : au relevé du 2026-11-25,
trois processus `claude` y avaient leur répertoire.

- **Module** `.claude/hooks/sessions-concurrentes.mjs` : quand la session
  démarre dans la copie principale (pas un worktree lié), il liste les
  autres processus `claude` dont le répertoire courant est cette copie
  (`lsof -a -c claude -d cwd`), hors chaîne d'ancêtres du crochet, et rend
  un avertissement qui nomme les pid, la règle et les gestes (passer en
  worktree ; sinon relire la branche avant tout commit, indexer par chemin).
- **Jamais un refus** : le répertoire d'un processus est un indice, pas une
  preuve. Sans `lsof`, sur erreur ou hors délai (2 s) : silence.
- **Câblage** : `git-freshness.mjs` l'importe au démarrage, dynamiquement et
  sous `try` ; le constat de fraîcheur n'en dépend pas. `settings.json`
  inchangé.
- **Banc** `.claude/hooks/sessions-concurrentes.test.mjs` : lecture de la
  sortie réelle de `lsof`, exclusions (worktrees, ancêtres, worktree lié),
  chemins réels, module cassé sans effet sur la fraîcheur. Quatre mutations
  rougissent.
- `.claude/rules/hooks-garde-fous.md` : le paragraphe.
