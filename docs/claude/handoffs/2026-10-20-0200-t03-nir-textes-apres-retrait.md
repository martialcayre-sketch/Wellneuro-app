# Handoff — t03 : textes après le retrait de la colonne NIR

## Branche et état du dépôt

- Branche `t03-nir-suite-textes`, worktree `d281-lot3-portail`, partie de
  `origin/main` (257807e3, qui porte la migration). Documentation et
  commentaires seuls. Nuit en autonomie file A du 2026-10-19.

## Objectif

Solder les textes qui annonçaient le retrait de la colonne `nir` comme à
venir, une fois la release constatée.

## Décisions prises

- Release constatée avant toute écriture : run 39340724658 (sentinelle
  `WN_RELEASE_DB_OK id=39340724658-1`), conteneur one-off-7583 (colonne et
  contrainte absentes, migration appliquée, aucune en échec, 34 dossiers),
  journaux de l'application sans erreur de colonne.
- Le constat de ligne de base du rayon patients reste écrit à l'identique (il
  se rejoue « jamais reformulé ») ; une note dit que sa ligne `avec_nir`
  échoue désormais et se retire au rejeu.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` (ligne du NIR).
- `web/src/app/api/praticien/patients/route.ts` et son test (commentaires).
- `docs/claude/campagnes/2026-09-16-rayon-patients/CONSTAT_LIGNE_DE_BASE.sql`
  (note).
- Plan (H26 et ligne du lot (g)), changelog, SESSION_LOG.

## Validations exécutées

- T1 complet : voir la PR.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, CodeRabbit, merge, déploiement constaté.

## Interdits encore actifs

- Ne jamais réinstaller une image antérieure à 257807e3 : l'ancien client
  Prisma sélectionne `nir`, toute lecture de dossier échouerait.
