# Handoff — 2026-11-14 — Release-db sans approbation : lot de gardes (D-520 §8)

## Branche et état Git

- Branche `chore/release-db-sans-approbation-2`, créée sur `origin/main` (80130dd0, merge de #2115). Elle a
  avancé une fois par `--ff-only` (5efcdb9a), sans fichier du lot. Worktree `.claude/worktrees/orch-ci`.
- Le lot reste indexé, sans commit, jusqu'au push (D-518 §1).
- Session concurrente « Orchestration », file D : `git` et `gh` en direct. La PR touche `release-db.yml` et
  la sonde, qui sont des chemins gelés : elle attend la fin de tout run release-db. Elle se déclare « prête »,
  et l'intégrateur la merge.

## Objectif

Lot `release-db-sans-approbation-2` du carnet (ordre 16, P0) : poser les quatre gardes de D-520 §8, chacune
avec son banc, rouge puis vert. Corriger aussi les messages des crochets et écrire la période transitoire
(remarque PR-Agent de #2115).

## Décisions prises

- Arbitrage `20261114-1459-d` (borne inconnue de `resume`). Le responsable, dans cette session, a retenu
  l'option recommandée : sur un push, la release échoue ; sur un dispatch, elle continue avec un
  avertissement ; trois lectures à 10 s d'intervalle.
- Choix de conception, sans arbitrage :
  - « Appliquée » se lit par `classerRunReleaseDb` du déployeur : run vert, ou rouge après ses deux
    attestations. Un état inconnu n'atteste rien.
  - Le reliquat compare les migrations de la tête à celles du commit du dernier run attesté. Il gèle les
    chemins déclencheurs (`CHEMINS_RELEASE_DB`), mais un revert pur passe : ses chemins déclencheurs sont
    tous des suppressions de fichiers du reliquat.
  - Le constat de la seconde migration est une ligne `WN_CONSTAT_RELEASE_DB run=<id>`, posée sur la PR de
    la dernière migration ajoutée et encore présente. Elle compte si son auteur est OWNER, MEMBER ou
    COLLABORATOR, si elle est postérieure à `updated_at` du run, et si ce run de `main`, du workflow
    release-db, est attesté et contient la migration.
  - Le banc des environnements est fermé : toute forme illisible compte comme protégée. Trois jobs sont
    admis (`release-db.yml:release`, `deploiement-production.yml:observation`, `deploiement-production.yml:deploiement`).

## Fichiers modifiés

- `scripts/wn-sonde-release-db.mjs` et son banc : `lireMigrations`, `juger` réordonné, `conseilDeuxRuns`
  qui dit « annuler », `CHEMINS_GELES` augmenté de `web/package*.json`.
- `.github/workflows/release-db.yml` : le job `resume` gagne la boucle de borne, `ARRET` et l'`exit 1` final.
  `scripts/release-db-comportement.test.mjs` gagne `jouerResume`, avec `gh`, `sleep` et `git` factices.
- `scripts/workflows-environnements.test.mjs` (nouveau), inscrit dans `bancs-outillage-check` de `web/package.json`.
- `.claude/hooks/protect-wellneuro-files.mjs` et son banc ; `.claude/hooks/guard-supabase-mcp.mjs` et son
  banc, nouveau.
- `.claude/rules/db-prisma.md`, `.claude/rules/pr-revue-et-release-db.md` (§3, étape 6 et piège 2),
  `docs/RUNBOOK.md` (étape 4), `docs/claude/WORKFLOW_DEVELOPPEMENT.md`.
- `changelog.d/2026-11-14-release-db-gardes-d520.md` ; ce handoff.
- Hors dépôt : ligne `release-db-sans-approbation-2` du carnet passée à `pris` ; message `merge_fait` de
  #2115 traité ; question `20261114-1459-d` créée, puis passée à `repondue`.

## Validations exécutées

- Rouge d'abord, banc par banc :
  - sonde : 12 rouges, puis 37 verts, puis 39 après les correctifs de revue ;
  - `resume` : 4 rouges, avec deux témoins verts ;
  - environnements : rouge sur un workflow intrus réel (`environment: { name: Release-DB }`), retiré ensuite ;
  - crochet de fichiers : 3 rouges.
- Verts : sonde et déployeur (105) ; release-db comportement, invariants et scripts (76) ; environnements (5) ;
  tous les crochets (444).
- Sonde jouée sur le dépôt réel, sans PR : `code=0`, aucun reliquat. Le chemin du constat, joué en lecture
  seule, trouve #2080 sans marqueur (voir les problèmes ouverts).
- T1 rapide : code 0, 18 étapes. T1 complet : code 0 sur la première version indexée, puis rejoué après
  les correctifs.
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`, diff indexé) : conforme, trois constats, tous
  corrigés.
  - P1 : formes en flux et échappements dans le banc des environnements.
  - P1 : le run du constat doit porter la migration, et pas seulement en descendre.
  - P2 : une lecture impossible du run cité rend 2.
- `wn-reviewer` sur le diff indexé : NO-GO sur B1, un revert partiel du reliquat passait. B1 est corrigé :
  tous les fichiers de tout le reliquat doivent être retirés. Les non-bloquants N2, N3 et N5 sont corrigés,
  avec `workflow_call` refusé. N4 est écarté avec motif : la lettre du §8 ne gèle les chemins déclencheurs
  que pour « non appliquée ». N6 est routé (problèmes ouverts) et N7 est l'amorçage. Les bancs des correctifs
  rougissent contre la version indexée d'avant : 23, 29 et 30 ; banc des environnements, n° 4.
  La revue de l'écart est consignée sur la PR.

## Problèmes ouverts

- **Amorçage du constat.** La dernière migration de `main` (`20261113180000_d515_designation_suicide_assignation_v1`,
  PR #2080) ne porte pas de ligne `WN_CONSTAT_RELEASE_DB`. La prochaine PR qui ajoute une migration sera
  donc gelée. Il faut d'abord lire `_prisma_migrations` par conteneur, puis poster sur #2080 la ligne
  `WN_CONSTAT_RELEASE_DB run=<id du run vert qui l'a appliquée>`. Ce geste revient à la file de cette
  prochaine migration.
- Le geste du §6 (retirer `required_reviewers` de l'environnement `release-db`) vient après le merge de ce
  lot, sur un accord daté du responsable. Il se constate par
  `gh api repos/{owner}/{repo}/environments/release-db --jq '.protection_rules'`. Au premier run qui suit,
  constater que le minuteur seul met le run en `waiting` et que la sonde y lit la phase 1.
- **Deux PR de migration sondées avant le merge de l'une ou de l'autre** rendent toutes deux 0 (N6 de
  `wn-reviewer`). C'est du check-then-act, qui existait avant ce lot. « Un merge à la fois » repose donc sur
  l'intégrateur : il doit relancer la sonde juste avant `gh pr merge`, comme le fait déjà l'étape 7 ter de
  `wn-merge`. Si l'on veut un verrou, il faut un lot dédié (file D).
- L'étape `resume` garde son nom « Résumé pour l'approbateur », et la ligne « part avec cette approbation »
  reste, parce que des bancs les vérifient. Le libellé peut se reprendre dans un lot de forme.
- D-520 §3 et §3 bis disent encore « la sonde ne le voit pas encore » : c'est l'état à sa date, et une
  décision acceptée ne se réécrit pas.

## Prochaine action exacte

1. T1 complet, commit, push, PR (`--body-file`). Déposer l'avis Codex sur la PR et y écrire les verdicts,
   ainsi que le GO de `wn-reviewer`. Lancer `node scripts/wn-attendre-ci.mjs <N>` en fond, puis
   `node scripts/wn-revue-pr-agent.mjs <N>`.
2. Poser `pr` sur la ligne du carnet et relire la boîte D. Déclarer ensuite « prête @<sha> » : une ligne
   `prete` à l'intégrateur et un commentaire de PR qui nomme l'amorçage du constat et le geste du §6.

## Interdits encore actifs

- Ne pas retirer les `required_reviewers` avant le merge de ce lot, ni sans accord daté.
- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ni approbation ni déclenchement de release-db par cette session.
- Si un commit propre est dépassé par `main`, l'arbitrage revient au responsable (D-518 §2).
