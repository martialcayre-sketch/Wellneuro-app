# Handoff — 2026-10-06 — BIO-INGEST LOT-09 : relancer la lecture

## Branche et état Git

`feat/bio-ingest-lot09-relancer-la-lecture`, depuis `main` 3f137079 (#1334,
déployé et constaté en production à 06:18 UTC). Aucune migration.

## Objectif

Relire un compte rendu déjà lu sans le retirer, tant qu'aucune ligne n'est
validée ; jamais de relance destructive.

## Décisions prises

- Garde serveur dans `ouvrirExtraction` : `ligne_validee` (409) si une ligne
  d'un import de ce compte rendu est `validee` ; lue sous le verrou du compte
  rendu (celui de la décision), après la clôture des imports périmés.
- L'import précédent et ses lignes restent tels quels ; le nouveau devient
  courant (`idExtractionCourante`) ; la décision refuse l'ancien
  (`import_remplace`) ; une relance échouée rend l'ancien courant.
- Écran : « Relancer la lecture » avec confirmation sur une lecture `extrait`
  non purgée sans ligne validée dans aucune lecture ; « Lancer la lecture »
  masqué aussi en présence d'une ligne validée.
- Pas de décision `D-xxx` : ni clinique, ni frontière ; la fiche fait foi.

## Fichiers modifiés

`lancerExtraction.ts`, `extraction/route.ts`, `ImportCompteRenduPanel.tsx`,
leurs bancs, fiche LOT-09 (terminé), `.wn/state.json` (lot actif LOT-09),
changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- Vitest ciblé : 60 verts ; mutations (garde serveur, condition d'écran)
  vues rouges ; T1 rapide vert ; T2 `--fast` : voir PR.
- `wn-reviewer` : GO, ni P0 ni P1 ; trois P2 corrigés.

## Problèmes ouverts

- Pour le responsable : D-258 purge dès que toutes les lignes courantes sont
  décidées. Une lecture mauvaise et entièrement écartée ne peut donc plus être
  relancée. Hors périmètre.
- Le filtre de relation n'est prouvé que sur mocks et par tsc ; aucun banc
  sur base réelle (facultatif, relevé par la revue).

## Prochaine action exacte

1. CI de la PR, commentaires de revue lus, merge (P1 : `wn-reviewer` suffit).
2. Constat du déploiement.
3. Campagne BIO-INGEST : lots restants selon l'ordre arbitré (BIOFLOW_ROADMAP).

## Interdits encore actifs

- Aucune relance après validation ; rien de validé effacé, réécrit ni
  remplacé ; aucune écriture dans `resultats_biologiques` sans validation.
