### Clôture de session : le handoff, le journal, et l'observabilité remise à l'heure (2026-09-04)

Documents seuls, aucun code. Le handoff
`2026-09-04-0753-incident-memoire-decommissionnement-ecrans-echec.md` clôt la
séquence ouverte par l'incident du 2026-08-31 : onze PR mergées, deux revues
adversariales, et sept dettes nommées avec ce qu'elles coûtent — la première
étant que le rapporteur d'erreurs n'est pas branché, donc qu'un écran d'échec
peut s'afficher pour une personne suivie sans que personne ne l'apprenne.

`docs/claude/OBSERVABILITE_PRODUCTION.md` décrivait encore les Runtime Logs
Vercel et un runbook Vercel, trois jours après le décommissionnement : il parle
désormais de Scalingo. Sa section Sentry passait pour une option à activer ;
elle dit maintenant l'état réel — paquet installé, trois fichiers de
configuration présents, rien qui les branche — et ce que ce trou coûte depuis
les écrans d'échec livrés la veille, `digest` absent sur les erreurs clientes
compris. Une section de surveillance de disponibilité est ajoutée : les deux
alertes Scalingo armées, et pourquoi elles ne suffisent pas seules.
