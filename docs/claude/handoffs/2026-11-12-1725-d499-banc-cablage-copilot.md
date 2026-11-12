# Handoff — D-499 : banc de câblage du lecteur Copilot réaligné

## Branche et état Git

`fix/d499-banc-cablage-copilot`, créée sur `origin/main` `b56ca4d9` ; un commit, PR à ouvrir par l'intégrateur.

## Objectif

Remettre au vert T1 complet en local : depuis `D-499` (#2017, `62592da6`), le banc
`scripts/wn-revue-copilot.test.mjs` (test « câblage ») exigeait que le skill
`wn-merge` et la règle de revue §1.6 citent `wn-revue-copilot.mjs`, que `D-499`
a retiré de ces deux textes. Signalé par la déclaration de #2028.

## Décisions prises

- Le test vérifie désormais l'état voulu par `D-499` : `D-468` nomme toujours
  le lecteur Copilot (trace, usage manuel possible) ; `wn-merge` et la règle
  §1.6 nomment `D-499` et `wn-revue-pr-agent.mjs`, et ne contiennent plus la
  demande `--add-reviewer @copilot`.
- Le lecteur `scripts/wn-revue-copilot.mjs` et ses autres tests restent en
  place : `D-499` ne l'a pas retiré.

## Fichiers modifiés

- `scripts/wn-revue-copilot.test.mjs` (un test réécrit).
- ce handoff.

## Validations exécutées

- `node --test scripts/wn-revue-copilot.test.mjs` : 10 passés, 0 échec (1 échec avant).
- `cd web && npm run bancs-outillage-check` : 834 passés, 0 échec (833 et 1 échec avant).

## Problèmes ouverts

- Ce banc n'est pas joué au CI (il fait partie de T1 complet local) : la casse
  de `D-499` n'a donc été vue qu'en local, par une file. Ajouter
  `bancs-outillage-check` au CI est hors de ce lot.

## Prochaine action exacte

Merge par l'intégrateur après CI vert et revue exigée (PR-Agent → 0, sinon `wn-reviewer`).

## Interdits encore actifs

Aucune migration ; pas de modification du lecteur `wn-revue-copilot.mjs` ;
copie principale à remettre détachée sur `origin/main` après le merge.
