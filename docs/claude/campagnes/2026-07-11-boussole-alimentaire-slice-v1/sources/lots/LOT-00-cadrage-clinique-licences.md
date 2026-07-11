---
id: "LOT-00"
titre: "Cadrage clinique, sources et licences"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Cadrage clinique, sources et licences

## But

Valider besoin 1, aliments, variables, sources et vocabulaire.

## Résultat observable

Spécification clinique du slice et liste de 12 aliments maximum.

## Périmètre

- Relire Boussole contexte.
- Sélectionner variables besoin 1.
- Documenter Ciqual/Etalab et OFF si retenu.

## Hors périmètre

- Coder
- Importer DB

## Fichiers probables

- docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md
- corpus aliments vedettes

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

- [ ] Valider distinction intrinsèque/contextuel.
- [ ] Choisir aliments.
- [ ] Définir libellés patient.
- [ ] Documenter sources.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucun axe hors slice n’est inclus.
- [ ] Vocabulaire non absolu.

## Risques / points de vigilance

- Réintroduire des axes narratifs comme scores directs.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
