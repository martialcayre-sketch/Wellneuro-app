### Crochets en retard : une session dont les gardes viennent d'une copie antérieure à `main` en est avertie (autonomie-pieges-restes, partie 17, 2026-11-25)

Les lanceurs de `settings.json` exécutent les gardes de la racine de
LANCEMENT (`$CLAUDE_PROJECT_DIR`), qui ne change ni après `/cd` ni après
`EnterWorktree`. Une session lancée dans la copie principale puis passée
dans son worktree garde donc les crochets, réglages et agents de la copie
principale. Si celle-ci n'a pas encore un changement de crochets
qu'`origin/main` porte, les gardes en vigueur sont antérieurs à `main`, et
le garde de fraîcheur, qui juge la branche du répertoire courant, ne le
voyait pas.

- **Module** `.claude/hooks/crochets-en-retard.mjs` : quand la copie qui
  porte les crochets n'est pas celle du répertoire courant, il liste les
  fichiers de `.claude/hooks/`, `.claude/settings.json` et `.claude/agents/`
  changés par `origin/main` depuis sa base commune avec la tête de cette
  copie, et que son arbre de travail n'a pas tels quels. S'il y en a, il
  avertit en les nommant, avec le remède : avance par l'intégrateur
  (`D-373` §2), ou session relancée à la racine de son worktree. Une copie
  en avance sur `main`, ou qui porte déjà son contenu (squash), n'est pas
  en retard.
- **Quand il parle** : aux démarrages (`/clear`, `/compact`, reprise) dont
  le répertoire est le worktree où la session est entrée. Au premier
  démarrage, dans la copie principale, il se tait : le constat de fraîcheur
  de cette copie dit déjà son retard. Le lot même qui fait `EnterWorktree`
  n'est pas averti ; le couvrir toucherait `settings.json`.
- **Jamais un refus** : la session n'y est pour rien. Sur erreur ou hors
  délai (2 s par appel) : silence.
- **Câblage** : `git-freshness.mjs` l'importe au démarrage, après le fetch,
  dynamiquement et sous `try` ; le constat de fraîcheur n'en dépend pas. Le
  chemin PreToolUse et `settings.json` sont inchangés.
- **Banc** `.claude/hooks/crochets-en-retard.test.mjs` : de bout en bout sur
  un vrai dépôt et son remote nu, `origin/main` avancé par le seul fetch du
  crochet (copie en retard, à jour, en avance, squash, divergente,
  modification locale ; `settings.json` et agents ; worktree imbriqué ;
  sans `origin/main` ; même copie, y compris par lien symbolique ; module
  cassé). Mutations nommées au handoff.
- `.claude/rules/hooks-garde-fous.md` : le paragraphe.
