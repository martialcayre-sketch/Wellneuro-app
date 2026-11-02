### Audit 3, lot Q3 quater : une annulée n'est plus « en retard » ; le déblocage refuse une annulée et un suivi clôturé (D-422)

- Fil du jour : une assignation annulée ne fait plus de carte « Échéance
  dépassée ».
- Dossier patient : une assignation annulée sort du bloc « Jamais rempli,
  échéance dépassée ». Un déblocage refusé s'écrit sous la ligne, avec le
  motif du serveur, au lieu de laisser le bouton revenir sans rien dire.
- Déblocage (`PATCH /api/praticien/assignations`) : refusé avant toute
  écriture pour une assignation annulée et pour un suivi clôturé, avec les
  mêmes messages que le rappel. Sur un suivi clôturé, une demande de
  correction se débloque après la réouverture du suivi.
- Aucune migration. Bancs des cartes, de la lecture, de la route et du
  dossier, chacun prouvé par mutation.
