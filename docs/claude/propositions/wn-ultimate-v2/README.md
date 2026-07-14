---
id: "wn-ultimate-v2-integration"
statut: "source_auditee_partiellement_promue"
statut_integration: "architecture_promue_regles_cliniques_bloquees"
source_version: "2.0-portable"
source_baseline: "main@d0d84d162b08c9b41604b7608f03ebdcc5517e4d"
branche_integration: "docs/wn-ultimate-v2-reconciliation"
integre_le: "2026-07-13"
---

# WN Ultimate v2 — source auditée et réconciliée

Ce dossier conserve la source documentaire auditée du pack
`WN_ULTIME_v2_PORTABLE`. Les contrats et frontières retenus ont été promus le
2026-07-13 dans `docs/claude/ARCHITECTURE_CLINIQUE_3_2.md`, le registre de
frontières et les campagnes normatives. Les paramètres cliniques non sourcés
restent des propositions non exécutables.

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

Les fichiers `00` à `15` restent la trace amont. Le fichier `16` est un
complément de maturité, pas une source clinique. En cas d'écart, ils ne
remplacent pas :

- `docs/claude/REGISTRE_FRONTIERES.md` ;
- `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` ;
- les `CAMPAGNE.md` actifs ;
- `docs/claude/PROJET_CONTEXTE.md` ;
- les règles cliniques et le scoring présents dans le code.

## Réconciliation avec l'état réel

| Sujet | État du pack | État retenu dans le dépôt |
|---|---|---|
| HC-F | LOT-04 et LOT-05 à terminer | LOT-04 terminé ; LOT-05 suivant |
| Activation campagne | état explicite requis | `.wn/state.json` retenu comme autorité ; `ACTIVE_CAMPAIGN.md` devient une vue générée |
| C1 | sept lots réorganisés | contrats purs, priorité proposée/sélectionnée et protocole brouillon promus |
| C5A/C5B | profils intrinsèques puis contexte/journal | C5A intrinsèque, C5B contextuel ; journal extrait vers JA |
| Corpus 391 sources | manifeste candidat | registre sanitaire expurgé, aucun runtime |
| Journal 25 marqueurs / neuf axes | présenté comme cible | JA promue, marqueurs/axes maintenus candidats jusqu'à validation clinique |
| Dates | documents datés du 2026-07-14 | date source conservée, intégration datée du 2026-07-13 |

## Gates restant fermés

1. Valider les décisions cliniques listées dans `10_DECISIONS_GATES.md`.
2. Vérifier les droits et produire les hashes du registre des sources (G0).
3. Valider taxonomie, extraction, claims/conflits et firewall (G1–G4).
4. Autoriser séparément toute migration PostgreSQL/pgvector (G5).
5. Donner le go/no-go praticien au pilote sommeil/chronobiologie (G6).

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
- `16_MATURITE_WN_AUTO.md` : couche de maturité WN-AUTO pour l’évaluation, le routage et les budgets.

## Éléments volontairement exclus

- `MASTER.md`, doublon concaténé des documents individuels ;
- `archives/previous_versions.zip` ;
- `sources/*.zip` et le prototype journal ;
- registres JSON originaux ou avec localisateurs internes ; seul le registre
  sanitaire expurgé est versionné dans `docs/claude/corpus/` ;
- proposition historique d'`ACTIVE_CAMPAIGN.md` ;
- patch de code/outillage, réservé à une branche technique.
