# Handoff — 2026-11-16 — F05 (BP-12a) : validations des fiches d'usage constatées, 30 rubriques sur 30

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-constat-validations`, partie d'`origin/main` (`e9da2b71`, qui contient le merge de #2169 `35846ccd`).

## Objectif

Constater par conteneur les validations annoncées par le responsable (« fu validées », 2026-11-16) et les consigner au journal F05.

## Décisions prises

- Aucune décision neuve. Les validations sont des gestes du responsable, faits à l'écran.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-03-textes-validations-constatees.md`, ce handoff.

## Validations exécutées

- Requête jouée d'abord à blanc sur une base locale, puis en production par `scalingo run -d`, en `BEGIN TRANSACTION READ ONLY … ROLLBACK`. État : `one-off-1073`. Détail des actes du jour : `one-off-3565`.
- Huit versions n° 1 déposées, 30 rubriques sur 30 validées, chacune sur l'empreinte de son texte et en relecture intégrale, avec un seul validateur. Neuf actes « validee » le 2026-11-16.

## Problèmes ouverts

- L'essai v9 sur `FU_POLY_AOX_P3`, `P6`, `P7`, `FU_MG_P5` et `P6` (streaming, 64 000 jetons) attend l'arbitrage du responsable.
- La v10 viendra au vu de cet essai : D-501 §13, Codex P0, puis le texte soumis au responsable.
- La phrase fixe de quantité (Q1-B) n'est pas encore éprouvée.
- Restent sans version déposée : les dix fiches de l'essai v9, le zinc et les autres fiches de la structure non encore rédigées.

## Prochaine action exacte

Déclarer cette PR « prête @sha ». Poser la question de l'essai v9 sur les cinq fiches arrêtées sur `max_tokens`.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- `web/.env.local` est absent du worktree : passer `--env-file=/Users/wellneuro/Developer/Wellneuro-app/web/.env.local`.
