### CC-8 : la première ouverture du détail du protocole s'enregistre, sous drapeau éteint (D-315 amendée)

- Nouveau drapeau `WN_PORTAIL_LECTURE_PROTOCOLE`, **éteint à la livraison** :
  fermé, l'accueil du portail sert le protocole exactement comme avant.
- Ouvert : le protocole se présente replié (titre, raison, axe) tant que la
  version diffusée en vigueur n'a pas été ouverte ; « Voir le détail de mon
  protocole » déplie les actions et le critère à trois semaines, et consigne
  la première ouverture (espèce `protocole`, identifiant de la diffusion
  approuvée, sans date). Une version lue s'ouvre dépliée d'office ; une
  nouvelle diffusion repart repliée ; une action en pause (D-281) déplie
  d'office, sans rien consigner.
- `api/portail/lectures` accepte l'espèce `protocole` par la `cycleRef`
  reçue avec la vue : le serveur résout la diffusion en vigueur et refuse en
  404 une version dépassée ou une surface fermée. Le protocole n'entre pas au
  fil du jour.
- `api/portail/protocole` sert `lectureDuDetail.dejaOuvert`, lu sur la trace
  du patient seulement ; une lecture en échec rend le détail replié, jamais
  le protocole caché.
- Banc de garde : `protocolDiffusionApproval` rejoint les modèles sans
  écriture en place (la lecture porte l'identifiant de la diffusion).
- D-315 amendée (arbitrages du 2026-10-16 : repli, libellé, revisite, pause,
  désignation par `cycleRef` et sa limite). Release-db de la migration
  consignée au plan (porte 9, H60).
