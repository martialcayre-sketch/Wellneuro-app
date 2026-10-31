# Handoff — D/21 : doublons WN-SRC-0058 et WN-SRC-0188 soldés au registre du corpus

## Branche et état Git

- Worktree `file-d1-suite`, branche `lot/file-d-d21-doublons`, partie de
  `origin/main` (a9feaa90). Session concurrente, cycle en `git`/`gh` direct ;
  l'intégrateur merge ([[D-373]]).
- La PR de D/51 (#1786, branche `lot/file-d-d51-constat`) reste ouverte et
  n'est pas touchée par ce lot.

## Objectif

Solder la ligne D/21 de la file D : deux sources `deprecated` dont la
`requiredAction` « Dédupliquer » restait ouverte, et que
`scripts/wn-context-pack.mjs` comptait donc comme conflits ouverts.

## Décisions prises

- Aucune décision D-xxx : l'étape de vérification n'en a révélé aucun besoin.
- Sources canoniques : WN-SRC-0059 et WN-SRC-0218. Les deux paires sont des
  copies binaires : SHA-256 identiques, constatés le 2026-10-30 sur le
  snapshot local du corpus (`~/.wellneuro/corpus/drive-dump/`, hors dépôt).
  Pour 0058 = 0059, la note LOT-02b le disait déjà. Pour 0188 = 0218, le
  constat a été fait sur la remarque de PR-Agent : la première tête disait
  « identité binaire non vérifiée ».
- Forme du solde : celle de WN-SRC-0546 (« Remplacée par … »), sans le mot
  « dédupliquer », que le comptage cherche. Aucun champ `doublon_de` ajouté :
  le comptage le lirait aussi comme conflit ouvert.
- `lifecycleStatus`, `rightsStatus`, `clinicalReviewStatus` et `auditDate`
  inchangés.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : `requiredAction` et `comment`
  de WN-SRC-0058 et WN-SRC-0188, rien d'autre ;
- `docs/claude/PLAN_WELLNEURO.md` : ligne D/21 passée à « fait le 2026-10-30 » ;
- ce handoff.

## Validations exécutées

- `git grep` des deux ids hors du registre, joué avant la création de ce
  handoff : seules la ligne D/21 du plan et la note LOT-02b les citaient.
  Depuis, ce handoff les cite aussi. Aucun claim, lien analyte-axe, fiche, entrée de
  `consommation_decisions.json` ni banc.
- Le banc `tests/wellneuro/evals/context-pack-corpus.test.mjs` travaille sur
  une fixture temporaire et ne lit pas le vrai registre. Le constat s'est donc
  fait par la sortie de `node scripts/wn-context-pack.mjs` : « Conflits
  ouverts » passe de 2 à 0.
- `shasum -a 256` sur les deux paires de PDF du snapshot local : identiques.
- T1 (`npm run check:rapide`) et T1 complet (`npm run check`) verts sur la
  première tête ; T1 rejoué après la correction.
- CI vert sur la première tête 477b44f2 (`wn-attendre-ci.mjs`, sortie 0).

## Problèmes ouverts

- La base de production n'a pas été lue : le lot interdit la production. Si
  des claims du corpus vivent en base sans trace au dépôt, ils n'ont pas été
  vérifiés. La note LOT-02b dit que l'ingestion du notebook 10 a écarté le
  doublon.

## Prochaine action exacte

1. CI par `node scripts/wn-attendre-ci.mjs <N>`, revue de CodeRabbit ou de
   PR-Agent prouvée sur la tête ([[D-393]]), verdict sur chaque commentaire,
   puis « prête @<sha> ».
2. Page « Suivi de la file D » : d21 passée à `fait`.

## Interdits encore actifs

- Aucun fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`.
- Aucune modification de claim ni de statut clinique au registre.
- Ni migration, ni `schema.prisma`, ni écriture en production.
- La file D ne merge aucune PR ordinaire pendant l'essai ([[D-373]]).
