### Sécurité : la lecture du programme au dépôt du formulaire d'avant ne fait plus perdre un signalement (D-281 §5, sans migration, 2026-10-16)

- **Le défaut, antérieur** : au dépôt d'un signalement d'effet indésirable
  par le formulaire d'avant (« oui » au programme : dossier mineur ou sans
  date de naissance, ou formulaire sans désignation), la lecture du
  programme diffusé n'était pas protégée.
  Si elle échouait, le patient recevait « Erreur technique » et le
  signalement n'était pas enregistré, ni notifié (revue `wn-reviewer` de
  #1494).
- **Le correctif** : cette lecture passe par le repli posé par #1494. Si
  elle échoue, le signalement est capturé sans programme, compté par son
  statut, ne bloque pas la diffusion, et le praticien est notifié — la règle
  du repli tranchée le même jour (D-281 §5). Une réponse « non » ne lit
  rien, comme avant.
- Route `POST /api/portail/trust/signalement` seule ; aucune migration, et
  `schema.prisma` inchangé. La règle `SAF-EI-01` reste non armée.
