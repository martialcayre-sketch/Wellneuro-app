---
id: "LOT-01"
titre: "Vérification read-only des routes Sheets et OAuth"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Vérification read-only des routes Sheets et OAuth

## But

Confirmer dans le code l’état réel de la décommission Google Sheets/OAuth.

## Résultat observable

Un inventaire exact des références restantes, avec impact et recommandation, sans modification.

## Périmètre

- Rechercher les imports, scopes OAuth, appels Sheets, routes de migration et types session associés.
- Distinguer code actif, archive et documentation.
- Identifier les tests ou scripts encore dépendants.

## Hors périmètre

- Supprimer les références
- Changer l’authentification
- Modifier les routes

## Fichiers probables

- web/src/app/api/**
- web/src/lib/**
- web/src/types/**
- archive/gas-legacy/**
- package.json et fichiers OAuth pertinents

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

- [ ] Chercher les chaînes `spreadsheets`, `googleapis`, `migrate-historique` et références Sheets.
- [ ] Classer les occurrences actives/archives/docs.
- [ ] Comparer avec LOT-00.
- [ ] Écrire la conclusion go/no-go.

## Tests

- Recherche globale reproductible
- Aucun diff applicatif

## Critères de done

- [ ] Chaque dette annoncée est confirmée ou infirmée par une preuve dans le code.
- [ ] Les impacts sur la campagne cockpit sont identifiés.

## Risques / points de vigilance

- Confondre archive et code exécuté.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
