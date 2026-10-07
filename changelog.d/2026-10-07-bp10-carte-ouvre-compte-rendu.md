### BP-10 : la carte « compte rendu à lire » ouvre le compte rendu qu'elle désigne (D-268, 2026-10-07)

- La carte du Fil `import_biologique_a_lire` mène à
  `?onglet=trajectoire&compteRendu=<id>` : le compte rendu de l'import s'ouvre
  à l'arrivée et le panneau vient à l'écran. Avant, le praticien le
  retrouvait lui-même parmi les dépôts.
- Le paramètre est validé par la page (forme d'identifiant des routes
  biologie) ; l'appartenance au dossier reste jugée par la route (404, message
  d'échec habituel).
- Sans marqueur `?fil=` : la carte ne s'acquitte toujours que par l'acte de
  lecture. Aucune migration, aucune logique clinique.
