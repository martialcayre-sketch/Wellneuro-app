# Handoff — t14 : journal du portail, soldée (constat + état du drapeau)

## Branche et état du dépôt

- Branche `t14-journal-sans-objet`, worktree `d281-lot3-portail`. Documentation
  seule, à jour de `origin/main` (contient #1586).

## Objectif

Dette t14 : à l'ouverture d'une surface fermée, le journal patient fait
apparaître d'un coup des faits anciens.

## Décisions prises

- Fait constaté sur Scalingo le 2026-10-19 (`env`, noms filtrés) : le journal
  et ses trois sources sous drapeau sont à `true`, le journal ouvert le dernier
  (2026-10-18) — aucune source fermée ne reste.
- Deux arbitrages le même soir, dans deux sessions : « clore sans code » (cette
  session, sur ce constat) ; le mécanisme `<DRAPEAU>_OUVERT_LE` livré par
  #1586 (autre session, sur l'arbitrage initial). #1586 est mergée et sans
  effet tant qu'aucune variable n'est posée : rien n'est défait. Cette PR
  solde la ligne du plan en citant #1586, retire son propre paragraphe en
  doublon de la procédure de #1586, et corrige l'état de production de
  `WN_PORTAIL_MES_ECHANGES` (revue CodeRabbit).

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne de `WN_PORTAIL_MES_ECHANGES`).
- Plan (ligne t14), changelog, SESSION_LOG.

## Validations exécutées

- T1 : voir la PR.

## Problèmes ouverts

- Aucun. Le responsable dira s'il veut poser après coup une date
  `_OUVERT_LE` (geste de production non demandé à ce jour).

## Prochaine action exacte

PR, CI, CodeRabbit, merge ; t14 → fait sur la page de suivi de la file A.

## Interdits encore actifs

- Aucune décision clinique sans D-xxx.
