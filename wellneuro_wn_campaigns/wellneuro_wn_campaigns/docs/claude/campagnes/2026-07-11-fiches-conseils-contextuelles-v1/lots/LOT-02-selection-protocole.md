---
id: "LOT-02"
titre: "Sélection dans le protocole"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Sélection dans le protocole

## But

Permettre au praticien d’associer une fiche prioritaire.

## Résultat observable

Recherche/sélection d’une fiche validée dans le builder.

## Périmètre

- Filtre simple.
- Une fiche prioritaire par phase.
- Aperçu praticien.

## Hors périmètre

- Suggestion IA automatique

## Fichiers probables

- ProtocolMiniBuilder
- components/advice-sheets/**

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

- [ ] Brancher catalogue.
- [ ] Limiter aux fiches validées.
- [ ] Afficher raison et précautions.
- [ ] Tester remplacement/retrait.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Seule une fiche validée est sélectionnable.
- [ ] Le protocole reste à 3 actions max indépendamment de la fiche.

## Risques / points de vigilance

- Compter la fiche comme action de manière incohérente.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
