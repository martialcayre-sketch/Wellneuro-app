---
id: "LOT-01"
titre: "Format canonique et catalogue statique"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Format canonique et catalogue statique

## But

Définir et implémenter un format simple versionné.

## Résultat observable

Catalogue typé/Markdown parsable avec métadonnées obligatoires.

## Périmètre

- Titre, audience, objectif, résumé, contenu, précautions, source, version, statut.
- Validation de schéma.

## Hors périmètre

- DB
- RAG

## Fichiers probables

- web/src/lib/advice-sheets/** ou corpus validé
- types associés

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

- [ ] Choisir format.
- [ ] Définir schéma.
- [ ] Importer fiches V1.
- [ ] Ajouter validation build.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Contenu invalidé échoue clairement.
- [ ] Version et statut visibles.

## Risques / points de vigilance

- Mélanger contenu et logique UI.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
