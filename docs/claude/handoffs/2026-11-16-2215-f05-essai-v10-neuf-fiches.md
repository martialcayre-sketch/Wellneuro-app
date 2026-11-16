# Handoff — 2026-11-16 — F05 (BP-12a) : essai sous la consigne v10, neuf fiches, trois acceptées et déposées

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v10`, depuis `origin/main` (contient #2189, consigne v10). Le lot ne contient que la consignation.

## Objectif

Jouer l'essai arbitré (`20261116-2212-b`) sous la v10, déposer et constater les fiches acceptées, et consigner le résultat sans texte de fiche.

## Décisions prises

- `20261116-2155-b` : texte v10 approuvé tel quel (#2189, mergée).
- `20261116-2212-b` : périmètre de l'essai, les neuf fiches sans version, une fois.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-08-textes-essai-v10-neuf-fiches.md`
- ce handoff.

## Validations exécutées

- `rediger.mjs`, une passe sur neuf fiches : 3 brouillons, 6 échecs de contre-lecture, aucun échec technique.
- `deposer.mjs --validate` sur les 3 brouillons : conforme. Dépôt sur `app.wellneuro.fr` : n° 1 chacun.
- Constat par conteneur, lecture seule (one-off-6930) : POLY P3, POLY P4 et MG P7 sont au n° 1 sous v10, avec 0 acte ; MG P6 est au n° 1 sous v9, avec 0 acte.

## Problèmes ouverts

- Validation à l'écran, par le responsable, de POLY P3, POLY P4, MG P7 (n° 1) et de MG P6 (n° 1).
- Six fiches refusées (POLY P2, P6, P7, P8 ; MG P4, P5). La suite dépend d'un arbitrage : consigne v11 ciblée, rejeu tel quel, ou arrêt des essais. Les motifs sont au journal, rang 08.
- D-501 §11 : amendement du volume d'eau (`20261116-1352-b`), à faire par une PR de décision.

## Prochaine action exacte

Poser au responsable la question de la suite des six refus, puis déclarer cette PR « prête » après le CI et PR-Agent.

## Interdits encore actifs

- Aucun rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation est un geste du responsable. Production en lecture seule, par conteneur ; un dépôt passe par la route interne.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
