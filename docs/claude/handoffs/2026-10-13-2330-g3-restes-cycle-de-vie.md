# Handoff — 2026-10-13 — G3 de BioFlow : les deux restes (D-282 §9)

## Branche et état Git

`fix/bioflow-g3-restes-cycle-de-vie`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`193b614c`,
merge du lot 5). Code seul, aucune migration. PR ouverte avec ce handoff.

## Objectif

Fermer les deux restes du G3 que le responsable a arbitrés sur scénarios le
2026-10-13 : la lecture qui partait après une clôture, et l'interblocage de
l'enregistrement des lignes face à l'effacement.

## Décisions prises

- `D-282` §9.1 : clôturer (`cycle-de-vie`, action `cloture`) ou désactiver
  (`PATCH patients`, `actif: 'NON'`) est refusé en 409 `lecture_en_cours` tant
  qu'un travail est ouvert. Le verrou commun est `aucuneLectureDemandee`, qui
  verrouille le dossier `FOR UPDATE` puis compte les travaux ouverts. Il vit
  dans `lectureDemandee.ts`, un module sans le client Anthropic. La reprise
  et l'effacement ne l'appellent pas.
- `demanderExtraction` lit le dossier `FOR KEY SHARE` en premier, avant le
  verrou du compte rendu, puis refuse `dossier_clos`. La route renvoie alors
  le refus habituel du dossier clos (`dossier_cloture`).
- `D-282` §9.2 : TEMPS 3, isolé dans `consignerLignes` (exporté pour le banc,
  contenu inchangé), verrouille le dossier `FOR KEY SHARE` en premier.
- Le PATCH de désactivation passe d'une transaction en tableau à une
  transaction interactive. L'ordre reste le même : dossier, puis copies de
  l'e-mail, puis liens.

## Fichiers modifiés

- Neuf : `web/src/lib/biology-library/import/lectureDemandee.ts`.
- `fileExtraction.ts` (+ test), `lancerExtraction.ts` (+ test), la route
  `import/extraction` (+ test), `api/praticien/patients/route.ts` (+ test),
  `api/praticien/patients/cycle-de-vie/route.ts` (+ test).
- `web/scripts/banc-file-extraction-deux-sessions.test.ts` (cas 8 et 9).
- `docs/DECISIONS.md`, changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- Vitest, biologie et dossier patient : 50 fichiers, 844 tests verts, plus le
  cas de la route.
- Banc à deux sessions sur une base locale jetable (`wn_g3_restes_banc`) :
  11 cas verts, sous `TZ=Europe/Paris` et sous `TZ=UTC`.
- Témoin du cas 9 : sans le verrou de TEMPS 3, `40P01 deadlock detected` sur
  `ligneBiologiqueCandidate.createMany`. Témoin du cas 8 : sans le verrou de
  la demande, le cas rougit. Les deux verrous sont remis.
- Revue `wn-reviewer` : GO, aucun P0/P1. P2 corrigés : message « quelques
  minutes » (le refus peut durer 6 à 12 min, sans limite sans processus de
  fond) ; délai des deux transactions porté à `DELAI_TRANSACTION_LIGNES_MS`
  + 5 s (le défaut de 5 s rendait une erreur technique) ; réécritures de
  l'e-mail construites seulement là où elles servent ; test PATCH désactivation
  et changement d'e-mail (copies dans la transaction, P2002 en 409).
- Constat de transition en production (conteneur détaché, agrégats) :
  0 travail ouvert, 0 sur un dossier clos ou désactivé.
- Garde des importeurs de `biology-library` : les deux routes du dossier
  inscrites, avec leur motif.
- T1 complet vert ; T2 vert (`test:worktree --fast` : 715 fichiers Vitest,
  271 E2E, contrats SQL et bancs, dont celui de la file).

## Problèmes ouverts

- Aucun reste du G3.
- La base locale `wn_g3_restes_banc` est laissée sur le serveur local, à
  supprimer sur accord. Le témoin rouge y a laissé des fixtures.
- Tests manquants relevés par la revue, laissés : banc 9 dans l'autre ordre
  (l'enregistrement tient déjà le dossier) ; désactivation contre une demande
  en vol à deux sessions (même verrou que la clôture, jouée au cas 8).

## Prochaine action exacte

CI, revue, merge, déploiement constaté. Puis l'identité retirée du compte
rendu avant l'envoi à Anthropic (`D-284` §5).

## Interdits encore actifs

- Ne pas toucher à la borne de lecture (LOT-08) ni aux refus de relance
  (LOT-09).
- Variables et conteneurs Scalingo : gestes du responsable.
