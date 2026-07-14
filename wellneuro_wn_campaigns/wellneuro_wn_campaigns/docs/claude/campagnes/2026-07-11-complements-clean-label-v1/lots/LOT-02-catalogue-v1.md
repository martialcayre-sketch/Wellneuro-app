---
id: "LOT-02"
titre: "Catalogue V1 qualifié"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Catalogue V1 qualifié

## But

Constituer un petit catalogue validé.

## Résultat observable

Produits/catégories V1 avec sources, statut et date de revue.

## Périmètre

- Importer manuellement ou seed statique le périmètre validé.
- Documenter exclusions.

## Hors périmètre

- Exhaustivité
- Scraping non autorisé

## Fichiers probables

- catalogue statique ou référentiel prévu
- tests validation contenu

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

- [ ] Saisir données.
- [ ] Valider chaque fiche.
- [ ] Ajouter date de revue.
- [ ] Tester schéma.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune fiche incomplète n’est visible.
- [ ] Périmètre reste court.

## Risques / points de vigilance

- Données produit déjà obsolètes.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
