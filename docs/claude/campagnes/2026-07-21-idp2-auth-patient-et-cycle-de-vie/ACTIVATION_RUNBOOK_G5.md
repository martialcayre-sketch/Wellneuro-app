# G5 — Runbook d'activation du chemin Google patient (LOT-03d)

> Écrit le 2026-07-21. **NON EXÉCUTÉ.**
>
> Il vit à la racine de la campagne et non dans `lots/`, comme
> `ACTIVATION_RUNBOOK_G4.md` : l'activation n'est pas un lot de code, et l'audit
> des campagnes n'accepte qu'un fichier par ordinal — 03d partage le sien
> avec 03a, 03b et 03c.
>
> Calqué sur `ACTIVATION_RUNBOOK_G4.md`. **Ce document n'active rien.** Il
> décrit ce qu'il faut faire, dans quel ordre, et ce qu'il faut vérifier après.
> L'exécution appartient au responsable : elle demande de créer un client OAuth
> chez Google et de poser deux secrets dans Vercel — deux gestes que l'assistant
> ne fait pas et ne peut pas faire.

## Ce que ce runbook n'autorise pas

**Il ne lève pas G-TRUST-04.** Le point bloquant de ce gate reste l'hébergement
HDS, et sa levée appartient au responsable du traitement.

Il n'ouvre pas non plus un nouveau traitement de données de santé : le chemin
Google ne transporte qu'une adresse e-mail vérifiée. Ce qu'il change, et qui est
inscrit au registre, est ailleurs : **Google apprend qu'une adresse personnelle
se connecte à une application de neuronutrition.** C'est le motif pour lequel le
chemin est optionnel — le lien magique reste ouvert à qui n'en veut pas.

## État de départ

Au 2026-07-21, après le merge du LOT-03c :

| Élément | État |
|---|---|
| `WN_G5_GOOGLE_PATIENT` | **absent** de Vercel → `/portail/connexion`, `/portail/google` et son retour répondent 404 |
| `WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET` | **absents** — le client OAuth patient n'existe pas encore |
| Chemins d'accès ouverts | jeton permanent, lien magique (`WN_G4_LIEN_MAGIQUE` actif depuis le 2026-07-21) |
| Accès portail ouverts | 13 au 2026-07-20 — à revérifier avant d'activer |

Le portail se comporte donc exactement comme avant le lot. **C'est vérifiable
sans rien lire de la configuration** : si `/portail/connexion` répond 404 en
production, le chemin est éteint.

## Bloquant avant d'activer — la trace durable

La revue adversariale du 2026-07-21 rend un **NO-GO à l'activation** sur ce
point, et il n'est pas fermé par le LOT-03c.

Une connexion Google n'écrit **rien en base** : elle ne laisse qu'un
`logger.security`. Le lien magique, lui, écrit `consommeLe` et `rejeuxRefuses`,
et le dépôt écrit l'argument à l'endroit même où il le fait
(`portail/lien/[jeton]/route.ts`) : « *un log Vercel est purgé, et une trace
purgée ne prouve plus rien le jour où on la cherche* ».

Le scénario n'est pas théorique : un patient signale trois mois plus tard un
accès qu'il ne reconnaît pas, ou le responsable doit dire qui a ouvert un
dossier, quand, par quel chemin. Les journaux Vercel ont tourné.

**Deux issues acceptables, aucune troisième** : une ligne minimale en base
(idPatient, instant, canal, succès ou refus — ni e-mail ni empreinte) portée par
un lot distinct avec sa migration ; **ou** une décision explicite et datée du
responsable de s'en passer, écrite ici. Activer sans l'un ni l'autre revient à
ouvrir un troisième chemin d'accès à des dossiers de santé sans pouvoir en
rendre compte.

## Vérifications préalables, en lecture seule

1. **Casse des adresses.** La recherche par adresse suppose `patients.email` en
   minuscules, et aucune contrainte ne l'impose. Une ligne à casse différente
   verrait le même écran de refus uniforme qu'une adresse inconnue — sans que
   personne, patient ou praticien, puisse comprendre pourquoi.
   ```sql
   SELECT count(*) FROM patients WHERE email <> lower(email);
   ```
   **Exécuté le 2026-07-21 : 0 sur 17 patients.** À rejouer avant d'activer, un
   import ayant pu passer entre-temps.

2. **Ce que l'activation rend joignable d'un coup.** `ensureActivePortalAccess`
   **crée** un jeton permanent quand il n'y en a pas. Un dossier créé par le
   praticien mais à qui aucun accès n'a jamais été envoyé devient donc joignable
   dès que la personne se connecte avec Google — « jamais accordé » et
   « accordé » sont indiscernables en base, seul `actif: false` exprime le
   refus. C'est déjà la sémantique du lien magique avec redemande, mais il faut
   le savoir avant, pas le découvrir après. Compter les dossiers concernés :
   ```sql
   SELECT count(*) FROM patients
   WHERE actif AND NOT access_token_revoked AND access_token IS NULL;
   ```
   **Exécuté le 2026-07-21 : 1 dossier.** Un seul, mais réel : cette personne
   ouvrirait son espace le jour de l'activation sans qu'aucun accès ne lui ait
   jamais été envoyé. À regarder nommément avant d'activer — si l'accès n'a pas
   été envoyé délibérément, c'est `actif: false` qu'il faut poser, pas espérer
   qu'elle n'essaie pas.

