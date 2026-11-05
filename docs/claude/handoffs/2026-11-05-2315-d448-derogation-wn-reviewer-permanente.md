# Handoff — 2026-11-05 — D-448 : dérogation `wn-reviewer` permanente, règle §1.6 alignée

## Branche et état du dépôt

- Branche `b-derogation-wn-reviewer-permanente`, avancée par `--ff-only` sur `origin/main` 1a85b02f (#1883).
- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium` : session concurrente de la file B, cycle en `git`/`gh` direct.
- Documentation seule : aucun code, aucune migration, aucune release-db.
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Point 2 des suites de D-446 : la règle écrite disait la dérogation `wn-reviewer` « par PR et jamais reportée ». Elle contredisait la dérogation permanente confirmée par le responsable le 2026-11-05.

## Décisions prises

- Forme arbitrée par le responsable (question à options) : une décision nouvelle qui amende D-393 §2, sans réécrire D-393.
- D-448, réservée par `wn-reserver-decision.mjs` au moment de rédiger :
  - §1 : dérogation permanente ;
  - §2 : GO sur la tête, revue de l'écart après un nouveau commit, verdict par constat ;
  - §3 : hors champ, les lots gardés par leur file et D-044.
- `docs/claude/POLITIQUE_REVUE.md` et `docs/claude/REGLES_PR_MERGE.md` ne parlent pas de la dérogation : rien ne les contredit, ils restent inchangés.

## Fichiers modifiés

- `docs/decisions/D-448.md` (nouvelle).
- `docs/decisions/D-393.md` : ligne datée sous §2, sur la forme des lignes de D-290.
- `.claude/rules/pr-revue-et-release-db.md` §1.6 : la dernière phrase est réécrite.
- `changelog.d/2026-11-05-d448-derogation-wn-reviewer-permanente.md`.
- Ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : voir la PR.

## Problèmes ouverts

- `CLAUDE.md` (§ PR, CI, merge) ne cite que CodeRabbit, puis PR-Agent, sans la troisième voie. C'est une omission, pas une contradiction. Non modifié : changement minimal, et le fichier est relu à chaque tour.

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), revue sur la tête, « prête @<sha> ».
2. Point 3, sur accord du responsable : deux bancs (niveau de mesure contre `aucun_acte`, paires `fiches_usage` du contrat SQL).

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Pas de pull, merge ou rebase sans arbitrage.
- Production en lecture seule par conteneur. Aucun texte clinique, libellé ou valeur au dépôt public (D-251 §4).
