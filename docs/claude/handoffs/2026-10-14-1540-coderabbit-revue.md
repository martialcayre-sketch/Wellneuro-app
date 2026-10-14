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
  181 caractères (max 250), revalidé après les correctifs de revue.
- T1 complet vert à chaque commit (`check_no_secrets` compris).
- Épreuve sur #1440 : revue automatique sur une PR vers `main` (l'hypothèse
  du saut de #1438 tient) ; configuration lue = celle de la branche ; statut
  `CodeRabbit` `pending` puis `success` « Review completed » ; six remarques
  en ligne, toutes retenues (`D-290` §5).

## Problèmes ouverts

- La case « Autofix » (bloc « autopilot ») reste affichée dans la synthèse :
  aucune clé du schéma ne la retire. Règle : ne jamais la cocher ; retrait par
  l'interface CodeRabbit, geste du responsable.
- Routés au plan §8 (« Dettes techniques vivantes ») depuis la synthèse de
  CodeRabbit : passe `wn-reviewer` non liée au sha final ; `.coderabbit.yaml`
  lu sur la branche (une PR peut affaiblir sa propre revue).
- Questions au responsable : CodeRabbit check obligatoire de `main` ?
  Copilot retiré de `.vscode/extensions.json` ?

## Prochaine action exacte

Merger #1440 après une revue de CodeRabbit sur le sha de tête
(`--match-head-commit`), verdicts rendus ; constater le déploiement ; mettre à
jour la mémoire `autorisation-github-copilot-assistant`.

## Interdits encore actifs

Protection de `main`, `enforce_admins`, checks obligatoires : gestes du
responsable. Aucun hook assoupli. Aucun code applicatif dans ce lot.
