# Handoff — F05 (BP-12a) : fiches du magnésium sous la v6, une fiche déposée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-fiches-mg-v6`, partie d'`origin/main` après le merge de #2090 (v6), avancée par `--ff-only` tant qu'elle était vide, puis par un merge d'`origin/main`, sans fichier commun (autorisation du responsable pour les branches F05).
- Branches locales `f05-textes-mg`, `f05-textes-magnesium` et `f05-consigne-v5` : sans objet, leur contenu est sur `main`.

## Objectif

Rédiger, déposer et faire valider les fiches d'usage du magnésium (`FU_MG_P1` à `P8`) sous la consigne `fiche-usage-v6+fd994955a037a754`.

## Décisions prises

- Responsable, 2026-11-14 : `FU_MG_P6`, en échec technique, est rejouée une fois ; les six fiches refusées passent en attente, comme le fer.
- Délégation [[D-509]] du 2026-11-14 (« valide pour moi pour cette fois »). Le périmètre est nommé sur question : `FU_MG_P2` n° 1, et `FU_MG_P6` si elle était acceptée.
- Responsable, 2026-11-14 : la « question » de `FU_MG_P2` reste en attente. La suite est le dossier des polyphénols.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-14-01-textes-magnesium-essai-v6.md` et `2026-11-14-02-textes-magnesium-p2-validation-deleguee.md` (trace D-509).
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Essai unique v6 des huit fiches. `FU_MG_P2` est acceptée en entier, conforme (`deposer.mjs --validate`), et déposée par la route interne en brouillon n° 1. Six fiches sont refusées, sur 13 rubriques. `FU_MG_P6` échoue sur une `SyntaxError`, deux fois.
- Production, lecture par conteneur. `FU_MG_P2` n° 1 : structure `e59d35c3`, consigne v6, empreintes des trois rubriques égales au brouillon local (one-off-9220). Deux actes « validee », relecture intégrale, sur le texte déposé (one-off-4597).
- Les rapports et brouillons sont hors dépôt, sous `~/.wellneuro/corpus/fiches-usage/FU_MG_P*/2026-11-14T*`.

## Problèmes ouverts

- La « question » de `FU_MG_P2` n° 1 n'a pas d'acte. Elle porte la réserve du statut « non_valide », alors que le statut signé est « preuves_limitees ». La contre-lecture l'a laissée passer sur P2, mais l'a refusée sur P5.
- `FU_MG_P6` : la réponse du rédacteur n'est pas un JSON lisible, et l'outil ne garde ni ce texte ni la raison d'arrêt (`stop_reason`). Un diagnostic demanderait une modification de l'outil.
- Fiches du magnésium en attente : P1, P3, P4, P5, P7, P8 (débordements, faits sans claim, médicaments, conditions tues), et P6. Le fer reste en attente (#2061).

## Prochaine action exacte

Le dossier des polyphénols, dans un lot à part : libellés manquants, puis un essai des fiches `FU_POLY_AOX_*` sous la v6, avec les mêmes `--designations` et `--claims`.

## Interdits encore actifs

- Production en lecture seule par conteneur ; un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature : gestes du responsable, sauf délégation D-509 explicite. La délégation du 2026-11-14 valait pour cette fois seulement ; le retrait n'est pas délégable.
- Pas de modification de la structure signée ; rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits sans arbitrage (exception : merge d'`origin/main` sans fichier commun, sur les branches F05) ; aucun essai hors de ceux arbitrés ; les arbitrages rendus ne se reposent pas.
