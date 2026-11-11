### Portail : une session expirée renvoie au gate, à l'accueil et au suivi (2026-11-11)

Réponse 7 (b) du responsable à l'étape 1 de la refonte Lien
(`docs/claude/propositions/2026-11-11-refonte-lien-etape1-carte/`). Après le
lot de fiabilité (#1973), une session absente ou expirée affichait
« Connexion au portail requise. » avec « Réessayer », qui ne pouvait pas
réussir. Aucun texte neuf.

- **Accueil du protocole** et **rendez-vous de suivi** : sur un refus 401, le
  patient retourne au gate du portail (`/portail/<token>`), comme sur la page
  d'un questionnaire, « Mon bilan » et les autres écrans. Au suivi, le renvoi
  vaut au chargement comme à l'envoi.
- « Réessayer » reste pour les erreurs récupérables (coupure réseau, erreur
  technique, protocole indisponible).
