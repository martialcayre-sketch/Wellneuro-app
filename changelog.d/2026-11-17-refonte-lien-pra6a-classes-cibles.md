### Refonte Lien, PRA-6a : les messages d'erreur des constats et de l'observation alimentaire reprennent leur couleur, les liens d'action du Fil passent à 44 px (2026-11-17)

Deux corrections minimes relevées par le constat à l'écran de PRA-6
(vérification d'ensemble du portail praticien). Aucun texte, aucun décor,
aucune route.

- `text-destructive` n'existe pas dans les jetons du dépôt : la classe était
  sans effet, et cinq messages d'erreur s'affichaient dans la couleur du texte
  courant. Ils passent à `text-status-danger`, comme `ConstatsParcoursPanel`
  l'a déjà fait. Quatre sont dans `besoins/ConstatsBesoinPanel.tsx` (constat
  sur un besoin, sous `WN_CONSTAT_BESOIN`), un dans
  `food-observation/PractitionerFoodObservationPanel.tsx` (détail d'une
  transmission).
- Le Fil du jour : le lien d'action des cartes (« Ouvrir la fiche »…) et le
  bouton « Rappeler » / « Débloquer » mesuraient 36 px ; ils passent à
  44 px (`min-h-11`), la cible du portail praticien.
- Banc : `FilDuJour.test.tsx` vérifie la hauteur des deux formes du lien
  d'action.
