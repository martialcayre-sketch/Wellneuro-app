# Handoff — 2026-10-24 — File D : outil du constat avant T0 (H07, b16)

## Branche et état Git

- Branche `feat/constat-avant-t0-h07`, partie d'`origin/main` (51cea633,
  merge de #1667), worktree `file-d1-suite` (session concurrente, cycle en
  git/gh direct).
- Lots précédents de la même file : #1659 (D/39) et #1667 (D/52), mergés.

## Objectif

Livrer l'outil du constat H07 du plan (R:Comptage T0) : combien de dossiers
n'ont pas atteint le T0, et quelles conditions dures les retiennent, en
agrégats masqués selon D-298.

## Décisions prises

- H07 relève de la file D (geste, constat de rang 0, sans migration) : vérifié
  au plan (H07, F25).
- Les préconditions s'évaluent par `preconditionsT0PourPatient` (jalon T0),
  le chemin des trois routes : pas de copie en SQL.
- Garde de lecture seule portée par la base : le script refuse de lire si
  `transaction_read_only` n'est pas `on`.
- Masquage : l'effectif et les zéros restent affichés ; avec et sans T0,
  bloqués et prêts sont masqués ensemble ; bloqués masqués, les comptes par
  condition le sont tous ; ancienneté en quartiles, masquée sous cinq
  dossiers datés, sans tranche (le délai attend la D-xxx du responsable).

## Fichiers modifiés

- `web/src/lib/constats/avantT0.ts` et `.test.ts` (nouveaux)
- `web/scripts/constatAvantT0.ts` (nouveau)
- `docs/claude/PLAN_WELLNEURO.md` (H07), fragment `changelog.d/`,
  `SESSION_LOG.md`

## Validations exécutées

- Vitest : `avantT0.test.ts`, 7 tests verts.
- Essai sur la base locale du worktree : refus (code 2) hors lecture seule ;
  en lecture seule, chemin complet des préconditions sans écriture, sortie
  masquée.
- T1 `npm run check` vert. T2 non joué : ni écran ni route touchés.

## Problèmes ouverts

- Le constat lui-même : en conteneur après déploiement, versé au plan en
  agrégats.
- La D-xxx du délai avant T0, de la main du responsable, après le compte.

## Prochaine action exacte

CI, verdicts CodeRabbit sur le sha de tête, runs `release-db` en attente
listés, merge en squash avec `--match-head-commit` ; puis, le déploiement
constaté, `scalingo --app wellneuro --region osc-fr1 run -d
"PGOPTIONS='-c default_transaction_read_only=on' node prisma/runWithAlias.js
scripts/constatAvantT0.ts"` et le constat versé (page D, b16) ; puis b25.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Pas de pull, merge ni rebase sans arbitrage, sauf la fusion
  d'`origin/main` dans la branche du lot sans conflit.
- Une seule release-db à la fois : lister les runs `waiting` avant chaque
  merge.
- Aucune identité réelle, aucun identifiant de dossier couplé à des mesures
  dans le dépôt ; D-298 s'applique à tout constat écrit.
- Pas de merge sans revue CodeRabbit sur le sha de tête.
