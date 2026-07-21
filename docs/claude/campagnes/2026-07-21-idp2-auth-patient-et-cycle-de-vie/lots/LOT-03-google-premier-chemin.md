---
id: "LOT-03"
titre: "Google comme premier chemin — et la séparation des rôles rendue structurelle"
statut: "spécifié — 03a"
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
- **03b — la garde d'abord.** Le test de séparation des rôles, écrit avant toute
  ligne d'authentification patient. Une PR.
- **03c — le chemin Google patient.** Routes, drapeau éteint, journalisation sans
  secret dans l'URL, bouton d'entrée, E2E. Une PR. T3 complet et **revue
  adversariale indépendante** avant de passer la main (exception « migration ou
  authentification » de `CLAUDE.md`).
- **03d — activation.** Décision distincte et datée, avec les variables du client
  OAuth patient. Ne fait pas partie du merge.

## Risques et garde-fous

| Risque | Garde-fou |
|---|---|
| Un patient atteint `/dashboard` | 03b avant tout code ; sous A, aucun cookie NextAuth n'est émis pour un patient |
| Google devient un oracle d'appartenance | Sortie de refus unique, identique au chemin lien magique |
| Adresse Google non vérifiée, casse ou alias | `email_verified === true` exigé ; normalisation en minuscules, comme `signPatientSession` |
| Confusion des deux clients OAuth | Variables d'environnement distinctes, jamais de secret en dur |
| Régression des 13 accès ouverts | `verifyPatientSession` n'est pas touché ; E2E des deux chemins existants |
| Nouveau flux de données patient vers Google | Inscrit au registre en 03a, **avant** le code |

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
