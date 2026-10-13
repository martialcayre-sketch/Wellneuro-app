# Handoff — 2026-10-13 — G3 de BioFlow : le processus de fond, drapeau éteint (D-282, lot 3)

## Branche et état Git

`feat/bioflow-g3-lot3-worker`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`a5567e5b`,
merge de `D-284`). Code seul, aucune migration. PR ouverte avec ce handoff.

## Objectif

Lot 3 du G3 (`D-282` §6) : le processus de fond qui traite la file, la bascule
de la route sous `WN_BIO_EXTRACTION_ASYNC` éteint, le retrait des travaux
avant le retrait d'un document, la purge à 30 jours, les bancs à deux sessions.

## Décisions prises

- `fileExtraction.ts` : demande (travail `en_attente`, sans import, refus
  jugés avant d'enfiler, `lecture_demandee` en plus, `P2002` intercepté) ;
  réclamation (import ouvert ET travail mis à jour dans UNE transaction,
  réservation 6 min en SQL) ; terminaison gardée par l'import courant ;
  balayage des fantômes ; purge des travaux terminés à 30 jours.
- **Ordre des verrous de la réclamation** : dossier `FOR KEY SHARE`, verrou
  du compte rendu, travail `FOR UPDATE SKIP LOCKED`. L'effacement verrouille
  le dossier `FOR UPDATE` avant de supprimer les travaux : l'ordre inverse
  s'interbloque (témoin joué : `40P01`).
- **Reprise** : elle juge d'abord SON import. Encore `en_cours` → clos
  `delai_depasse` sans horloge client (P2-3 de la revue) ; la lecture avait
  répondu (`extrait`, ou échec autre que `delai_depasse`) → travail terminé,
  jamais relu (P2-1) ; puis épuisement à 2 tentatives.
- `ouvrirExtraction` découpée en `ouvrirExtractionDans(tx, …)` : mêmes refus,
  même ordre — rien du LOT-09 ne change.
- **Écart à « l'écran ne change pas » (D-282 §2)** : l'import né à la
  réclamation rendait l'attente invisible. `lireCompteRendu` expose
  `lectureDemandee` (travail ouvert) ; l'écran la montre « en cours » et masque
  lancer/relancer. Toujours `false` drapeau éteint.
- Processus de fond : `scripts/bioExtractionWorker.ts`
  (`npm run bio:worker-extraction`), un travail à la fois, attente 2 s file
  vide, fantômes chaque minute, arrêt propre sur SIGTERM. PAS au `Procfile`.
- Drapeau documenté dans `docs/FEATURE_FLAGS.md` (garde des drapeaux).

## Fichiers modifiés

- Neufs : `web/src/lib/biology-library/import/fileExtraction.ts` (+ test),
  `web/scripts/bioExtractionWorker.ts`,
  `web/scripts/banc-file-extraction-deux-sessions.test.ts`.
- `lancerExtraction.ts`, `retrait.ts` (+ test), `lecture.ts`,
  `featureFlag.ts`, la route `import/extraction` (+ test), le test de la route
  `import/compte-rendu`, `ImportCompteRenduPanel.tsx` (+ test).
- `web/scripts/purgeComptesRendusEcheance.ts`, `web/package.json`.
- `.github/workflows/ci.yml` et `scripts/wn-test-worktree.sh` (le banc).
- `docs/FEATURE_FLAGS.md`, changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- T1 complet vert (`npm run check`) après les correctifs de revue.
- T2 vert (`test:worktree --fast`, 271 E2E, contrats SQL, bancs) AVANT les
  correctifs de revue ; ceux-ci ne touchent ni l'écran ni les routes
  (internes de la réclamation, banc, CI) et sont couverts par T1 et le banc
  rejoué.
- Revue Copilot #1414 : fraîcheur de la demande jugée en SQL (corrigé, cas 0
  du banc ajouté).
- Banc rejoué seul sur la base de T2 : 9 cas verts (0 à 7 et 5 bis) sous `TZ=Europe/Paris`
  et sous `TZ=UTC` ; rejouable (fixtures et résidu d'effacement nettoyés).
- Témoin du cas 7 : `FOR KEY SHARE` retiré → l'effacement meurt en `40P01` ;
  remis → vert.
- Revue `wn-reviewer` : aucun P0/P1. P2-1, P2-3, P2-4 corrigés ; P2-7 corrigé
  (TZ au CI, nettoyage du résidu, cas 7 réécrit sur la vraie fenêtre).

## Problèmes ouverts

À trancher par le responsable AVANT de poser le drapeau (lot 4) :

- **P2-2** : sans processus de fond vivant, un travail ouvert ne finit jamais.
  L'écran reste « Lecture en cours », lancer/relancer/retrait fermés, seul
  l'effacement du dossier passe. Échéance d'un travail `en_attente`, état
  d'écran distinct, ou surveillance du conteneur au lot 4 ?
- **P2-6** : pendant l'attente d'une relance, les lignes de l'ancien import
  restent décidables ; une validation fait échouer la réclamation
  (`ligne_validee`) sans que l'écran le dise. ~2 s avec un processus vivant.
- Dossier clos pendant l'attente : la réclamation ne le rejuge pas (un motif
  neuf demanderait une migration).

Routés ou écartés :

- **Horloge client dans `ouvrirExtractionDans`** (revue Copilot #1414) :
  le refus `extraction_en_cours` du LOT-09 juge encore la fraîcheur d'un import
  à l'horloge du processus. Corrigé dans la demande (SQL) ; laissé dans
  l'ouverture, que `D-282` interdit de toucher, et dont la reprise ne dépend
  plus (elle clôt son propre import). Reste exposé : un import de l'ancien
  chemin, pendant la seule bascule, sous un décalage d'horloge — à reprendre
  au lot 5, quand `after()` disparaît.
- **P2-5** écarté : drapeau rééteint, l'ancien chemin ignore la file ; la
  base reste cohérente (le travail échoue `extraction_en_cours`) et `after()`
  disparaît au lot 5.
- Préexistant, hors périmètre (`D-282` interdit de toucher la lecture) : la
  transaction des lignes (TEMPS 3) insère sous des clés vers le dossier sans le
  verrouiller d'abord — même risque d'interblocage face à l'effacement que
  celui corrigé ici, sur l'ancien chemin comme sur le nouveau.
- Tests manquants : `reconcilierFantomes` (le `lance_le` posé par trigger ne
  se recule pas, il faudrait attendre 5 min), le refus à la réclamation et à
  la reprise, la boucle du processus.
- Base locale `wn_g3_lot3_banc` (vide) créée puis laissée sur le serveur
  Postgres local : à supprimer sur accord.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue Copilot, merge. Puis
arbitrer P2-2 et P2-6. Puis lot 4 : `worker: npm run bio:worker-extraction`
au `Procfile`, le responsable fait `scale worker:1` PUIS pose
`WN_BIO_EXTRACTION_ASYNC=true` ; constat sur un dossier de test lu par
identifiant (balayage des fantômes visible drapeau éteint).

## Interdits encore actifs

- `scale worker`, pose du drapeau : gestes du responsable.
- Ne pas toucher à la borne d'extraction (LOT-08) ni aux refus de relance
  (LOT-09) ; `after()` reste jusqu'au lot 5 (après une première lecture réussie
  par la file).
- Aucune migration dans ce lot.
