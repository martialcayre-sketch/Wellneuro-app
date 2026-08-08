### Fusion de wn-auto dans /wn, et clé `paths:` des rules confirmée

- Le skill `wn-auto` (reprise automatique) est supprimé : `/wn` sans argument
  reprend sa fonction — priorité au lot de campagne actif, puis à la
  « prochaine action » du SESSION_LOG, puis aux roadmaps ; toujours en lecture
  seule au premier passage. Une couche de sélection de moins.
- Question ouverte du journal tranchée par observation : la clé `paths:` des
  fichiers `.claude/rules/` **est honorée** — la lecture de
  `web/prisma/schema.prisma`, d'un fichier de `clinical/` et de `auth.ts` a
  injecté à chaque fois la règle du chemin lu, et elle seule
  (`db-prisma`, `clinique-scoring`, `auth-securite`). Aucun changement requis.
