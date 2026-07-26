# Audit des identités Google — WellNeuro

> Établi le 2026-07-25. Déclencheur : erreur `403 org_internal` en test staging,
> alors que la connexion Google patient **fonctionne en production**. Objectif :
> cartographier tous les identifiants Google (code + Vercel + base), expliquer la
> contradiction, proposer une simplification **sans casser la prod qui marche**.

## Résumé exécutif

- **La prod n'est pas cassée.** Le login Google patient a **6 connexions réelles
  réussies** (patients en `gmail.com`, dont une le 2026-07-25). Vérifié en base
  (`portail_connexions_google`).
- **La contradiction venait d'un client OAuth créé par erreur** dans le projet
  *praticien* (Interne), récupéré par erreur pour staging → `org_internal`. Il
  n'a jamais servi la prod.
- **L'architecture est déjà correcte et minimale** : deux projets Google (un
  praticien *Interne*, un patient *Externe*) — c'est **obligatoire**, on ne peut
  pas les fusionner (types de consentement incompatibles). La « simplification »
  se limite donc à **supprimer le client parasite** et à **documenter/consolider
  la propriété**.
- **Aucune fuite de secret par git.** Le service account Drive est en local,
  gitignoré, jamais committé.

## 1. Inventaire réel (vérifié)

### Deux projets Google Cloud + un compte de service

| Projet Google | Type consentement | Contient | Variable(s) | Statut |
|---|---|---|---|---|
| **n° 385215216634** (« wellneuro ») | **Interne** (`@wellneuro.fr`) | client OAuth **praticien** (NextAuth) | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ correct |
| ⤷ *même projet* | Interne | **client parasite** `385215216634-tanfoe…` (créé par erreur, 2 secrets, JSON dans `secrets/`) | — | ❌ à supprimer |
| ⤷ *même projet (project_id « wellneuro »)* | — | **service account Drive** `wellneuro-notebooklm-push@…` | `WN_DRIVE_SA_JSON(_INLINE)`, `WN_DRIVE_SUBJECT` | ✅ outillage local |
| **n° 750815743505** | **Externe** (publié) | client OAuth **patient** `750815743505-bkonoj…` | `WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET` | ✅ **marche en prod** |

### Détail par usage

**a) OAuth praticien** — `web/src/lib/auth.ts:54-56`
- NextAuth `GoogleProvider`, scopes `openid email profile`.
- Restreint `@wellneuro.fr` (`profilPraticienAutorise`, `email_verified` + `hd`).
- Redirect : `https://app.wellneuro.fr/api/auth/callback/google`.
- Projet **Interne** = c'est voulu et correct (public interne au cabinet).

**b) OAuth patient (G5)** — `web/src/lib/portail/googleIdentite.ts`
- OIDC direct (PAS NextAuth), scopes `openid email` (minimal).
- `redirect_uri = ${NEXTAUTH_URL}/portail/google/retour`.
- Endpoints : `accounts.google.com/o/oauth2/v2/auth` + `oauth2.googleapis.com/token`.
- L'e-mail vérifié sort du JWT `id_token` décodé localement — **aucune API Google
  à activer, aucun userinfo**.
- Projet **Externe publié** = c'est voulu et correct (les patients sont externes).
- Activé par `WN_G5_GOOGLE_PATIENT=true` (prod, depuis 2026-07-22).

**c) Service account Drive** — `tools/corpus/notebooklm/push-drive.mjs`
- `wellneuro-notebooklm-push@wellneuro.iam.gserviceaccount.com`, scope
  `.../auth/drive`, clé JWT dans `secrets/wn-drive-sa.json`.
- **Outillage local uniquement** (push de la bibliothèque corpus vers Drive) —
  **jamais lu par le runtime Vercel** (absent des variables de prod).
- Gitignoré (`secrets/` + `client_secret*.json`), **jamais committé** (historique
  git vérifié). Pas de fuite.

### Vercel prod — 5 variables Google (noms seuls)
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `WN_GOOGLE_PATIENT_CLIENT_ID`,
`WN_GOOGLE_PATIENT_CLIENT_SECRET`, `WN_G5_GOOGLE_PATIENT`. Les 4 premières sont de
type **« Sensitive »** → illisibles via `vercel env pull` (ressortent en
placeholder). Aucun secret Google en clair récupérable côté CLI.

