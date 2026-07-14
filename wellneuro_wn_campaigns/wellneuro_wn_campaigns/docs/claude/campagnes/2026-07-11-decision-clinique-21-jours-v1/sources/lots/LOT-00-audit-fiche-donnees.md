---
id: "LOT-00"
titre: "Audit de la fiche patient et des données disponibles"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Audit de la fiche patient et des données disponibles

## But

Cartographier la fiche actuelle, ses appels de données et les composants réutilisables, sans modification.

## Résultat observable

Carte des flux et liste exacte des données utilisables sans nouvelle API.

## Périmètre

- Lire FichePatientPanel, page patient praticien, composants équilibre et routes appelées.
- Identifier les blocs monolithiques et les zones de risque.
- Repérer les états chargement/erreur/vide existants.

## Hors périmètre

- Modifier le code
- Concevoir le schéma Prisma
- Changer le scoring

## Fichiers probables

- web/src/components/FichePatientPanel.tsx
- web/src/app/dashboard/patients/[idPatient]/page.tsx
- web/src/components/DetailBesoinsPanel.tsx
- web/src/lib/equilibre/**
- routes praticien consommées par la fiche

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

- [ ] Tracer les props, fetch et états.
- [ ] Lister les données du résumé décisionnel.
- [ ] Identifier les composants extractibles sans changement de comportement.
- [ ] Documenter les contraintes de rétrocompatibilité.

## Tests

- Aucun test de code
- Smoke test de la fiche existante avant changement

## Critères de done

- [ ] Les données disponibles et absentes sont explicites.
- [ ] Les fichiers à modifier sont confirmés.
- [ ] Les risques de régression sont listés.

## Risques / points de vigilance

- Sous-estimer un couplage caché dans FichePatientPanel.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
