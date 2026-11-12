### Coordination des sessions : registre des messages entre agents (D-503, 2026-11-12)

- **Un message entre sessions s'écrit dans un registre** : la collection
  `messages` de la page privée de suivi de la file D, à côté de la liste
  commune de questions. Une ligne par message, adressée à une boîte (une
  file, le guichet, l'intégrateur), avec un accusé `emis` / `lu` / `traite`
  et ses horodatages.
- Chaque session lit sa boîte au démarrage et avant de déclarer « prête ».
  La file qui déclare écrit `prete` à l'intégrateur ; l'intégrateur écrit
  `merge_fait` à chaque merge et relance à chaque tour toute ligne non
  accusée.
- `SendMessage` n'est plus qu'une sonnette. Une ligne n'autorise rien ; le
  commentaire de la PR fait foi. Amende `D-499` §5.
- Consigne : `docs/ROLES_MACHINES.md` ; pointeurs dans `REGLES_PR_MERGE.md`,
  le skill `wn-merge` (étape 9) et `CLAUDE.md` (Début de session).
