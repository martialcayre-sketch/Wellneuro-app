# Handoff — 2026-10-03 — BIO-INGEST LOT-02, signature du resolver (D-259)

## Branche et état Git

- Branche `feat/bio-ingest-lot02-resolver-signe`, partie de `main` à
  `ac046516`, sans divergence. Changements indexés, commit et PR à suivre.
- Campagne `2026-09-30-bio-ingest`, lot actif `LOT-02`.

## Objectif

Étape 3 des arbitrages du 2026-10-02 : préparer la relecture du resolver
libellé → analyte, faire valider la table par le responsable, la signer par
une `D-xxx` et l'enrôler dans `shaPerimetreLitteral.guard`.

## Décisions prises

- **[[D-259]]** : resolver signé tel quel, validation rendue en séance le
  2026-10-03 à 05:17 UTC. Empreinte en dur
  `ccbd8008f913d69900792c976e80311fc390a32d5ca525c2f3b46486ff53504b`
  (98 entrées, 96 libellés distincts, 43 analytes).
- « Albumine » et « Acide urique » **restent rattachés**. Le seul piège
  résiduel est une autre matrice sous la même unité : toute unité divergente
  est déjà refusée à la validation (`decisions.ts:236`).
- **Pas d'enrichissement deviné** : les synonymes s'ajouteront d'après les
  libellés réellement lus restés `inconnu`, constatés par identifiant en
  conteneur. Chaque ajout demande une nouvelle signature.
- Source déclarée : relecture du responsable contre le catalogue
  `biology_analytes` (migrations niveau 1 et oméga-3 AA/EPA).

## Constats

- **Premier passage du cron de purge** : journal de production du
  2026-10-03 à 00:15 CEST, `[bio-ingest purge échéance]` →
  `{"candidats":0,"purges":0,"importsClos":0,"differes":0,"echecs":0}`.

## Fichiers modifiés

- `web/src/lib/biology-library/import/resolverLibellesV1.ts` : métadonnée
  signée, en-tête « signée par D-259 ».
- `web/src/lib/clinical/shaPerimetreLitteral.guard.test.ts` : enrôlement,
  avec un chemin relatif `../biology-library/import/…`.
- `resolverLibellesV1.test.ts` et `lancerExtraction.test.ts` : le cas
  « non signé » devient « signé », vérifié sur la table réelle.
- `docs/DECISIONS.md` (D-259), `docs/FEATURE_FLAGS.md` (tableau des verrous
  et conditions de pose), fiche `LOT-02-staging-et-pdf.md`,
  `changelog.d/2026-10-03-bio-ingest-lot02-resolver-signe.md`, surface
  `docs/claude/campagnes/SURFACE_RELECTURE_RESOLVER_LIBELLES_2026-10-03.md`.

## Validations

- Vitest ciblé (`biology-library`, routes biologie, composants, garde
  `shaPerimetreLitteral`) : 148 fichiers verts.
- T1 complet (`npm run check`) : vert. Anti-secrets sur les lignes
  indexées : vert.
- T2 (`npm run test:worktree -- --fast`) : en cours au moment de l'écriture.
  La PR attend son verdict.

## Problèmes ouverts

- **R1** (catalogue) : une iodurie sur échantillon (µg/L) sera proposée puis
  refusée, car le catalogue tient µg/24h.
- **R2** (catalogue) : « Cortisol salivaire 8h » et « … 20h » imprimés sur
  deux lignes restent `inconnu`.
- Rétention des sauvegardes Scalingo : toujours pas établie (héritée de
  D-258).

## Prochaine action exacte

1. T2 vert, puis commit, PR (`--body-file`), CI en fond
   (`node scripts/wn-attendre-ci.mjs <N>`), lecture des commentaires en
   ligne, puis merge.
2. Conditions restantes de la pose de `WN_BIO_INGEST_ENABLED`
   (`docs/FEATURE_FLAGS.md`) : la v4 et la v12 déployées, constatées et
   relues contre le comportement livré. La pose elle-même est un geste du
   responsable.
3. Étape 4, une fois le drapeau posé : constat de `after()` en production.
   Un PDF fabriqué (identité de fixture) est déposé dans un dossier de test
   réel, `extrait` est constaté par identifiant en conteneur, puis le dépôt
   est retiré sans résidu.

## Interdits actifs

- Aucune migration ni modification de `schema.prisma` sans demande
  explicite. L'index partiel `depose_le` reste une proposition.
- Ne jamais retoucher la table sans nouvelle `D-xxx`, et ne jamais écrire
  `shaPerimetre: RESOLVER_LIBELLES_SHA256` : ce serait une tautologie.
- Dossiers de test : désignés par identifiant seulement, jamais par seed ni
  par E2E.
- `release-db` et la pose du drapeau restent des gestes humains.
