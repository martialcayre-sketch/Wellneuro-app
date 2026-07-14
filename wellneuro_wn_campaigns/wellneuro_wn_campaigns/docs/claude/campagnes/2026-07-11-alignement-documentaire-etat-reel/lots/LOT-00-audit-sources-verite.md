---
id: "LOT-00"
titre: "Audit des sources de vérité"
statut: "terminé"
dépend_de: "aucun"
---

# LOT-00 — Audit des sources de vérité

## But

Lire les documents canoniques et identifier les affirmations susceptibles d'être obsolètes.

## Résultat observable

Une matrice `affirmation → source → date → confiance → vérification requise`, sans modification.

## Périmètre

- Lire `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`, `docs/claude/PROJET_CONTEXTE.md` et les README pertinents.
- Lister les modules annoncés comme terminés, en cours ou différés.
- Repérer les conflits de dates et de statut.

## Hors périmètre

- Modifier des fichiers
- Interpréter le code en profondeur
- Décider une architecture cible

## Fichiers probables

- docs/roadmap.md
- docs/claude/SESSION_LOG.md
- docs/claude/PROJET_CONTEXTE.md
- README.md

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

- [x] Lire la dernière entrée du journal de session.
- [x] Construire la matrice des divergences.
- [x] Marquer chaque point comme confirmé, probable ou à vérifier.
- [x] Produire une note de cadrage pour LOT-01.

## Tests

- Aucun test applicatif
- Relire les citations et dates
- Vérifier qu'aucune donnée patient réelle n'est reproduite

## Critères de done

- [x] La matrice couvre Sheets, OAuth, routes, modules livrés et dette UX.
- [x] Aucune modification du dépôt (ce lot n'a lui-même modifié aucun fichier avant sa propre clôture).

## Risques / points de vigilance

- Prendre un document récent pour vrai sans vérifier le code.

## Résultats

**Clôturé le 2026-07-11.** Aucune modification de fichier dans ce lot (audit lecture seule via 3 agents Explore). Matrice des divergences :

| # | Affirmation | Source | Vérification | Confiance |
|---|---|---|---|---|
| 1 | Décommission Google Sheets terminée (2026-07-07), scope OAuth = `openid email profile`, route `migrate-historique` supprimée, `SHEET_ID` non requis | `CLAUDE.md`, `PROJET_CONTEXTE.md` | Code : `web/src/lib/auth.ts:17` scope exact confirmé ; 0 référence active à Sheets/`SHEET_ID`/`migrate-historique` dans `web/src/` (seuls 2 commentaires historiques) ; 6 routes praticien inspectées = Prisma uniquement | Confirmé |
| 2 | Registre relationnel (`questionnaire_packs`) livré, lecture primaire + fallback `packs.qids` | `PROJET_CONTEXTE.md:74`, `ROADMAP_TECHNIQUE.md:30` | `schema.prisma:184-217` + `packRegistry.ts:67-90` (`resolvePackQuestionnaireIds`) confirmés, callers vérifiés | Confirmé |
| 3 | Portail patient unifié `/portail/[token]` | `PROJET_CONTEXTE.md` | Route existe (`web/src/app/portail/[token]/`) | Confirmé |
| 4 | Synthèse IA enrichie (`contexteClinique.ts`) | `PROJET_CONTEXTE.md:78` | Module existe, description conforme | Confirmé |
| 5 | Patients fictifs = uniquement Sophie Nicola, Jennifer Martin, Michel Dogné, aucune variante | `PROJET_CONTEXTE.md:82` | Confirmé, aucun autre nom/typo | Confirmé |
| 6 | R8 (filet de sécurité technique) : « Vitest (32 tests) … Playwright reste hors CI » | `ROADMAP_TECHNIQUE.md:55` et `docs/roadmap.md:55` (texte dupliqué) | Contredit par SESSION_LOG 2026-07-11 (R8.2/R8.3) : Playwright intégré en CI réelle, Vitest passé à 61 tests | Écart confirmé → corrigé en LOT-02 |
| 7 | Suppression de `docs/claude/PROJET_CONTEXTE_MINIMAL.md` et `README_MINIMAL.md` | `git status` | Ajoutés au commit `2ba80dc`, mis en suppression avant cette session — confirmé intentionnel par l'utilisateur en session (2026-07-11) | Confirmé |

Dette restante : aucune. Point #7 clos en session (suppression intentionnelle confirmée par l'utilisateur). Décision de poursuite : go pour LOT-01 (périmètre déjà couvert par ce même audit) puis LOT-02 (correction de l'écart #6).
