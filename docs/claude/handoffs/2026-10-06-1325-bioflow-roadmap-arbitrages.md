# Handoff — 2026-10-06 — Feuille de route BioFlow, arbitrages du jour

## Branche et état Git

Porté par la branche `docs/bio-parcours-bp10-registre-rgpd` (#1344) : la PR séparée #1345 a été fermée pour éviter un conflit sur `SESSION_LOG.md`. Doc seule.

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
- SESSION_LOG (entrée du registre RGPD BP-10, complétée)
- ce handoff

## Validations exécutées

T1 complet.

## Problèmes ouverts

- #1344 (registre RGPD BP-10) attend la validation du responsable.
- BP-26 attend toujours le responsable.

## Prochaine action exacte

1. Validation de #1344 par le responsable, merge, constat du déploiement.
2. Puis migration `LectureImportBiologique`, sur
   confirmation distincte.

## Interdits encore actifs

La feuille de route référence les lots, elle ne les duplique jamais.
