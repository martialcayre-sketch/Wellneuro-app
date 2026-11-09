# Handoff — 2026-11-09 — D-463 §4 : le cockpit affiche le motif du poids égal de la stabilité métabolique

## Branche et état du dépôt

- Branche `feat/d463-mention-stabilite`, créée depuis `origin/main` à `2b3156aa` (#1941).
- Worktree `.claude/worktrees/d463-code` : session concurrente, cycle en `git`/`gh` direct.
- Lot de code d'affichage, file A : cinq fichiers de code (dont trois bancs), un fragment F59, un fragment `changelog.d/` et ce handoff. Ni migration ni `schema.prisma` ; rien sous `web/src/lib/clinical/`.
- **Pas de release-db attendue** : aucun chemin déclencheur.
- D-454 amendée (#1937) : la PR est déclarée « prête @<sha> ». Si l'intégrateur ne l'a ni mergée ni commentée vingt minutes après la déclaration, la file la merge elle-même : étape 7 bis, puis `wn-sonde-release-db` (code 0 seul).

## Objectif

Appliquer D-463 §3-§4 : remplacer la tolérance « Non motivé, décision due » par le libellé validé.

## Décisions prises

- La constante `MENTION_POIDS_NON_MOTIVE` devient `MENTION_POIDS_EGAL_MOTIVE` = « Poids égal : motif déclaré, sans source (D-463) », libellé validé mot pour mot (`20261108-2328-c`).
- La prop `tolerance` d'`ObjetGauge` garde son nom (changement minimal) ; seul son commentaire change.
- Fichiers touchés : la liste fermée de D-463 §4, rien d'autre. `objetsCliniques.ts` et la route `api/praticien/equilibre` ne sont pas touchés.

## Fichiers modifiés

- `web/src/lib/praticien/mentionStabiliteMetabolique.ts` et son banc `.test.ts`.
- `web/src/components/FichePatientPanel.tsx` et `FichePatientPanel.test.tsx`.
- `web/src/lib/equilibre/natureIndiceGlobal.guard.test.ts`.
- `docs/claude/plan-journal/F59/2026-11-09-01-dette-poids-egal-close-d463.md`, `changelog.d/2026-11-09-d463-mention-stabilite.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (quatre fichiers, frontière du portail comprise) : 205 sur 205.
- T1 rapide vert. T1 complet et T2 (`npm run test:worktree -- --fast`) : voir la PR.

## Problèmes ouverts

- Aucun pour c (F59). H74 reste tenue par H61 (porte 16) et H67 (porte 24).

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` (seul le code 0 compte). Revue : CodeRabbit, sinon PR-Agent (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer`. Un verdict par remarque, puis « prête @<sha> ».
2. Après le merge, contrôler sur le cockpit que le libellé s'affiche.

## Interdits encore actifs

- Le libellé ne se modifie pas. Aucun autre objet ne reçoit ce motif.
- Rien sous `web/src/lib/clinical/` ; le calcul ne change pas ; ni migration ni `schema.prisma`.
- Ne pas reposer les arbitrages `20261108-2302-c`, `-2327-c` et `-2328-c`.
