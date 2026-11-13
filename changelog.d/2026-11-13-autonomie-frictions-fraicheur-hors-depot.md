### Autonomie des sessions, frictions (1) : le garde de fraîcheur laisse libres le bloc-notes et la mémoire ; `gate-codex-p0` renvoie à `wn-codex-avis.mjs` (2026-11-13)

- `git-freshness.mjs` ne juge plus une écriture dont la cible n'est dans aucun
  dépôt Git, comme le bloc-notes de la session ou la mémoire. Ces cibles ne
  déclenchent plus ni refus, ni fetch, ni marqueur ; le journal les consigne
  avec le motif `hors-depot`.
  - Seul le « not a git repository » explicite de Git exempte, sans aucune
    variable `GIT_*` héritée. Un délai dépassé, un Git absent ou toute autre
    erreur laissent le garde juger.
  - Jamais d'exemption :
    - sous la racine du worktree courant ou sous la copie principale, même
      avec un pointeur `.git` cassé ;
    - à travers un lien symbolique : un lien est jugé sur sa destination, et
      un lien qui ne se résout pas n'exempte rien.
  - Un autre dépôt et un autre worktree restent gardés.
  - Durcissements venus de la contre-revue Codex D-505 (environnement Git
    hérité) et de `wn-reviewer` (liens, pointeur cassé, délai prouvé).
  - Du 2026-10-27 au 2026-11-12, le journal avait compté 359 refus sur des
    cibles externes, sur un total de 625 refus pour retard.
- `gate-codex-p0.mjs` : la demande de confirmation d'une passe Codex P0 ne
  renvoie plus au bloc `$wellneuro-pr-review`. Elle renvoie à la commande
  fermée de D-505 (`node scripts/wn-codex-avis.mjs --mode revue`).
- Bancs : cinq cas de fraîcheur ajoutés :
  - cible hors dépôt libre sans fetch, les quatre outils ;
  - autre dépôt et autre worktree refusés ;
  - environnement Git hérité sans effet ;
  - Git qui pend coupé en 2 s ;
  - liens symboliques et pointeur `.git` cassé refusés.
  Le message de `gate-codex-p0` est épinglé.
