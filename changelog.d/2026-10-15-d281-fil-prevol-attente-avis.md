### D-281 §5 : le Fil du jour et le prévol comptent le « non traité » par l'attente d'avis (2026-10-15)

- La carte « Signalement » du Fil du jour et le prévol du copilote
  appliquent la règle du panneau TRUST : un effet indésirable qui reçoit un
  avis (rattaché, ou formulaire d'avant) reste non traité tant qu'aucun
  verdict n'est en tête de sa chaîne, quel que soit son statut. Passé à
  « traité » sans avis, il ne sort plus d'aucun compteur. Les autres
  signalements se comptent toujours par statut.
- Une seule règle : `effetsNonTraites` (module pur de la pause), réutilisée
  par le panneau, le Fil et le prévol ; la lecture commune est
  `lireEffetsNonTraites`. Le comportement du panneau est inchangé.
- Le Fil lit désormais les effets indésirables sur les seuls patients actifs du
  praticien, et la borne de dix s'applique après la sélection : un
  signalement déjà jugé n'en évince plus un qui attend.
- Comptage actif dès le déploiement, comme le compteur du panneau ; seule la
  garde de la diffusion attend la signature (D-281 §6). Aucune migration,
  aucun schéma modifié.
