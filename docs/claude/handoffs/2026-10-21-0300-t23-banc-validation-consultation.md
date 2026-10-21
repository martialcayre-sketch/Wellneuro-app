# Handoff — t23 : banc « seule la route de validation valide une consultation »

## Branche et état du dépôt

- Branche `lot/t23-banc-consultation`, worktree `d281-lot3-portail`, partie de
  `origin/main` (b857bd0d). Sans migration, sans drapeau. PR de doc #1617
  (arbitrages de la file A) ouverte à part.

## Objectif

Dette C-6 du LOT-11 (t23) : la garde de lecture de la consultation qui fait
foi tient au fait (un seul chemin d'écriture), pas au schéma.

## Décisions prises

- Arbitrage du responsable, 2026-10-21 : banc de code, pas de contrainte en
  base. Aucune décision `D-xxx` neuve (application de D-107).

## Fichiers modifiés

- `web/src/lib/consultation/consultationPorteuse.ecritures.guard.test.ts` (neuf).
- `changelog.d/2026-10-21-t23-banc-validation-consultation.md`, SESSION_LOG.

## Validations exécutées

- Banc seul vert (10 tests, dont 6 contre-épreuves du détecteur) ; T1 et T2
  `--fast` : voir la PR.

## Problèmes ouverts

- Limite déclarée : seed, scripts hors `src` et SQL manuel échappent au banc.

## Prochaine action exacte

CI, CodeRabbit, merge ; puis t06 (brouillon local de « Ce qui compte »).

## Interdits encore actifs

- Un merge à la fois ; aucune image antérieure à 257807e3 redéployée ; rien
  de clinique sans D-xxx.
