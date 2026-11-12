# Handoff — 2026-11-12 — Besoin 2 : mentions périmées du registre et du plan (H15)

## Branche et état Git

- Branche `docs/besoin2-restes`, dans le worktree `.claude/worktrees/b-bp17-cadre`, avancée par `--ff-only` sur
  `origin/main` 16c29f6 (#2020).
- Documentation seule. Session concurrente : `git` et `gh` en direct.

## Objectif

Corriger les trois mentions périmées que la déclaration « besoin 2 achevé » (#2020, une autre session) n'a pas
corrigées.

## Décisions prises

- Cette session préparait la même déclaration. Au moment de l'inventaire, personne ne l'avait prise ; #2020 a été
  mergée pendant le lot, avec le même critère.
- Arbitrage du responsable :
  - la déclaration en double est abandonnée ; seuls les restes partent dans cette PR ;
  - les lignes `20261112-1405-b` et `1406-b` de la liste commune sont closes sur #2020 (doublons).
- Q1 (`20261112-1240-b`, clinique) et Q2 (`20261112-1241-b`, ordinaire), issues de la revue de D-490, sont versées
  à la liste commune. Elles sont ouvertes et ne sont pas tranchées.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : `requiredAction` de `WN-SRC-0652` et `0653`.
- `docs/claude/PLAN_WELLNEURO.md` : ligne des fiches d'usage (constat de D-477, #1982) et ligne D.3 (préalable
  levé, #2020).
- `docs/claude/plan-journal/H15/2026-11-12-04-besoin-2-restes-registre-plan.md`.
- `changelog.d/2026-11-12-besoin-2-restes-registre-plan.md`.
- Ce handoff.

## Validations exécutées

- Conteneurs détachés en lecture seule (`one-off-8022` et deux suivants) :
  - `0652-001` à `003` et `0653-001` validés ;
  - comptes 8599 / 32 / 93 ;
  - contrats de fraîcheur et de liens d'axe : `exit 0` ;
  - `fiches_usage_versions` vide.
- Empreinte de la structure calculée localement : `e59d35c3`, égale à celle de #1982.
- JSON du registre relu par `JSON.parse`.
- T1 complet et contrôle anti-secrets : voir la PR.

## Problèmes ouverts

- Étiquetage de `WN-CL-0043-005` et `0377-016` : signés sans clé de besoin, à rapprocher du dossier privé
  (`reserve-d465/`). C'est un geste délégable (D-325 §5).
- Q1 et Q2 de D-490 : au responsable.

## Prochaine action exacte

1. CI de la tête, puis revue selon la règle en vigueur sur `main` (#2017, D-499, à relire au moment de déclarer).
2. Déclarer la PR « prête @<sha> » ; l'intégrateur merge.
3. Suite de la file B : le dossier de preuve du besoin 1, au geste du responsable.

## Interdits encore actifs

- Production en lecture seule, par conteneur.
- Ni nouveau marquage ni rétablissement d'exclusion.
- Aucun texte clinique au dépôt (D-251 §4).
- Ni signature ni arbitrage par l'assistant sans délégation explicite.
- Pas de `prisma format`.
