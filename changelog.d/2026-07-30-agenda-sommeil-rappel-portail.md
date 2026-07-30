### Modifié

- **Agenda du sommeil — rappel dans l'espace patient** : quand le patient ouvre son
  parcours, un agenda dont la nuit du jour manque passe **devant** les autres tâches,
  y compris devant un brouillon enregistré. C'est la seule tâche périssable du portail :
  `estDateSaisissable` referme la porte à J-2, alors qu'un brouillon attend sans rien
  perdre. Le CTA devient « Noter ma nuit », avec une ligne factuelle (« 5 nuits notées
  sur 21 ») et un badge de liste propre au recueil quotidien. **Aucun envoi, aucun
  ordonnanceur** : seulement une hiérarchie d'écran.

  Interdits tenus, vérifiés par un banc de vocabulaire : aucun compte à rebours, aucun
  « il vous reste N jours », aucun « vous avez manqué », aucun pourcentage, aucune série,
  aucun agrégat ni score. Le seul chiffre servi est celui que la frise montre déjà —
  navigation, pas gamification (arbitrage du 2026-07-21). `GET /api/portail/assignations`
  gagne un champ `agendas[]` avec le compte de nuits et la position dans la fenêtre,
  calculés par la **même** arithmétique que le journal, avec assertion négative au banc
  sur les clés d'agrégat. Aucune migration.
