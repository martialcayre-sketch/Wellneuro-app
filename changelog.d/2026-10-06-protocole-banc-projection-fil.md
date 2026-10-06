### Protocole : la projection « sur le fil » reçoit son banc — dette (2) de D-200 fermée (2026-10-06)

- **Pourquoi.** `projeterSurLeFil` décide seul de ce qui atteint le
  navigateur du patient, et recopie le contrat champ par champ. Un champ
  ajouté au contrat y aurait été abandonné en silence, sans que `tsc`
  rougisse. C'est ainsi que `followUpCriterion` avait voyagé des mois sans
  écran.
- **Banc.** `vuePatientSurLeFil.test.ts` classe chaque champ du contrat
  patient et de ses actions, servi ou écarté, dans un `Record` sur leurs
  clés. Un champ ajouté sans classement fait rougir `tsc`. À l'exécution :
  les champs servis sortent à l'identique, les écartés n'atteignent pas le
  fil, l'ordre des actions est tenu, et une action sans statut n'en gagne
  aucun.
- Mutations constatées rouges : un champ retiré de la projection, un champ
  ajouté au type.
- Aucun changement de comportement. Le commentaire du module nomme désormais
  `selectedPriorityId` parmi les champs écartés.
