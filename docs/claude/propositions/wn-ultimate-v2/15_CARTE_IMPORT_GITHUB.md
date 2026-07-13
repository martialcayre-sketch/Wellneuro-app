---
id: "wellneuro-github-import-map-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Carte d’import GitHub

> Cette carte décrit les destinations après promotion. Dans la branche
> d'intégration, les documents restent sous
> `docs/claude/propositions/wn-ultimate-v2/` et ne remplacent aucune source
> normative.

| Fichier du pack | Chemin cible recommandé |
|---|---|
| `00_SOURCE_MAITRE.md` | `docs/claude/MOTEUR_CLINIQUE_SOURCE_MAITRE.md` |
| `01_CARTOGRAPHIE_SYSTEME_ET_FRONTIERES.md` | `docs/claude/CARTOGRAPHIE_SYSTEME_ET_FRONTIERES.md` |
| `02_CONTRATS_DONNEES.md` | `docs/claude/CONTRATS_DONNEES_CLINIQUES.md` |
| `03_INTEGRATION_OUTILS_EXISTANTS.md` | `docs/claude/INTEGRATION_OUTILS_EXISTANTS.md` |
| `04_JOURNAL_ALIMENTAIRE_21J.md` | `docs/claude/JOURNAL_ALIMENTAIRE_21J.md` |
| `05_BOUSSOLE_ALIMENTAIRE_NUTRITION_LAB.md` | `docs/claude/BOUSSOLE_ALIMENTAIRE_NUTRITION_LAB.md` |
| `06_CORPUS_CLINIQUE_ET_COMPILER.md` | `docs/claude/CORPUS_CLINIQUE_COMPILER.md` |
| `07_FEUILLE_DE_ROUTE_3_2.md` | `docs/claude/FEUILLE_DE_ROUTE_3_2.md` |
| `08_PATCH_CAMPAGNES.md` | `docs/claude/PATCH_CAMPAGNES_3_2.md` |
| `09_OUTILLAGE_WN.md` | `docs/claude/OUTILLAGE_WN_CLINIQUE.md` |
| `10_DECISIONS_GATES.md` | `docs/claude/DECISIONS_CLINIQUES_GATES.md` |
| `11_MIGRATION_DOCUMENTAIRE.md` | `docs/claude/MIGRATION_DOCUMENTAIRE_V2.md` |
| `12_PLAN_PR_GITHUB.md` | `docs/claude/PLAN_PR_GITHUB_3_2.md` |
| `13_TESTS_ET_ACCEPTATION.md` | `docs/claude/TESTS_CLINIQUES_ACCEPTATION.md` |
| `14_AUDIT_SOURCES.md` | `docs/claude/AUDIT_MANIFESTE_SOURCES.md` |

## Fichiers machine-readable

| Fichier | Cible |
|---|---|
| `source_registry_original.json` | `docs/claude/manifests/source_registry_original.json` |
| `source_registry_normalized_candidate.json` | `docs/claude/manifests/source_registry_normalized_candidate.json` |
| `roadmap_dependencies.json` | `docs/claude/manifests/roadmap_dependencies.json` |
| `decision_register.json` | `docs/claude/manifests/decision_register.json` |
| `document_status.csv` | `docs/claude/manifests/document_status.csv` |

## Annexes

- installer le pack C1B sous `docs/claude/campagnes/_prepared/` seulement après correction de l’activation explicite ;
- ne pas copier le prototype journal dans le runtime sans appliquer les corrections du document 04 ;
- conserver les anciens documents sous `docs/archive/` avec statut `SUPERSEDED`.

## Ordre de commit

Cet ordre concerne la promotion future, pas le dépôt initial en quarantaine.

1. orchestration ;
2. documents canoniques ;
3. manifests ;
4. campagnes et frontières ;
5. annexes utiles ;
6. archivage.
