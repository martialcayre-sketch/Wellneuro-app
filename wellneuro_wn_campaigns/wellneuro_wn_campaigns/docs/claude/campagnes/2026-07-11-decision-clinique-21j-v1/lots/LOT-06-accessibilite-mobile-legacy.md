---
id: "LOT-06"
titre: "Accessibilité, mobile et compatibilité legacy"
statut: "à_faire"
dépend_de: "LOT-05"
---

# LOT-06 — Accessibilité, mobile et compatibilité legacy

## But

Durcir le vertical slice sans élargir le périmètre.

## Résultat observable

Cockpit utilisable souris/tactile, contrasté et compatible avec les flux existants.

## Périmètre

- Targets tactiles ≥44 px.
- Aucune information importante au survol.
- États loading/error/empty.
- Régression historique questionnaires et demandes de correction.

## Hors périmètre

- Redesign global
- Nouveau framework UI

## Fichiers probables

- Composants créés LOT-02 à LOT-05
- docs/checklist_tests_end_to_end.md

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

- [ ] Tester clavier, tactile et lecteur visuel simple.
- [ ] Tester petits écrans.
- [ ] Vérifier les anciens liens/actions.
- [ ] Corriger seulement les défauts du slice.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucun état clinique par couleur seule.
- [ ] Aucune action dépend du hover.
- [ ] Les flux existants restent accessibles.

## Risques / points de vigilance

- Cacher trop d’informations sur mobile.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
