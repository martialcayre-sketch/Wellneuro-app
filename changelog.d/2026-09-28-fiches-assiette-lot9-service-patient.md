### Fiches d'assiette : le service patient des fiches remises (D-251, lot 9) (2026-09-28)

- **Sous `WN_FICHES_ASSIETTE_LECTURE`, neuf et fermé à la livraison.** Fermé,
  `GET /api/portail/fiches-assiette` répond 503 avant toute lecture de session
  ou de base : aucune fiche remise n'atteint un patient. Le drapeau d'émission,
  ouvert, n'ouvre pas la lecture.
- **Pour chaque fiche, la remise en cours, et elle seule.** Une version
  remplacée ne réapparaît jamais d'elle-même : c'est un clic « Valider pour
  diffusion » qui remet une fiche, jamais la lecture.
- **Trois états** :
  - *servie*, avec son texte, les contrôles étant rejoués au moment de
    servir ;
  - *retirée*, l'entrée restant visible, sans texte ;
  - *indisponible*, quand la version ne passe plus les contrôles. Rien n'est
    servi, et c'est dit.
- **La mention « ne fait plus partie de votre protocole actuel »** repose sur le
  protocole servi. Une assiette portée par une action ferme, suspendue ou
  différée en fait encore partie. Contre-indiquée ou non indiquée, elle en
  sort. Sans protocole servi établi, la route ne dit rien.
- **Une panne pendant le rejeu des contrôles ne retient que la fiche
  concernée** : les autres restent servies, retirées comprises.
- **Ce qui ne sort jamais** : le motif d'un retrait, le validateur, les claims,
  le texte source.
- Un patient dont le suivi est terminé garde le droit de relire ce qui lui a
  été remis : la route n'exige pas d'assignation.
