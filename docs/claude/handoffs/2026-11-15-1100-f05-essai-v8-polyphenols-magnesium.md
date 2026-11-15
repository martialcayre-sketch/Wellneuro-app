# Handoff — 2026-11-15 — F05 (BP-12a) : essai ciblé unique v8, neuf fiches refusées sous la v7, une fiche déposée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v8`, partie d'`origin/main` (`71efdcb3`) après le merge de #2135 (v8).
- Branche locale `f05-consigne-v8` : sans objet, son contenu est sur `main` (#2135).

## Objectif

Un seul essai, sous la consigne `fiche-usage-v8+cb4d89a4186ee36d`, des neuf fiches refusées sous la v7 (`FU_POLY_AOX_P2`, `P3`, `P4`, `P7`, `P8`, `FU_MG_P3`, `P4`, `P5`, `P7`). Il comprend le dépôt des fiches entièrement acceptées et leur constat en production.

## Décisions prises

- Aucune décision neuve. La v8 est celle de D-501 §11. Le périmètre a été arbitré par le responsable le 2026-11-15 (prompt de session), hors les deux P6, les quatre fiches déjà déposées, le volume d'eau de `FU_MG_P8`, le fer, le zinc et les sept rubriques sans acte du rang 06.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-15-01-textes-polyphenols-magnesium-essai-v8.md`.
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Empreinte servie vérifiée avant l'essai (`consignesVerifiees()` → `fiche-usage-v8+cb4d89a4186ee36d`), puis annoncée par l'outil. Aucune désignation manquante.
- Une fiche acceptée en entier : `FU_MG_P3`. `--validate` conforme, déposée en brouillon n° 1 par la route interne (`BROUILLON_DEPOSE — n° 1`).
- Constat par conteneur (lecture seule, `one-off-7491`). `FU_MG_P3` n° 1 : structure `e59d35c3`, consigne v8, modèles `claude-sonnet-5` et `gpt-5.4`, 0 acte. Les cinq empreintes de rubrique sont égales à celles du brouillon local. Les quatre fiches déposées sous la v7 n'ont pas de version n° 2.
- Quatre fiches refusées sur 7 rubriques : POLY P2, P4, P8, MG P4. Familles au journal (rang 01 du 2026-11-15).
- Quatre `SyntaxError`, avant tout rapport : POLY P3, POLY P7, MG P5, MG P7. Les rapports sont hors dépôt, sous `~/.wellneuro/corpus/fiches-usage/*/2026-11-15T09-*-revue.json`.
- Banc `scripts/lib/plan-journal.test.mjs` : 27/27. `check_no_secrets.sh --staged` : OK. CI de #2144 : 0.
- PR-Agent ne tourne pas sur une PR de seuls fichiers de clôture (`paths-ignore` de `pr_agent.yml`). Recours D-448 : `wn-reviewer` GO, un P2 (classement de POLY P8), corrigé.

## Problèmes ouverts

- Validation à l'écran des cinq rubriques de `FU_MG_P3` n° 1 : geste du responsable, aucune délégation en cours.
- Question de la dose, sous une forme inverse : les « options » de MG P4 sont refusées parce que la quantité, que la v8 interdit d'écrire, est jugée indissociable du fait. À arbitrer avec la question clinique ouverte.
- La limite de la règle des claims non employés : la phrase d'absence est écrite alors qu'un claim porte sur l'objet de la rubrique (MG P4).
- Retour d'une famille de la v6 : la « question » ajoute un terme de mesure à la désignation de l'analyte (POLY P2, MG P4).
- Rubriques hors objet : les « interprétations » de POLY P4 (déjà sous la v7) et de POLY P8 (neuf sur cette rubrique).
- Famille de la v7 non visée par la v8, qui demeure : un usage qui dépasse le statut (« précautions » de POLY P8).
- Six fiches en `SyntaxError` au total (les deux P6, plus quatre neuves). L'outil ne garde pas la réponse brute, ce qui relève de l'outil.
- Toujours en attente : le fer, le zinc, le volume d'eau de `FU_MG_P8`, les sept rubriques sans acte du rang 06.

## Prochaine action exacte

« Prête @sha » de la PR de ce lot, puis merge par l'intégrateur. Ensuite, arbitrage du responsable : validation de `FU_MG_P3`, sort des `SyntaxError` (garder la réponse brute dans l'outil avant tout rejeu ?), et les trois familles restantes (dose inverse, terme de mesure dans la question, hors objet des « interprétations »).

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v8 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- Pas de pull, merge ou rebase d'une branche à commits sans arbitrage. Exception : le merge d'`origin/main` sans fichier commun, sur les branches F05.
