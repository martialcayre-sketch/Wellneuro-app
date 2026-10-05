# Handoff — 2026-10-05 — BioFlow : roadmap ramenée à une forme courte

## Branche et état Git

`docs/bioflow-roadmap-forme-courte`, partie de `main` (23bf3d4d). Ce
changement est de la documentation seule.

## Objectif

Corriger l'incohérence n° 1 relevée à la clôture de BIO-INGEST LOT-03
(#1318). `BIOFLOW_ROADMAP.md` a été mergée (#1317) avant que la gouvernance
soit propre : elle annonçait encore la clôture de LOT-03 comme étape à venir,
et recopiait l'ordre détaillé des lots.

## Décisions prises

- Structure fixée par le responsable (2026-10-05) : un arbre BIOFLOW avec
  Track A et Track B (lot courant, prochain gate, objectif), les gates
  G1 à G4, et BIOFLOW PLATFORM non ouverte.
- Règle capitale : la roadmap référence les lots, elle ne les duplique
  jamais. Le `lot_courant` de chaque campagne fait foi, et l'arbre se met à
  jour quand il change.
- Retirés : l'ordre détaillé des lots, la liste des interdits de plateforme
  et le renvoi à l'audit, déjà présents dans les campagnes ou en mémoire.

## Fichiers modifiés

- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`.
- `changelog.d/2026-10-05-bioflow-roadmap-forme-courte.md`, ce handoff et
  l'entrée `SESSION_LOG.md`.

## Validations exécutées

`check_no_secrets`, `npm run check`, puis le CI de la PR.

## Problèmes ouverts

- La dette auto-merge (contrôle de clôture non obligatoire en CI) reste
  ouverte.
- Des copies anciennes d'un identifiant de dossier réel restent dans le
  dépôt.
- L'état des lieux du 2026-10-04 est à verser quand son texte sera fourni.

## Prochaine action exacte

La décision préalable au LOT-07, sur feu vert du responsable.

## Interdits encore actifs

- Aucun code ni aucune migration du LOT-07 avant la décision préalable
  mergée.
- La roadmap ne porte jamais de liste de lots.
