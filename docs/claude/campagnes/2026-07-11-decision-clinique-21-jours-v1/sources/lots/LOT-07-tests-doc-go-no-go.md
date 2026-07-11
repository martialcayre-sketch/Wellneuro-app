---
id: "LOT-07"
titre: "Tests, documentation et go/no-go"
statut: "à_faire"
dépend_de: "LOT-06"
---

# LOT-07 — Tests, documentation et go/no-go

## But

Valider le vertical slice et décider de la persistance.

## Résultat observable

Rapport E2E, captures fictives, documentation et décision go/no-go pour la campagne suivante.

## Périmètre

- Exécuter tests.
- Tester les trois patients fictifs.
- Relire le diff et la dette.
- Documenter limites du mode non persistant.

## Hors périmètre

- Commencer la migration
- Ajouter de nouvelles fonctions

## Fichiers probables

- docs/checklist_tests_end_to_end.md
- docs/claude/SESSION_LOG.md selon pratique
- CAMPAGNE.md
- lots/LOT-07-tests-doc-go-no-go.md

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

- [ ] Exécuter commandes qualité.
- [ ] Tester les scénarios E2E.
- [ ] Capturer desktop/mobile.
- [ ] Décider si UX assez stable pour spécifier le modèle persistant.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Toutes les validations sont consignées.
- [ ] Le go/no-go est argumenté.
- [ ] Le backlog est séparé.

## Risques / points de vigilance

- Valider la persistance malgré une UX non stabilisée.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
