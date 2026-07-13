---
id: "wn-ultimate-v2-integration"
statut: "proposition_non_executable_a_valider"
statut_integration: "proposition_non_executable_a_valider"
source_version: "2.0-portable"
source_baseline: "main@d0d84d162b08c9b41604b7608f03ebdcc5517e4d"
branche_integration: "docs/wn-ultimate-v2-reconciliation"
integre_le: "2026-07-13"
---

# WN Ultimate v2 — dossier de proposition intégré

Ce dossier intègre le corpus documentaire du pack
`WN_ULTIME_v2_PORTABLE` sans l'activer comme vérité clinique ou technique.
Les documents normatifs existants, le code et les tests restent prioritaires
tant qu'un arbitrage explicite n'a pas promu un document de ce dossier.

## Garanties d'intégration

- aucun code runtime importé ;
- aucune migration Prisma ou SQL ;
- aucun ZIP, prototype, archive ou document maître concaténé importé ;
- aucune source clinique publiée dans le runtime ;
- aucun changement de scoring, seuil ou recommandation clinique ;
- les dates source du `2026-07-14` sont conservées comme métadonnée déclarée,
  distincte de la date d'intégration réelle du `2026-07-13` ;
- `Michel Dogné` est la seule graphie utilisée dans les exemples intégrés.

## Contrôle du paquet source

L'audit en lecture seule a établi :

- 35 fichiers déclarés et 35 fichiers présents hors manifeste ;
- tous les SHA-256 conformes à `FILE_MANIFEST.json` ;
- JSON valides ;
- contrôle anti-secrets réussi ;
- 391 entrées de source, de `WN-SRC-0001` à `WN-SRC-0391`, sans doublon
  d'identifiant ;
- 391/391 sources sans hash de contenu, avec droits `to_verify` et revue
  clinique `not_reviewed`.

Les manifests et archives restent donc hors Git dans cette intégration. Leur
publication exige au minimum les gates G0 (droits) et G1 (contrats/taxonomie).

## Hiérarchie et statut

Les fichiers `00` à `15` sont des propositions cohérentes entre elles. Ils
ne remplacent pas automatiquement :

- `docs/claude/REGISTRE_FRONTIERES.md` ;
- `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` ;
- les `CAMPAGNE.md` actifs ;
- `docs/claude/PROJET_CONTEXTE.md` ;
- les règles cliniques et le scoring présents dans le code.

## Réconciliation avec l'état réel

| Sujet | État du pack | État retenu dans le dépôt |
|---|---|---|
| HC-F | LOT-04 et LOT-05 à terminer | LOT-04 terminé ; LOT-05 suivant |
| Activation campagne | `ACTIVE_CAMPAIGN.md` doit être lu explicitement | constat confirmé ; correction technique dans une branche séparée |
| C1 | sept lots réorganisés | contenu compatible, mais cinq fichiers de lots génériques restent à réaligner |
| C5A/C5B | profils intrinsèques puis contexte/journal | proposition en conflit avec le registre actuel ; arbitrage produit requis |
| Corpus 391 sources | manifeste candidat | quarantaine documentaire, aucun runtime |
| Journal 25 marqueurs / neuf axes | présenté comme cible | décision clinique à valider avant code ou promotion canonique |
| Dates | documents datés du 2026-07-14 | date source conservée, intégration datée du 2026-07-13 |

## Gates avant promotion

1. Valider les frontières et objets cliniques proposés.
2. Arbitrer la répartition C5A/C5B et la place du journal.
3. Valider les décisions cliniques listées dans `10_DECISIONS_GATES.md`.
4. Vérifier les droits et produire les hashes du registre des sources.
5. Réconcilier physiquement les lots C1 avec son `CAMPAGNE.md`.
6. Corriger l'activation explicite de `wn-campaign.mjs` dans une PR technique.
7. Promouvoir les documents retenus un par un, avec revue et historique.

## Documents

- `00_SOURCE_MAITRE.md` : vision du moteur clinique.
- `01_CARTOGRAPHIE_SYSTEME_ET_FRONTIERES.md` : responsabilités des briques.
- `02_CONTRATS_DONNEES.md` : contrats TypeScript proposés.
- `03_INTEGRATION_OUTILS_EXISTANTS.md` : adaptateurs et réutilisation.
- `04_JOURNAL_ALIMENTAIRE_21J.md` : journal proposé.
- `05_BOUSSOLE_ALIMENTAIRE_NUTRITION_LAB.md` : Boussole et Nutrition Lab.
- `06_CORPUS_CLINIQUE_ET_COMPILER.md` : gouvernance du corpus.
- `07_FEUILLE_DE_ROUTE_3_2.md` : séquence proposée.
- `08_PATCH_CAMPAGNES.md` : amendements proposés.
- `09_OUTILLAGE_WN.md` : évolution proposée de l'outillage.
- `10_DECISIONS_GATES.md` : décisions humaines obligatoires.
- `11_MIGRATION_DOCUMENTAIRE.md` : stratégie de promotion documentaire.
- `12_PLAN_PR_GITHUB.md` : séquence de branches proposée.
- `13_TESTS_ET_ACCEPTATION.md` : stratégie de preuve.
- `14_AUDIT_SOURCES.md` : audit du registre de sources.
- `15_CARTE_IMPORT_GITHUB.md` : destinations après promotion.

## Éléments volontairement exclus

- `MASTER.md`, doublon concaténé des documents individuels ;
- `archives/previous_versions.zip` ;
- `sources/*.zip` et le prototype journal ;
- registres JSON originaux ou normalisés, faute de droits et de hashes validés ;
- proposition historique d'`ACTIVE_CAMPAIGN.md` ;
- patch de code/outillage, réservé à une branche technique.
