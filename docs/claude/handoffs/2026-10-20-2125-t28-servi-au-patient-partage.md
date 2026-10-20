# Handoff — t28 : « servi au patient » composé à un seul endroit (D-200)

## Branche et état du dépôt

- Branche `lot/file-a-suivant`, worktree `d281-lot3-portail`, partie de
  `origin/main` (e9099182), main fusionnée (5e3a2f24, J3-12e). Sans
  migration, sans drapeau.

## Objectif

Dette t28 de la file A (plan unique §8, revue `wn-reviewer` de t20) : le
rejeu de la carte puis le contrat patient étaient enchaînés à trois
endroits ; une marche ajoutée à l'un aurait fait diverger l'écran du
patient, le constat du praticien et la liste de la désignation.

## Décisions prises

- Aucune décision nouvelle ; application de D-200.
- Le module neuf est serveur (`servirAuPatientServeur.ts`) : `servirAuPatient.ts`
  reste pur. La lecture du brouillon reste à l'appelant (409 au portail,
  « non servi » au miroir, `null` à la désignation). Le miroir passe son
  rejeu mémoïsé (`rejouer: rejeuDe`).
- Contre-revue : P2-a (une ligne de journal « protocole approuvé illisible »
  en plus quand le rejeu aurait aussi échoué) et P2-b (payload approuvé
  illisible et rejeu qui lève : 200 « non servi » au lieu d'un 500, valeur
  juste) écartés : cas de bord, constat exact.

## Fichiers modifiés

- `web/src/lib/protocol/servirAuPatientServeur.ts` (+ test), neuf.
- `web/src/app/api/portail/protocole/route.ts`,
  `web/src/app/api/praticien/protocoles/diffusion/route.ts`,
  `web/src/lib/trust/pauseEffetIndesirableServeur.ts`.
- `docs/claude/PLAN_WELLNEURO.md` (§8 → soldées),
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : un consommateur
  indirect de plus), `changelog.d/2026-10-20-t28-servi-au-patient-partage.md`,
  SESSION_LOG.

## Validations exécutées

- T1 rapide vert ; T2 `--fast` vert avant la fusion de main (841 fichiers
  Vitest, 14 201 tests ; 282 E2E) ; contre-revue `wn-reviewer` : GO, aucun
  P0/P1 ; T1 complet après la fusion.

## Problèmes ouverts

- Aucun dans ce lot. Tests facultatifs signalés par la contre-revue (journal
  du portail par marche, réutilisation du rejeu mémoïsé par l'aperçu) non
  ajoutés.

## Prochaine action exacte

CI, CodeRabbit, merge, déploiement constaté ; t28 → « fait » sur la page de
la file A.

## Interdits encore actifs

- Rien ne s'ouvre au code avant la signature M-2 (porte 6) ; aucune image
  antérieure à 257807e3 redéployée ; un merge à la fois.
