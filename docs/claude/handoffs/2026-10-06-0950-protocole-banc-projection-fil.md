# Handoff — 2026-10-06 — Protocole : banc de `projeterSurLeFil` (D-200, dette 2)

## Branche et état Git

`test/protocole-banc-projeter-sur-le-fil`, depuis `main` baf706f4. Banc seul,
aucun changement de comportement.

## Objectif

Fermer la dette (2) de `D-200` : la projection qui décide de ce qui atteint le
patient n'avait aucun banc.

## Décisions prises

- Classement servi/écarté de chaque champ du contrat dans un `Record` sur ses
  clés : la compilation garde l'exhaustivité, l'exécution garde les valeurs.
- `limitations` reste classé « servi » : `D-213` §2 le fait sortir du contrat,
  mais ce n'est pas encore exécuté. Le jour où il sort du type, `tsc` exigera
  de retirer sa ligne : le banc suivra.

## Fichiers modifiés

`vuePatientSurLeFil.test.ts` (nouveau), commentaire de `vuePatientSurLeFil.ts`,
`FILE_ATTENTE.md`, changelog, SESSION_LOG, ce handoff.

## Validations exécutées

Banc : 5 verts. Mutations rouges : un champ retiré de la projection (2 échecs),
un champ ajouté au type (`tsc` rouge sur le banc). T1 complet.

## Problèmes ouverts

- Dette (5) de `D-200` : hydratation du constructeur depuis la version
  active, et `versionsLues` non remonté au rail.
- `D-213` §2 (`limitations` sort du contrat patient) n'est pas exécutée ; le
  banc suivra le type le jour où elle l'est.

## Prochaine action exacte

CI, commentaires de revue, merge.

## Interdits encore actifs

Aucune modification du contrat patient sans décision.
