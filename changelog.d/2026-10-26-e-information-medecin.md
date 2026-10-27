### Lettres au médecin : chaque lettre dit au médecin d'où viennent ses coordonnées et comment exercer ses droits (lot (e), D-377)

- Les trois lettres au médecin (adressage sur signal d'alerte, explorations
  biologiques, compléments ciblés) portent la phrase validée par D-377, avant
  la formule de politesse : coordonnées communiquées par le patient,
  conservées le temps de l'accompagnement, droits d'accès, de rectification,
  d'effacement et d'opposition à l'adresse des droits.
- Une seule constante (`web/src/lib/correspondance/informationMedecin.ts`),
  qui lit l'adresse de `GOUVERNANCE_TRUST.contactDroits` au lieu de la
  recopier. Aucune migration ; les lettres déjà consignées gardent leur texte.
