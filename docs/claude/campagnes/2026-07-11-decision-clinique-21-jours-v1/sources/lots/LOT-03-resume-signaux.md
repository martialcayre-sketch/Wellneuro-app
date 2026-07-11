---
id: "LOT-03"
titre: "Résumé décisionnel, données manquantes et discordances"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Résumé décisionnel, données manquantes et discordances

## But

Afficher une lecture prudente fondée uniquement sur les données existantes.

## Résultat observable

DecisionSummaryCard, MissingDataPanel et signaux discordants visibles côté praticien.

## Périmètre

- Afficher où en est le patient, convergences, résistances, données manquantes et décision proposée.
- Utiliser statuts solide/probable/fragile/à documenter.
- Prévoir placeholders prudents lorsque les données manquent.

## Hors périmètre

- Nouvel appel IA
- Diagnostic
- Inférence biologique
- Affichage brut des discordances côté patient

## Fichiers probables

- web/src/components/patient-cockpit/DecisionSummaryCard.tsx
- MissingDataPanel.tsx
- web/src/lib/missing-data/**
- web/src/lib/clinical-signals/**

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

- [ ] Définir types de signal et source.
- [ ] Écrire règles déterministes minimales.
- [ ] Ajouter composants et explications.
- [ ] Tester cas sans données et signaux contradictoires.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune conclusion non sourcée.
- [ ] Chaque donnée manquante explique son impact décisionnel.
- [ ] Les discordances sont praticien-only.

## Risques / points de vigilance

- Transformer une corrélation en conclusion.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
