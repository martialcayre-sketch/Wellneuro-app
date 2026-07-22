---
id: "LOT-03"
titre: "Google comme premier chemin — et la séparation des rôles rendue structurelle"
statut: "livré — 03a, 03b, 03c, 03c-trace, 03d (activation), 03e (purge, #230, mergée) et 03f (invitation Google dans l'e-mail) en revue"
dépend_de: "LOT-02 (livré)"
---

# LOT-03 — Google comme premier chemin

> Écrit le 2026-07-21. **LOT-03a est ce document**, et rien d'autre : aucun code,
> aucune migration. Il tranche l'arbitrage qui détermine le périmètre des lots
> suivants, et il le tranche **avant** la première ligne d'authentification
> patient — c'est l'exigence explicite de la campagne.

## But

Ajouter **Google** comme second moyen de prouver la possession de l'adresse
e-mail du compte patient (décision D1), et **fermer structurellement** le risque
de conception nommé par la campagne : deux surfaces d'authentification dans le
même NextAuth.

## Résultat observable

- Un patient dont l'adresse Google correspond à `patients.email` arrive sur son
  espace **sans lien magique, sans jeton saisi, sans e-mail envoyé**.
- Les deux chemins existants — `/portail/[token]` + e-mail, et lien magique —
  fonctionnent à l'identique. **Aucun des 13 accès portail ouverts n'est rompu.**
- Un compte Google **hors** `@wellneuro.fr` ne peut atteindre ni `/dashboard` ni
  une route `/api/praticien/*`, et **un test échoue** si cela devient possible.
- Une adresse Google inconnue de la base **ne l'apprend pas** : même non-oracle
  que `POST /api/portail/lien/demande`.

## L'arbitrage — tranché le 2026-07-21

La campagne écrit : « séparation stricte du rôle dans le jeton ». L'état réel du
dépôt rend cette formulation coûteuse, et pour une raison mesurable :

| Fait vérifié dans le dépôt | Conséquence |
|---|---|
| `web/src/middleware.ts` **n'existe pas** | aucune garde centrale sur `/dashboard` ni sur `/api/praticien/*` |
| **236 appels** à `getServerSession` dans `src/app` (60 fichiers) | la garde praticien est un `if (!session)` recopié à la main |
| **Aucun** helper `requirePraticien` dans `src` | rien à corriger en un seul point |

Autrement dit : **le seul contrôle de domaine praticien du dépôt est le callback
`signIn` de `lib/auth.ts`.** Le jour où un compte patient obtient un cookie
NextAuth valide, ces 236 sites deviennent ouverts d'un coup.

### Option retenue — A : le patient n'entre jamais dans NextAuth

Google est consommé **en OIDC direct**, par une route portail dédiée, hors de
`authOptions`. Le corps du traitement est celui, déjà éprouvé, de
`app/portail/lien/[jeton]/route.ts` : vérifier, résoudre le patient, appeler
`ensureActivePortalAccess`, poser le cookie `wn_portail` via `signPatientSession`,
rediriger.

**Aucun provider n'est ajouté à `authOptions`. Aucun cookie NextAuth n'est jamais
émis pour un patient.** Le risque nommé par la campagne devient *structurellement
impossible* plutôt que *gardé* : il n'y a pas de rôle à départager dans un jeton
puisqu'il n'y a pas de jeton commun. Les 236 sites ne sont pas touchés, la
révocation (`sessionsInvalidesAvant`) continue de valoir sans changement, et le
LOT-04 n'a rien de plus à défaire.

Le client OAuth est **distinct** de celui du praticien : écran de consentement,
audience et journalisation séparés. Deux applications Google, jamais une seule
partagée.

### Option écartée — B : la lettre de la campagne

Un provider patient dans le même `authOptions`, un claim `role` dans le JWT, un
helper `requirePraticienSession()` et la migration des 236 sites.

Correcte, mais elle transforme un lot d'authentification en refonte transversale
et fait dépendre la sécurité de l'exhaustivité de 236 remplacements. La règle de
changement minimal de `CLAUDE.md` tranche pour A.

**Ce que l'option A ne dispense pas de faire.** Le test de non-régression est dû
dans les deux cas. Sous A il prend deux formes :

1. une **garde structurelle** (`lib/auth.roles.guard.test.ts`, sur le patron de
   `lib/tokens-couleur.guard.test.ts`) qui échoue si un provider est ajouté à
   `authOptions`, ou si le callback `signIn` cesse de passer par
   `profilPraticienAutorise` ;
2. une **propriété** : aucun chemin patient n'émet de cookie NextAuth, et aucun
   profil hors `@wellneuro.fr` n'est autorisé par `profilPraticienAutorise`.

