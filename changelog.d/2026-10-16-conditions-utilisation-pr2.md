### Conditions d'utilisation : lien vers leur page, e-mail aux patients suivis et envoi depuis le cockpit, sous drapeau éteint (D-292, ACT-1, PR 2)

- Lien magique : il peut porter une destination (`?vers=conditions`), en liste
  fermée, résolue sous l'espace du patient et lue après toutes les gardes. Le
  lien des conditions atterrit sur leur page ; une valeur inconnue ramène à
  l'accueil, sans refuser le lien. Sans migration.
- Registre des gabarits : `conditions_utilisation` v1, le texte de l'e-mail
  validé avec D-292, mot pour mot, plus la phrase des 24 heures (arbitrage du
  2026-10-16). Les réponses vont à l'adresse du praticien du dossier.
- Cockpit, « Confiance & droits », drapeau `WN_PORTAIL_CONDITIONS` ouvert :
  la liste des patients suivis qui attendent l'e-mail (dossier en cours,
  portail ouvert, majeur, sans accusé de la version en vigueur, pas encore
  servi), l'aperçu, puis un envoi confirmé en une fois. Chaque envoi est
  consigné au dossier avec la version annoncée et retire le dossier de la
  liste ; un envoi en échec y reste.
- Drapeau fermé, rien ne change : ni section au cockpit, ni envoi possible.
