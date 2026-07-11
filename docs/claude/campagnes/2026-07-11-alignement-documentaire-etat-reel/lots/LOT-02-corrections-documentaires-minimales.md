---
id: "LOT-02"
titre: "Corrections documentaires minimales"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Corrections documentaires minimales

## But

Aligner uniquement les documents contradictoires avec l'état vérifié.

## Résultat observable

Documentation cohérente et minimale, sans changement fonctionnel.

## Périmètre

- Corriger les statuts obsolètes.
- Ajouter la source de vérité et la date de vérification.
- Conserver un historique clair des dettes résolues.

## Hors périmètre

- Réécrire toute la roadmap
- Modifier le code
- Ajouter une nouvelle architecture produit non validée

## Fichiers probables

- docs/roadmap.md
- docs/claude/PROJET_CONTEXTE.md
- README.md
- docs/claude/SESSION_LOG.md uniquement selon règle projet

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Préparer un diff documentaire minimal.
- [ ] Vérifier qu'aucune décision non prouvée n'est ajoutée.
- [ ] Relire les liens et chemins.
- [ ] Exécuter le contrôle secrets par prudence.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] La dette Sheets/OAuth est décrite correctement.
- [ ] La roadmap distingue acquis, dette réelle et backlog.
- [ ] Le diff ne touche que la documentation.

## Risques / points de vigilance

- Écraser l'historique utile au lieu de le contextualiser.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
