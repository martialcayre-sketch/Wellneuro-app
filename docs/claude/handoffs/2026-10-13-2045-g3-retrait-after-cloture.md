# Handoff — 2026-10-13 — G3 de BioFlow : `after()` retiré, G3 levé (D-282, lot 5)

## Branche et état Git

`feat/bioflow-g3-lot5-retrait-after`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`26706d17`,
merge du lot 4). Code seul, aucune migration. PR ouverte avec ce handoff.

## Objectif

Lot 5 du G3 (`D-282` §6.5) : constat de la mise en service, retrait de
l'ancien chemin `after()`, clôture et G3 levé dans la feuille de route.

## Décisions prises

- Mise en service constatée le 2026-10-13 (`D-282` §8) : surveillance du
  signal de vie au vert, `worker-1` lancé, drapeau posé puis conteneurs web
  relancés (`env-set` seul ne les relance pas). Première lecture par la file
  sur un dossier de test, lue par conteneur détaché : travail `termine`,
  1 tentative, import `extrait`, 0 fantôme.
- La route demande toujours à la file ; `isBioExtractionAsync` supprimé ; le
  drapeau passe en « entrée morte » de `FEATURE_FLAGS.md` §E.
- `ouvrirExtractionDans` juge la fraîcheur d'un import `en_cours` en SQL
  (`clock_timestamp() AT TIME ZONE 'UTC'`) ; le paramètre `maintenant`
  disparaît. Routé ici par la revue Copilot de #1414.
- `lancerExtraction` et `ouvrirExtraction` restent (les trois temps hors
  file, couverts par leurs tests) ; plus aucune route ne les appelle.

## Fichiers modifiés

- `web/src/app/api/praticien/biologie/import/extraction/route.ts` (+ test
  réécrit sur le seul chemin).
- `web/src/lib/biology-library/import/lancerExtraction.ts` (+ test),
  `featureFlag.ts`, `lecture.ts`, `fileExtraction.ts` (commentaire),
  `web/scripts/bioExtractionWorker.ts` (commentaire).
- `docs/DECISIONS.md` (§8 de `D-282`), `docs/FEATURE_FLAGS.md`,
  `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`, changelog, SESSION_LOG, ce
  handoff.

## Validations exécutées

- Vitest route et bibliothèque biologie : 34 fichiers, 481 tests verts, dont
  un cas neuf (la fraîcheur s'écrit en SQL) et un cas « drapeau à `false`, la
  route demande quand même ».
- T1 complet vert (`npm run check`), anti-secrets OK.
- T2 vert (`test:worktree --fast`) : 271 E2E, contrats SQL et bancs.

## Problèmes ouverts

- Dossier clos pendant l'attente : la réclamation ne le rejuge pas (un motif
  neuf demanderait une migration).
- TEMPS 3 insère sans verrouiller le dossier d'abord : même risque
  d'interblocage face à l'effacement que celui corrigé au lot 3.
- Tests manquants hérités du lot 3 : `reconcilierFantomes`, la boucle du
  processus.

## Prochaine action exacte

CI, revue, merge, déploiement constaté. Le responsable peut retirer
`WN_BIO_EXTRACTION_ASYNC` de Scalingo (`env-unset`, sans effet). Suite de la
feuille de route : l'identité retirée avant l'envoi à Anthropic (`D-284`).

## Interdits encore actifs

- Ne pas toucher à la lecture et sa borne (LOT-08) ni aux refus de relance
  (LOT-09).
- `scale`, variables Scalingo : gestes du responsable.
