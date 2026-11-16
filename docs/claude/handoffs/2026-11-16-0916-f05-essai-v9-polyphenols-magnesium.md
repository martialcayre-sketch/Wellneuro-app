# Handoff — 2026-11-16 — F05 (BP-12a) : essai ciblé unique v9, dix fiches, aucune acceptée, cause des SyntaxError établie

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v9`, partie d'`origin/main` (`cbe52d14`) après le merge de #2150 (v9), avancée par `--ff-only` sur `d7baf395`.
- Branche locale `f05-consigne-v9` : sans objet, son contenu est sur `main` (#2150).

## Objectif

Faire un seul essai, sous la consigne `fiche-usage-v9+26ec769b7e28a398`, sur le périmètre arbitré par le responsable (liste commune `20261116-0844-b`) :
- les quatre fiches refusées sous la v8 (`FU_POLY_AOX_P2`, `P4`, `P8`, `FU_MG_P4`) ;
- les six fiches en `SyntaxError` (`FU_POLY_AOX_P3`, `P6`, `P7`, `FU_MG_P5`, `P6`, `P7`), rejouées une fois.

## Décisions prises

- Aucune décision neuve. La v9 est celle de D-501 §12.
- Périmètre : réponse du responsable du 2026-11-16, « Refusées v8 + SyntaxError », l'option recommandée. Sont hors périmètre le fer, le zinc, le volume d'eau de `FU_MG_P8` et les sept rubriques sans acte du rang 06 du 2026-11-14.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-01-textes-polyphenols-magnesium-essai-v9.md`.
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Empreinte servie vérifiée avant l'essai (`consignesVerifiees()` → `fiche-usage-v9+26ec769b7e28a398`), puis annoncée par l'outil. Aucune désignation manquante.
- Aucune fiche acceptée, aucun `--validate`, aucun dépôt, donc aucun constat par conteneur à faire.
- Cinq fiches refusées à la contre-lecture, sur 9 rubriques : POLY P2 (3), P4 (1), P8 (2), MG P4 (1), MG P7 (2). Les familles sont au journal (rang 01 du 2026-11-16).
- Cinq arrêts sur `max_tokens` : POLY P3, P6, P7, MG P5, MG P6. Chacun a 16 000 jetons de sortie et une réponse brute vide, gardée par #2148.
- Rapports hors dépôt : `~/.wellneuro/corpus/fiches-usage/*/2026-11-16T0*-revue.json`.

## Problèmes ouverts

- Budget de sortie de la rédaction (`rediger.mjs`, `max_tokens: 16000`, `thinking: adaptive`). Le raisonnement l'épuise avant tout texte sur les fiches de 14 à 41 claims. Le correctif relève de l'outil, pas de la consigne, et attend un arbitrage du responsable : augmenter le budget, borner le raisonnement, ou découper les claims.
- La phrase d'absence est encore écrite alors qu'un claim porte sur l'objet (MG P4 résultats, POLY P2 limites). La v9 borne la règle, mais le rédacteur ne la tient pas.
- Un usage dépasse le statut « preuves limitées » (POLY P8 précautions, MG P7 surveillance et arrêt).
- Rubriques hors objet ou en débordement : POLY P8 interprétations, POLY P4 options.
- Motifs neufs : une désignation d'usage modifiée dans la question (POLY P2), une conclusion non établie par les claims (POLY P2 interprétations), une population reformulée (MG P7).
- Toujours en attente :
  - validation à l'écran de `FU_MG_P3` n° 1 ;
  - le fer, le zinc et le volume d'eau de `FU_MG_P8` ;
  - les sept rubriques sans acte du rang 06.

## Prochaine action exacte

Déclarer la PR de ce lot « prête @sha » à l'intégrateur, qui la merge. Ensuite, arbitrage du responsable sur la suite. D'abord le budget de sortie de l'outil, qui conditionne cinq fiches. Puis le sort des refus : une v10 sur la phrase d'absence et l'usage qui dépasse le statut, ou un arrêt des essais sur ces fiches.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9, de l'outil ou de la structure signée sans arbitrage (D-xxx pour la consigne), et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- Pas de pull, merge ou rebase d'une branche à commits sans arbitrage. Exception : le merge d'`origin/main` sans fichier commun, sur les branches F05.
