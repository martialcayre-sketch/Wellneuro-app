# Handoff — 2026-11-17 — F05 (BP-12a) : D-501 §15, arbitrage du volume d'eau de FU_MG_P8 rendu

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-d501-s11-volume-eau`, depuis `origin/main`. Rang 03 du 2026-11-17 : les rangs 01 et 02 sont pris par #2210, ouverte.

## Objectif

Consigner dans une PR de décision l'arbitrage du volume d'eau de `FU_MG_P8`, que D-501 §11 réservait et que le responsable a rendu le 2026-11-16 (`20261116-1352-b`).

## Décisions prises

- `20261116-1352-b` (clinique), responsable, 2026-11-16 : « la validation vaut arbitrage : volume admis ».
- Choix de la session : la portée est bornée au texte validé (`FU_MG_P8` n° 1), sans aucune règle de consigne nouvelle ; l'avis Codex n'est pas sollicité, avec un motif écrit dans §15.

## Fichiers modifiés

- `docs/decisions/D-501.md` (§15).
- `changelog.d/2026-11-17-d501-arbitrage-volume-eau-mg-p8.md`, `docs/claude/plan-journal/F05/2026-11-17-03-decision-arbitrage-volume-eau.md`, ce handoff.

## Validations exécutées

- `node --test scripts/lib/plan-journal.test.mjs` et `bash scripts/check_no_secrets.sh` : verts.
- Aucune lecture ni écriture en production dans ce lot. Le constat de validation date du 2026-11-16 (one-off-3565).

## Problèmes ouverts

- POLY P7 n° 1 et MG P4 n° 1 attendent la validation du responsable.
- Trois fiches restent sans version (POLY P6, P8 ; MG P5). Les essais sont clos (`20261117-0115-b`).
- #2210 attend son merge par l'intégrateur.

## Prochaine action exacte

CI, puis revue (PR-Agent à 0, sinon `wn-reviewer`), et déclarer la PR « prête ».

## Interdits encore actifs

- Aucun essai ni rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation et le retrait sont des gestes du responsable.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