### Supabase / base
Aucun secret Google stocké en base. Seulement des **journaux d'accès** :
`portail_connexions_google` (login Google), `portail_magic_links` (lien e-mail),
`portail_demande_tentatives` (anti-abus). Rétention trace Google : 12 mois.

## 2. Ce qui a réellement causé la confusion

1. **Un client OAuth parasite** `385215216634-tanfoe…` a été créé dans le projet
   *praticien* (Interne). Comme ce projet est Interne, tout compte externe
   (`…@gmail.com`) y est refusé → `org_internal`.
2. Ce client (et son JSON `client_secret_2_…`) a été pris pour « le client
   patient » et posé sur **staging** → l'erreur observée. La **prod**, elle,
   utilise le bon client (`750815743505-…`, Externe) — d'où l'absence de problème
   côté patients réels.
3. **Comptes perso/pro** : le projet praticien Interne est nécessairement rattaché
   au Workspace `@wellneuro.fr`. Le projet patient `750815743505` (Externe) peut
   avoir été créé sous un autre compte (perso `gmail` ?) — **à vérifier** (voir §4).

Canaux réellement utilisés en prod : **Google OAuth = 6 connexions** (canal
dominant) ; lien magique par e-mail = **1**. (« lien magique google » = en fait la
connexion Google OAuth.)

## 3. Correctif staging (immédiat, sûr)

Ne **pas** créer de nouveau projet. Réutiliser le client patient **qui marche
déjà** (`750815743505`).

1. **[navigateur]** Projet `750815743505` → client `750815743505-bkonoj…` :
   - Origine JS : ajouter `https://wellneuro-staging.osc-fr1.scalingo.io`
   - URI de redirection : ajouter `https://wellneuro-staging.osc-fr1.scalingo.io/portail/google/retour`
   - (la prod y est déjà, ne rien retirer)
2. **[navigateur]** Récupérer le **secret de ce client** (ou « Ajouter un secret »
   sur ce même client) → mettre `client_id 750815743505-bkonoj…` + ce secret dans
   `web/.env.local`, en **remplacement** du `385215216634-tanfoe…`.
3. **[assistant]** Re-pousse sur staging + restart + vérif que `/portail/google`
   émet bien le client_id `750815743505-…`.

## 4. Simplification / réorganisation (proposition)

L'architecture n'a **rien à refaire** — elle est déjà juste. La simplification
consiste à retirer le bruit et à clarifier la propriété.

| Action | Qui | Détail |
|---|---|---|
| **Supprimer le client parasite** `385215216634-tanfoe…` | navigateur | dans le projet praticien Interne, une fois staging basculé sur le bon client |
| Supprimer son JSON | local | `secrets/client_secret_2_385215216634-…json` |
| **Vérifier la propriété du projet patient** `750815743505` | navigateur | Console → projet → *IAM* / *Paramètres* : sous compte perso `gmail` ou Workspace `wellneuro.fr` ? |
| **Transférer** `750815743505` vers l'org `wellneuro.fr` si perso | navigateur | continuité : un projet critique ne doit pas dépendre d'un compte personnel |
| **Documenter la carte** (ce fichier) | fait | référence unique projet↔rôle↔variable |
| (option) **Faire tourner la clé** du service account Drive | navigateur | non urgent (jamais fuité) ; hygiène si doute sur l'exposition locale |

**Pourquoi on ne peut pas « réduire » à un seul client/projet** : le consentement
*Interne* (praticien) et *Externe* (patient) est un réglage **par projet**. Un
seul projet imposerait un seul type → soit les patients externes sont refusés,
soit le praticien perd son verrou Google `@wellneuro.fr`. Deux projets = le
minimum correct.

## 5. Nommage des variables — déjà clair

Les noms distinguent bien les rôles ; **rien à renommer** :
- `GOOGLE_CLIENT_ID/_SECRET` → praticien (NextAuth).
- `WN_GOOGLE_PATIENT_CLIENT_ID/_SECRET` → patient (G5).
- `WN_DRIVE_SA_JSON*` / `WN_DRIVE_SUBJECT` → service account Drive (outillage).

La seule ambiguïté était **humaine** (quel client physique derrière
`WN_GOOGLE_PATIENT_*`), pas dans le code. Ce document la lève.
