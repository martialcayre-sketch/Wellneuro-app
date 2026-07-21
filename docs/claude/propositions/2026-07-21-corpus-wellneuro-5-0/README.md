# Corpus WellNeuro 5.0 — cadrage de l'outil corpus

- Date : 2026-07-21
- Statut : décisions structurantes **actées** (registre A9, D-004) ; le
  détail d'implémentation reste proposition jusqu'à compilation des lots.
- Source d'exécution normative : `docs/claude/REGISTRE_FRONTIERES.md` (A9).

## Objet

Le corpus scientifique (supports SIIN, futures formations, publications,
veille) est le socle documentaire des fonctions 5.0 : Spirale, boussoles
alimentaires, synthèses, booklets, protocoles, recommandations praticien.
Ce dossier cadre l'outil qui le construit et l'entretient.

## Décisions actées (2026-07-21)

| Sujet | Décision |
|---|---|
| Gates | G0 acté (droits SIIN, verdict utilisateur) ; G1–G4 = machine à états `NOTEBOOK_VALIDATIONS` ; G5 acté (PR #196) ; G6 non ouvert |
| Modèle de corpus | **Deux couches** : verbatim source immuable (cité tel quel) + claims validés praticien, liés aux sources |
| Typologie des lectures | Unique : **déclaré / observé / vécu / interprété** (A7) |
| Forme de l'outil | Pipeline CLI versionné (`tools/corpus/`) + **Atelier corpus** dans `dashboard/corpus` |
| Extraction du stock | Double lecture croisée : couche texte (pdftotext) + **Sonnet 5 + GPT-5.4** en batch, invariants déterministes bloquants |
| Fenêtre tarifaire | Lancement avant le **2026-08-31** (tarif d'introduction Sonnet 5) |
| Apps Script v1.5 | Appelant **transitoire** ; extinction à l'ouverture de l'Atelier corpus (D-004) |

## Architecture cible

```
Drive (stock PDF)          Entrées vivantes (upload, URL, DOI — Atelier v3)
      │                            │
      ▼                            ▼
tools/corpus/ (CLI local)   compartiment QUARANTAINE + fiche G0
  extract/    double lecture A (pdftotext) + B (Sonnet 5) + C (GPT-5.4)
  invariants/ nombres+unités, couverture, tableaux — bloquant, sans IA
  chunk/      découpage structurel, IDs WN-CH-XXXX-NNN, front matter
  claims/     extraction assistée LLM → EN_ATTENTE_VALIDATION praticien
  ingest/     POST /api/internal/rag/ingest (secret partagé)
  bench/      fixtures Q/R de conformité (banc du savoir)
      │
      ▼
rag_corpus_chunks (pgvector, PR #196)  ←  rag_corpus_claims (à venir)
      │
      ▼
Moteur clinique : citations verbatim + claims sourcés, validation praticien
```

## Invariants d'extraction

- Deux lectures indépendantes réconciliées ; tout écart = artéfact détecté,
  routé en file de revue avec diff localisé.
- Invariants déterministes **bloquants** : chaque nombre+unité de la couche
  texte doit survivre à l'identique (dosages = risque clinique n°1) ; taux de
  couverture caractères ; comptage de cellules par tableau.
- Figures non transcriptibles : `[FIGURE p.N — non transcrite]`, jamais
  paraphrasées.
- Triage de validation humaine : `prescriptif` → 100 % ; divergences → revue
  ciblée ; descriptif concordant → échantillonnage.

## Chiffrage

Voir `BENCH_COUTS_EXTRACTION_CORPUS.md` (échantillon réel : 3 PDF Drive,
85 pages). Stock complet ≈ 11 000 pages ≈ **107 $** en croisé intégral batch.

## Séquencement

1. **Fusion PR #196** (infrastructure) — préalable à toute ingestion.
2. **Banc qualité** sur les 3 PDF échantillons (clés API locales) : tokens
   réels/page, concordance A/B/C, restitution des tableaux, résolution.
3. **Pipeline `tools/corpus/`** + ingestion du stock par priorité
   fonctionnelle (notebooks nourrissant Spirale/boussoles d'abord).
4. **Migration `rag_corpus_claims`** (PR relue) + poste de revue des claims.
5. **Atelier corpus v1→v3** (`dashboard/corpus`) ; extinction du GAS.
6. **Banc du savoir** : fixtures Q/R rejouées à chaque évolution du corpus
   (transposition de `check_questionnaire_certification.js`).

## Arbitrages restants

- **Notebooks prioritaires** : hypothèse de travail — 09 Nutrition,
  10 Micronutrition/compléments, 08 Biologie fonctionnelle — à confirmer.
- **Champ `patient_identifiable` explicite** produit par `build_pack` et
  exigé par la validation (aujourd'hui codé en dur à `false` côté GAS).
- **Schéma `rag_corpus_claims`** : à compiler au lot correspondant (texte
  normalisé, liens chunks sources, classe d'autorité, niveau de preuve,
  modèle réviseur, statut, validateur, dates).
