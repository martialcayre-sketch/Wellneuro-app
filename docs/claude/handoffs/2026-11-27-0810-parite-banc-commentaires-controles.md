# Handoff — lot `parite-banc-commentaires-controles` : commentaires du banc de parité recalés (2026-11-27)

## 1. Branche et état Git

- Branche `claude/clever-mayer-eyj3ss`, tirée d'`origin/main` à fbbca1c2 (passe cloud de l'orchestrateur,
  journal `20261127-0808-orch`).
- Carnet : le lot `parite-banc-commentaires-controles` (file D, ordre 126, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `parite-banc-commentaires-controles--v1` à l'état `prise`.
- Boîte D lue au départ : deux lignes `emis` de la passe précédente (`20261127-0709-orchestrateur`, lot
  `banc-codex-tmpdir-course` pour le Mac ; `20261127-0709-orchestrateur-2`, constat d'hygiène), passées à
  `lu`. Elles s'adressent au responsable, pas à ce lot : laissées `lu`, non `traite`.

## 2. Objectif

Fiche : handoff `2026-11-25-1517-parite-bancs-outillage-sens-check-ci.md` §6. L'en-tête de
`scripts/parite-check-ci.test.mjs` (l. 11) et la JSDoc de `commandesCiAvantNpm` (l. 42) nommaient le job
`verify` alors que la lecture porte sur `controles` depuis le 2026-10-27 ; le commentaire de l'étape
« Parité » de `.github/workflows/ci.yml` disait « L'inverse n'est pas contrôlé », faux pour
`bancs-outillage-check`. Résultat observable : diff de commentaires seul, banc vert inchangé.

## 3. Décisions prises

- Ligne 105 du banc **non modifiée** : elle appartient à la JSDoc d'`etapesHorsParite`, pas à celle de
  `commandesCiAvantNpm`, et nomme à bon droit le job `verify` (job sans `setup-node`, qui existe par
  ailleurs — la ligne du lot avertissait de ne pas le confondre).
- `ci.yml` : la phrase dit désormais que l'inverse n'est contrôlé que pour la liste
  `bancs-outillage-check` (web/package.json), dont chaque banc doit être joué dans `controles` ; le reste
  de `check` n'a pas à l'être.
- L'en-tête du banc (l. 18-29) décrivait déjà correctement l'exception `bancs-outillage-check` : inchangé.
- Revue : P2, PR-Agent sur la tête (`D-499`).

## 4. Fichiers modifiés

- `scripts/parite-check-ci.test.mjs` (deux commentaires : l. 11, l. 42).
- `.github/workflows/ci.yml` (commentaire de l'étape « Parité », l. 571-574).
- `changelog.d/2026-11-27-parite-banc-commentaires-controles.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/parite-check-ci.test.mjs` après édition : 83/83.
- `git diff` : lignes de commentaire seules (`//`, ` *`, `#`).
- T1 : voir le corps de la PR. T2/T3 non joués (passe cloud, `D-540`).

## 6. Problèmes ouverts

- Faiblesse sœur, toujours hors périmètre (handoff du 2026-11-25 §6) : `commandesNodeBash` (sens CI →
  check) ne lit que `run: node`/`bash` en tête de ligne. À inscrire au carnet par une session qui inscrit.
- Les deux lignes de la boîte D citées au §1 attendent le responsable.

## 7. Prochaine action exacte

Merge par l'intégrateur après PR-Agent sur la tête.

## 8. Interdits encore actifs

- Logique du banc, listes de bancs, étapes du CI : intouchées.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
