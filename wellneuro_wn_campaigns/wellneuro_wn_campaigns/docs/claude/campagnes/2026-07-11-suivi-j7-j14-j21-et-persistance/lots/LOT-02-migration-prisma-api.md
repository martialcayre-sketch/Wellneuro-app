---
id: "LOT-02"
titre: "Migration Prisma et API minimale — confirmation obligatoire"
statut: "bloqué_confirmation"
dépend_de: "LOT-01"
---

# LOT-02 — Migration Prisma et API minimale — confirmation obligatoire

## But

Créer la persistance minimale validée.

## Résultat observable

Une migration courte, API protégée et données compatibles avec le protocole V1.

## Périmètre

- Modifier schema Prisma conformément à l’ADR.
- Créer migration après confirmation.
- Ajouter routes minimales et contrôles d’accès.

## Hors périmètre

- Écriture Supabase directe manuelle
- Biologie
- Messagerie
- Seed patient réel

## Fichiers probables

- web/prisma/schema.prisma
- web/prisma/migrations/**
- web/src/app/api/praticien/protocoles/**
- web/src/app/api/patient/** selon auth validée

## Interdits

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Vérifier la confirmation explicite.
- [ ] Créer migration en environnement prévu.
- [ ] Ajouter validation serveur.
- [ ] Tester droits et rollback.

## Tests

- `cd web && npx prisma validate`
- Tests API autorisé/interdit
- Type-check
- Migration sur environnement de test uniquement selon procédure projet

## Critères de done

- [ ] Migration confirmée et unique.
- [ ] Aucun accès inter-patient.
- [ ] Rollback/documentation disponibles.

## Risques / points de vigilance

- Migration sans confirmation
- Contrôle d’accès insuffisant.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
