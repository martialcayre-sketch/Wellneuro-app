---
id: "LOT-02"
titre: "Migration Prisma et API minimale — confirmation obligatoire"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-02 — Migration Prisma et API minimale — confirmation obligatoire

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-02-migration-prisma-api.md`.
>
> **GATE MIGRATION — ce lot reste `bloqué_confirmation`.** Seule une
> confirmation humaine **explicite et distincte** (checklist de la spec
> LOT-01, section 6, cochée par l'utilisateur dans la conversation) le
> débloque. La compilation de la campagne, l'activation de l'état machine ou
> la clôture des lots précédents ne valent **pas** confirmation. Tant que ce
> gate n'est pas levé : aucun changement de `web/prisma/schema.prisma`, aucun
> fichier sous `web/prisma/migrations/`, aucun `prisma migrate` ni `db push`.

## But

Créer la persistance minimale validée en LOT-01.

## Résultat observable

Une migration courte et additive, une API protégée et des données
compatibles avec le protocole V1.

## Périmètre

- Modifier le schéma Prisma conformément à l'ADR
  (`../SPEC_LOT-01_MODELE_PERSISTANCE.md`).
- Créer la migration **après confirmation**.
- Ajouter les routes minimales et les contrôles d'accès (praticien NextAuth ;
  patient via session portail + vérification d'assignation).

## Hors périmètre

- Écriture Supabase directe manuelle.
- Biologie.
- Messagerie.
- Seed patient réel.

## Fichiers probables

- `web/prisma/schema.prisma`
- `web/prisma/migrations/**`
- `web/src/app/api/praticien/protocoles/**`
- `web/src/app/api/patient/**` selon auth validée

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [x] Vérifier la confirmation explicite (checklist LOT-01 cochée par l'utilisateur).
- [x] Créer la migration en environnement prévu (base éphémère
      `test:worktree` d'abord ; production uniquement via le pipeline Vercel
      `migrate deploy` au merge).
- [x] Ajouter la validation serveur.
- [x] Tester droits et rollback.

## Tests

- `cd web && npx prisma validate`
- Gate de dérive schéma↔migrations (`npm run test:worktree`, réplique CI).
- Tests API autorisé/interdit (praticien, patient, inter-patient).
- Type-check.
- Migration sur environnement de test uniquement selon procédure projet.

## Critères de done

- [x] Migration confirmée, unique et additive.
- [x] Aucun accès inter-patient.
- [x] Rollback/documentation disponibles.

## Risques / points de vigilance

- Migration sans confirmation.
- Contrôle d'accès insuffisant.

## Résultats (2026-07-17)

Gate migration **levé** : l'utilisateur a coché la checklist SPEC §8.11 par un
message distinct. Exécution en session dédiée (`WN_ALLOW_PROTECTED_WRITE=1` +
`WN_ALLOW_RISKY_COMMAND=1`), sur la branche `feat/c2a-lot-02-persistance-prisma`.

### Migration

- Migration **additive unique** `20260717120000_c2a_persistance_v1` : 3 tables
  (`assessment_episodes`, `protocol_drafts`, `protocol_checkins`), index, FK
  `ON DELETE RESTRICT/SET NULL ON UPDATE CASCADE`, RLS deny-all sans policy
  (ajout manuel comme trust_v1). Aucune table existante modifiée.
- SQL généré par `prisma migrate diff` (datamodel→datamodel, **sans toucher de
  base**) puis complété du bloc RLS ; jamais `migrate dev`/`db push` sur une base
  partagée. Production : uniquement via pipeline Vercel `migrate deploy` au merge.
- **Rollback** : `DROP TABLE` des 3 nouvelles tables (documenté SPEC §8.9).

### Schéma et modèles

- `web/prisma/schema.prisma` : modèles `AssessmentEpisode`, `ProtocolDraft`,
  `ProtocolCheckin` + back-relations `Patient`/`Assignation`. PK = id du contrat
  pour épisodes/drafts, cuid pour check-ins (§8.6). Provenance ancrée par colonnes
  de hash sur `protocol_drafts` (§8.2). `prisma validate` + `generate` verts.

### Routes API et contrôles d'accès

- **Praticien** `web/src/app/api/praticien/protocoles/route.ts` : `POST` persiste
  un épisode confirmé + un protocole relu (idempotent par id de contrat ;
  vérifie la cohérence de provenance draft↔decision-card et les statuts
  `confirmed`/`practitioner_reviewed`) ; `GET ?idPatient=` liste bornée au patient.
  Garde `getServerSession(authOptions)`.
- **Patient** `web/src/app/api/patient/protocole/route.ts` : `GET ?id=<assignation>`
  scopé par session portail vérifiée (`isSessionAuthorizedForAssignment`),
  **email-gate exclu** (§8.4) ; ne renvoie que des métadonnées minimales, jamais
  le contenu de `protocol_drafts` (§8.3). Le contenu diffusable relève de LOT-03/05.

### Validations

- `npm run test:worktree` (réplique CI complète) **verte en 11 min 23 s** :
  anti-secrets, audit campagnes, scoring (63), type-check, Vitest **315/315**,
  lint, PostgreSQL éphémère, `migrate deploy`, **gate de dérive schéma↔migrations
  vert**, seed fictif, build production, E2E Playwright **30/30** (Chromium+WebKit).
- 10 tests ciblés ajoutés (autorisé / non authentifié / provenance incohérente /
  non relu / non confirmé / **inter-patient refusé**).

### Écarts / dette

- Routes d'**écriture** de check-ins et versionnement du protocole : hors périmètre
  LOT-02, traités en LOT-03 (versionnement/validation) et LOT-04 (check-ins J21).
- `relecture_notes` différée à SP-TT (§8.7) ; nettoyage du chemin legacy email-gate
  (hors C2A) ; besoin multi-praticien (campagne dédiée).

### Décision de poursuite

LOT-02 clos. La migration n'est **pas encore déployée en production** : elle
s'appliquera via `migrate deploy` au merge de la branche sur `main` (pipeline
Vercel). Poursuite : **LOT-03** (versionnement et validation du protocole).
