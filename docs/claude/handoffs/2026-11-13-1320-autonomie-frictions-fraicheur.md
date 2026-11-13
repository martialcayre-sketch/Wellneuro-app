# Handoff — 2026-11-13 — Autonomie des sessions, frictions (1) : fraîcheur hors dépôt, message de gate-codex-p0

## Branche et état Git

- Branche `chore/autonomie-frictions`, créée sur `origin/main` (f2677460) dans le worktree
  `.claude/worktrees/file-d-artefacts`.
- Session concurrente (File D) : `git` et `gh` en direct. PR déclarée « prête » ; l'intégrateur merge.
- Lot du carnet `autonomie-frictions` (D-510), ordre 20, point 5 du cadrage « autonomie des sessions ». Cette PR en
  livre une partie : le lot reste `pris`.

## Objectif

Supprimer les refus du garde de fraîcheur qui ne protègent rien : bloc-notes et mémoire, hors de tout dépôt, soit
359 des 625 refus pour retard du 2026-10-27 au 2026-11-12. Remettre à jour le message de `gate-codex-p0`, qui
renvoyait encore au skill personnel `$wellneuro-pr-review` alors que D-505 fait appeler Codex par la session.

## Décisions prises

- Aucune D-xxx. Exécution du point 5 du cadrage, lot inscrit au carnet.
- Exemption bornée : seule une cible qu'aucun dépôt Git ne contient est exemptée, sur le « not a git repository »
  explicite de Git (`LC_ALL=C`, délai de 2 s). Échec fermé : un délai dépassé ou toute autre erreur laissent le
  garde juger.
- Restent hors exemption : un autre dépôt (ex. `wellneuro-artefacts`) et un autre worktree.
- Hors de cette PR, dans le même lot :
  - la relecture adverse locale avant push ;
  - les pièges convertis en contrôles ;
  - l'avance `--ff-only` déléguée, qui demande une D-xxx ;
  - l'en-tête de `.github/workflows/pr_agent.yml`, fichier d'exception qui part dans sa propre PR.

## Fichiers modifiés

- `.claude/hooks/git-freshness.mjs`, `.claude/hooks/git-freshness.test.mjs`
- `.claude/hooks/gate-codex-p0.mjs`, `.claude/hooks/gate-codex-p0.test.mjs`
- `.claude/rules/hooks-garde-fous.md`
- `changelog.d/2026-11-13-autonomie-frictions-fraicheur-hors-depot.md` ; ce handoff.

## Validations exécutées

- `node --test .claude/hooks/git-freshness.test.mjs` : 29/29. Cinq cas neufs :
  - cible hors dépôt libre sans fetch ni marqueur, pour les quatre outils ;
  - autre dépôt et autre worktree refusés ;
  - environnement `GIT_*` hérité sans effet ;
  - Git qui pend coupé en 2 s ;
  - liens symboliques et pointeur `.git` cassé refusés.
  Rejoués contre la version b400aed1, les cas de l'environnement et des liens échouent : ils prouvent le
  durcissement.
- Contre-revue Codex (D-505, `--mode revue`, code 0) sur b400aed1 : un P2 (environnement Git hérité), corrigé.
- `wn-reviewer` sur b400aed1 : GO, six P2 :
  - environnement, `.git` cassé, liens, délai prouvé, cas non couverts, vocabulaire de la règle : corrigés ;
  - la question sur le message « hors dépôt » de `SessionStart` est écartée, car sans racine lisible rien n'est
    exempté.
- Branche remise à niveau par `git merge origin/main` (#2062, aucun fichier commun), sur arbitrage du responsable.
- `node --test .claude/hooks/gate-codex-p0.test.mjs` : 24/24, avec le message épinglé.
- `node --test .claude/hooks/*.test.mjs` : 425/425.
- Constat réel : la mémoire et le bloc-notes répondent tous deux `128` et « not a git repository ».
- `npm run check:rapide` vert, après `prisma generate` dans ce worktree neuf.
- Revue P0 (garde-fous) : `wn-reviewer` et contre-revue Codex D-505 sur la PR. Verdicts en commentaire de la PR.

## Problèmes ouverts

- Le reste du point 5 (voir les décisions) n'est pas livré : le lot `autonomie-frictions` reste `pris`.
- Un sous-agent avait contourné le garde par `python3 -I -c` pour écrire hors dépôt (lot 17). L'exemption rend ce
  contournement inutile pour le bloc-notes et la mémoire. Un autre dépôt reste gardé.

## Prochaine action exacte

1. CI de la tête ; `wn-reviewer` ; contre-revue Codex (`node scripts/wn-codex-avis.mjs --mode revue`) sur le diff
   poussé ; un verdict par constat.
2. « prête @<sha> », ligne `prete` au registre, carnet tenu.
3. Suite du lot : PR de l'en-tête de `pr_agent.yml`, puis relecture adverse locale et pièges convertis.

## Interdits encore actifs

- Aucune exemption pour une cible dans un dépôt, quel qu'il soit ; aucun pull, merge ni rebase automatique.
- Toute modification d'un crochet se relit adversarialement et repasse le banc.
- Codex seulement par `wn-codex-avis.mjs` ; aucune donnée patient ni aucun secret dans un paquet.
