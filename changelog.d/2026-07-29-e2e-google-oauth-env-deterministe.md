### Les E2E d'entrée Google ne dépendent plus du `.env.local` local (2026-07-29)

`portail-google.spec.ts` vérifie l'état exact de la production : drapeau G5
allumé, **aucun client OAuth patient posé** — la route doit alors refuser
proprement (`/portail/connexion?etat=refus`), sans jamais ouvrir de session.

Le `webServer.env` de `playwright.config.ts` **prétendait** cet état mais ne
l'imposait pas : son `...process.env` faisait fuiter le vrai
`WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET` présent dans `web/.env.local`
(nécessaire à `npm run dev`). Sur les postes où ce fichier existe — donc en
local, jamais en CI — `configurationGoogle()` recevait un client réel, la route
redirigeait vers Google, et deux E2E viraient au rouge « hors périmètre », de
façon stable et reproductible. Le test dépendait de la configuration de la
machine, pas du code.

`WN_GOOGLE_PATIENT_CLIENT_ID` et `WN_GOOGLE_PATIENT_CLIENT_SECRET` sont
désormais forcés à la chaîne vide **après** le spread : la valeur vide fait
rendre `null` à `configurationGoogle()`, et le test observe partout le même état
de production. Aucun changement de comportement applicatif — seul l'environnement
du serveur de test change, et seulement en local (le CI ne posait déjà pas ces
variables).
