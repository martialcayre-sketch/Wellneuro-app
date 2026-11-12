# Handoff — 2026-11-12 — D-490 : filtre « exclus » dans les trois onglets de l'atelier corpus

## Branche et état Git

- Branche `feat/d490-filtre-exclus-trois-onglets`, créée sur `origin/main` 9a680203 (merge de #2032, lot 1),
  dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot 2 des suites des sept questions du 2026-11-12 : Q2 de `D-490` (`20261112-1241-b`, « étendre »). Le filtre
« Exclus de la recherche seulement » vaut dans les trois onglets (en attente, validés, rejetés).

## Décisions prises

- Préalable : `20261112-1240-b` était déjà `close` (pr 2032, `merge_le` 16:56:58Z, posé par l'intégrateur) ;
  rien à écrire.
- Route : `exclu=1` accepté pour les trois statuts ; une autre valeur reste `400 exclu_invalide`. Le service
  `listerClaimsRevue` combinait déjà statut et exclusion : non modifié.
- Changement d'onglet (choix d'interface) : le filtre est **gardé**. La case est visible dans les trois onglets,
  l'état reste donc lisible, et on suit un claim exclu remis en attente ou rejeté. Une recherche par identifiant le
  remet toujours à zéro.
- Message vide propre à chaque onglet filtré.
- `D-490` §4 point 2 : précision datée qui lève la restriction à `VALIDE` (pas de nouvelle décision).

## Fichiers modifiés

- `web/src/app/api/praticien/corpus/claims/route.ts` et `route.test.ts`.
- `web/src/components/corpus/AtelierCorpusPanel.tsx` et `AtelierCorpusPanel.test.tsx`.
- `docs/decisions/D-490.md` ; `changelog.d/2026-11-12-d490-filtre-exclus-trois-onglets.md` ; ce handoff.

## Validations exécutées

- Vitest ciblé (route et panneau) : 46 verts.
- T1 (`check:rapide`, puis `npm run check`) vert.
- T2 (`test:worktree -- --fast`) rouge deux fois à l'étape Vitest, donc build et E2E non joués localement. Les
  échecs sont hors du lot : `ProtocolMiniBuilder`, `MobileBottomNav` et `masquage`, soit des délais de 5 s dépassés
  et deux seuils de performance. La machine était à une charge de ~30, avec d'autres sessions qui lançaient
  vitest. Rejoués seuls, ces quatre fichiers sont verts (282 tests). Le CI `verify` fait foi, E2E compris.
- Branche rebasée sur `origin/main` 632c0244 (arbitrage du responsable), sans fichier en commun.

## Problèmes ouverts

- Préexistant, non traité : si le praticien coche le filtre APRÈS une recherche par identifiant, le renvoi
  « Il est dans l'onglet … » (`statutsDuClaim`) ignore la marque et peut désigner l'onglet ouvert. Cette limite
  existait déjà dans l'onglet Validés ; elle vaut désormais dans les trois.

## Prochaine action exacte

1. CI de la tête, revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer`.
2. Déclarer « prête @<sha> » ; l'intégrateur merge.
3. À la fusion : `20261112-1241-b` en `close` dans la liste commune (page file D, `pr`, `merge_le`).
4. Lot 3 (banc contextuel identifiant–rubrique) : #2032 est mergée, il peut partir.

## Interdits encore actifs

- Aucune migration, aucune écriture en base ; ni marquage ni rétablissement d'exclusion.
- Aucune rubrique, aucun texte de claim ni dose au dépôt (`D-251` §4, `D-325` §5).
- Pas de `prisma format`.
