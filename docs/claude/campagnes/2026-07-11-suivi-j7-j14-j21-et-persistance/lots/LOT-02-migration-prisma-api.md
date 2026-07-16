---
id: "LOT-02"
titre: "Migration Prisma et API minimale — confirmation obligatoire"
statut: "bloqué_confirmation"
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

- [ ] Vérifier la confirmation explicite (checklist LOT-01 cochée par l'utilisateur).
- [ ] Créer la migration en environnement prévu (base éphémère
      `test:worktree` d'abord ; production uniquement via le pipeline Vercel
      `migrate deploy` au merge).
- [ ] Ajouter la validation serveur.
- [ ] Tester droits et rollback.

## Tests

- `cd web && npx prisma validate`
- Gate de dérive schéma↔migrations (`npm run test:worktree`, réplique CI).
- Tests API autorisé/interdit (praticien, patient, inter-patient).
- Type-check.
- Migration sur environnement de test uniquement selon procédure projet.

## Critères de done

- [ ] Migration confirmée, unique et additive.
- [ ] Aucun accès inter-patient.
- [ ] Rollback/documentation disponibles.

## Risques / points de vigilance

- Migration sans confirmation.
- Contrôle d'accès insuffisant.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
