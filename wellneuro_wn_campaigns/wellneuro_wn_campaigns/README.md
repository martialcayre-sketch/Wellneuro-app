# Programme `/wn` — WellNeuro 3.0

Ce paquet transforme la synthèse stratégique et la bibliothèque assistant de code en campagnes autonomes compatibles avec `.claude/skills/wn-campaign/SKILL.md`.

## Point de départ

Campagne active : `2026-07-11-alignement-documentaire-etat-reel`

```text
/wn status
/wn next
```

## Ordre recommandé

| Ordre | Campagne | Résultat | Priorité | Risque | Dépendance |
|---|---|---|---|---|---|
| C0 | `2026-07-11-alignement-documentaire-etat-reel` | Alignement documentaire | Obligatoire | Faible | Aucune |
| C1 | `2026-07-11-decision-clinique-21j-v1` | Décision clinique 21J V1 | Priorité produit | Moyen | C0 |
| C2 | `2026-07-11-suivi-j7-j14-j21-et-persistance` | Persistance + suivi J7/J14/J21 | Après validation UX | Élevé / migration | C1 + confirmation |
| C3 | `2026-07-11-fiches-conseils-contextuelles-v1` | Fiches conseils contextuelles | Après C1 | Faible | C1 |
| C4 | `2026-07-11-complements-clean-label-v1` | Compléments clean label V1 | Après C1/C3 | Moyen | C1 + C3 |
| C5 | `2026-07-11-boussole-alimentaire-slice-v1` | Boussole alimentaire slice V1 | Après C1 | Moyen | C1 + validation mapping |

## Principe directeur

> WellNeuro 3.0 transforme les données patient existantes en une décision clinique 21 jours simple, validée, documentée et suivable.

## Règle produit centrale

```text
Phase 1 = 3 actions maximum
+ 1 fiche prioritaire
+ 1 critère de suivi
+ validation praticien obligatoire
```

## Structure

```text
docs/claude/campagnes/
├── ACTIVE_CAMPAIGN.md
├── 2026-07-11-alignement-documentaire-etat-reel/
├── 2026-07-11-decision-clinique-21j-v1/
├── 2026-07-11-suivi-j7-j14-j21-et-persistance/
├── 2026-07-11-fiches-conseils-contextuelles-v1/
├── 2026-07-11-complements-clean-label-v1/
└── 2026-07-11-boussole-alimentaire-slice-v1/
```

Chaque campagne contient `BRIEF.md`, `BRIEF_COMPILED.md`, `CAMPAIGN_DRAFT.md`, `CAMPAIGN_META.json`, `CAMPAGNE.md`, `sources/` et `lots/`. Le dossier source complet est également fourni dans `docs/claude/wellneuro-3/`, ce qui rend les commandes `--source docs/claude/wellneuro-3` directement utilisables après copie.

## Import dans le dépôt

Copier le contenu de `docs/claude/campagnes/` dans le même chemin du dépôt. Ne pas écraser une campagne existante sans revue.
