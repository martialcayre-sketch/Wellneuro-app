# Handoff — 2026-11-17 — F05 (BP-12a) : essai sous la consigne v11, cinq fiches, une acceptée et déposée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v11`, depuis `origin/main` (`d6b48b4b`, merge de #2200). Le lot ne contient que la consignation.

## Objectif

Jouer l'essai v11 arbitré (`20261117-0025-b`), déposer et constater la fiche acceptée, consigner la validation de POLY P2, sans texte de fiche.

## Décisions prises

- `20261116-2310-b` : texte v11 approuvé tel quel (#2200, mergée).
- `20261117-0025-b` : les cinq fiches, une fois.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-17-01-textes-essai-v11-cinq-fiches.md`
- ce handoff.

## Validations exécutées

- `rediger.mjs`, une passe sur cinq fiches : 1 brouillon, 4 échecs de contre-lecture, aucun échec technique.
- `deposer.mjs --validate` : conforme. Dépôt sur `app.wellneuro.fr` : POLY P7 n° 1.
- Constats par conteneur en lecture seule : one-off-4522 (POLY P7 n° 1, v11, 0 acte) ; one-off-2683 (POLY P2 n° 1, 4 actes `validee`).
- `node --test scripts/lib/plan-journal.test.mjs` et `bash scripts/check_no_secrets.sh` : verts.

## Problèmes ouverts

- La validation de POLY P7 n° 1 attend le geste du responsable.
- Quatre fiches restent sans version (POLY P6, P8 ; MG P4, P5). Les refus se déplacent d'une rubrique à l'autre d'un tirage à l'autre. La suite dépend d'un arbitrage : arrêter les essais, rejouer, ou une v12.
- D-501 §11 : amendement du volume d'eau (`20261116-1352-b`), à faire par une PR de décision.

## Prochaine action exacte

Poser au responsable la question de la suite des quatre fiches, puis déclarer cette PR « prête » après le CI et la revue.

## Interdits encore actifs

- Aucun rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation est un geste du responsable. Production en lecture seule, par conteneur ; un dépôt passe par la route interne.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
