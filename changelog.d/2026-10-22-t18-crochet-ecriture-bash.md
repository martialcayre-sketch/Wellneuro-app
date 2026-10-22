### Outillage : le crochet d'écriture juge aussi les écritures Bash (t18)

- **`protect-wellneuro-files.mjs` armé sur `Bash`** en plus d'`Edit|Write` :
  une commande qui écrit un fichier protégé reçoit le même verdict que par
  Edit/Write — refus (secrets, infrastructure), demande (Prisma, fichiers
  cliniques nommés, toute table signée par son marqueur, sur disque ou posé
  par un heredoc). Le classement passe par une seule fonction `juger()`.
- **`cibles-ecriture-bash.mjs`**, module pur : redirections, `tee`, `sed -i`,
  `perl -i`, destination de `cp`/`mv`/`install`/`ln`/`rsync`, `truncate`,
  `dd of=`, `git checkout -- f`, `git restore f` ; `cd` successifs, `git -C`,
  globs et `$(…)` compris.
- **Arbitrages du responsable du 2026-10-22** : même verdict qu'Edit/Write ;
  un interpréteur qui cite un fichier protégé reçoit « demande » ; script
  opaque, chemin par variable, `xargs`, `find -exec`, `git apply` et
  suppressions restent en silence, documenté dans `hooks-garde-fous.md` et
  épinglé au banc `protect-wellneuro-files-bash.test.mjs`.
- Outillage seul : ni règle clinique, ni migration, ni D-xxx.
