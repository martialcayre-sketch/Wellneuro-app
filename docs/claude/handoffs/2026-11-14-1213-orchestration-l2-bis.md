# Handoff — 2026-11-14 — Orchestration (8) : L2 bis, suite de la revue de #2100

## Branche et état Git

- Branche `chore/orchestration-l2-bis`, créée sur `origin/main` (b5ac3bac) dans le worktree
  `.claude/worktrees/orch-ci`. #2100 (L2) a été mergée à 10:11 UTC (762269ca).
- Le lot reste indexé, sans commit, jusqu'au push (D-518 §1). `main` n'a pas avancé pendant le lot.
- Session concurrente « Orchestration », file D : `git` et `gh` en direct. La PR se déclare « prête » ; l'intégrateur
  merge.

## Objectif

Lot `orchestration-8` du carnet : corriger les neuf constats non bloquants de la revue `wn-reviewer` sur la tête de
#2100. Ils sont listés au commentaire de verdicts de #2100.

## Décisions prises

- Aucune D-xxx et aucun arbitrage. Les choix laissés ouverts par la revue ont été tranchés ainsi :
  - 7, forks : l'anomalie d'origine est réservée aux PR qu'un registre nomme (ligne `prete`, carnet) ou qu'une
    déclaration vise. Une PR de fork sans porteur ne l'est plus. La déclaration d'un tiers reste toujours une anomalie.
  - 9, tolérance : 10 min (`TOLERANCE_DECLARATION_MS`). Une ligne `prete` traitée couvre la déclaration si elle la
    précède de dix minutes au plus et si elle n'a pas été traitée avant elle (`traite_le` ≥ `cree_le`).
  - 5, tête de la revue : `wn-revue-pr-agent.lire` rend `tete` en plus, sans changer son code. L'instantané la garde,
    et le superviseur exige `tete === pr.tete`.
  - 2 : un nouveau type d'action, `chevauchement_non_etabli`.

## Fichiers modifiés

- `scripts/lib/superviseur.mjs` : constats 1, 2, 3, 5, 7, 8 et 9.
- `scripts/wn-instantane-github.mjs` : 4 (`plusRecent`), 5 (tête de la garde) et 6 (`sortieEstUnLien`,
  `ecrireSansSuivre` en `O_NOFOLLOW`).
- `scripts/wn-revue-pr-agent.mjs` : `tete` dans le retour de `lire`.
- Bancs : `scripts/wn-superviseur.test.mjs`, `scripts/wn-instantane-github.test.mjs`. Dans le cas d, `traite_le` a
  été recalé pour que la ligne soit traitée AVANT la déclaration neuve, comme le titre du cas le dit.
- `docs/ROLES_MACHINES.md`, section « Le superviseur rejoué ».
- `changelog.d/2026-11-14-orchestration-superviseur-l2-bis.md` ; ce handoff.
- Hors dépôt : la ligne `orchestration-8` du carnet est passée à `pris`.

## Validations exécutées

- Bancs superviseur, instantané, revue PR-Agent et registres : 96 tests, code 0.
- T1 complet (`npm --prefix web run check`) : code 0.
- T2 non joué : ni UI ni API touchées.

## Problèmes ouverts

- Toujours ouverts depuis L2 :
  - l'identité n'est pas jugée ;
  - les contextes requis de la protection de branche ne sont pas lus ;
  - les conflits de fusion ne sont pas lus non plus ;
  - la sortie est longue (le tri relève de L5a).
- Questions 2355-d (forme du cockpit) et 2356-d (routine cloud) en attente du responsable.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`), puis `node scripts/wn-attendre-ci.mjs <N>` en fond et
   `node scripts/wn-revue-pr-agent.mjs <N>`. Si elle rend autre chose que 0, `wn-reviewer` sur la tête. Un verdict
   écrit pour chaque remarque.
2. Poser `pr` sur la ligne `orchestration-8`, relire la boîte, puis déclarer « prête @<sha> » : ligne `prete` à
   l'intégrateur et commentaire de PR.
3. Lot suivant de la file D au carnet.

## Interdits encore actifs

- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ni approbation ni déclenchement de release-db.
- Aucune adresse de page de suivi ni texte de registre dans le dépôt.
- Si un commit propre est dépassé par `main`, c'est au responsable d'arbitrer (D-518 §2).
