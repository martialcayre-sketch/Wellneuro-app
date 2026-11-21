# Handoff — 2026-11-16 — F05 (BP-12a) : essai sous la consigne v10, neuf fiches, quatre acceptées sur neuf après rejeu, validations constatées

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v10`, depuis `origin/main` (contient #2189, consigne v10). Le lot ne contient que la consignation.

## Objectif

Jouer l'essai arbitré (`20261116-2212-b`) sous la v10, puis le rejeu des six refusées (`20261116-2220-b`), déposer et constater les fiches acceptées, constater les validations du responsable, et consigner le tout sans texte de fiche.

## Décisions prises

- `20261116-2155-b` : texte v10 approuvé tel quel (#2189, mergée).
- `20261116-2212-b` : périmètre de l'essai, les neuf fiches sans version, une fois.
- `20261116-2220-b` : rejouer une fois, tel quel, les six refusées.
- `20261116-2250-b` : une consigne v11 ciblée sur les cinq refus stables.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-09-textes-essai-v10-neuf-fiches.md` (rang 09 : le 08 est pris par #2196)
- `docs/claude/plan-journal/F05/2026-11-16-10-textes-rejeu-v10-et-validations.md`
- ce handoff.

## Validations exécutées

- `rediger.mjs`, une passe sur neuf fiches : 3 brouillons, 6 échecs de contre-lecture, aucun échec technique.
- `deposer.mjs --validate` sur les 3 brouillons : conforme. Dépôt sur `app.wellneuro.fr` : n° 1 chacun.
- Constat par conteneur, lecture seule (one-off-6930) : POLY P3, POLY P4 et MG P7 sont au n° 1 sous v10, avec 0 acte ; MG P6 (hors essai, essai v9) est au n° 1 sous v9, avec 0 acte.
- Rejeu des six : 1 acceptée (POLY P2), déposée, constatée au n° 1 avec 0 acte (one-off-3438). Les cinq autres sont refusées sur la même rubrique qu'au premier passage.
- `node --test scripts/lib/plan-journal.test.mjs` : vert ; `bash scripts/check_no_secrets.sh` : OK.
- Revue D-448 (`wn-reviewer`) : NO-GO, deux P1 corrigés (compte des rubriques, affirmation sur le tirage) et des P2 corrigés.
- Validations du responsable constatées (one-off-1199, one-off-3438) : MG P6, MG P7, POLY P3 et POLY P4, un acte `validee` par rubrique, avec relecture intégrale.

## Problèmes ouverts

- Validation à l'écran de POLY P2 (n° 1), par le responsable.
- Cinq fiches toujours refusées (POLY P6, P7, P8 ; MG P4, P5), refusées les deux fois sur la même rubrique. Le responsable a arbitré une v11 ciblée sur cinq points (`20261116-2250-b`), en cours sur la branche `f05-consigne-v11`. Les motifs sont au journal, rangs 09 et 10.
- D-501 §11 : amendement du volume d'eau (`20261116-1352-b`), à faire par une PR de décision.

## Prochaine action exacte

Déclarer cette PR « prête » après le CI. Ensuite, achever la v11 (D-501 §14, Codex P0), puis la soumettre à l'approbation du responsable avant tout essai.

## Interdits encore actifs

- Aucun rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation est un geste du responsable. Production en lecture seule, par conteneur ; un dépôt passe par la route interne.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
