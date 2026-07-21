---
id: "2026-07-19-idp-identite-patient-durable"
titre: "IDP — Identité patient durable"
statut: "livrée"
créée_le: "2026-07-19"
mise_à_jour: "2026-07-21"
lot_courant: "LOT-01"
---

# IDP — Identité patient durable

## Objectif

Remplacer le lien d'accès permanent du patient par une **identité durable et
révocable** : un lien magique à usage unique et expirant, puis, en option, des
**passkeys** (WebAuthn). C'est la fondation de la Phase B : « Ma spirale »
(SP-SPI) n'a de sens que si le patient peut revenir, plusieurs mois plus tard,
sans qu'on lui renvoie un lien éternel par e-mail.

## État de départ (constaté au 2026-07-19)

- `patients.access_token` est **permanent et non expirant**
  (`web/prisma/schema.prisma:23-28`), émis par le praticien
  (`web/src/app/api/praticien/token/route.ts:55-72`), révocable manuellement.
- Le second facteur est l'**e-mail** (`web/src/lib/consultation/portail.ts:34-40`).
- La session est un cookie `wn_portail` signé HMAC-SHA256, **12 h glissantes**
  (`web/src/lib/patient-session.ts:15-30`), lié à l'empreinte du token — un
  token régénéré invalide donc les sessions en cours.
- Un chemin **legacy** subsiste sur `/api/patient/*` (gate e-mail seul).

## Frontières

**Possède** : le lien magique à usage unique (émission, expiration,
consommation, anti-rejeu), la table de jetons associée, les passkeys en option,
et la **bascule progressive** depuis le token permanent.

**Consomme** : `web/src/lib/patient-session.ts` (cookie signé, à conserver),
`web/src/lib/consultation/portail.ts`, et le modèle documentaire versionné de
**TRUST** (accusés, choix, versions de contenu).

**Ne possède pas** : le contenu de l'espace patient (**SP-SPI**) ; la
suppression du chemin token permanent, qui reste supporté pendant la
coexistence ; l'authentification praticien (NextAuth, inchangée).

## Décisions actées

- **Migration additive seule** : nouvelle table de jetons ; aucun champ
  existant renommé ni supprimé. `access_token` reste en place.
- **Coexistence obligatoire** : les deux chemins fonctionnent pendant la
  bascule. Aucun patient ne perd son accès dans la PR qui introduit le nouveau.
- Le jeton est stocké **haché**, jamais en clair ; expiration courte ;
  consommation unique ; toute tentative de rejeu est refusée et tracée.
- **Revue de sécurité obligatoire** avant merge (`/security-review`).
- **Gate TRUST** : TRUST est **NO-GO activation avec données réelles** tant que
  ses gates (juridique, sécurité, hébergement, gouvernance) ne sont pas levés.
  Cette campagne est donc **livrable en préproduction** ; sa mise en service
  reste une décision explicite et distincte.
- Les passkeys sont un **lot séparé et optionnel** : le magic link seul suffit
  à débloquer SP-SPI.

## Dépendances

Aucune dépendance de code. Dépendances de gouvernance : TRUST (activation),
revue de sécurité.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Lien magique à usage unique et expirant : table de jetons, émission, consommation, coexistence avec le token permanent — **gate migration G4 + revue de sécurité** | livré (#172, migration `20260720200000_g4_portail_magic_links_v1` ; **activé en production le 2026-07-21**, cf. `ACTIVATION_RUNBOOK_G4.md`) | — |
| LOT-02 | Passkeys (WebAuthn) — option, différable sans bloquer SP-SPI | non compilé (option, doctrine N+1/A3) | LOT-01 |

## Définition de done

- Un patient accède au portail depuis un lien neuf, à usage unique, expirant.
- Un lien consommé ou expiré est refusé avec un message en français, sans fuite
  d'information sur l'existence du compte.
- Le chemin existant continue de fonctionner (aucune régression du portail).
- Revue de sécurité passée ; anti-secrets, type-check, lint, Vitest, E2E verts.
- Aucune donnée réelle utilisée : recette sur patients fictifs uniquement.
