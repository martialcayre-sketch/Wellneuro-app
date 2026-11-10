### Portail et cockpit mobile : un échec de lecture n'est plus une attente ; « Fiches » allumée sur une fiche (2026-11-11)

Lot de fiabilité ouvert par la réponse 1 (a) du responsable à l'étape 1 de la
refonte Lien (`docs/claude/propositions/2026-11-11-refonte-lien-etape1-carte/`,
constats C1, C2 et C4). Aucun texte neuf : les messages et le bouton
« Réessayer » sont ceux déjà servis au portail.

- **Accueil du portail (C1)** : le protocole et le suivi se lisent
  indépendamment. Une coupure du suivi n'efface plus le protocole ni ses
  pauses ([[D-281]]) ; un échec du protocole montre une erreur avec
  « Réessayer » au lieu de « Votre accompagnement arrivera bientôt ».
- **Rendez-vous de suivi (C2)** : une coupure réseau ou un refus du serveur
  montrent une erreur avec « Réessayer », et non plus la phrase d'attente
  « Votre suivi commencera… ».
- **Barre du bas praticien (C4)** : sur une fiche patient, « Fiches » porte
  l'état actif, comme « Fiche-trajectoire » au rail.
