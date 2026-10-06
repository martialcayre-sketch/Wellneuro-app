### BP-10 : l'acte de lecture d'un import validé est allumé en production (D-268, 2026-10-06)

- `WN_BIO_LECTURE_ENABLED` est posé en production à 22:12 UTC, après le
  déploiement constaté de #1347 et le compte par conteneur des cartes à naître
  (une : un import validé, des lignes encore à décider).
- Effet constaté : la route de l'acte répond `401` sans session, et non plus
  `503`.
- Reste : le constat d'usage en agrégats, une fois des lectures consignées.
