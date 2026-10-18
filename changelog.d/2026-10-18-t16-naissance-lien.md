### Portail : un lien magique ne peut plus naître d'un dossier en train de se fermer (t16, 2026-10-18)

- Quand un patient redemande un lien, l'éligibilité de son dossier était lue
  avant la transaction qui crée le lien. Sous contention, une désactivation ou
  une révocation pouvait passer entre les deux : elle fermait les liens en
  vol, mais pas celui qui naissait juste après, utilisable si le dossier était
  réactivé sous 24 h (écart résiduel n° 3 de D-126).
- L'éligibilité se relit désormais dans la transaction, sous verrou de la
  ligne du dossier : la demande attend le geste du praticien, puis refuse si
  le dossier est fermé. La réponse au patient ne change pas.
- Un banc à deux sessions joue la course contre PostgreSQL, en CI et en T3.
