### Refonte Lien, PRA-6l : les cibles du praticien laissées par PRA-6d passent à 44 px — listes des packs et des assignations, listes de l'Alimentation, gestes du tiroir des questionnaires à consulter (2026-11-21)

Restes de PRA-6d (#2237, handoff du 2026-11-17, « Problèmes ouverts »), sur
son patron. Aucun texte, aucun décor, ni route, ni garde, ni drapeau, ni
schéma.

- Bibliothèque, rayon Questionnaires : la liste native « Filtrer par statut »
  des assignations (`CLASSE_SELECT` d'`AssignationsPacksPanel`, `min-h-11`
  seul) reçoit `h-11` ; sous WebKit, une `<select>` stylée ignore
  `min-height`. Les six listes natives de `PacksPanel` partagent leur classe
  (`inputCls`) avec des saisies : elles reçoivent `[&:is(select)]:h-11`, la
  forme de `patientInputClassName` et des `CHAMP` de PRA-6d.
- Alimentation (`PractitionerFoodObservationPanel`) : les cinq listes de
  saisie, de revue et d'activation reçoivent `h-11`.
- Fil, tiroir des questionnaires à consulter (`InboxQuestionnaires`) :
  « Ouvrir la fiche-trajectoire » et, dans le même tiroir et à la même
  hauteur de 40 px, « Confirmer la lecture », « Retirer du raisonnement
  clinique », « Rétablir dans le raisonnement », « Confirmer le retrait » et
  « Annuler » passent de `min-h-10` à `min-h-11`.
- Banc : `e2e/cibles-44px-pra6l.spec.ts` mesure la boîte englobante de
  chaque cible (Chromium et iPhone 13) ; le tiroir est servi sur une identité
  de fixture, sans écriture.
