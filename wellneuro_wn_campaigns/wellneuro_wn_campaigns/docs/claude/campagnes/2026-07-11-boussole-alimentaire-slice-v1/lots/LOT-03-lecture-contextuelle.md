---
id: "LOT-03"
titre: "Lecture contextuelle par objectif"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Lecture contextuelle par objectif

## But

Pondérer le profil intrinsèque selon objectifs actifs du protocole.

## Résultat observable

Fonction pure produisant statut va dans votre sens/neutre/moins aligné et raisons.

## Périmètre

- Objectifs V1 explicitement mappés.
- Raisons structurées.
- Formulations patient/praticien séparées.

## Hors périmètre

- Personnalisation biologique
- Diagnostic alimentaire

## Fichiers probables

- web/src/lib/food-compass/contextualReading.ts
- tests

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

- [ ] Définir contrats.
- [ ] Implémenter règles.
- [ ] Tester le même aliment avec trois profils fictifs.
- [ ] Vérifier non-culpabilisation.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le score intrinsèque ne change pas selon patient.
- [ ] Seule la lecture contextuelle change.

## Risques / points de vigilance

- Faire croire à une précision clinique excessive.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
