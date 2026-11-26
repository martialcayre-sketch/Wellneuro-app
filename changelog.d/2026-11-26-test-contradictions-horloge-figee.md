### Test des convergences (H98, D-495) : l'horloge est figée, le test ne périme plus (2026-11-26)

`web/src/lib/clinical/contradictionsService.test.ts`, cas « D-495 : corpus
lisible — la convergence sort et rien n'est signalé », rougissait le CI de
toutes les PR depuis le 2026-11-26 à 10 h UTC, `main` comprise. Le service
`contradictionsDetailleesPourPatient` lit `Date.now()`. La réponse de fixture
Q_MOD_01, datée du 2026-11-05 à 10 h UTC, est sortie ce jour-là de sa fenêtre
de fraîcheur de 21 jours, et la convergence attendue `CONV-B5` a disparu.
Signalé par la file B sur #2378.

- Les trois cas du « dossier stocké » figent désormais `Date` à la constante
  `MAINTENANT` du bloc (2026-11-07 à 12 h UTC), celle que les autres cas
  passent déjà au service. L'horloge réelle revient après chaque cas.
- Test seul : ni le service, ni la fenêtre de fraîcheur, ni aucune règle ne
  change. Le chemin `web/src/lib/clinical/**` déclenche toutefois un
  `release-db` sans migration au merge (D-044).
