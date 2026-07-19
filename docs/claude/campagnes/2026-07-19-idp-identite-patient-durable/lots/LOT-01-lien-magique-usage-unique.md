---
id: "LOT-01"
titre: "Lien magique à usage unique et expirant"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-01 — Lien magique à usage unique et expirant

> Compilé le 2026-07-19. **Gate G4** : migration Prisma **et** revue de
> sécurité, chacune exigeant une confirmation explicite distincte.
> Livrable en préproduction ; l'activation avec données réelles reste bloquée
> par les gates TRUST.

## But

Remplacer progressivement le lien d'accès **permanent et non expirant** du
patient par un lien magique à **usage unique**, expirant, révocable — sans
qu'aucun patient ne perde son accès pendant la bascule.

## Résultat observable

Le praticien émet un lien ; le patient l'utilise une fois, dans une fenêtre
courte ; une seconde utilisation est refusée avec un message en français qui
**ne révèle pas** si le compte existe. Le chemin existant (token permanent +
e-mail) continue de fonctionner.

## Périmètre

- Table de jetons : jeton **stocké haché**, date d'expiration, date de
  consommation, patient rattaché. Migration **additive** ; `access_token` et
  ses colonnes restent en place, inchangés.
- Émission côté praticien, consommation côté portail, anti-rejeu tracé.
- Session inchangée : le cookie `wn_portail` signé HMAC 12 h est conservé
  (`web/src/lib/patient-session.ts`).

## Hors périmètre

- Les **passkeys** (WebAuthn) — lot **LOT-02**, optionnel.
- Le contenu de l'espace patient (**SP-SPI**).
- La suppression du chemin token permanent, ou du chemin legacy
  `/api/patient/*` — aucune suppression dans ce lot.
- L'authentification praticien (NextAuth) — inchangée.
- Toute mise en service avec données réelles (**gate TRUST**).

## Fichiers probables

- `web/prisma/schema.prisma` + une migration additive dédiée.
- `web/src/app/api/praticien/token/route.ts` (émission).
- `web/src/lib/consultation/portail.ts`, `web/src/app/api/portail/session/route.ts`
  (consommation).
- `web/src/lib/patient-session.ts` (aucune modification attendue).

## Interdits

- Pas de secret en dur ; le jeton n'est jamais journalisé en clair.
- Pas de donnée patient réelle.
- **Pas de migration sans confirmation explicite** ; additive seulement,
  aucun `DROP`, aucun renommage.
- Pas de refactor hors lot.

## Étapes

- [ ] Spécifier le modèle de jeton (durée de vie, format, hachage, unicité).
- [ ] **Demander la confirmation du gate G4** avant toute migration.
- [ ] Migration additive + `prisma generate`, relecture du SQL produit.
- [ ] Émission, consommation, anti-rejeu + tests.
- [ ] Vérifier la coexistence : le chemin existant reste fonctionnel.
- [ ] **Revue de sécurité** (`/security-review`) avant merge.

## Tests

- Unitaires : jeton valide, expiré, déjà consommé, inconnu, malformé.
- Garde-fou : aucun message ne révèle l'existence d'un compte ; aucun jeton en
  clair en base ni dans les logs.
- E2E : parcours portail complet depuis un lien neuf ; parcours legacy intact.

## Critères de done

- Un lien neuf ouvre le portail une seule fois, dans sa fenêtre.
- Aucune régression du parcours patient existant.
- Revue de sécurité passée ; anti-secrets, type-check, lint, Vitest,
  `test:worktree` verts.
- Recette sur patients fictifs uniquement.

## Résultats

À compléter à la clôture.
