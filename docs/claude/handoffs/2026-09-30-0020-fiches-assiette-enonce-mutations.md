# Handoff — 2026-09-30 — Fiches d'assiette : l'énoncé de la seconde passe Codex (mutations)

## 1. Branche et état Git

`docs/contre-revue-codex-fiches-assiette-mutations`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`2cdb6739` (#1252, correctif des journaux). Documentation seule. Un merge à
la fois : le déploiement de `2cdb6739` est suivi avant le merge de celle-ci.

## 2. Objectif

Verser au dépôt, avant qu'il soit joué, l'énoncé de la seconde passe adverse
décidée par le responsable le 2026-09-29 : éprouver par mutation les bancs de
`D-251`, qu'aucun tiers n'a encore cassés.

## 3. Décisions prises

- Mutations seules : les verdicts sur lecture de la première passe ne sont
  pas rejoués.
- **C'est le contre-relecteur qui choisit la mutation** : une mutation prévue
  par l'auteur des bancs ne prouverait rien.
- Un banc resté vert sous une mutation qui casse l'invariant = P1 confirmée.
- Mêmes règles que l'énoncé corrigé de la première passe : worktree jetable
  et propre, sinon `NON VÉRIFIABLE`.

## 4. Fichiers modifiés

- `docs/claude/PROMPT_CONTRE_REVUE_CODEX_FICHES_ASSIETTE_MUTATIONS_2026-09-30.md`.
- `changelog.d/2026-09-30-fiches-assiette-enonce-mutations.md`, ce handoff,
  `docs/claude/SESSION_LOG.md`.

## 5. Validations exécutées

- Chaque module et chaque banc cité existe au dépôt (listage de
  `lib/fiches-assiette/`, `components/patient/fiches-assiette/` et des
  `*.test.ts*` du périmètre).
- Aucun texte de fiche ni identité réelle dans l'énoncé.
- CI : voir la PR.

## 6. Problèmes ouverts

- **Résultat de la seconde passe** : chaque `NE MORD PAS` est à vérifier dans
  l'arbre avant correction ; le résultat ira dans un fichier `REVUE_CODEX_…`
  daté.
- **Le constat de l'espace** sur `PAT032`, après son prochain clic de
  diffusion.
- **Document TRUST sur l'IA** : à rédiger (Claude), valider (responsable),
  verser au dépôt seulement.
- **La phase « Actions »**, après les fiches, avec son propre `D-xxx`.

## 7. Prochaine action exacte

Merger cette PR après le déploiement constaté de `2cdb6739` ; le responsable
lance Codex sur l'énoncé.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- Codex n'est jamais invoqué par Claude.
- Les dossiers de test se lisent par identifiant, jamais par nom.
