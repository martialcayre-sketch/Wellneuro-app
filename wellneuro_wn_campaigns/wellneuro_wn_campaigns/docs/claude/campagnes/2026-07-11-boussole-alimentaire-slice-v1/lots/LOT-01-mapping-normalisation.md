---
id: "LOT-01"
titre: "Mapping et normalisation versionnés"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Mapping et normalisation versionnés

## But

Définir le moteur déterministe minimal.

## Résultat observable

Mapping besoin 1, bornes et versionScore/versionMapping documentés et testables.

## Périmètre

- Direction favorable/limitant.
- Normalisation robuste.
- Niveau de preuve.
- Cas données manquantes.

## Hors périmètre

- IA
- Biologie
- Cofacteurs avancés

## Fichiers probables

- web/src/lib/food-compass/**
- docs mapping

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

- [ ] Écrire types et données test.
- [ ] Implémenter fonction pure.
- [ ] Ajouter tests snapshots/valeurs limites.
- [ ] Documenter versions.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Même entrée produit toujours même score intrinsèque.
- [ ] Changement mapping impose version.

## Risques / points de vigilance

- Poids arbitraires non validés.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
