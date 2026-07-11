---
id: "LOT-01"
titre: "Contrat UX, états et parcours E2E"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Contrat UX, états et parcours E2E

## But

Fixer le comportement observable avant d’implémenter.

## Résultat observable

Wireframe textuel, hiérarchie des blocs, microcopy, états et checklist E2E validés.

## Périmètre

- Définir ordre cockpit, détails repliables et interactions.
- Définir les 3 actions max, 1 fiche, 1 critère.
- Définir états vide, incomplet, chargé, validé, imprimable.

## Hors périmètre

- Coder les composants
- Créer la persistance

## Fichiers probables

- docs/claude/campagnes/**
- docs/checklist_tests_end_to_end.md
- docs/design-system-d1.md

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

- [ ] Écrire les scénarios Sophie/Jennifer/Michel.
- [ ] Valider la règle patient minimal/praticien maximal.
- [ ] Définir microcopy autorisée/interdite.
- [ ] Ajouter critères accessibilité et tactile.

## Tests

- Relecture UX santé
- Vérification que toute action importante fonctionne sans survol

## Critères de done

- [ ] Le parcours principal est testable avant code.
- [ ] Les états vides et erreurs sont définis.
- [ ] Le cockpit répond aux 5 questions de décision.

## Risques / points de vigilance

- Ajouter trop de panneaux au cockpit.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
