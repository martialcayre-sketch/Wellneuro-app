### ap : « Ma bibliothèque », le contenant livré éteint (D-360, 2026-10-25)

- Trois titres acceptés par le responsable, à la première personne :
  « Ma bibliothèque » (titre de la page et libellé du lien), « Remis par mon
  praticien » (rayon des documents remis) et « Pour mieux comprendre ma
  démarche » (socle commun, pas encore servi, puisqu'il est vide).
- La page `/portail/[token]/bibliotheque` et sa route
  `api/portail/bibliotheque`, en lecture seule et sans document : la route
  dit si la bibliothèque est servie et si le rayon des documents remis a
  quelque chose à montrer. Le rayon porte les fiches d'assiette déjà
  remises ; chaque carte renvoie à la page de sa fiche, dont le régime ne
  change pas.
- Dossiers majeurs seuls ([[D-357]] §5) : un dossier mineur ou sans date
  de naissance reçoit un 409, et ni page ni lien ne lui sont servis.
- Servie, la bibliothèque remplace le lien « Fiches remises par mon
  praticien » dans « Autres espaces ». Le mineur garde ce lien, et la page
  des fiches reste servie à tous. Une seule fonction,
  `bibliothequeServie`, décide pour les deux sondes.
- La carte d'une fiche remise est extraite en composant
  (`CarteFicheRemise`), servi aux deux pages, sans changement à l'écran des
  fiches.
- Drapeau neuf `WN_PORTAIL_BIBLIOTHEQUE`, éteint. Il s'ouvre après le
  constat de la place 9. Aucune migration, aucun texte d'état neuf.
