### Coordination des sessions : carnet de lots (D-510, 2026-11-13)

- **Un carnet de lots que les sessions lisent elles-mêmes** : la collection
  `lots` de la page privée de suivi de la file D, à côté de la liste commune
  de questions et du registre des messages. Une ligne par lot, dans l'un de
  quatre états : `pret`, `pris`, `bloque`, `fait`. L'ordre reproduit le plan
  (rang, hiérarchie, ordre de la fiche).
- Une session sans lot désigné prend le lot `pret` suivant de sa file. La
  prise est conditionnée à la version lue, si bien que deux sessions ne
  tiennent jamais le même lot. Un lot `pris` sans nouvelles depuis quatre
  heures se voit, et une session de la même file le reprend si la session
  qui le tenait n'est plus joignable.
- Un lot qui bute se range `bloque` avec son motif, et la session prend le
  suivant. Ses questions s'accumulent pour la séance. Amende `D-466` §3.
- Après « prête », en l'absence du responsable, la session enchaîne le lot
  suivant après son handoff, sans `/clear`. Amende `D-373` §1 et « Un lot =
  une session ». Un lot gardé (migration, authentification) se suit
  toujours jusqu'au constat, et une migration ne passe à `fait` qu'au
  constat de sa release-db.
- Le carnet ordonne, il n'autorise rien : portes, migration, release-db,
  signatures et données restent à leur file et au responsable.
- Consigne : `docs/ROLES_MACHINES.md` ; pointeurs dans `REGLES_PR_MERGE.md`,
  le skill `wn-merge` (étape 9) et `CLAUDE.md` (Début de session).
