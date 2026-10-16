# Handoff — 2026-10-16 — D-281 §5, t25 : avis « impliqué, élément non identifiable », PR 2 (code consommateur)

## Branche et état Git

- Branche `feat/d281-avis-implique-non-identifiable-code`, depuis `origin/main`
  9431d350 (#1500, la migration), worktree `d281-lot3-portail` (session
  concurrente, cycle en git/gh direct).
- Poussée seulement après la `release-db` de #1500 constatée par conteneur.

## Objectif

Plan §8, fiche t25 : le praticien peut rendre « impliqué » sans élément, avec un
aménagement, quand le programme visé ne se lit pas (arbitrages du responsable
du 2026-10-16, D-281 §5 amendée par #1500).

## Décisions prises

- Une seule règle, `avisSansElementOuvert` (`web/src/lib/trust/verdictEffetIndesirable.ts`) :
  rattachement ≠ élément, `protocolDraftId` non nul, éléments illisibles
  (`null`). Route du verdict et écran (champ `avisSansElement` de la route
  GET) lisent la même entrée (`elementsDesProgrammesVises`). Programme
  lisible même vide, élément désigné, signalement délié : exclus ; les refus
  du trigger de #1500 ne sont pas atteignables par la route.
- `elementsEnPause` : « impliqué » sans élément maintient la pause de tous les
  compléments, texte « avis rendu » (règle ; sans effet au portail tant que
  l'avis ne s'ouvre que sur une version illisible, que le portail ne sert pas).
- Écran : « Impliqué, élément non identifiable », légende d'aménagement
  adaptée, historique « élément non identifiable ».

## Fichiers modifiés

- `web/src/lib/trust/verdictEffetIndesirable.ts` et `.test.ts`,
  `web/src/lib/trust/pauseEffetIndesirable.ts` et `.test.ts`,
  `web/src/lib/trust/bancCasFictifsD281.test.ts` (cas 30, 31)
- `web/src/app/api/praticien/trust/route.ts` et `route.validation.test.ts`,
  `web/src/app/api/praticien/trust/verdict/route.ts` et `route.test.ts`
- `web/src/components/ValidationEffetIndesirable.tsx` et `.test.tsx`
- commentaire de `web/src/app/api/portail/trust/signalement/route.ts`
- `docs/claude/PLAN_WELLNEURO.md` (t25, dette « jamais à l'identique »),
  `changelog.d/2026-10-16-d281-avis-implique-sans-element-code.md`

## Validations exécutées

- Suites liées (trust, écran, routes) : 261 tests verts ; T1 vert.
- T2 (`--fast`) vert en 5 min 55 s sur l'état final.
- Revue `wn-reviewer` (P0) : Go conditionné à la migration constatée, aucun
  P0 ; P2 traités (changelog, légende, tests de la route GET et du
  formulaire d'avant, dette du §8) ; P2-6 corrigé ensuite : le choix de
  l'avis annonce l'explication affichée (`aria-describedby`, les deux
  paragraphes « ne se lit pas » et « aucun élément désignable »), test à
  l'appui.
- Passe Codex (P0, clinique) : geste du responsable, avant le merge.

## Problèmes ouverts

- Revue Q3, différée : programme lisible sans élément désignable
  (orientations, prises de sang seules) — l'avis sans élément n'y est pas
  ouvert, conformément à l'arbitrage « programme illisible seul ». L'étendre
  demande une décision clinique distincte, hors de cette PR.
- Retour arrière : dès qu'un avis « impliqué » sans élément existe en base,
  un code antérieur à cette PR ne maintient plus la pause qu'il commande
  (`elementsEnPause` d'avant l'ignore). Risque conditionnel — il faut, en
  plus, la règle signée (M-1) et une version visée redevenue lisible. Règle :
  correction en avant ; jamais de redéploiement d'un commit antérieur à ce
  merge une fois un tel avis enregistré (lecture par conteneur avant tout
  retour : `implique` avec `element_action_id` nul).
- Le commentaire de la migration #1500 (« aucun élément n'est mis en pause »)
  décrit l'état de fait, pas la règle ; une migration ne se réécrit pas.

## Prochaine action exacte

Migration constatée le 2026-10-16 (sentinelle `WN_RELEASE_DB_OK id=38892125593-1`, `migrate status` à jour). Pousser, PR, CI, CodeRabbit, passe
Codex, merge, déploiement constaté, t25 → fait sur la page de la file A.

## Interdits encore actifs

- Pas de merge avant la migration constatée en production.
- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Un merge à la fois ; jamais pendant l'attente d'une `release-db`.
