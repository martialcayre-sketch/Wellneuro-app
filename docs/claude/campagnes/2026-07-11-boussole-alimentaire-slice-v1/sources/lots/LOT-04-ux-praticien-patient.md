---
id: "LOT-04"
titre: "UX praticien et patient"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — UX praticien et patient

## But

Afficher fiche, source, confiance et explication.

## Résultat observable

Carte aliment contextualisée dans protocole/cockpit et vue patient simple.

## Périmètre

- Recherche limitée aux aliments du slice.
- Détail praticien.
- Phrase patient.
- Source/fiabilité.

## Hors périmètre

- Scan caméra
- Catalogue complet

## Fichiers probables

- web/src/components/food-compass/**
- pages/routes pertinentes

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

- [ ] Créer composants.
- [ ] Brancher moteur.
- [ ] Tester mobile.
- [ ] Tester données manquantes.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune note absolue type A-E.
- [ ] La source est accessible.

## Risques / points de vigilance

- UI trop proche de Nutri-Score/Yuka.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
