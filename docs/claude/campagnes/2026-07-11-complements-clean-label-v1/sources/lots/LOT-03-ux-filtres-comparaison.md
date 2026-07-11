---
id: "LOT-03"
titre: "UX praticien : filtres et comparaison"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — UX praticien : filtres et comparaison

## But

Permettre une exploration rapide et explicable.

## Résultat observable

Catalogue, filtres essentiels, détail qualité et comparaison limitée.

## Périmètre

- Filtres vegan/lactose/gluten/additifs/formes.
- Badges et raisons.
- État à vérifier clairement visible.

## Hors périmètre

- Classement commercial
- Score unique absolu

## Fichiers probables

- web/src/components/supplements/**
- route/page praticien

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

- [ ] Créer liste et fiche.
- [ ] Ajouter filtres.
- [ ] Tester mobile/tablette.
- [ ] Vérifier accessibilité.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le praticien comprend pourquoi un produit est retenu ou non.

## Risques / points de vigilance

- Surcharge de badges.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
