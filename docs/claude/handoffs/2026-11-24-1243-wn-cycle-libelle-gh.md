# Handoff — 2026-11-24 — wn-cycle : « nom de branche non interrogeable » au lieu d'un faux « gh indisponible »

## Branche et état du dépôt

- Branche `claude/clever-mayer-aht56l` (branche de la session cloud), égale à `origin/main@53d01c8d` au départ, un commit du lot par-dessus.
- Lot `wn-cycle-libelle-gh` de la file D, pris par la passe de l'orchestrateur cloud (journal `20261124-1236-orch`, intention `wn-cycle-libelle-gh--v1`), `lieu: cloud`, `risque: P2`.
- La passe ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454, D-546).

## Objectif

Sur une branche au nom hors alphabet sûr, `scripts/wn-cycle.mjs` rendait « gh indisponible » alors que GitHub n'avait pas été interrogé (P3 laissé de la revue de #2287). Dire « nom de branche non interrogeable », comme `nettoyage-branches.sh`, sans jamais envoyer ce nom à GitHub.

## Décisions prises

- `collecterFaits` juge `brancheSure(branche)` avant toute lecture : faux ⇒ `brancheInterrogeable: false`, aucun appel `gh`, `ghDisponible` laissé vrai (rien n'a échoué).
- `rendre` : la ligne PR dit « inconnue (nom de branche non interrogeable — verdict partiel) » quand `brancheInterrogeable === false`, avant le cas « gh indisponible ». Champ absent ⇒ comportement d'avant.
- `diagnostiquer` inchangé : le verdict de phase ne lisait pas `ghDisponible`, il ne lit pas le nouveau champ.
- Prettier n'est pas appliqué : les deux fichiers échouaient déjà `prettier --check` sur `origin/main` ; reformater sortirait du périmètre.

## Fichiers modifiés

- `scripts/wn-cycle.mjs` (collecte, rendu, JSDoc de `faits`).
- `scripts/wn-cycle.test.mjs` (un banc : ligne PR « non interrogeable », jamais « gh indisponible » ni « aucune »).
- `changelog.d/2026-11-24-wn-cycle-libelle-gh.md`, ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans `web/` (clone frais).
- `node --test scripts/wn-cycle.test.mjs` : 51 tests, vert.
- T1 `npm run check:rapide` : vert (18 étapes, 2 sautées). T1 complet `npm run check` : voir la PR.
- Ni T2 ni T3 : la passe cloud joue T1 seul (`ORCHESTRATEUR_PASSE.md` §4).

## Problèmes ouverts

- Aucun dans le périmètre. `--local` reste prioritaire sur le nouveau libellé (l'état PR y est « non vérifié »).

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>`), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par commentaire ; puis « prête @<sha> » et ligne `prete` à l'`integrateur`.

## Interdits encore actifs

- Aucun autre script, aucun autre comportement de `wn-cycle`.
- Jamais de merge, de release-db ni de T2/T3 par la passe cloud ; production ni lue ni écrite.
