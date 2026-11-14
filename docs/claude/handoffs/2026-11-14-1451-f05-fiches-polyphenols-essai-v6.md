# Handoff — F05 (BP-12a) : fiches des polyphénols et antioxydants sous la v6, aucune acceptée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-fiches-poly-aox-v6`, partie d'`origin/main` (après le merge de #2107), avancée par `--ff-only` tant qu'elle était vide.
- Branche locale `f05-fiches-mg-v6` : sans objet, son contenu est sur `main` (#2107).

## Objectif

Rédiger et déposer les fiches d'usage des polyphénols et antioxydants (`FU_POLY_AOX_P1` à `P8`) sous la consigne `fiche-usage-v6+fd994955a037a754`, puis les faire valider à l'écran.

## Décisions prises

- Aucune décision neuve. La consigne v6 est celle de D-501 §9. L'ordre (magnésium, puis polyphénols, puis zinc) a été arbitré le 2026-11-13.
- Aucun libellé à rédiger : aucune hypothèse rattachée, population `POP_GENERALE` déjà validée.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-14-03-textes-polyphenols-essai-v6.md`.
- Ce handoff. Aucun code, aucune consigne, aucune structure signée.

## Validations exécutées

- Essai unique v6 des huit fiches. Aucune n'est acceptée en entier. Sept sont refusées à la contre-lecture, sur 16 des 29 rubriques qu'elles portent. `FU_POLY_AOX_P6` échoue sur une `SyntaxError` avant tout rapport de revue. `--designations` ne signale aucune désignation manquante.
- Aucun dépôt, donc aucun constat en production.
- Les rapports sont hors dépôt, sous `~/.wellneuro/corpus/fiches-usage/FU_POLY_AOX_P*/2026-11-14T13-*-revue.json`.

## Problèmes ouverts

- Les motifs, par famille, sont au journal F05 du 2026-11-14 (rang 03). Ce sont ceux du magnésium : débordements, faits sans claim, conditions tues. S'y ajoute un point propre à ce dossier : P1 et P5 n'ont aucun analyte à désigner, et leur « question » ajoute ce que la v6 ne permet pas.
- `FU_POLY_AOX_P6`, après `FU_MG_P6` : la réponse du rédacteur n'est pas un JSON lisible, et l'outil n'en garde ni le texte ni la raison d'arrêt. Un diagnostic demanderait de modifier l'outil.
- En attente : le fer (#2061), le magnésium (P1, P3 à P8 ; la « question » de P2 n° 1 sans acte), et maintenant les huit fiches des polyphénols.

## Prochaine action exacte

Arbitrage du responsable : rejeu ou non de `FU_POLY_AOX_P6`, mise en attente des sept refusées, ou bien un changement de consigne ciblé sur les familles de refus communes aux trois dossiers. Le dossier suivant est le zinc.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite. Aucune délégation n'est en cours.
- Pas de modification de la structure signée, et rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits, sans arbitrage. Exception : le merge d'`origin/main` sans fichier commun, sur les branches F05. Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
