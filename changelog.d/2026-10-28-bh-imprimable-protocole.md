### bh : le protocole servi s'imprime, sous `WN_PORTAIL_PROTOCOLE_IMPRIMABLE` éteint (D-392, H69, 2026-10-28)

- Nouvelle page `/portail/[token]/protocole`. Elle lit la même route que
  l'accueil (`api/portail/protocole`) et rend le détail par le même composant
  (`DetailDuProtocole`, sorti de l'accueil à apparence constante) :
  - actions sous leur régime, trois plans compris quand la version les porte ;
  - critère à trois semaines ;
  - encart « quand ralentir » ;
  - pied daté.
  Ni « Jour difficile ? », ni liens, ni boutons à l'impression.
- La route sert `imprimable` drapeau ouvert, vue servie et dossier majeur
  seulement. La date de naissance n'est lue que drapeau ouvert.
- Lien « Imprimer mon protocole » dans le détail déplié. Aucune écriture,
  aucune trace, aucune migration.
- Banc de concordance : pour la même réponse de la route, les blocs du détail
  sont identiques entre l'accueil et l'imprimable.
- D-392 écrite ; registre des drapeaux et journal de H69 mis à jour.
