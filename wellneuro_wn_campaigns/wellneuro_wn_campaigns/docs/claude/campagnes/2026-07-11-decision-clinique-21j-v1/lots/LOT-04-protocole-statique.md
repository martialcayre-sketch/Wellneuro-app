---
id: "LOT-04"
titre: "Protocole 21 jours statique"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Protocole 21 jours statique

## But

Permettre de préparer un protocole phase 1 non persistant.

## Résultat observable

Builder local avec raison d’être, priorité, 3 actions max, fiche et critère de suivi.

## Périmètre

- Types TypeScript locaux.
- Ajout/modification/suppression d’actions.
- Plans idéal/minimal/secours en option simple.
- Types d’action prévus pour extensions futures.

## Hors périmètre

- DB
- API
- Envoi patient
- Posologies automatiques

## Fichiers probables

- web/src/components/protocol/ProtocolMiniBuilder.tsx
- web/src/lib/protocol/types.ts
- web/src/lib/protocol/**

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

- [ ] Définir les types.
- [ ] Créer formulaire contrôlé local.
- [ ] Bloquer ou alerter au-delà de 3 actions.
- [ ] Prévoir reset et brouillon visuel.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le protocole se prépare sans persistance.
- [ ] Chaque action est modifiable.
- [ ] Les contraintes sont visibles.

## Risques / points de vigilance

- État local perdu sans avertissement
- Composant trop générique trop tôt.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
