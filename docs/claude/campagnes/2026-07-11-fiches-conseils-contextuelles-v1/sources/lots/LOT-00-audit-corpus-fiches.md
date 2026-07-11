---
id: "LOT-00"
titre: "Audit du corpus et sélection V1"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Audit du corpus et sélection V1

## But

Identifier 8 à 12 fiches prioritaires et leurs sources.

## Résultat observable

Liste validée de fiches, formats et lacunes.

## Périmètre

- Inventorier corpus patient existant.
- Classer par alimentation/routine/complément/écart utile.
- Vérifier droits et sources.

## Hors périmètre

- Créer du contenu non validé
- Coder UI

## Fichiers probables

- corpus/**
- docs/claude/**
- templates existants

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

- [ ] Lister les fiches.
- [ ] Évaluer utilité phase 1.
- [ ] Choisir le lot V1.
- [ ] Documenter sources.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Périmètre ≤12 fiches.
- [ ] Chaque fiche a une source et un propriétaire de validation.

## Risques / points de vigilance

- Choisir des fiches trop spécialisées.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
