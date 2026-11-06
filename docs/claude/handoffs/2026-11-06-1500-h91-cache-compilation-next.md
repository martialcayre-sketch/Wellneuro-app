# Handoff — H91, temps 2 : cache de compilation Next dans `e2e`

## Branche et état Git

`lot/h91-temps-2-cache-next`, worktree `.claude/worktrees/h91-temps-2`, depuis
`origin/main` 1987b5c0 (avancée `--ff-only` deux fois en début de lot). Ligne
r1_22 de la file A. Aucune PR ouverte ne touchait `ci.yml` ni les deux bancs
au départ.

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
`changelog.d/2026-11-06-h91-cache-compilation-next.md` ; ce handoff ; le
fragment `docs/claude/plan-journal/H91/2026-11-06-nn-…` au second push.

## Validations exécutées

- `node --test` sur les deux bancs : 59 sur 59.
- `bash -n web/scripts/build.sh` : syntaxe valide.
- T1 (`check:rapide`) : 17 étapes vertes, 2 sautées.
- Mesure « après » du temps 1 : 71 runs `push` de `main`, réussis au premier
  essai, depuis le merge de #1747 (2026-10-27 22:19 UTC).

## Problèmes ouverts

- Mesure du cache : run 1 de la PR (sans cache), puis run 2 déclenché par le
  push du fragment (avec cache). Elles sont à reporter dans le fragment.
- Objectif chiffré : à proposer dans le fragment, à poser dans la liste
  commune (file A), sans le poser.

## Prochaine action exacte

Attendre le run 1 (`wn-attendre-ci`), mesurer, écrire le fragment H91 (nn
relu sur `origin/main`), pousser, attendre et mesurer le run 2, compléter le
fragment, revue `wn-reviewer` puis CodeRabbit (ou PR-Agent), verdicts dans la
PR, rebase sur `main`, puis déclarer « prête @<sha> ».

## Interdits encore actifs

- Ne pas merger (essai `D-373`).
- Aucun fragment existant réécrit, aucune entrée dans SESSION_LOG.
- Aucun changement dans les étapes de `controles` ni de `typage-tests`.
- Aucun shard e2e, rien sur « Install Playwright browsers ».
- Aucune migration, aucun code applicatif hors `build.sh` (arbitrage).
- Ne jamais relancer un run pour mesurer.
