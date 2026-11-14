# Handoff — 2026-11-14 — Release-db sans approbation humaine (D-520)

## Branche et état Git

- Branche `chore/release-db-sans-approbation-1`, créée sur `origin/main` (3f7f5d0f) dans le worktree
  `.claude/worktrees/orch-ci`. #2110 (orchestration-8) était mergée (3525c671).
- Le lot reste indexé, sans commit, jusqu'au push (D-518 §1).
- Session concurrente « Orchestration », file D : `git` et `gh` en direct. La PR est une PR de doc, sans
  migration. Elle se déclare « prête » et l'intégrateur la merge.

## Objectif

Lot `release-db-sans-approbation-1` du carnet (ordre 15, P0). Écrire la D-xxx qui amende D-087, avec ce qui
remplace le regard humain, puis mettre en cohérence les règles, la doc et les commentaires de `release-db.yml`.

## Décisions prises

- **D-520**, réservée par `wn-reserver-decision` (`refs/tags/reserve/D-520`).
- Arbitrage `20261114-1340-d` (heure) : « Aucune plage », réponse du responsable dans cette session, contre
  l'option recommandée. La panne d'une table servie est acceptée à toute heure.
- Choix de rédaction, sans arbitrage :
  - le minuteur de 5 min et la restriction à `main` restent, seuls les relecteurs requis se retirent ;
  - Codex indisponible ⇒ pas de merge de migration ;
  - les PR qui touchent `release-db.yml`, ce que son run exécute ou un job `environment: release-db`
    passent P0 (`POLITIQUE_REVUE.md`) ;
  - la sonde et D-374 restent inchangées (la phase 1 se réduit au minuteur).
- L'arbitrage du 2026-11-13, « classifieur pour les migrations additives » (lot `orchestration-6`), est
  remplacé.

## Fichiers modifiés

- `docs/decisions/D-520.md` (nouveau).
- `CLAUDE.md` (règle « Base de production ») ; `.claude/rules/db-prisma.md` ;
  `.claude/rules/pr-revue-et-release-db.md` §3, §4, piège 2 et fin du §5.
- `docs/claude/REGLES_PR_MERGE.md` (exception migration) ; `docs/claude/POLITIQUE_REVUE.md` (P0).
- `.github/workflows/release-db.yml` : commentaires et echo du résumé (« Ce qui part »), sans logique.
- `docs/DEPLOIEMENT_RELEASE_DB.md` (encart d'amendement) ; `docs/RUNBOOK.md` ;
  `docs/claude/WORKFLOW_DEVELOPPEMENT.md` ; `docs/claude/PLAN_WELLNEURO.md` §5.
- `changelog.d/2026-11-14-release-db-sans-approbation.md` ; ce handoff.
- Hors dépôt : ligne du carnet passée à `pris`, question `20261114-1340-d` créée puis passée à `repondue`.

## Validations exécutées

- T1 complet (`npm --prefix web run check`) : code 0. Il a fallu d'abord `prisma generate`, le client du
  worktree était périmé.
- Bancs `release-db-invariants`, `release-db-comportement`, `release-db-scripts` et `wn-sonde-release-db` :
  94 tests, code 0.
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`, sur le diff indexé) : deux constats P2, corrigés.
  Le premier : la phase 1 dure jusqu'à l'approbation tant que les relecteurs restent. Le second :
  l'exception `GITHUB_TOKEN` de `resume`.
- `wn-reviewer` sur le diff indexé : NO-GO, sur deux bloquants. B1 : une migration non appliquée part au push
  déclencheur suivant, d'où le §3 bis. B2 : « rejeter » devient « annuler ». Sept non bloquants, corrigés ou
  routés au §8 (lot de gardes). La revue de l'écart est consignée sur la PR.

## Problèmes ouverts

- **Lot `release-db-sans-approbation-2`** (D-520 §8), à inscrire au carnet, file D, P0. Il porte quatre
  gardes : la sonde (gel sur migration non appliquée, seconde migration avant constat), `resume` qui échoue
  sur un diff en échec et tranche la borne inconnue, un banc des environnements sur tous les workflows, et
  `web/package*.json` dans les `CHEMINS_GELES`. Il corrige aussi les messages des crochets. Le geste du §6
  vient **après** ce lot.
- Le geste du §6 : retirer la règle `required_reviewers` de l'environnement `release-db`. Il revient au
  responsable, ou à l'intégrateur sur son accord daté, et se constate à l'API.
- `deploy-production` porte un `SCALINGO_API_TOKEN` sous sa seule politique de branche. Ce n'est pas neuf,
  mais c'est désormais nommé (§7).
- Les commentaires des bancs `scripts/release-db-*.test.mjs` parlent encore d'« approbation ». Leurs
  chaînes vérifiées (« part avec cette approbation », « Ne pas approuver… ») sont gardées telles quelles.
- `docs/ai/POLICY.md` et `docs/ai/RISK_MATRIX.yaml` exigent toujours une « approbation humaine » pour un
  déploiement en production. Ils étaient déjà en retard sur D-248 et ne sont pas touchés.
- Les en-têtes de `web/scripts/*.sh` et des migrations ne sont pas touchés : historique, ou chemin de
  release.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`). Déposer l'avis Codex sur la PR et y écrire les verdicts. Lancer
   `node scripts/wn-attendre-ci.mjs <N>` en fond, puis `node scripts/wn-revue-pr-agent.mjs <N>`.
2. Poser `pr` sur la ligne du carnet et relire la boîte D. Déclarer ensuite « prête @<sha> » : une ligne
   `prete` à l'intégrateur et un commentaire de PR qui nomme le geste du §6.
3. Après le merge, le geste du §6 se fait sur un accord daté. Mettre à jour les mémoires
   `delegation-approbation-release-db` et `orchestration-arbitrages-2026-11-13`.

## Interdits encore actifs

- Ne pas retirer les `required_reviewers` avant le merge de D-520, ni sans accord daté.
- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ni approbation ni déclenchement de release-db par cette session.
- Si un commit propre est dépassé par `main`, l'arbitrage revient au responsable (D-518 §2).
