### J1-alim : la Boussole alimentaire quitte le portail (D-365, H16)

- Démontage côté patient ([[D-365]] §1) : la route `api/portail/boussole`, la
  page de l'aliment (`portail/[token]/alimentation/boussole`) et les composants
  `patient-food-compass` sont retirés ; l'accueil du protocole et la page
  alimentation ne montent plus la Boussole.
- La route du protocole servi ne résout ni ne sert plus aucune lecture de la
  Boussole, en pause ou non ; la projection `projeterSurLeFil` perd son champ
  `boussoles`. Un protocole qui porte encore un `foodCompassRef` reste servi
  et lisible (§3) ; un banc le tient.
- Constat préalable par conteneur, en agrégats (§3) : 5 versions de protocole
  diffusées, 0 portant une Boussole.
- Restent en place : le code praticien, les contrats V2 et V4, les modules
  `lib/food-compass` et `WN_C5_ENABLED`, allumé. Sans migration ni règle
  clinique. D-C5-01 à 04 se soldent au constat du retrait en production (§4).
