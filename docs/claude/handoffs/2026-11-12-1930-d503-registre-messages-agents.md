# Handoff — 2026-11-12 — D-503 : registre des messages entre agents

## Branche et état Git

- Branche `docs/d503-registre-messages`, créée sur `origin/main` 36f3bee2 (#2036), dans le worktree
  `.claude/worktrees/autonomie-registre-messages`.
- Session concurrente : `git` et `gh` en direct, pas de `/wn-*`. PR déclarée « prête » ; l'intégrateur merge.

## Objectif

Point 3 du cadrage « autonomie des sessions » (go du responsable du 2026-11-12) : un registre unique des messages
entre agents, pour qu'aucun message ne soit oublié. Aucune règle ni contrainte nouvelle pour le responsable ; ni
clinique, ni migration, ni schéma.

## Décisions prises

- `D-503` réservée (`wn-reserver-decision.mjs` → D-503) et rédigée : elle amende `D-499` §5 (le message direct
  devient la sonnette d'une ligne `merge_fait` ; une ligne sans session joignable attend la session suivante de sa
  boîte, l'intégrateur la relance sans l'attendre).
- Adressage par **boîte** (file A, A bis, B, C, D, `guichet`, `integrateur`, ou nom du lot hors file), pas par
  session : le message survit au `/clear`.
- Ajout d'un objet `prete` (file → intégrateur) : le commentaire « prête » ne nomme pas la file, et l'intégrateur a
  besoin de savoir à quelle boîte adresser `merge_fait`. Le commentaire reste ce qui fait foi.
- Pointeur d'une ligne dans `CLAUDE.md` (Début de session) : sans lui, une session neuve ne lit pas sa boîte.
- La collection `messages` vit dans la page de suivi de la file D (adresse et schéma dans la mémoire
  `suivi-file-d-artefact`) ; page republiée en v6 avec une section « Messages » en lecture seule.

## Fichiers modifiés

- `docs/decisions/D-503.md` (nouveau).
- `docs/ROLES_MACHINES.md` : sous-section « Le registre des messages entre agents (`D-503`) ».
- `docs/claude/REGLES_PR_MERGE.md` (phrase de `D-499` §5) ; `.claude/skills/wn-merge/SKILL.md` (étape 9) ;
  `CLAUDE.md` (Début de session).
- `changelog.d/2026-11-12-d503-registre-messages-agents.md` ;
  `docs/claude/plan-journal/H89/2026-11-12-02-registre-des-messages.md` ; ce handoff.
- Hors dépôt : page de suivi de la file D (v6) ; mémoire `suivi-file-d-artefact.md` et son index.

## Validations exécutées

- T1 (`check:rapide`) vert ; `npm run check` avant commit. Diff de documentation seule : ni T2 ni T3.
- Page : syntaxe du script vérifiée (`new Function`) avant publication.

## Problèmes ouverts

- L'intégrateur en cours ne connaît pas encore le registre : il l'apprendra par `CLAUDE.md` à sa prochaine session.
  Pour cette PR, la ligne `prete` est écrite et la sonnette envoyée.
- Le compteur « non lus par boîte » de la page s'appuie sur le champ `a` ; une boîte mal orthographiée crée une
  boîte à part (aucune liste fermée côté base).

## Prochaine action exacte

1. CI de la tête, revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer`.
2. Ligne `prete` au registre (boîte émettrice : `autonomie des sessions`), puis commentaire « prête @<sha> ».
3. Lot suivant à rappeler au responsable : Codex appelé par la session (question `20261112-1702-g`).

## Interdits encore actifs

- Pas d'automatisme qui lise ou écrive le registre sans session (hors périmètre de `D-503`).
- Un message n'autorise rien ; aucune réponse clinique ou de migration ne vaut par une ligne du registre.
- Ni migration, ni schéma, ni clinique dans ce lot.
