# Handoff — H91, temps 2 : cache de compilation Next dans `e2e`

## Branche et état Git

`lot/h91-temps-2-cache-next`, worktree `.claude/worktrees/h91-temps-2`, PR
#1890. Rebasée sur `origin/main` f1943140 (#1891, documentaire, sans
migration) avant le push du fragment. Ligne r1_22 de la file A. Aucune PR
ouverte ne touchait `ci.yml` ni les deux bancs au départ.

## Objectif

Fiche H91, temps 2 : mesurer l'« après » du temps 1 sur `main`, cacher
`web/.next/cache` dans `e2e`, solder la dette de parité routée par la revue
du temps 1, mesurer le cache restauration comprise, publier le tout en
fragment du journal H91 et proposer un objectif chiffré sans le poser.

## Décisions prises

- Fait nouveau : `web/scripts/build.sh` efface `.next/cache/webpack` à la fin
  de chaque build (#1001 : image Scalingo plafonnée à 2048 Mo). Sans
  correction, le cache n'aurait presque rien sauvegardé. **Arbitrage du
  responsable du 2026-11-06** : le périmètre s'étend à `build.sh`. Le cache
  webpack est gardé si `WN_GARDER_CACHE_WEBPACK=1`, posée par la seule étape
  Build d'`e2e`, et effacé par défaut.
- Clé du cache : `next-<os>-<lock + next.config.mjs>-<web/src + web/public>`,
  avec `restore-keys` sur le préfixe lock et configuration. Des sources
  inchangées donnent une restauration exacte, sans nouvelle sauvegarde.
- Parité : `etapesHorsParite` refuse, hors `controles`, toute étape `run:`
  avant `setup-node`, et tout alias autre que `*perimetre`. Dans un job sans
  `setup-node` (`verify`), elle refuse un appel `node` ou `bash`. Le test a
  d'abord été écrit rouge contre une souche (1 échec sur 45), puis passé vert.

## Fichiers modifiés

`.github/workflows/ci.yml` (job `e2e` seul) ; `web/scripts/build.sh` ;
`scripts/parite-check-ci.test.mjs` ; `scripts/ci-invariants.test.mjs` ;
`changelog.d/2026-11-06-h91-cache-compilation-next.md` ; ce handoff ;
`docs/claude/plan-journal/H91/2026-11-06-01-temps-2-cache-compilation-next.md`.

## Validations exécutées

- `node --test` sur les deux bancs : 59 sur 59. Mutations du P1 rejouées :
  un `export` dans `build.sh`, puis la variable dans `web/package.json`,
  rougissent chacune un test.
- `bash -n web/scripts/build.sh` : syntaxe valide.
- T1 rapide et T1 complet verts.
- Mesure « après » du temps 1 : 71 runs `push` de `main`, réussis au premier
  essai, depuis le merge de #1747 (2026-10-27 22:19 UTC).
- Run 1 de la PR (a317da6b), sans cache : vert. Run 2 (3ee2d9fd), avec
  cache : vert, restauration exacte, compilation de 70 à 36,6 s, build de 161
  à 135 s. Chiffres dans le fragment H91.
- `wn-reviewer` : GO avec réserves sur a317da6b. Le P1 (liste fermée de la
  variable) et les P2-2 à P2-5 sont corrigés, le P2-1 est écarté sur mesure
  (sauvegarde de 5 s). GO sur 3ee2d9fd, sans constat nouveau.

## Problèmes ouverts

- Le gain du build (−26 s) ne se voit pas sur le chemin critique d'un seul
  run : l'étape Playwright varie davantage. Le gain d'une restauration
  partielle, cas ordinaire sur `main`, reste à constater sur les premiers
  runs de `main` après le merge.
- Objectif chiffré proposé dans le fragment (médiane ≤ 630 s, p90 ≤ 720 s sur
  `main`), non posé : question dans la liste commune, file A.

## Prochaine action exacte

Revue CodeRabbit (ou PR-Agent) sur la tête, un verdict par remarque dans la
PR, revue de l'écart par `wn-reviewer` si la tête change, puis déclarer
« prête @<sha> » sans merger. Après « prête » : passer r1_22 à « fait » sur
la page de la file A et mettre à jour la mémoire `suivi-file-a-artefact`.

## Interdits encore actifs

- Ne pas merger (essai `D-373`).
- Aucun fragment existant réécrit, aucune entrée dans SESSION_LOG.
- Aucun changement dans les étapes de `controles` ni de `typage-tests`.
- Aucun shard e2e, rien sur « Install Playwright browsers ».
- Aucune migration, aucun code applicatif hors `build.sh` (arbitrage).
- Ne jamais relancer un run pour mesurer.
