---
id: "LOT-05"
titre: "Substitutions et fiches aliments"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Substitutions et fiches aliments

## But

Proposer trois substitutions simples dans des familles comparables.

## Résultat observable

Comparateur actuel/alternative avec gain explicable, sans injonction.

## Périmètre

- Familles définies manuellement.
- Delta contextuel.
- Fiche pourquoi/combien/quand/précautions.

## Hors périmètre

- Génération de menu
- Liste de courses

## Fichiers probables

- web/src/lib/food-compass/substitutions.ts
- fiches conseils aliments

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

- [ ] Définir familles.
- [ ] Créer règles.
- [ ] Ajouter UI comparaison.
- [ ] Tester cas sans alternative.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Substitution comparable et justifiée.
- [ ] Toujours une option neutre/absence de suggestion.

## Risques / points de vigilance

- Substitution culturellement ou pratiquement inadaptée.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
