---
id: "LOT-03"
titre: "Cockpit — reprendre, amender, écarter ; le diff proposé↔négocié"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Cockpit : reprendre, amender, écarter

## But

Donner au praticien la surface de disposition des propositions : reprendre
telle quelle, amender (sa reformulation, sa priorité), ou écarter avec
motif — et rendre lisible ce qui a été amendé (diff proposé↔négocié).

## Résultat observable

- Le panneau objectif du cockpit (phase « Compréhension ») affiche les
  propositions vivantes, chaque fragment **cliquable vers sa source**
  (anamnèse, instrument, règle + SHA).
- « Reprendre » pré-remplit le formulaire existant : `enoncePatient` par la
  **citation verbatim seule** (marquée comme citation, avec sa source),
  reformulation/priorité libres au praticien ; la soumission passe par le
  `POST /api/praticien/objectifs` existant, enrichi du seul champ
  `sourcePropositionId`.
- « Écarter » exige un motif (le matériau du bilan LOT-06).
- La trajectoire affiche le **diff** entre la proposition source et
  l'objectif négocié — ce que le praticien a changé est un fait observable.
- Une proposition caduque s'affiche comme telle et ne se reprend pas.

## Périmètre

- `web/src/components/patient-cockpit/ObjectifNegociePanel.tsx` (+ test)
- `web/src/app/api/praticien/objectifs/route.ts` : champ
  `sourcePropositionId` (référence souple, patron `supersedesObjectifId`) +
  l'événement `reprise` posé sur la proposition — **seule écriture nouvelle**.
- `web/src/lib/praticien/objectifNegocie.ts` si la préparation doit porter
  le champ.

## Hors périmètre

- Le moteur (LOT-02) ; le portail (LOT-04).
- Tout tri des propositions par priorité ou par score (G3/G7).
- Toute remise au patient.

## Fichiers probables

Ceux du périmètre ; gardes existantes à étendre :
`web/src/lib/praticien/objectifNegocie.guard.test.ts` (G1 : clé
`sourcePropositionId` entre dans la liste épinglée).

## Interdits

- `enoncePatient` jamais pré-rempli autrement que par citation verbatim
  sourcée ; jamais de texte machine assemblé dans ce champ.
- Les six gardes G1-G6 restent vertes sans assouplissement — un
  renommage plutôt qu'une exception si l'une mord à tort (précédent
  `marqueurPrisma`).
- Pas de compteur, taux ou agrégat de propositions reprises/écartées à
  l'écran (l'adhésion se constate, ne se compte pas).

## Étapes

- [ ] Étendre la route objectifs (`sourcePropositionId` + événement
      `reprise` transactionnel) ; G1 mise à jour, vue rouge puis verte.
- [ ] UI : liste des propositions, sources cliquables, reprise/écart, diff.
- [ ] États vides et caducs (un bloc fermé est absent, pas vide — patron
      6.0-A).
- [ ] T1 ; T2 avant commit ; revue `wn-reviewer`.

## Tests

- Route : reprise lie l'objectif à la proposition ; écart sans motif refusé ;
  proposition caduque non reprenable (409).
- Composant : rendu des sources, diff, aucun tri par priorité (garde
  élargie au rendu — leçon de la revue LOT-02 de 6.0-A).

## Critères de done

- T2 vert ; parcours reprendre/amender/écarter complet derrière drapeau ;
  diff lisible ; gardes étendues vues rouges.

## Résultats

À compléter à la clôture.
