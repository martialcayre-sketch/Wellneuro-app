### Modifié

- **Les dossiers de test sont réels, et la règle le dit enfin** (`D-075`,
  arbitrage praticien) : `CLAUDE.md` interdisait aux « patients fictifs » seuls
  d'apparaître, ce qui se lisait comme une interdiction d'examiner les dossiers
  réellement utilisés pour tester. Ils se **lisent désormais par identifiant**
  via `execute_sql` — la façon normale de vérifier un comportement. Deux
  interdits demeurent : aucun nom ni e-mail réel dans le dépôt (l'historique
  Git, les logs CI et Vercel ne s'effacent pas), et aucun seed ni E2E visant un
  dossier réel — `web/prisma/seed.ts` écrit des réponses de questionnaire, et une réponse
  fabriquée dans un dossier réel est une donnée que personne n'a produite
  (`DC-01`, `DC-24`). Les trois identités de fixture restent en place.
