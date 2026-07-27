### Sécurité — le cookie de session devient l'unique credential du portail patient (LOT-04, exigence 4 G-TRUST-04) (2026-07-27)

Le jeton d'accès permanent `patients.access_token`, stocké **en clair** et
servant de **clé d'URL** `/portail/<jeton>` **et** de credential (jeton + e-mail
= accès), cesse d'authentifier. L'accès repose désormais sur le seul **cookie de
session signé `wn_portail`** (HMAC, déjà posé à l'atterrissage magic-link et
Google) : `resolvePortailPatientFromSession` résout le patient par
`session.idPatient`, plus par un jeton d'URL. Le segment d'URL du portail porte
maintenant l'`idPatient` (pseudonyme, non secret), et le jeton secret disparaît
de l'URL comme de la chaîne d'accès. Le gate e-mail du portail est retiré : sans
cookie valide, la page renvoie vers `/portail/connexion`.

Les 18 routes `/api/portail/*` et les deux atterrissages passent tous à la
résolution par cookie ; les envois praticien (assignation, pack, file d'envoi,
consultation, lien) ne contiennent plus de lien permanent — ils pointent la page
de connexion. Le résolveur-credential `resolvePortailPatient(jeton, email)`, le
helper `portal-access.ts` (jeton permanent) et le coupe-circuit `lienPermanent.ts`
sont **supprimés** (code d'auth mort = passif). Le secret `access_token` (chaîne)
n'est plus lu ni écrit nulle part.

**La révocation reste infaillible**, et c'est l'invariant tenu par le lot :
`accessTokenRevoked` (booléen, non secret) demeure le drapeau « accès portail
révoqué », vérifié à **chaque entrée** — session cookie (`isSessionValideForPatient`),
atterrissage Google, **atterrissage magic-link (garde réécrite explicitement, la
classe de bug PR #202)**, redemande de lien. La révocation praticien continue de
poser `accessTokenRevoked=true` + `sessionsInvalidesAvant` + fermeture des
magic-links en vol (`sessionsInvalidesAvant` seul ne bloque pas un nouveau login).
Les 14 patients actifs conservent l'accès : magic-link et Google restent, la page
`/portail/connexion` est enrichie pour offrir **les deux** voies de reprise
(Google + réception d'un lien par e-mail) — elle ne renvoie `404` que si aucune
n'est ouverte.

**Aucune migration** : les colonnes `access_token*` sont conservées (rollback par
`git revert`, sans backup). Le `DROP COLUMN` destructif est une PR ultérieure,
après fenêtre de stabilité.
