---
id: "LOT-06"
titre: "Tests, rétrocompatibilité et handoff"
statut: "à_faire"
dépend_de: "LOT-05"
---

# LOT-06 — Tests, rétrocompatibilité et handoff

## But

Valider persistance, droits et parcours longitudinal.

## Résultat observable

Rapport complet, rollback testé et décision pour les campagnes de contenu.

## Périmètre

- Tests API/auth.
- Tests migration.
- E2E praticien-patient fictifs.
- Documentation.

## Hors périmètre

- Ajouter nouvelles fonctions

## Fichiers probables

- tests existants
- docs/checklist_tests_end_to_end.md
- SESSION_LOG selon pratique
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

- [ ] Exécuter validations.
- [ ] Tester absence accès croisé.
- [ ] Tester protocole historique.
- [ ] Documenter dette.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune régression auth/assignations.
- [ ] Droits validés.
- [ ] Handoff produit.

## Risques / points de vigilance

- Ne tester que le happy path.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