## Deux gestes, dans cet ordre

### 1. Créer le client OAuth **patient**, distinct de celui du praticien

Console Google Cloud → *Identifiants* → *ID client OAuth* → application Web.

| Champ | Valeur |
|---|---|
| Nom | quelque chose qui dit « patient », pour qu'aucune relecture ne le confonde |
| Origine JavaScript autorisée | `https://app.wellneuro.fr` |
| URI de redirection autorisé | `https://app.wellneuro.fr/portail/google/retour` |

**Un client distinct n'est pas une précaution de style.** Partager celui du
praticien réunirait chez Google les deux publics que l'option A sépare chez
nous : même audience dans les jetons, même écran de consentement, même
journalisation. La vérification d'`aud` faite au retour perdrait tout son sens —
c'est elle qui empêche qu'un jeton émis pour l'application praticien ouvre un
espace patient. Un test le fixe (`googleIdentite.test.ts`, « ne lit jamais les
variables du client praticien »).

L'écran de consentement s'adresse à des patients : il doit être lisible par eux,
en français, et ne demander que ce que l'application demande — `openid email`.

### 2. Poser les variables dans Vercel

| Variable | Valeur | Portée |
|---|---|---|
| `WN_GOOGLE_PATIENT_CLIENT_ID` | l'ID du client créé | Production |
| `WN_GOOGLE_PATIENT_CLIENT_SECRET` | le secret du client créé | Production |
| `WN_G5_GOOGLE_PATIENT` | `true` | Production |

**Production seulement.** Il n'existe **aucune préproduction** : un seul projet
Supabase, et les déploiements Preview lisent la base de production. Poser un
drapeau sur Preview revient donc à l'ouvrir sur des données réelles par un autre
chemin — l'erreur a déjà été commise le 2026-07-21 sur G4.

Les deux secrets ne passent par aucun fichier du dépôt. Aucun `.env` n'est
committé, jamais.

### L'ordre compte

Poser le drapeau **après** les deux secrets. Dans l'autre sens, la page d'entrée
existe et le bouton mène à un refus — fonctionnellement inoffensif (la route
refuse proprement, un test le couvre) mais visible par les patients.

## Vérifications, après activation

1. `https://app.wellneuro.fr/portail/connexion` affiche « Continuer avec
   Google ». Avant activation, la même URL répondait 404 : c'est la preuve que
   le drapeau est bien ce qui commande.
2. **Le premier essai se fait sur une adresse du praticien**, jamais sur la
   boîte d'un tiers, et sur un dossier dont l'adresse lui appartient.
3. Le retour ouvre l'espace du bon patient — et **seulement** le sien.
4. Un compte Google **inconnu de la base** atterrit sur l'écran de refus unique,
   sans que rien n'indique que l'adresse est inconnue.
5. Les deux chemins existants fonctionnent toujours : un lien permanent ouvre
   l'espace, un lien magique aussi.
6. Dans les journaux Vercel, chercher `PORTAIL_PATIENT.GOOGLE.` : ni code
   d'autorisation, ni `state`, ni adresse e-mail ne doivent y apparaître. La
   route est journalisée sous son gabarit, `/portail/google/retour`.

## À ne pas faire en même temps : poser la bascule R4

`WN_PORTAIL_LIEN_PERMANENT_FIN` (réserve R4, PR #214) coupe les liens permanents
à une date. **Elle couperait aussi le chemin Google**, et le lien magique avec
lui : les trois atterrissent sur `/portail/<jeton permanent>`, et
`POST /api/portail/session` refuse en 410 dès la bascule atteinte, avant même de
regarder le cookie de session.

Tant que le LOT-04 n'a pas retiré le jeton permanent de l'URL, ces deux décisions
ne se prennent pas le même jour — et la seconde ne se prend pas du tout en
croyant qu'elle ne ferme qu'un chemin.

## Rollback

`WN_G5_GOOGLE_PATIENT` à `false` (ou variable supprimée), puis redéploiement.
Non destructif : aucune donnée n'a été écrite par ce chemin — il pose un cookie
de session, rien d'autre. Les sessions déjà ouvertes restent valides jusqu'à leur
expiration (12 h) ; pour les couper immédiatement, c'est la révocation d'accès
existante (`sessionsInvalidesAvant`), qui ne connaît pas le chemin d'entrée.

## Ce que l'activation ne fait pas

- Elle ne retire pas le jeton permanent ni le secret dans l'URL — **LOT-04**,
  migration destructive, décision distincte.
- Elle ne change rien à l'authentification praticien.
- Elle n'ouvre aucun autre fournisseur d'identité. Facebook reste écarté (D1).
