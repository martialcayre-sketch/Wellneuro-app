# Handoff — 2026-10-15 — D-281 §5 : code du formulaire d'avant (PR 2 sur 2)

## Branche et état Git

- Branche `d281-formulaire-avant-code`, depuis `origin/main` (rebasée sur
  `c87cd187`, #1466), worktree `d281-lot3-portail`.
- Code consommateur seul : aucun schéma, aucune migration.

## Objectif

Consommer la migration `20261014230000_saf_ei_verdict_formulaire_avant_v1`
(#1464). Arbitrage du responsable du 2026-10-14 (D-281 §5) : un signalement
du formulaire d'avant (« oui » au programme, sans élément désigné) bloque la
diffusion jusqu'à l'avis du praticien. Rien n'est mis en pause au portail.

## Décisions prises

- Release-db de #1464 constatée avant tout code :
  - run 38649200510 vert ;
  - sentinelle `WN_RELEASE_DB_OK id=38649200510-1` ;
  - migration appliquée par one-off-9362 ;
  - `migrate status` « up to date » par one-off-4547.
- `recoitUnAvis` (module pur) : un signalement reçoit un avis s'il est
  rattaché, ou s'il porte un programme sans rattachement. Même règle que le
  trigger.
- Garde de diffusion et compteur `nonTraites` : le formulaire d'avant y
  attend comme les autres, statut ignoré.
- Route du verdict et écran d'avis : branche « Je ne sais pas » ; le praticien
  désigne l'élément en cause, ou aucun.
- Pause : `elementsEnPause` ignore un signalement sans rattachement (défense
  en profondeur), en plus du filtre de `pausesServies`.

## Fichiers modifiés

- `web/src/lib/trust/pauseEffetIndesirable.ts`, `pauseEffetIndesirableServeur.ts`,
  `verdictEffetIndesirable.ts` et leurs tests ; `bancCasFictifsD281.test.ts`
  (cas 24 à 29, cas 19 réécrit)
- `web/src/app/api/praticien/trust/route.ts`, `verdict/route.ts` et leurs tests
- `web/src/components/ValidationEffetIndesirable.tsx` et son test
- `web/src/lib/clinical/safetyEffetIndesirableV1.ts` (commentaire seul)
- `changelog.d/2026-10-15-d281-formulaire-avant-code.md`
- `docs/claude/PLAN_WELLNEURO.md` (porte 9, F66, §8)

## Validations exécutées

- T1 rapide vert ; vitest du périmètre vert (101 fichiers, 1678 tests).
- T3 complet et revue `wn-reviewer` : voir la PR.

## Problèmes ouverts

- Correctif routé à la revue CodeRabbit de #1464 : figer le patient dès
  qu'un verdict existe (l'effacement du programme le rend modifiable).
  Petite migration séparée, cas de contrat après suppression du programme,
  avant la signature.
- Fil du jour et prévol comptent encore par statut ; désignation illisible au
  dépôt à trancher ; restes de l'étape 3 (plan §8).

## Prochaine action exacte

1. CI vert, revue CodeRabbit sur la tête, merge, déploiement constaté.
2. Puis la migration du gel du patient, arbitrée par le responsable le
   2026-10-15 (« appliquer, puis migration »).

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 et ses préalables.
- Aucune migration sans demande explicite ; production en lecture seule par
  conteneur ; aucune identité réelle au dépôt.
