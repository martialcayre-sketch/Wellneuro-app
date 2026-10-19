# Handoff — t14 : journal du portail, close sans code

## Branche et état du dépôt

- Branche `t14-journal-sans-objet`, partie de `origin/main` 89907823. Worktree
  `d281-lot3-portail`. Documentation seule.

## Objectif

Dette t14 : à l'ouverture d'une surface fermée, le journal patient fait
apparaître d'un coup des faits anciens. Arbitrage initial du 2026-10-19 : une
ligne « affiché à partir du … », datée par un réglage posé avec le drapeau.

## Décisions prises

- Fait nouveau, constaté sur Scalingo (`env`, noms filtrés) le 2026-10-19 :
  `WN_PORTAIL_MES_ECHANGES`, `WN_FICHES_ASSIETTE_LECTURE`,
  `WN_LETTRE_ADRESSAGE_PATIENT`, `WN_BIO_PORTAIL_ENABLED` (et
  `WN_BIO_INGEST_ENABLED`) sont à `true`. Le journal a été ouvert le dernier
  (2026-10-18, plan H76) : aucune source fermée ne reste.
- Question reposée au responsable sur ce fait : **clore sans code**, règle
  pour la prochaine source écrite au `docs/FEATURE_FLAGS.md` § B.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (§ B, un paragraphe).
- Plan (ligne t14), changelog, SESSION_LOG.

## Validations exécutées

- T1 complet : voir la PR.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, CodeRabbit, merge ; t14 → fait sur la page de suivi de la file A.

## Interdits encore actifs

- Aucune décision clinique sans D-xxx.
