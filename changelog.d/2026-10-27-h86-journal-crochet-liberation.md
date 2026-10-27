### H86 : sessions libérées dès le merge, journal du crochet de fraîcheur (2026-10-27)

`CLAUDE.md` porte la consigne de `D-373` §1 : une session fait `/clear` dès
que sa PR est mergée, sans attendre le CI de `main` ni le déploiement, sauf
migration, authentification ou `.coderabbit.yaml` ; le gel de `D-374` §5 et,
après une migration, « un merge à la fois, déploiement constaté avant le
merge suivant » demeurent.

Le crochet `git-freshness.mjs` journalise chacun de ses verdicts (`D-375` §1) :
une ligne JSON (date, outil, cible interne ou externe au worktree du
répertoire courant, `HEAD`, `origin/main`, verdict, motif), jamais de contenu
ni de chemin, dans `.claude/logs/git-freshness.log` de la copie principale,
ignoré par Git et distinct du marqueur. Le journal s'écrit après le verdict
émis, avec des appels Git bornés à 2 s : il ne change aucun verdict. Huit cas
de banc ; revue `wn-reviewer` (ordre verdict-journal et worktrees imbriqués
corrigés dans le lot). Une semaine de comptage avant la tolérance de
`D-375` §2.
