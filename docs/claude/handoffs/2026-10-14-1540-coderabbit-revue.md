# Handoff — 2026-10-14 — Gouvernance : la revue des PR passe à CodeRabbit (D-290)

## Branche et état Git

- Branche `gouv/coderabbit-revue`, depuis `origin/main` e76e0985, worktree
  `.claude/worktrees/gouv-coderabbit` (sessions concurrentes actives sur la
  copie principale).
- Lot sans fiche de campagne, P2, documentation et configuration seules.

## Objectif

CodeRabbit revoit, l'assistant merge ; verdicts sur chaque remarque, comme avec
Copilot. Barème de `POLITIQUE_REVUE.md` inchangé.

## Décisions prises

- `D-290` : amende la décision non numérotée du 2026-07-21 (« le ressort de
  Copilot ») et généralise les règles 1.5 à 1.7 de `D-214` au bot de revue.
- `.coderabbit.yaml` : chaque clé validée sur `schema.v2.json` (ajv 2020-12,
  aucune clé inconnue). Choix au-delà de la demande, motivés dans le fichier :
  `auto_pause_after_reviewed_commits: 0` (une pause silencieuse referait le
  piège de Copilot), `pre_merge_checks.docstrings.mode: off`,
  `in_progress_fortune: false`, `simplify` coupé ; linters coupés : eslint
  (joué par `verify`), biome et oxc (pas les linters du dépôt), markdownlint et
  languagetool (bruit) ; gitleaks gardé.
- `docs/claude/PLAN_WELLNEURO.md` n'est pas exclu : il est écrit à la main.
- La constitution clinique est lue comme ligne directrice sur les seuls
  chemins cliniques (`applyTo`).

## Fichiers modifiés

`.coderabbit.yaml` (neuf), `CLAUDE.md`, `docs/claude/REGLES_PR_MERGE.md`,
`docs/claude/POLITIQUE_REVUE.md`, `.claude/rules/pr-revue-et-release-db.md`,
`.claude/skills/wn-merge/SKILL.md`, `docs/DECISIONS.md`,
`changelog.d/2026-10-14-coderabbit-revue-des-pr.md`, `SESSION_LOG.md`, ce
handoff.

## Validations exécutées

- Schéma : `.coderabbit.yaml` VALIDE, 0 clé hors schéma, `tone_instructions`
  181 caractères (max 250).
- T1 complet et `check_no_secrets` : voir le corps de la PR.

## Problèmes ouverts

- Cause du saut de revue sur #1438 : hypothèse (passage à l'installation),
  tranchée par l'épreuve de la PR de ce lot (`D-290` §5).
- Questions au responsable : CodeRabbit check obligatoire de `main` ?
  Copilot retiré de `.vscode/extensions.json` ?

## Prochaine action exacte

Lire les trois sorties de CodeRabbit sur la PR, rendre les verdicts dans son
fil, compléter `D-290` §5, merger après une revue sur le sha de tête, constater
le déploiement.

## Interdits encore actifs

Protection de `main`, `enforce_admins`, checks obligatoires : gestes du
responsable. Aucun hook assoupli. Aucun code applicatif dans ce lot.
