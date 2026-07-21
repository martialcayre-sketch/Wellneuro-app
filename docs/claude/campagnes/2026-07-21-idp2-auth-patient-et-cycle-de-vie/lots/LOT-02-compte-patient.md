---
id: "LOT-02"
titre: "Compte patient, second chemin — la session cesse d'être un porteur"
statut: "spécifié — LOT-02a écrit, LOT-02b à livrer"
dépend_de: "LOT-01 (livré)"
---

# LOT-02 — Compte patient, second chemin

> Écrit le 2026-07-21. Ce document spécifie ; il ne raconte pas encore une
> livraison. LOT-02a **est** ce document et le réalignement documentaire qui
> l'accompagne ; LOT-02b porte le code et sa migration, dans une PR distincte.

## But

Faire cesser au lien magique son rôle de **porteur d'accès** pour en faire un
**moyen de connexion à un compte**.

Le lien magique est livré et activé en production depuis le 2026-07-21 (G4,
`WN_G4_LIEN_MAGIQUE`). Mais ce qu'il ouvre n'est pas une session de compte :
`lib/patient-session.ts` scelle dans le cookie l'empreinte du **jeton permanent**
(`accessTokenFingerprint`), et chaque route recoupe cette empreinte avec
`patients.access_token` (`isPatientSessionBoundToToken`). La route du lien
magique le dit elle-même, en commentaire :

> « Le cookie reste ancré sur le jeton permanent […]. Cet ancrage sera à
> déplacer le jour où le jeton permanent disparaîtra — autre gate. »
> — `app/portail/lien/[jeton]/route.ts`

Ce gate, c'est ce lot. Tant que l'ancrage tient, il n'y a pas de compte : il y a
un porteur déguisé en session. Deux conséquences concrètes, aujourd'hui :

- réémettre le jeton d'un patient le **déconnecte** de sa session en cours ;
- la révocation d'accès n'existe que par `access_token` — donc **LOT-04**, qui
  retire cette colonne, retirerait le coupe-circuit avec elle.

## Ce qu'est un « compte », ici

**La ligne `patients` elle-même.** Aucune table de comptes n'est créée, aucun
mot de passe n'est stocké, aucun fournisseur d'identité n'est ajouté (D1 : Google
et lien magique, et rien d'autre — Google arrive au LOT-03).

L'identifiant du compte est l'adresse e-mail, déjà unique en base
(`Patient.email @unique`). Le lien magique **prouve déjà la possession de cette
adresse** : c'est sa définition. Ce qui manque n'est donc pas une preuve, c'est
une session qui s'appuie sur elle plutôt que sur un secret d'URL.

## Résultat observable

- Un patient connecté le **reste** quand son jeton permanent est réémis.
- « Révoquer l'accès » **coupe** sa session, par un mécanisme qui appartient au
  compte et survivra au retrait du jeton (LOT-04).
- Le chemin `/portail/[token]` + e-mail fonctionne **à l'identique**. Aucun des
  13 accès portail ouverts n'est rompu : les cookies déjà émis restent valides.

## Ancrage retenu — une date, pas une empreinte

Arbitré le 2026-07-21 entre deux options. Retenue : **la colonne additive**.

La charge du cookie porte sa date d'émission (`iat`). Une colonne
`Patient.sessionsInvalidesAvant DateTime?` sert de coupe-circuit :

```
autorisé si  patient.actif
        et   sessionsInvalidesAvant == null  ou  iat > sessionsInvalidesAvant
```

L'option sans migration — garder la relecture de `accessTokenRevoked` et se
contenter de retirer l'empreinte — a été écartée : elle laisse la révocation
adossée au jeton permanent, donc **LOT-04 devrait la refaire**. Une colonne
nullable, additive, sans backfill, coûte moins qu'un second passage sur le même
mécanisme d'authentification.

**Révoquer** écrit désormais deux choses : `accessTokenRevoked = true` (le chemin
jeton existe encore) *et* `sessionsInvalidesAvant = now()`. **Réémettre** un
accès remet `accessTokenRevoked` à `false` mais **ne touche pas** à
`sessionsInvalidesAvant` : les sessions ouvertes avant la révocation restent
mortes. C'est l'effet recherché — une révocation ne se défait pas par effet de
bord d'une réémission.

## Coexistence — les deux formats de cookie

Le point le plus important du lot n'est pas le nouveau format, c'est l'**ancien**.

13 accès portail sont ouverts en production. Un cookie déjà émis porte
`accessTokenFingerprint` et **pas** `iat`. La vérification doit accepter les deux
formes ; pour l'ancienne, `iat` se reconstruit exactement par
`exp - SESSION_TTL_SECONDS`, la durée de vie étant fixe (12 h). Aucun patient
n'est déconnecté par le déploiement, et l'empreinte cesse simplement d'être lue.

Même exigence de coexistence que pour G4 : personne ne se retrouve dehors
(question ouverte 3 de la campagne, close par cette clause).

## Périmètre technique — LOT-02b

| Fichier | Changement |
|---|---|
| `prisma/schema.prisma` + migration | `sessionsInvalidesAvant DateTime?` sur `Patient`. Additive, nullable, sans backfill |
| `lib/patient-session.ts` | `PatientSession = { idPatient, email, iat }` ; `signPatientSession` perd son paramètre `accessToken` ; vérification tolérante aux deux formats ; `isPatientSessionBoundToToken` → `isSessionValideForPatient(session, patient)` |
| `api/portail/session/route.ts`, `portail/lien/[jeton]/route.ts` | émission sans jeton ; le commentaire d'ancrage provisoire tombe |
| `api/portail/assignations`, `api/portail/ja/{decision,observations}`, `lib/consultation/portail.ts` | appellent le nouveau contrôle ; ils lisent déjà la ligne patient |
| `api/praticien/token/route.ts` (DELETE) | pose `sessionsInvalidesAvant` en même temps que la révocation |

Les routes `api/patient/*` et `lib/protocol/portailProtocol.ts` passent toutes par
`isSessionAuthorizedForAssignment` : **rien à y changer**. Ce contrôle conserve la
lecture de `accessTokenRevoked` — ceinture et bretelles tant que le chemin jeton
existe.

## Vérification

T1 après chaque édition ; T2 avant commit ; **T3 complet**, le lot portant une
migration. `npx next lint` en plus : les trois paliers ne le couvrent pas, et
c'est ce qui a cassé le CI en LOT-01b. Revue de sécurité avant merge — le lot
touche l'authentification.

Tests attendus : cookie **ancien format** toujours accepté ; session survivant à
une réémission du jeton ; `sessionsInvalidesAvant` postérieur à l'émission ⇒
refus, antérieur ⇒ accès ; patient inactif ⇒ refus ; le DELETE praticien pose
bien la date ; chemin `/portail/[token]` intact (E2E).

## Ce que ce lot ne fait pas

- **Aucun provider patient dans `authOptions`.** Le risque de conception nommé
  par la campagne — deux surfaces d'authentification dans le même NextAuth —
  appartient au LOT-03, avec son test de non-régression. Ce lot ne doit rien
  faire qui le rende plus difficile, à commencer par y toucher.
- Le retrait de `patients.access_token` et du secret dans l'URL (LOT-04,
  migration destructive, décision distincte).
- Le renommage de la surface praticien : « Révoquer l'accès » cesse de signifier
  « invalider un jeton », et le dire à l'écran est un lot d'UI (LOT-02c), pas un
  lot d'authentification.
- L'allumage de `WN_G4_REDEMANDE_PATIENT`, décision distincte.
- Le contenu de l'espace patient (SP-SPI), l'auth praticien, l'hébergement HDS.
