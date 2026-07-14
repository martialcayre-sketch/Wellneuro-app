---
id: "LOT-03"
titre: "Affichage patient et impression"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Affichage patient et impression

## But

Afficher la fiche de façon calme et imprimable.

## Résultat observable

Page/carte patient et intégration document protocole.

## Périmètre

- Résumé puis détail.
- Mobile/tactile.
- CSS print.
- Badge validé par praticien.

## Hors périmètre

- Commentaires patient
- Messagerie

## Fichiers probables

- web/src/app/patient/**
- components/advice-sheets/**
- PatientProtocolPrintable

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

- [ ] Créer vue patient.
- [ ] Ajouter accès depuis protocole.
- [ ] Tester format long/court.
- [ ] Tester impression.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Lecture mobile claire.
- [ ] Précautions visibles sans alarmisme.

## Risques / points de vigilance

- Texte trop dense.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
