---
id: "LOT-04"
titre: "Check-ins et décision J21"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Check-ins et décision J21

## But

Collecter tolérance/adhésion minimale et préparer la décision J21.

## Résultat observable

Check-ins J7/J14/J21 et panneau décisionnel praticien.

## Périmètre

- Questions courtes énergie, sommeil, digestion, stress, adhésion.
- Labels continuer/alléger/densifier/pivoter/explorer/stopper.
- Aucune interprétation diagnostique.

## Hors périmètre

- Score prédictif
- Urgence médicale
- Chat

## Fichiers probables

- web/src/components/patient-companion/**
- web/src/components/patient-cockpit/J21DecisionPanel.tsx
- routes check-ins

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

- [ ] Définir questions et fréquence.
- [ ] Créer soumission sécurisée.
- [ ] Afficher tendance simple.
- [ ] Créer décision manuelle praticien.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Check-in <15 secondes.
- [ ] Le praticien distingue adhésion et effet.
- [ ] Aucun libellé culpabilisant.

## Risques / points de vigilance

- Sur-sollicitation
- Interprétation excessive.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
