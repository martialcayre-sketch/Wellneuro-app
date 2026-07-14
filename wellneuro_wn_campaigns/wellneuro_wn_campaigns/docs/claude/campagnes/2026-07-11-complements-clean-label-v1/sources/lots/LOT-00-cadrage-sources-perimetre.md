---
id: "LOT-00"
titre: "Cadrage des sources et du périmètre"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Cadrage des sources et du périmètre

## But

Définir catégories, sources, licences et processus de validation V1.

## Résultat observable

Périmètre court et matrice source/fiabilité/maintenance.

## Périmètre

- Choisir 2-3 catégories prioritaires.
- Auditer Compl’Alim/DGCCRF et données disponibles.
- Définir ce qui est public vs propriétaire.

## Hors périmètre

- Importer des données
- Créer DB

## Fichiers probables

- docs/claude/**
- sources open data documentées

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

- [ ] Choisir catégories.
- [ ] Documenter licences.
- [ ] Définir critères clean label.
- [ ] Valider vocabulaire.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Périmètre maintenable et sourcé.

## Risques / points de vigilance

- Choisir une source insuffisamment structurée.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
