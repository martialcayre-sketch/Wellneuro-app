### Parcours : les tables des données physiologiques et des traitements en cours sont créées (D-335, BP-13, migration)

- Migration seule : deux tables en ajout seul gardent, ligne par ligne et
  datées, le sexe déclaré, le statut menstruel, la grossesse,
  l'allaitement, le poids et la taille, ainsi que chaque médicament ou
  complément en cours. Chaque ligne dit si elle vient du patient ou du
  praticien du dossier. La base tient une seule ligne en vigueur par
  critère et par traitement, refuse une réponse hors de sa liste, une
  mesure hors des bornes techniques, une date sans sa précision, un autre
  praticien que celui du dossier, et le retrait par le patient d'une ligne
  qu'il n'a pas déclarée. Aucun IMC, aucune classe de traitement.
- Une pièce de constat peut désormais citer une ligne de traitement en
  vigueur du dossier (troisième clé).
- L'effacement d'un dossier vide ces lignes après les pièces et les
  constats. Aucun écran ne les écrit ni ne les lit encore : le code suivra,
  sous drapeau éteint, après application constatée en production.
