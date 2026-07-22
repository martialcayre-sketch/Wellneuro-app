### Sécurité

- **Journal des accès praticien — branchement** (G-TRUST-04, exigence 5) :
  helper `journaliserAccesDossier` (écriture awaitée fail-open, purge
  opportuniste 12 mois, échec alertable sous
  `PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC`) et garde d'appartenance étendue d'un
  paramètre `acces` optionnel — journalise si et seulement si le verdict est
  `accessible`. 12 routes GET « dossier nommé » branchées (catégories A/B du
  lot) ; 5 vérifications d'appartenance inline ralliées à la garde factorisée,
  réponses 403 préservées à l'octet. Seul le gabarit littéral de route est
  journalisé — jamais l'URL reçue, l'IP, le user-agent ni un payload. Les
  écritures (POST) et les routes C/D restent hors périmètre (PR-9).
