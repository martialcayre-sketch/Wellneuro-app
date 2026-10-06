# Handoff — 2026-10-06 — Feuille de route BioFlow, arbitrages du jour

## Branche et état Git

`docs/bioflow-roadmap-arbitrages-1006`, depuis `main` cf8a7717. Doc seule.

## Objectif

Porter dans `BIOFLOW_ROADMAP.md` les arbitrages BIO-INGEST du 2026-10-06 et
l'état de BP-23 et BP-10.

## Décisions prises

Ce sont des arbitrages du responsable, sans décision `D-xxx` :

- G3 est différé ;
- les imports fantômes seront traités avec G3 ;
- pour la purge du LOT-09, il suffit de redéposer le compte rendu.

## Fichiers modifiés

- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`
- fragment `changelog.d/2026-10-06-bioflow-roadmap-arbitrages.md`
- (pas d’entrée SESSION_LOG : elle entrerait en conflit avec #1344, ouverte en parallèle ; ce handoff en tient lieu)
- ce handoff

## Validations exécutées

T1 complet.

## Problèmes ouverts

- #1344 (registre RGPD BP-10) attend la validation du responsable.
- BP-26 attend toujours le responsable.

## Prochaine action exacte

1. Merger, puis constater le déploiement.
2. Après validation de #1344 : migration `LectureImportBiologique`, sur
   confirmation distincte.

## Interdits encore actifs

La feuille de route référence les lots, elle ne les duplique jamais.
