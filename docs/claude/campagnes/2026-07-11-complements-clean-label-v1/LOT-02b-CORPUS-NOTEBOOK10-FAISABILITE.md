# LOT-02b — Couche corpus du rayon compléments (notebook 10) : faisabilité

> **Statut : faisabilité prouvée en dev-local, extraction complète + ingestion
> prod = acte gaté.** Le pilote borné a tourné le 2026-07-24 sans aucune perte
> de dosage ; l'extraction du notebook complet et l'ingestion en pgvector de
> production attendent un feu vert explicite (coût réel + écriture prod).
>
> Aucune donnée patient. Sorties du pilote hors dépôt (`~/.wellneuro/corpus/`).
> Alimente l'outil n°1 de la proposition (« rayon corpus micronutrition »).

## Inventaire — notebook « 10 — Micronutrition et compléments »

- **30 notices** au registre (`docs/claude/corpus/source_registry.json`),
  **30/30 appariées** au snapshot local — aucune source manquante.
- **1 doublon strict** (SHA-256 identique) : `WN-SRC-0058` = `WN-SRC-0059`
  (« 19 Les vitamines du groupe B », 39 p) → **29 sources uniques**.
- **730 pages uniques** (769 brutes − 39 du doublon), ~46 Mo de PDF. Volumétrie
  ≈ 4,5× le pilote 09 (163 p).

## Pilote borné réellement extrait (2 IA, lectures A/B/C)

- Sources : `WN-SRC-0066` (intro thérapeutique micronutritionnelle, 13 p),
  `WN-SRC-0064` (compléments alimentaires en neuronutrition, 29 p),
  `WN-SRC-0239` (prescrire la vitamine D, 3 p).
- **45 pages extraites** (< borne 60 p), **223 s** (~5 s/page, B et C en
  parallèle par page).

### Verdict des invariants (dosages de la lecture A survivant dans B et C)

- **26 dosages** détectés en couche texte A (vérité des nombres).
- Manquants dans B : **0** (survie A→B 100 %). Manquants dans C : **0**
  (survie A→C 100 %). **Perdus des deux lectures : 0.** Aucune alerte dure.

### Chunks et ingestion dev-locale

- **6 chunks conformes** (462–599 mots, cible spec 350–800), **6/6** validés par
  le vrai `parseRagIngestPayload` serveur (mode `--validate`), **0 rejeté**.
- Ingestion dev-locale éphémère (Postgres 55432, batch `LOT_910_2026-07-24`,
  embeddings réels `text-embedding-3-small`) : **6/6 indexés, récupération 6/6**
  (auto-test de similarité ~1 ; requête « dose max tolérable vitamine A » →
  chunk correct). **Aucun appel prod.**

## Estimation du notebook 10 complet (29 sources, 730 pages)

| | |
|---|---|
| Coût extraction (hors batch) | ~13 $ (≈1,8 ¢/page, 2 modèles) |
| Coût extraction (batch −50 %) | ~6–7 $ |
| Temps d'extraction | ~60 min (5 s/page, sources en série) |
| Coût du pilote (dépensé) | ~0,81 $ |

Prérequis tous levés : clés API présentes (`web/.env.local`, existence vérifiée,
jamais affichée), poppler installé, option de bornage `--pages`/`--pilote`
disponible. **Aucun blocage technique.**

## Acte gaté — suite

L'extraction du notebook 10 complet puis l'**ingestion en pgvector de
production** (chunks → claims 2 IA → Atelier corpus → validation praticien
signée, barrière D-003) sont un **acte gaté** : coût réel (~6–13 $) et écriture
en base de production. Séquence à confirmer :

1. Extraction complète des 29 sources uniques (ignorer le doublon `WN-SRC-0059`).
2. Chunk + rédaction des claims (2 IA, contre-vérification de fidélité).
3. Ingestion des chunks + claims en prod, statut `EN_ATTENTE_VALIDATION`.
4. Validation praticien à l'Atelier corpus (tag `metadata.rayon = micronutrition`).
5. Alors seulement, l'outil n°1 (rayon corpus) sert ces claims validés dans les
   fiches du rayon compléments.
