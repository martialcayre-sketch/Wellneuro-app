### Portail : « servi au patient » composé à un seul endroit (t28, D-200)

- Le rejeu de la carte puis le contrat patient étaient enchaînés à la main, à
  trois endroits : la route `api/portail/protocole`, le miroir
  praticien de la diffusion (`servieAuPatient`) et la désignation d'un
  élément au signalement (`programmeDiffuse`). Les trois appellent désormais
  `servirAuPatient` (`lib/protocol/servirAuPatientServeur.ts`), qui compose
  les deux marches et l'absence de limitation patient ; une marche ajoutée
  ne peut plus faire diverger l'écran du patient, le constat du praticien et
  la liste de la désignation. Comportement inchangé ; aucune règle clinique,
  aucun texte patient touché.