Une garde qui ne peut pas échouer ne garde rien : elle sera **falsifiée une fois**
avant d'être committée.

## Non-oracle — la contrainte qui structure la route

`POST /api/portail/lien/demande` a déjà payé ce prix : réponse indifférenciée
*en code, en corps, en en-têtes et en durée*. Le chemin Google hérite de la même
exigence, sous une forme plus simple parce qu'il n'y a qu'une seule sortie de
refus : **adresse inconnue, patient inactif, portail révoqué, session invalidée,
adresse non vérifiée — même destination, même message.** Le patron est
`refuser()` de `portail/lien/[jeton]/route.ts`.

Ce que Google apporte ici et que le lien magique n'apportait pas : le temps de
réponse n'est plus un canal, l'écriture (émission de lien, poignée SMTP) ayant
disparu. Il reste à ne pas différencier la **destination**.

## Périmètre technique prévisionnel

Aucune migration Prisma : le compte est déjà la ligne `patients` (LOT-02).

| Élément | Nature |
|---|---|
| `app/portail/google/route.ts` (+ callback) | nouveau — entrée et retour OIDC |
| `lib/portail/googleIdentite.ts` | nouveau — vérification du jeton d'identité, `email_verified` exigé, normalisation en minuscules |
| `lib/auth.roles.guard.test.ts` | nouveau — la garde, écrite **en 03b, avant 03c** |
| `lib/portail/featureFlag.ts` | drapeau `WN_G5_GOOGLE_PATIENT`, éteint par défaut ⇒ route en 404 |
| `lib/observability/eventCodes.ts` | codes d'événement du chemin Google |
| page d'entrée portail | bouton « Continuer avec Google » (UI en français) |
| `e2e/*` | les deux chemins existants intacts ; refus hors domaine |
| `REGISTRE_FRONTIERES.md`, `CHANGELOG.md`, doc des variables | mise à jour |

`lib/auth.ts` **n'est pas modifié** — c'est le sens même de l'option A.

## Découpage

- **03a — cette spécification.** Documentaire, une PR. Porte au registre le fait
  que Google devient sous-traitant sur les patients (question ouverte 4 de la
  campagne).
- **03b — la garde d'abord.** *Livré le 2026-07-21* —
  `lib/auth.roles.guard.test.ts`, 53 cas, écrit avant toute ligne
  d'authentification patient. Falsifié trois fois avant d'être committé : un
  second provider dans `authOptions` (2 échecs), un `signIn` qui cesse de passer
  par `profilPraticienAutorise` (7 échecs), un `getServerSession` importé dans
  une route `/api/portail` (2 échecs).
- **03c — le chemin Google patient.** *Livré le 2026-07-21* — `lib/portail/
  googleIdentite.ts`, `app/portail/google/route.ts` et son retour,
  `app/portail/connexion/page.tsx`, drapeau `WN_G5_GOOGLE_PATIENT` éteint, codes
  d'événement, E2E. 82 tests unitaires, 3 E2E. Falsifié six fois avant d'être
  committé (voir plus bas). `lib/auth.ts` n'est pas touché.
- **03c-trace — la trace durable en base.** *Livré le 2026-07-22* — table
  `portail_connexions_google`, écrite dans `google/retour/route.ts`. Lève le
  NO-GO d'activation qu'avait posé la revue adversariale : le chemin Google
  laisse désormais une trace, comme le lien magique. Migration additive, drapeau
  toujours éteint. Falsifié trois fois (trace succès supprimée, trace avant
  vérification du `state`, trace fail-closed).
- **03d — activation.** *Exécutée le 2026-07-22* — client OAuth patient créé,
  secrets posés en Production, `WN_G5_GOOGLE_PATIENT=true`. Vérifiée par
  comportement observable (`/portail/connexion` 200, `/portail/google` redirige
  vers Google avec le bon client), pas par lecture de configuration. Détail dans
  `../ACTIVATION_RUNBOOK_G5.md`, section « Activation exécutée ». Durée de
  conservation de la trace fixée à 12 mois glissants le même jour.
