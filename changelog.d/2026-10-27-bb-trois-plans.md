### bb, lot 2 : le détail du protocole servi au patient lit les trois plans, et « Jour difficile ? » propose le plan de secours, sous drapeau éteint (D-384 §2-§4, D-386, H49)

- `api/portail/protocole` sert, à côté de la vue signée (inchangée), le plan
  idéal et le plan de secours des actions fermes et hors pause, quand
  `WN_PORTAIL_TROIS_PLANS` est ouvert et que la version a été créée après
  `2026-10-27T00:00:00Z` (colonne `created_at` de la ligne). Une version plus
  ancienne sert son plan minimal seul.
- L'accueil lit alors « Selon votre journée : », puis pour chaque action
  ferme « Si tout va bien », « Au quotidien », « Si c'est plus dur ». Une
  action en attente de bilan ou en pause garde son régime. « Jour difficile ? »
  propose le plan de secours ; l'orientation vers le médecin garde son plan
  minimal.
- Drapeau éteint à la livraison : rien ne change pour le patient. Activation en
  file C, porte 18. Aucune migration.
