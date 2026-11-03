### Masquage : les refus au-delà de 20 pages sont comptés (2026-11-03)

- Un compte rendu de plus de 20 pages est refusé dans le navigateur avant
  tout envoi. Ce refus est désormais signalé au serveur avec le seul nombre
  de pages (`POST /api/praticien/biologie/import/masquage/refus`, mêmes
  gardes que l'import).
- La route écrit `[bio-ingest masquage] refus trop_de_pages : N pages` au
  journal de l'application (Scalingo), sans identifiant de dossier ni de
  compte rendu. Rien n'est écrit en base. L'écran et le message de refus
  sont inchangés.
- Arbitrage du responsable du 2026-11-03 : compter avant de décider du sort
  des documents longs ; aucune migration.
