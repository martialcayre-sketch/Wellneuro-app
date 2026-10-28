# Handoff — 2026-10-28 — File C : bb, activation de `WN_PORTAIL_TROIS_PLANS` constatée (D-386, H49)

## Branche et état du dépôt

- Branche `bb-activation-constat-dossier`, partie de `origin/main` (777d6654,
  #1756) ; worktree `j3-12e-ingestion`, session concurrente, cycle en
  `git`/`gh` direct.
- PR de documentation seule : ni code, ni migration, ni release-db attendue.

## Objectif

Constater l'activation de bb sur un vrai dossier : le drapeau était posé depuis
le 2026-10-27 (#1749), mais aucune version n'était postérieure à l'instant.

## Décisions prises

- Ordre retenu par le responsable (option A) : version enregistrée puis
  diffusée d'abord sur un dossier de test, constat ensuite. Le drapeau était
  déjà `true` (relu par `env-get`) : rien n'a été posé dans cette session.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne `WN_PORTAIL_TROIS_PLANS`) ;
  `docs/claude/PLAN_WELLNEURO.md` (ligne de renvoi du journal de H49, ligne
  H49 de la file C) ;
  `docs/claude/plan-journal/H49/2026-10-28-01-constat-activation.md` ;
  `changelog.d/2026-10-28-bb-constat-activation.md` ; ce handoff.

## Validations exécutées

- Absence de recul relue par l'historique Scalingo : les déploiements
  postérieurs à 39131a45 descendent tous de lui.
- Lecture agrégée par conteneur avant le geste : aucune version en vigueur
  postérieure à l'instant. Après le geste, lecture par identifiant d'un
  dossier de test : version en vigueur postérieure à l'instant, approbation
  ancrée sur elle, plans idéal et de secours remplis.
- Lecture en ligne par le responsable : portail (trois plans), « Jour
  difficile ? » (un seul point final), aperçu « Diffusion » identique.
- Banc du journal du plan (`scripts/lib/plan-journal.test.mjs`) vert ; T1
  complet (`cd web && npm run check`) vert.

## Problèmes ouverts

- Les plans du dossier de test portent un texte provisoire identique : le
  constat prouve la présence du plan de secours au jour difficile et l'absence
  de « .. », pas leur distinction à l'écran (couverte par les bancs).

## Prochaine action exacte

PR, CI (`wn-attendre-ci`), revue CodeRabbit de la tête, sonde des runs
`release-db` non conclus (D-374 §5), merge `--match-head-commit`. Puis
l'ouverture suivante de la file C (porte 18 levée).

## Interdits encore actifs

- Aucune migration ; aucun texte patient inventé.
- Production lue en lecture seule, par identifiant, depuis un conteneur ;
  dans le dépôt, « un dossier de test ».
