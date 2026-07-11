---
id: "LOT-04"
titre: "Tests, documentation et handoff"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Tests, documentation et handoff

## But

Valider le catalogue et préparer l’enrichissement futur.

## Résultat observable

Tests, guide auteur et backlog priorisé.

## Périmètre

- Validation contenu.
- E2E sélection/lecture/impression.
- Documentation ajout fiche.

## Hors périmètre

- Ajouter plus de fiches pendant la stabilisation

## Fichiers probables

- tests
- docs/corpus guide
- CAMPAGNE.md

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

- [ ] Tester fiches invalides.
- [ ] Tester patients fictifs.
- [ ] Documenter workflow de validation.
- [ ] Clôturer.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le workflow auteur→validation→patient est reproductible.

## Risques / points de vigilance

- Pas de propriétaire éditorial clair.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
