### Biologie — purge à 30 jours des lignes non validées (D-318, F44)

- À 30 jours du dépôt, le cron horaire efface aussi les lignes écartées ou
  jamais décidées d'un compte rendu, puis chaque extraction restée sans ligne
  validée (et ses travaux terminés de la file). Les lignes validées, leur
  extraction et leurs actes de lecture restent ; d'un compte rendu sans ligne
  validée ne reste que la trace du dépôt (date, empreinte).
- Écarter un document transmis par le patient efface ses lignes et ses
  extractions avec lui. Un travail de la file ouvert refuse l'écart et diffère
  la purge.
- Le panneau praticien dit désormais ce qui reste après l'effacement du
  document. D-258 amendée ; aucune migration.
