---
id: "LOT-05"
titre: "Validation, maintenance et handoff"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Validation, maintenance et handoff

## But

Tester et formaliser la gouvernance du catalogue.

## Résultat observable

Guide de revue, tests et décision sur persistance/import futur.

## Périmètre

- E2E.
- Process de revalidation.
- Journal changements.

## Hors périmètre

- Élargir catalogue

## Fichiers probables

- docs maintenance
- tests
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

- [ ] Tester règles.
- [ ] Faire revue clinique.
- [ ] Définir fréquence.
- [ ] Clôturer.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Chaque produit a propriétaire/date prochaine revue.

## Risques / points de vigilance

- Absence de maintenance après livraison.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
