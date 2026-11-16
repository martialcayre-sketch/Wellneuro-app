# Handoff — 2026-11-16 — F05 (BP-12a) : validations des fiches d'usage constatées, 30 rubriques sur 30

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-constat-validations`, partie d'`origin/main` (`e9da2b71`, qui contient le merge de #2169 `35846ccd`).

## Objectif

Constater par conteneur les validations annoncées par le responsable (« fu validées », 2026-11-16) et les consigner au journal F05.

## Décisions prises

- Les validations sont des gestes du responsable, faits à l'écran.
- `20261116-1352-b` (clinique), responsable, 2026-11-16 : « Oui, arbitrage rendu ». La validation de « options » de `FU_MG_P8` vaut l'arbitrage distinct de D-501 §11, et le volume d'eau est admis pour ce texte.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-03-textes-validations-constatees.md`, ce handoff.

## Validations exécutées

- Requête jouée d'abord à blanc sur une base locale, puis en production par `scalingo run -d`, en `BEGIN TRANSACTION READ ONLY … ROLLBACK`. État : `one-off-1073`. Détail des actes du jour : `one-off-3565`.
- Huit versions n° 1 déposées, 30 rubriques sur 30 validées, chacune sur l'empreinte de son texte et en relecture intégrale, avec une seule adresse de validateur ; une partie des actes antérieurs a été posée sous délégation D-509. Neuf actes « validee » le 2026-11-16.

- Revue de recours D-448 (`wn-reviewer`, PR-Agent sans run sur des fichiers de clôture), sur b2625481 : NO-GO sur un P1, qui fermait en silence l'arbitrage du volume d'eau. Il est corrigé après l'arbitrage `20261116-1352-b`. Les trois P2 sont corrigés : restes de FER P3 et MG P2 soldés, fer remis dans les points ouverts, délégation D-509 précisée.

## Problèmes ouverts

- L'essai v9 sur `FU_POLY_AOX_P3`, `P6`, `P7`, `FU_MG_P5` et `P6` (streaming, 64 000 jetons) attend l'arbitrage du responsable.
- La v10 viendra au vu de cet essai : D-501 §13, Codex P0, puis le texte soumis au responsable.
- La phrase fixe de quantité (Q1-B) n'est pas encore éprouvée.
- D-501 §11 est à amender par une PR de décision distincte (avec un fragment `changelog.d`) : l'arbitrage du volume d'eau de `FU_MG_P8` est rendu (`20261116-1352-b`). La question clinique a été posée et tranchée en séance sans avis Codex joint (D-505) : la PR de décision en joint un, ou justifie son absence.
- Restent sans version déposée : les dix fiches de l'essai v9, le fer (`FU_FER_P1`, `P2`, `P5`, `P6`, refusées, en attente d'un changement identifié, couverture documentaire ou cadre signé), le zinc et les autres fiches de la structure non encore rédigées.

## Prochaine action exacte

Déclarer cette PR « prête @sha ». Poser la question de l'essai v9 sur les cinq fiches arrêtées sur `max_tokens`.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- `web/.env.local` est absent du worktree : passer `--env-file=/Users/wellneuro/Developer/Wellneuro-app/web/.env.local`.
