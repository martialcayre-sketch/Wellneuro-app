# Handoff — 2026-10-06 — Feuille de route BioFlow à jour du LOT-09

## Branche et état Git

`docs/bioflow-roadmap-lot09`, depuis `main` c4b53e83. Doc seule.

## Objectif

Tenir l'arbre de `BIOFLOW_ROADMAP.md`, qui se met à jour à chaque changement
de lot courant.

## Décisions prises

- Track A : LOT-07 et LOT-09 terminés, procédé `bio-extraction-v3` ; G2 levé ;
  prochain gate G3 (décision sur l'asynchrone durable, à poser).
- Track B : BP-26 en attente du responsable ; BP-23 et BP-10 cadrés.

## Fichiers modifiés

`docs/architecture/bioflow/BIOFLOW_ROADMAP.md`, SESSION_LOG, ce handoff.

## Validations exécutées

T1 complet.

## Problèmes ouverts

- G2 levé ouvre la réconciliation des imports fantômes : aucune fiche n'existe
  encore (LOT-09 la renvoyait « après LOT-07 »).
- G3 : la décision sur l'asynchrone durable reste à poser par le responsable.

## Prochaine action exacte

Merge ; puis arbitrages BP-23, BP-10 et décision G3.

## Interdits encore actifs

La feuille de route référence les lots, elle ne les duplique jamais.
