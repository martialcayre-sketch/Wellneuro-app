# Handoff — 2026-11-13 — Autonomie des sessions, frictions (2) : en-tête de `pr_agent.yml`

## Branche et état Git

- Branche `chore/pr-agent-entete`, créée sur `origin/main` (24d8641d, après le merge de #2064) dans le worktree
  `.claude/worktrees/file-d-artefacts`.
- Lot du carnet `autonomie-frictions` (D-510), ordre 20, partie 2. Le lot reste `pris`.
- `pr_agent.yml` est un fichier d'exception (D-393 §6, D-373 §3) : PR à part, que la file suit jusqu'au constat.

## Objectif

L'en-tête de `.github/workflows/pr_agent.yml` renvoyait une PR de clôture seule à CodeRabbit « demandé à la main »,
contraire à D-499 §2 (relevé par `wn-reviewer` sur #2057). L'aligner sur D-499, sans toucher au comportement.

## Décisions prises

- Aucune D-xxx : D-499 a tranché ; la PR remet le commentaire d'accord.
- Commentaires seulement : aucun réglage, déclencheur, permission ni image modifié.

## Fichiers modifiés

- `.github/workflows/pr_agent.yml` (en-tête et commentaire du plafond de contexte)
- `changelog.d/2026-11-13-autonomie-frictions-entete-pr-agent.md` ; ce handoff.

## Validations exécutées

- YAML relu par un analyseur (`YAML.load_file`) : valide.
- Aucun banc ne lit l'en-tête (`wn-revue-pr-agent.mjs` ne lit que le nom du workflow).
- Revue P1 (D-393 §6) : `wn-reviewer`, mission « la PR affaiblit-elle la revue ? » ; verdict en commentaire de la
  PR.

## Problèmes ouverts

- Reste du lot : relecture adverse locale avant push, pièges convertis en contrôles, question à la liste commune sur
  l'avance `--ff-only` déléguée.

## Prochaine action exacte

1. CI de la tête, `wn-reviewer` sur le diff ; un verdict par constat.
2. La file suit sa PR (fichier d'exception) : merge par la file après revue, puis constat sur `main`.
3. Suite du lot : relecture adverse locale avant push, puis pièges convertis.

## Interdits encore actifs

- Aucun affaiblissement de la revue par `pr_agent.yml` ; aucun pull, merge ni rebase automatique.
- Codex seulement par `wn-codex-avis.mjs` ; aucune donnée patient ni aucun secret dans un paquet.
