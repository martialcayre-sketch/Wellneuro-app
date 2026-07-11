---
id: "LOT-02"
titre: "Découpage du cockpit sans régression"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Découpage du cockpit sans régression

## But

Extraire des sous-composants de présentation sans changer les appels API ni la logique clinique.

## Résultat observable

Fiche patient structurée en sections réutilisables, comportement existant préservé.

## Périmètre

- Créer PatientHeader, EquilibreOverview, QuestionnaireHistoryPanel et zones cockpit.
- Conserver toutes les fonctionnalités existantes.
- Mettre l’historique technique en second niveau accessible.

## Hors périmètre

- Ajouter résumé clinique nouveau
- Créer protocole
- Modifier API ou Prisma

## Fichiers probables

- web/src/components/FichePatientPanel.tsx
- web/src/components/patient-cockpit/**
- web/src/components/ui/**

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

- [ ] Extraire un composant à la fois.
- [ ] Comparer rendu avant/après.
- [ ] Préserver les handlers et fetch.
- [ ] Tester desktop et mobile.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune fonction supprimée.
- [ ] La fiche est plus lisible et compilable.
- [ ] Diff limité aux composants.

## Risques / points de vigilance

- Refactor cosmétique trop large
- Perte d’un état ou bouton existant.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
