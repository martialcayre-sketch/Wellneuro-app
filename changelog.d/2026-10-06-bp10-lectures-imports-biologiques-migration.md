### BP-10 : la table des actes de lecture d'un import validé est créée (D-268, 2026-10-06)

- **Migration seule** `lectures_imports_biologiques_v1`, demandée par le
  responsable le 2026-10-06. Aucun code n'écrit ni ne lit encore la table.
  La carte du Fil et le geste de lecture viendront dans une seconde PR,
  derrière un drapeau, après une application constatée par conteneur.
- La table trace qu'un praticien **a lu** un import biologique validé, ou
  qu'il a révoqué cette lecture. Elle ne porte ni valeur, ni libellé, ni
  marquage, ni texte libre. Le code de révocation est pris dans une liste
  fermée : `acte_pose_par_erreur`, `mauvais_import`, `lecture_a_refaire`.
- La base refuse :
  - l'import d'un autre dossier ;
  - l'acte d'un autre praticien que celui du dossier ;
  - la lecture d'un import sans ligne validée, ou qui garde une ligne à
    décider ;
  - une seconde lecture active ;
  - une révocation qui ne vise pas une lecture de cet import.
- La table est figée : aucune mise à jour, aucune troncature. Elle est
  effacée nommément avec le dossier. Le contrat
  `lectures_imports_biologiques_v1_negatif.sql` est joué au CI : 15
  promesses, 37 mutants tués.
