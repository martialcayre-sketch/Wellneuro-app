---
id: "LOT-00"
titre: "Audit des flux et besoins de persistance"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Audit des flux et besoins de persistance

## But

Identifier exactement ce qui doit être stocké et les contraintes d’accès.

## Résultat observable

Contrat de persistance minimal et matrice des droits.

## Périmètre

- Auditer auth patient, routes praticien, modèles existants et génération document.
- Lister événements de cycle de vie protocole.
- Définir données nécessaires aux check-ins.

## Hors périmètre

- Écrire le schéma
- Créer migration

## Fichiers probables

- web/prisma/schema.prisma
- web/src/app/api/**
- web/src/lib/auth*
- composants protocole V1

## Interdits

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Cartographier acteurs et droits.
- [ ] Définir données minimales.
- [ ] Vérifier HDS/RGPD sans inclure biologie.
- [ ] Produire matrice create/read/update.

## Tests

- Aucun diff DB
- Relecture sécurité

## Critères de done

- [ ] Le besoin est réduit au minimum.
- [ ] Les droits patient/praticien sont explicites.

## Risques / points de vigilance

- Stocker des champs narratifs inutiles.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
