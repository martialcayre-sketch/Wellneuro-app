---
id: "LOT-02"
titre: "Jeu de données Ciqual du slice"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Jeu de données Ciqual du slice

## But

Fournir les valeurs nécessaires aux 12 aliments avec traçabilité.

## Résultat observable

Dataset minimal read-only validé.

## Périmètre

- Extraire uniquement constituants requis.
- Conserver code qualité/source/version.
- Choisir stockage statique V1 sauf confirmation autre.

## Hors périmètre

- Ingestion complète Ciqual
- Migration non confirmée

## Fichiers probables

- data/ciqual slice ou module lib
- attributions licences

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

- [ ] Extraire données.
- [ ] Valider unités.
- [ ] Ajouter attribution.
- [ ] Tester valeurs manquantes.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune valeur inventée.
- [ ] Dataset reproductible.

## Risques / points de vigilance

- Erreur unité/100g.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
