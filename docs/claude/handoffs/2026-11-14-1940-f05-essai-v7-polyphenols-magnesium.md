# Handoff — 2026-11-14 — F05 (BP-12a) : essai unique v7, polyphénols et magnésium, quatre fiches déposées

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v7-poly-mg`, partie d'`origin/main` après le merge de #2121 (v7), avancée par `--ff-only` tant qu'elle était vide.
- Branche locale `f05-consigne-v7` : sans objet, son contenu est sur `main` (#2121).

## Objectif

Un seul essai, sous la consigne `fiche-usage-v7+c24e537bf91e3c4d`, des quinze fiches arbitrées le 2026-11-14 (`FU_POLY_AOX_P1` à `P8`, `FU_MG_P1` et `P3` à `P8`), le dépôt des fiches entièrement acceptées et leur constat en production.

## Décisions prises

- Aucune décision neuve. La v7 est celle de D-501 §10. Le périmètre (quinze fiches, un essai, fer en attente, `FU_MG_P2` n° 1 non rejouée) a été arbitré le 2026-11-14.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-14-05-textes-polyphenols-magnesium-essai-v7.md`.
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Essai unique v7 des quinze fiches. L'outil annonce la consigne v7, et `--designations` ne signale aucune désignation manquante.
- Quatre fiches acceptées en entier : `FU_POLY_AOX_P1`, `FU_POLY_AOX_P5`, `FU_MG_P1` et `FU_MG_P8`. `--validate` est conforme sur les quatre, déposées en brouillon n° 1 par la route interne.
- Constat par conteneur (lecture seule, `one-off-8858`) : quatre versions n° 1, structure `e59d35c3`, consigne v7, modèles `claude-sonnet-5` et `gpt-5.4`, 0 acte. Les quinze empreintes de rubrique sont égales à celles des brouillons locaux.
- Neuf fiches refusées, sur 14 rubriques. `FU_POLY_AOX_P6` et `FU_MG_P6` échouent sur une `SyntaxError`. Les rapports sont hors dépôt, sous `~/.wellneuro/corpus/fiches-usage/*/2026-11-14T18-*-revue.json`.
- Banc `scripts/lib/plan-journal.test.mjs` : 27/27. `check_no_secrets.sh --staged` : OK. CI de #2123 : 0. PR-Agent n'a pas tourné ; recours D-448 : `wn-reviewer` GO.

## Problèmes ouverts

- La validation à l'écran des quinze rubriques déposées revient au responsable : aucune délégation n'est en cours.
- Les familles de refus sont au journal F05 du 2026-11-14 (rang 05). Trois rubriques relèvent des deux questions cliniques ouvertes, sur les doses d'option et les médicaments cités par un claim (MG P4, MG P5). Ce sont les seules réponses qui débloqueraient MG P5.
- Les `SyntaxError` des deux P6 relèvent de l'outil, qui ne garde pas la réponse brute.
- En attente : le fer (#2061), les neuf fiches refusées, les deux P6.

## Prochaine action exacte

Validation des rubriques déposées par le responsable. Ensuite, son arbitrage sur les refus : questions cliniques, consigne ou mise en attente, et sur les P6. Le dossier suivant est le zinc.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite. Aucune délégation n'est en cours.
- Pas de modification de la consigne v7 ni de la structure signée, et rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits, sans arbitrage. Exception : le merge d'`origin/main` sans fichier commun, sur les branches F05. Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
