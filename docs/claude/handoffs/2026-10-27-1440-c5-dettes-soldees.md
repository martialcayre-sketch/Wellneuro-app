# Handoff — 2026-10-27 — File D : retrait de la Boussole constaté, D-C5-01 à 04 soldées (D-365 §4, H16)

## Branche et état du dépôt

- Branche `lot/c5-dettes-soldees`, partie de `origin/main` (67b58cb7, #1739) ;
  worktree `file-d1-suite`, session concurrente, cycle en `git`/`gh` direct.
- PR de doc seule : ni code, ni migration, ni release-db.

## Objectif

Clore J1-alim. Le retrait doit être constaté en production avant de solder
D-C5-01 à 04, comme le demande D-365 §4.

## Décisions prises

- Constat par requêtes HTTP sur `app.wellneuro.fr`, après le déploiement de
  cf76ed14, qui contient #1736 (60d694b2) :
  - `api/portail/boussole/…` rend 404, quand le témoin `api/portail/protocole`
    rend 401 ;
  - la page de l'aliment rend 404, quand le témoin, la page alimentation,
    rend 200.
- Le fichier `DETTE_C5.md` n'est pas touché : il dit que le plan fait foi
  depuis le 2026-10-14. Le solde s'écrit au plan, dans H16 et la ligne D-C5 du
  §8.
- La dette routée sur la revue de #1736, la colonne « Patient » de la matrice
  de consommation, est posée au §8.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` (H16, §8)
- `changelog.d/2026-10-27-c5-dettes-soldees.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Requêtes HTTP de constat, avec leurs témoins.
- T1 (`check:rapide`) sur la branche.

## Problèmes ouverts

- Le sort des modules `lib/food-compass` sans consommateur patient, avec la
  suppression du code C5 ; hors de D-365.
- D-C5-05, opportuniste.
- Le générateur de la matrice, en son propre lot.

## Prochaine action exacte

La séance des lettres de la file D a livré :
- cb (#1726), bg (#1728) et J1-alim (#1736), avec ce constat ;
- le plan de J3-cabinet (#1739).

Ses lots ba et (e) ont été laissés à d'autres sessions. bb (lot 7) est pris
par une autre session. Prochaine action : PR 1 de J3-cabinet, dans une
session dédiée (`docs/claude/propositions/2026-10-27-j3-cabinet-plan/`).

## Interdits encore actifs

- Aucune migration sans accord ; aucun texte patient inventé.
- Production en lecture seule ; aucun identifiant de dossier dans le dépôt.
- Un merge à la fois ; aucun merge tant qu'un run `release-db` attend.
