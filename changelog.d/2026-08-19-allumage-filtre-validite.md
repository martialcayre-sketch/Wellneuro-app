### Le filtre de validité des passations est allumé (D-077)

- `WN_ENABLE_VALIDITE_PASSATIONS=1` posé en Production (non *sensitive* —
  lisible pour les audits futurs) et porté par un redéploiement aliasé le
  2026-08-19, sur arbitrage praticien explicite en session.
- Geste prouvé sûr AVANT l'arbitrage : lecture MCP de la production — 111
  passations, toutes `VALID` (défaut de migration, `D-052`), et aucun chemin
  d'écriture d'un autre statut hors la route d'invalidation elle-même. Aucun
  calcul existant ne change ; la route d'invalidation praticien cesse de
  répondre 503, le filtre devient réel pour l'avenir.
- `D-077` consigne aussi la méthode de lecture des variables Vercel qui
  manquait à `D-076` : tirage vers un fichier cible explicite du scratchpad,
  `.env.local` prouvé intact, tirage détruit — les variables *sensitive*
  restant illisibles par construction.
- La file d'attente referme le geste ; restent à sa liste : désarmer
  `WN_CB_RESULTS_ENABLED`, le recueil 21 jours, la preuve terminale T0.
