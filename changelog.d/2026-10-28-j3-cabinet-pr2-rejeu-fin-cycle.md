### J3-cabinet, PR 2 : le rejeu du cockpit et la fin de cycle sortent de leurs routes (D-385, H58)

- Nouveau module `web/src/lib/clinical-engine/rejeuEpisodeCockpit.ts` :
  `loadRuntimeInputs`, `ancreCycleCourant`, `ancrePoseeDe`,
  `episodePersisteRejouable` et `rejouerChaine`, avec leurs utilitaires,
  transcrits à l'identique de la route du cockpit, qui les importe. La page des
  comptes du cabinet (PR 3) rejouera un dossier par le même chemin.
- Nouveau module pur `web/src/lib/protocol/finDeCycle.ts` :
  `JOURS_FIN_DE_CYCLE` (valeur inchangée) et `estFinDeCycle(jourZero,
  maintenant)`, sortis de la route du portail, qui l'appelle avec son horloge.
- À comportement constant : aucun texte d'écran, aucun seuil, aucune
  migration, rien sous `lib/clinical/` ; les bancs des deux routes restent
  verts sans réécriture. La garde des constructions de la chaîne C1 compte le
  nouveau module à la place de la construction déménagée (toujours quatre).
- Tests unitaires d'`estFinDeCycle`, borne comprise, et une garde « un seul
  rejeu, une seule fin de cycle ».
