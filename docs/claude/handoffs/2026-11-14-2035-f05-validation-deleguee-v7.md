# Handoff — 2026-11-14 — F05 (BP-12a) : validation déléguée des rubriques déposées sous la v7

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-validation-deleguee-v7`, partie d'`origin/main` après le merge de #2123 (essai v7, `711cd281`).
- Branche locale `f05-essai-v7-poly-mg` : sans objet, son contenu est sur `main`.

## Objectif

Valider à l'écran, sur délégation D-509, les quinze rubriques déposées en n° 1 sous la v7 (`FU_POLY_AOX_P1`, `FU_POLY_AOX_P5`, `FU_MG_P1`, `FU_MG_P8`), puis en laisser la trace écrite.

## Décisions prises

- Délégation D-509 du responsable, en session le 2026-11-14 : « valide pour moi ». Le périmètre a été nommé par question à options : les quinze rubriques des quatre fiches, versions n° 1.
- Huit actes posés, sept rubriques laissées sans acte, avec leur motif (journal F05, rang 06).
- Le huitième acte a été posé après la fermeture de l'onglet, sur confirmation du responsable.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-14-06-textes-polyphenols-magnesium-validation-deleguee-v7.md`.
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Relecture de chaque rubrique contre le message exact du rédacteur, reconstruit hors dépôt (claims, axes, désignations), et contre la consigne v7.
- Actes posés à l'écran sur `app.wellneuro.fr` : relecture intégrale déclarée, puis confirmation de la validation.
- Constat par conteneur (lecture seule, `one-off-707`) : huit actes « validee », relecture intégrale vraie, empreintes égales à celles des textes déposés.
- Banc `scripts/lib/plan-journal.test.mjs` et `check_no_secrets.sh --staged` (voir la PR).

## Problèmes ouverts

- Sept rubriques sans acte, à la relecture du responsable : la population de POLY P5 et de MG P8 (phrase d'absence), les précautions de POLY P5, les interprétations et les précautions de MG P1, les options et l'argument de préférence de MG P8. Ces deux dernières dépendent des questions cliniques ouvertes sur les doses et les médicaments.
- La consigne v7 laisse la rubrique « population » prendre la phrase d'absence alors qu'elle doit nommer la population signée. La contre-lecture l'a acceptée sur deux fiches. C'est à arbitrer si cela se répète.
- Toujours en attente : les neuf fiches refusées, les deux P6 (`SyntaxError`), le fer, et la « question » de `FU_MG_P2` n° 1.

## Prochaine action exacte

Arbitrage du responsable : les sept rubriques sans acte, les deux questions cliniques, les refus de l'essai v7 et les P6. Le dossier suivant est le zinc.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- La délégation D-509 de ce jour est épuisée : elle ne passe ni à une autre session ni à un autre lot. Le retrait n'est pas délégable.
- Pas de modification de la consigne v7 ni de la structure signée, et rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits, sans arbitrage. Exception : le merge d'`origin/main` sans fichier commun, sur les branches F05. Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
