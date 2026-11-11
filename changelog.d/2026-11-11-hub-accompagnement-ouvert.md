### Portail : « Mon accompagnement » s'ouvre quand la lecture du protocole échoue (2026-11-11)

Constat à l'écran local du 2026-11-11 (vérification 8 (a) de l'étape 1 de la
refonte Lien), arbitré par le responsable : « lot maintenant ». Sur une
coupure du protocole, l'accueil affichait bien son erreur avec « Réessayer »
(#1973), mais dans le groupe « Mon accompagnement » du hub, resté replié : il
fallait un clic pour la voir.

- Le hub ouvre ce groupe quand sa propre lecture de `/api/portail/protocole`
  échoue : coupure réseau, refus du serveur, protocole incohérent.
- Il reste replié sur une absence **confirmée** de protocole et déplié sous
  protocole servi ([[D-423]] §3). Aucun texte neuf.
