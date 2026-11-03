# Handoff — 2026-11-03 — File B, bancs du processus de fond

## Branche et état Git

Branche `b-bancs-processus-fond`, dans le worktree
`.claude/worktrees/b-bancs-processus-fond`, partie de `origin/main` 8c458d65
(#1834 mergée). Le lot n'a ni migration, ni `schema.prisma`, ni chemin
clinique : aucune release-db à suivre.

## Objectif

Solder la ligne « Bancs manquants du processus de fond » du plan §8 :
`reconcilierFantomes`, les refus à la réclamation et à la reprise, et la
boucle du processus (`web/scripts/bioExtractionWorker.ts`), en production
depuis le 2026-10-13 sans test automatique.

## Décisions prises

- Le 2026-11-03, le responsable a autorisé le remaniement : la boucle sort
  du script dans une fonction testable. Il a rendu trois autres arbitrages
  le même jour : le rayon 08 reprend après B9/B12, les refus au-delà de
  20 pages seront comptés, et la re-signature B9/B12 passe en file B. Ils
  sont inscrits au plan par #1836, déclarée « prête @fbb09897 ».
- Fantômes : la péremption de `reconcilierFantomes` devient un paramètre,
  par défaut celle de production. `lance_le` est daté et figé par un
  trigger, donc le banc injecte la péremption au lieu de vieillir l'import.
  Aucun trigger n'est désarmé.
- Refus : la base n'interdit pas deux imports « en cours » sur un même
  compte rendu. Une lecture fraîche insérée directement provoque donc
  `extraction_en_cours`, à la réclamation comme à la reprise.
- Boucle : le comportement est identique. Le premier tour balaie toujours
  (`-Infinity` au lieu de `0`, même effet que `Date.now() - 0`).

## Fichiers modifiés

- `web/src/lib/biology-library/import/boucleFileExtraction.ts` (nouveau) :
  la boucle, avec ses dépendances injectées (horloge, attente, arrêt,
  balayage, signal, tour, journal).
- `web/src/lib/biology-library/import/boucleFileExtraction.test.ts`
  (nouveau) : huit tests sur une horloge simulée.
- `web/scripts/bioExtractionWorker.ts` : se réduit au branchement (base,
  `Date.now`, `setTimeout`, SIGTERM et SIGINT, signal de vie).
- `web/src/lib/biology-library/import/fileExtraction.ts` :
  `reconcilierFantomes(peremptionMs = PEREMPTION_EN_COURS_MS)`.
- `web/scripts/banc-file-extraction-deux-sessions.test.ts` : cas 11
  (fantômes) et 12 (refus a et b), joués après le cas 6.
- `changelog.d/2026-11-03-bancs-processus-fond.md`.

## Validations exécutées

- Vitest `boucleFileExtraction` et `fileExtraction` : 15 verts.
- Banc PostgreSQL local (`wellneuro_dev_2303026412`, `TZ=Europe/Paris`) :
  0 à 12 verts, cas existants compris.
- `npm run check` (T1 complet) : vert.
- T2 (`test:worktree --fast`) : lancé, résultat à reporter dans la PR.

## Problèmes ouverts

- La ligne « Bancs manquants » du plan §8 reste à marquer soldée. #1836
  touche la même ligne : cette PR ne la touche donc pas, pour éviter conflit
  et fusion. Elle sera marquée dans la PR du lot suivant de la file B, qui
  partira d'`origin/main` une fois #1836 et cette PR mergées.
- Le commentaire du pas « Bio extraction queue bench » de `ci.yml` ne cite
  pas les cas 11 et 12. Ce n'est pas bloquant.

## Prochaine action exacte

1. T2 vert, puis la PR, la CI, la revue sur la tête, la lecture des
   commentaires, et « prête @<sha> ».
2. Lot suivant en file B : le comptage des refus `trop_de_pages`, trace
   sans donnée patient. Il vient avant la re-signature B9/B12 si la
   release-db de #1834 n'est pas encore constatée. Sa PR marque aussi la
   ligne « Bancs manquants » du §8 soldée (#<cette PR>).

## Interdits encore actifs

- Ni migration ni `schema.prisma` sans demande.
- Production en lecture seule, par conteneur.
- Aucun pull, merge ni rebase sans arbitrage (l'avance `--ff-only` n'en est
  pas un).
- Release-db : approbation par le responsable seul (D-044). Celle de #1834
  attend.
- Essai D-373 : déclarer « prête », ne pas merger.
- Dépôt public : aucune donnée patient ni identité réelle.