- **03e — purge de la trace.** *Livré le 2026-07-22* (#230, mergée) —
  `deleteMany` opportuniste sur `portail_connexions_google` à chaque tentative,
  même patron que `portail_demande_tentatives`. Aucune migration (l'index de
  purge existait déjà dans le modèle du LOT-03c-trace). Falsification notable :
  retirer le `.catch()` local de la purge ne cassait rien — le `try/catch`
  englobant de `tracer()` rattrapait déjà tout — et a révélé que ce `.catch()`
  était pire que redondant : il avalait silencieusement un échec que le code
  rendait pourtant alertable. Retiré ; l'échec remonte désormais au `catch` qui
  journalise. Revue adversariale : GO, deux tests faibles (un tautologique, un
  sans assertion d'ordre) corrigés dans la foulée et falsifiés à leur tour.
  Vérifié en production après merge : comportement inchangé, table toujours
  vide.
- **03f — inviter vers Google, pas seulement l'accepter.** *2026-07-22* — la
  vérification de précondition de LOT-04 (voir plus bas) a montré que 12 accès
  ouverts sur 13 n'avaient **jamais** utilisé le lien magique ni Google : rien,
  ni bouton praticien ni e-mail, ne mentionnait le chemin Google. `03c`/`03d`
  avaient livré une porte que personne ne poussait vers le patient.
  `sendPortailLinkEmail` (`lib/consultation/email.ts`) propose désormais Google
  en premier quand `WN_G5_GOOGLE_PATIENT` est actif, **sans retirer** le lien
  permanent — cohérent avec D1/D8, le patient garde le choix. Drapeau éteint,
  texte identique lettre pour lettre à avant ce lot (vérifié : falsifier la
  lecture du drapeau fait échouer le test qui vérifie l'ordre Google-puis-lien).
  Pas de migration, pas de route d'authentification touchée — hors du périmètre
  de l'exception « migration ou authentification » de `CLAUDE.md`.

### Ce que 03c a coûté en falsifications

Six atteintes délibérées, chacune restaurée aussitôt. Cinq ont fait échouer la
suite comme prévu ; **la sixième l'a laissée verte, et c'est celle qui a servi.**

| Atteinte | Échecs |
|---|---|
| la vérification `email_verified` disparaît | 4 |
| l'audience (`aud`) n'est plus contrôlée | 3 |
| le `nonce` n'est plus contrôlé | 2 |
| le refus distingue l'adresse inconnue du portail révoqué | 2 |
| le cookie d'aller n'est plus effacé | 6 |
| **le `state` n'est plus vérifié au retour** | **0, puis 3** |

Retirer la vérification du `state` — c'est-à-dire la protection anti-CSRF du
retour — ne cassait rien : la route refusait quand même, mais sur une exception
levée deux lignes plus bas, rattrapée par le `catch` final. Les tests
constataient un refus et s'en satisfaisaient. Deux assertions ont été ajoutées
pour distinguer un refus **délibéré** d'un refus **par plantage** : aucun appel à
Google, et aucune entrée `logger.error`. La falsification échoue alors sur trois
cas.

## Risques et garde-fous

| Risque | Garde-fou |
|---|---|
| Un patient atteint `/dashboard` | 03b avant tout code ; sous A, aucun cookie NextAuth n'est émis pour un patient |
| Google devient un oracle d'appartenance | Sortie de refus unique, identique au chemin lien magique |
| Adresse Google non vérifiée, casse ou alias | `email_verified === true` exigé ; normalisation en minuscules, comme `signPatientSession` |
| Confusion des deux clients OAuth | Variables d'environnement distinctes, jamais de secret en dur |
| Régression des 13 accès ouverts | `verifyPatientSession` n'est pas touché ; E2E des deux chemins existants |
| Nouveau flux de données patient vers Google | Inscrit au registre en 03a, **avant** le code |

## Revue adversariale du 2026-07-21 — ce qu'elle a changé

Verdict : **GO conditionnel au merge, NO-GO à l'activation.** Aucun chemin
d'usurpation, aucune fuite de secret, aucune régression sur les deux chemins
existants ni sur la révocation. Ce qu'elle a trouvé, et qui est corrigé ici :

| Constat | Traitement |
|---|---|
| **Le cookie de session n'était jamais décodé par les tests.** `toContain('wn_portail=')` constatait qu'*un* cookie était posé. Signer l'identité d'un autre dossier laissait la suite verte — à l'endroit précis où l'erreur ouvre l'espace de quelqu'un d'autre. | Le cookie est décodé et son `idPatient` et son `email` vérifiés. Falsifié : signer `PAT_AUTRE` fait échouer. Idem pour l'argument d'`ensureActivePortalAccess`. |
| **La lecture d'un jeton d'identité était exportée.** Son nom se lit comme une validation, sa signature accepte un `string` de n'importe quelle provenance — or c'est la provenance qui autorise à ne pas vérifier la signature. Un futur appelant (Google One Tap) aurait offert l'usurpation pour le prix d'une charge base64. | La fonction devient privée. Le seul point d'entrée public est `identiteDepuisCode`, où le jeton n'existe pas comme paramètre : la propriété passe du commentaire au typage. Un test garde la surface exportée. |
| **N'importe quel site pouvait effacer l'aller** d'une personne en cours de connexion, via `?error=`, traité avant la vérification du `state`. | Le cookie n'est plus effacé tant que l'aller n'est pas reconnu. |
| **Pas de délai sur l'échange de code** — une fonction serverless qui attend indéfiniment occupe son quota. | `AbortSignal.timeout(10 s)`. |
| **Les journaux annonçaient 302** là où `NextResponse.redirect` émet 307. | Corrigé. |
| **Trois surfaces en 404 sans le drapeau, deux le prouvaient.** La page n'avait pas de test, et l'E2E tourne drapeau allumé. | `connexion/page.test.tsx` et `lien/indisponible/page.test.tsx`. |
| **L'E2E acceptait deux destinations**, donc ne pouvait presque pas échouer. | Resserré : la configuration de test ne pose délibérément aucun client OAuth, la destination est connue. |
| **Rien ne prévenait le patient** qu'il partait chez Google, alors que le registre l'inscrit comme sous-traitant nouveau. | Mention avant le clic, et rappel que l'autre chemin existe. |

Vérifié en production le 2026-07-21, sur demande de la revue : **0 ligne sur 17**
avec `email <> lower(email)`. L'hypothèse de normalisation sur laquelle repose la
recherche par adresse tient — mais aucune contrainte ne l'impose, d'où un test
qui fixe le comportement si une ligne à casse différente apparaissait.

**Ce qui bloquait l'activation, et qui est levé (LOT-03c-trace, 2026-07-22) :**
une connexion Google ne laissait **aucune trace durable en base**, là où le lien
magique écrit `consommeLe` et `rejeuxRefuses`. Le dépôt écrit lui-même l'argument
(`portail/lien/[jeton]/route.ts`) : « un log Vercel est purgé, et une trace
purgée ne prouve plus rien le jour où on la cherche ». C'est désormais la table
`portail_connexions_google` — un lot distinct avec sa migration, comme il se
devait, plutôt qu'un ajout de dernière minute à celui-ci.

Restent ouverts, à arbitrer et non à trancher en revue : la **durée de
conservation** de cette trace (décision de conformité, pas de code) ; `max_age`
sur l'URL d'autorisation (poste partagé où la session Google reste ouverte) ; et
l'absence de `noindex` sur la page d'entrée.

## Interaction avec R4, constatée au rebasage du 2026-07-21

La PR #214 a introduit `WN_PORTAIL_LIEN_PERMANENT_FIN` : passée cette date, un
lien permanent n'est plus honoré. Elle n'est **pas posée** aujourd'hui, donc rien
n'est cassé — mais le jour où elle le sera, elle coupera **plus que le lien
permanent**.

Le motif est mécanique. Les trois chemins d'entrée atterrissent sur la même URL,
`/portail/<jeton permanent>` : le jeton reste la clé de l'espace, quel que soit
ce qui a servi à prouver l'identité. Or `POST /api/portail/session` vérifie la
bascule **avant** toute résolution et répond 410
(`api/portail/session/route.ts:95`), et `resolvePortailPatientFromSession`
renvoie `null` de la même façon (`lib/consultation/portail.ts:51`) — y compris
pour un cookie `wn_portail` parfaitement valide, tout juste posé par le lien
magique ou par Google.

Autrement dit : **poser la date R4 aujourd'hui fermerait les trois chemins, pas
un seul.** Ce n'est pas un défaut de ce lot — il n'y touche pas — ni vraiment un
défaut de #214, dont le mécanisme est correct pour ce qu'il vise. C'est la
conséquence de l'ancrage de l'URL au jeton permanent, et c'est **exactement ce
que le LOT-04 doit défaire**. La correction appartient donc au LOT-04, avec le
retrait du jeton ; l'inscrire ici sert à ce que personne ne pose la date en
croyant ne couper qu'un chemin.

## Ce que ce lot ne fait pas

- Le retrait de `patients.access_token` et du secret dans l'URL — **LOT-04**,
  migration destructive, décision distincte, à ne pas enchaîner.
- L'authentification praticien, qui ne bouge pas.
- Le contenu de l'espace patient (SP-SPI), l'hébergement et la question HDS.
- L'allumage du drapeau en production (03d).
- La question ouverte 2 de la campagne (obligation de conservation) — conseil
  qualifié, pas assistant.

## Vérification

T1 après chaque édition (`npm run check`, lint inclus depuis le 2026-07-21) ; T2
avant tout commit d'UI ou d'API ; **T3 complet** sur 03c — lot
d'authentification, même exigence que LOT-02.

Cas attendus : hors domaine ⇒ `/dashboard` refusé ; adresse inconnue ⇒ page
indisponible générique ; `email_verified: false` ⇒ refus ; patient inactif ou
portail révoqué ⇒ refus ; `sessionsInvalidesAvant` postérieur ⇒ refus ; drapeau
éteint ⇒ 404 ; cookies anciens toujours acceptés ; E2E `/portail/[token]` et lien
magique intacts.
