---
id: "LOT-02"
titre: "Corrections documentaires minimales"
statut: "terminé"
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
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [x] Préparer un diff documentaire minimal.
- [x] Vérifier qu'aucune décision non prouvée n'est ajoutée.
- [x] Relire les liens et chemins.
- [x] Exécuter le contrôle secrets par prudence.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [x] La dette Sheets/OAuth est décrite correctement (déjà exacte, aucune correction requise — cf. LOT-00/LOT-01).
- [x] La roadmap distingue acquis, dette réelle et backlog (ligne R8 corrigée).
- [x] Le diff ne touche que la documentation.

## Risques / points de vigilance

- Écraser l'historique utile au lieu de le contextualiser.

## Résultats

**Clôturé le 2026-07-11.** Seule divergence trouvée par LOT-00 : la ligne R8 du tableau R0→R10 (dupliquée dans `docs/ROADMAP_TECHNIQUE.md:55` et `docs/roadmap.md:55`) affirmait « Vitest (32 tests) … Playwright reste hors CI », contredit par les entrées SESSION_LOG du 2026-07-11 (R8.2 : Playwright intégré en CI réelle avec service PostgreSQL ; R8.3 : Vitest passé à 61 tests, `.check.ts` supprimés).

**Fichiers modifiés** :
- `docs/ROADMAP_TECHNIQUE.md` (ligne R8) : état mis à jour (61 tests/9 fichiers, Playwright en CI réelle, source SESSION_LOG R8.2/R8.3).
- `docs/roadmap.md` (ligne R8, texte dupliqué) : identique.
- `lots/LOT-00-audit-sources-verite.md`, `lots/LOT-01-verification-routes-sheets-oauth.md`, `lots/LOT-02-corrections-documentaires-minimales.md` (ce fichier) : statuts et sections Résultats complétés.
- `CAMPAGNE.md` : `lot_courant` avancé, tableau des lots mis à jour.

**Commandes exécutées** : `bash scripts/check_no_secrets.sh` (à consigner ci-dessous après exécution).

**Écarts** : aucun autre écart trouvé (cf. matrice LOT-00, points 1 à 5 confirmés exacts). Point #7 (suppression non committée de `PROJET_CONTEXTE_MINIMAL.md`/`README_MINIMAL.md`) laissé ouvert, hors périmètre de cette campagne.

**Dette restante** : aucune dette documentaire connue sur le périmètre audité (Sheets/OAuth, registre relationnel, portail unifié, synthèse IA, patients fictifs, statut R8).

**Décision de poursuite** : GO pour LOT-03 (validation et handoff vers la campagne suivante).
