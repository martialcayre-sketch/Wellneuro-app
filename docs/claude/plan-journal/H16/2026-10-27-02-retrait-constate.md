- **Mise à jour (2026-10-27, retrait constaté)** : J1-alim mergé (#1736, 60d694b2), en production par le déploiement de cf76ed14, qui le contient. Constaté par requêtes HTTP :
  - la route `api/portail/boussole/…` rend 404, quand le témoin `api/portail/protocole` rend 401 ;
  - la page de l'aliment rend 404, quand le témoin, la page alimentation, rend 200.

  **D-C5-01 à 04 soldées sans objet** (D-365 §4) ; D-C5-05 reste ouverte, opportuniste. Critère de fin tenu. Reste hors de D-365 : le sort des modules `lib/food-compass` sans consommateur patient, avec la suppression du code C5.
