### J3-cabinet, PR 1 : le moteur des statuts de phase sort de la fiche (D-385, H58)

- Nouveau module pur `web/src/lib/trajectoire-partagee/statutsPhases.ts` :
  `statutPhase`, `statutsDesPhases` et `phaseDueDuDossier`, transcrits à
  l'identique de `FichePatientPanel`. La page des comptes du cabinet (PR 3)
  fera le même calcul que « Prochaine étape » sur la fiche.
- Nouveau module pur `etatRuntimeDerive.ts` : `deriverEtatRuntimePourPhases`
  dérive les champs runtime que les statuts lisent, transcrits de
  `ClinicalRuntimeSection`.
- La fiche et le cockpit consomment ces modules, à comportement constant :
  aucun texte d'écran, aucun seuil, aucune migration, et les bancs existants
  restent verts sans réécriture.
- Tests unitaires des deux modules, et une garde « un seul moteur » qui refuse
  une copie locale dans la fiche ou dans le cockpit.
