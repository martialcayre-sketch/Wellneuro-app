# Handoff — 2026-08-19 — D-076 : le message d'orientation inactive

- **État** : `fix/message-orientation-inactive`, depuis `main` à `24efced3`.
  Constante + trois bancs + un renvoi doc. Aucun comportement changé.
- **Décision** : `D-076`.

## La règle qui en sort

Un message d'état ne nomme pas un terme qu'il ne connaît pas.
`MESSAGE_ORIENTATION_INACTIVE` est servie par `resultatInactif()` dès que
`orientationActive()` est faux — pour l'UN OU L'AUTRE des deux termes du ET.
Nommer la signature revenait à affirmer le seul des deux qui était devenu
faux le 2026-08-04.

## Dette qui reste ouverte, et pourquoi elle n'a pas été soldée

Les **scopes Preview et Development** des drapeaux : `FEATURE_FLAGS.md` §C les
demande vérifiés depuis le 2026-08-04. **Aucun outil accessible ne lit les
variables d'environnement Vercel** — vérifié ce jour : le serveur MCP n'expose
que les réglages de projet et la protection de déploiement. La route
d'orientation répond 401 avant le verrou, donc aucune sonde anonyme sur un
déploiement Preview ne renseigne non plus. Seul le panneau Vercel les montre :
c'est un geste praticien, à consigner ensuite dans `FEATURE_FLAGS.md`.
