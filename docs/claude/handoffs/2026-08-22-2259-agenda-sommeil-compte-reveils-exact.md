# Handoff — 2026-08-22 — Agenda du sommeil : le compte de réveils devient exact (D-091)

## Branche et état Git

- Lot **mergé** : PR #758, squash `31842f01` sur `main`. Branche
  `feat/agenda-sommeil-compte-reveils-exact` à supprimer par Copilot.
- Ce handoff arrive par une PR de doc séparée (fenêtre de clôture fermée au
  merge — écrit depuis `main`, jamais en rebranchant sur la branche squashée).

## Objectif du lot

Recueillir plusieurs réveils nocturnes dans l'agenda du sommeil (Q_SOM_09).
Le recueil plafonnait à « 3 ou plus » : un patient à six réveils par nuit
était indiscernable d'un patient à trois.

## Décisions prises (D-091)

- Compte **exact**, contrat `agenda-sommeil-v3` ; borne de vraisemblance
  technique `NB_REVEILS_MAX = 20` — identifiée comme non clinique (DC-19).
- **Aucun horaire de réveil nocturne** — option débattue puis écartée : le
  Consensus Sleep Diary recueille compte + durée cumulée ; horodater
  pousserait le patient à regarder l'heure la nuit. Le WASO reste dérivé de
  la classe de durée déclarée.
- Sur une ligne v1/v2 en base, `nombre: 3` reste un PLANCHER (« 3 ou plus »),
  jamais réinterprété — même doctrine que les classes d'éveil héritées.
- Le compte reste facultatif et **hors calcul structurel** : l'indice /100 ne
  le voit qu'à travers l'efficacité, comme avant.
- Écartées : une durée par réveil (contrat plus lourd sans gain clinique) ;
  se contenter de rendre le champ plus visible.

## Fichiers modifiés

- `web/src/lib/agenda-sommeil/types.ts` — contrat v3, `NB_REVEILS_MAX`,
  note (g) ; `nuit.ts` — borne d'écriture ET de lecture.
- `web/src/components/patient/agenda-sommeil/SaisieNuitForm.tsx` — compteur
  tactile − / + (composant `Compteur`), toujours sans clavier ; décrémenter
  depuis 1 = « pas de réponse », 0 réservé à la nuit continue.
- `web/src/lib/questionnaires/sommeil.ts` — borne du pseudo-item
  `AGD_REV_MOY` 0..20 (métrique brute, hors indice).
- `web/src/lib/agenda-sommeil/agregats.ts` — commentaire plancher v1/v2.
- Tests : `nuit.test.ts`, `agregats.test.ts`, `SaisieNuitForm.test.tsx`.
- `docs/DECISIONS.md` (D-091), fragment
  `changelog.d/2026-08-22-agenda-sommeil-compte-reveils-exact.md`.

## Validations exécutées

T1 vert (dont `decisions-numerotation.mjs`, suite pleine après rebase sur le
D-090 du lot-04) ; Vitest agenda-sommeil 229/229 ; T2 vert (142 E2E, build de
production, Chromium + WebKit) ; CI `verify` vert (`wn-attendre-ci`, exit 0).

## Problèmes ouverts

- `AGD_REV_MOY` mélange des planchers v2 (3 = « 3+ ») et des comptes exacts
  v3 : sous-estimation transitoire, documentée dans le code, se résorbe à
  mesure que les nuits v3 s'accumulent. Aucun geste requis.
- L'affichage praticien (`ChronogrammeSommeil`) rend un 3 historique comme
  « 3 réveil(s) » sans dire « ou plus » (préexistant ; distinguer exigerait
  de faire remonter `contractVersion` jusqu'au composant).
- Aucun E2E dédié au compteur (couvert par Vitest ; parcours E2E existants
  inchangés).

## Prochaine action exacte

Aucune — le lot est clos. Si un jour un seuil sur le compte de réveils devait
entrer dans un calcul ou une interprétation (fragmentation), il exigerait une
provenance certifiée + D-xxx (DC-01, DC-19).

## Interdits encore actifs

Pas de réinterprétation des `nombre: 3` v1/v2 ; pas de recueil d'horaires de
réveils nocturnes sans nouvelle décision ; le compte n'entre dans aucun calcul
structurel sans provenance certifiée.
