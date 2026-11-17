# Handoff — 2026-11-17 — F05 (BP-12a) : essai v11 et rejeu final, deux acceptées et déposées, clôture des essais sur dix fiches

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v11`, depuis `origin/main` (`d6b48b4b`, merge de #2200). Le lot ne contient que la consignation.

## Objectif

Jouer l'essai v11 arbitré (`20261117-0025-b`) puis le rejeu final (`20261117-0115-b`), déposer et constater les fiches acceptées, consigner la validation de POLY P2 et la clôture des essais, sans texte de fiche.

## Décisions prises

- `20261116-2310-b` : texte v11 approuvé tel quel (#2200, mergée).
- `20261117-0025-b` : les cinq fiches, une fois.
- `20261117-0115-b` : rejouer les quatre restantes une fois, puis arrêter les essais.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-17-01-textes-essai-v11-cinq-fiches.md`
- `docs/claude/plan-journal/F05/2026-11-17-02-textes-rejeu-v11-cloture-des-essais.md`
- ce handoff.

## Validations exécutées

- `rediger.mjs`, une passe sur cinq fiches : 1 brouillon, 4 échecs de contre-lecture, aucun échec technique.
- `deposer.mjs --validate` : conforme. Dépôt sur `app.wellneuro.fr` : POLY P7 n° 1.
- Rejeu des quatre : 1 brouillon (MG P4), 3 échecs de contre-lecture ; MG P4 déposée au n° 1.
- Constats par conteneur en lecture seule : one-off-4128 (MG P4 n° 1, v11, 0 acte) ; one-off-4522 (POLY P7 n° 1, v11, 0 acte) ; one-off-2683 (POLY P2 n° 1, 4 actes `validee`).
- `node --test scripts/lib/plan-journal.test.mjs` et `bash scripts/check_no_secrets.sh` : verts.

## Problèmes ouverts

- POLY P7 n° 1 et MG P4 n° 1 attendent la validation du responsable.
- Trois fiches restent sans version (POLY P6, P8 ; MG P5). Les essais sont clos sur ces dix fiches ; aucun nouvel essai sans un nouvel arbitrage.
- D-501 §11 : amendement du volume d'eau (`20261116-1352-b`), à faire par une PR de décision.

## Prochaine action exacte

Revue `wn-reviewer` (D-448, PR-Agent n'ayant pas tourné), puis déclarer cette PR « prête ». Ensuite, ouvrir la PR de décision de D-501 §11 (volume d'eau).

## Interdits encore actifs

- Aucun rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation est un geste du responsable. Production en lecture seule, par conteneur ; un dépôt passe par la route interne.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
