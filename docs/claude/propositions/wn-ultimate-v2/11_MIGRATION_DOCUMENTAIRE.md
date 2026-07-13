---
id: "wellneuro-migration-documentaire-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Migration documentaire

## 1. Règle de priorité

```text
Avant promotion :
registre de frontières et campagnes actuelles
> pack v2.0 proposé

Après promotion explicite d'un document :
document v2.0 promu
> document antérieur qu'il remplace explicitement
> prototypes et brainstorms
```

La présence du pack dans le dépôt ne modifie jamais seule la hiérarchie
normative.

## 2. Dépôt cible

```text
docs/claude/
├── MOTEUR_CLINIQUE_SOURCE_MAITRE.md
├── CARTOGRAPHIE_SYSTEME_ET_FRONTIERES.md
├── CONTRATS_DONNEES_CLINIQUES.md
├── INTEGRATION_OUTILS_EXISTANTS.md
├── JOURNAL_ALIMENTAIRE_21J.md
├── BOUSSOLE_ALIMENTAIRE_NUTRITION_LAB.md
├── CORPUS_CLINIQUE_COMPILER.md
├── FEUILLE_DE_ROUTE_3_2.md
├── DECISIONS_CLINIQUES_GATES.md
├── manifests/
└── campagnes/
    └── _prepared/
```

## 3. Documents à remplacer

- ancienne source moteur clinique ;
- ancienne compilation moteur/Boussole ;
- contexte Mon équilibre lorsque ses décisions sont reprises ;
- blueprint Boussole comme source d’exécution ;
- proposition ACTIVE_CAMPAIGN datée ;
- patches intermédiaires.

Ils peuvent rester en archive avec bannière `SUPERSEDED`.

## 4. Documents à conserver comme sources

- contexte Mon équilibre ;
- prompts Mon équilibre ;
- pack journal original ;
- prototype journal ;
- campagne C1B originale ;
- manifeste 391 sources ;
- registre de frontières ;
- campagnes existantes ;
- historiques de session.

## 5. Documents à amender

- `PROGRAMME_WELLNEURO_3_0.md` → 3.2 ;
- `REGISTRE_FRONTIERES.md` ;
- C1 ;
- C2 ;
- C3 ;
- C4 ;
- C5 ;
- ACTIVE_CAMPAIGN ;
- README campagnes ;
- context pack.

## 6. Vérification post-migration

- un seul document maître ;
- aucun ancien terme banni ;
- liens valides ;
- campagnes préparées non actives ;
- manifeste versionné ;
- C1 consomme Mon équilibre ;
- C2 n’alimente pas le score ;
- journal et Boussole séparés ;
- corpus brut inaccessible au runtime ;
- absence de migration.
