### Autonomie des sessions, frictions (3) : quatre pièges de mémoire convertis en contrôles (2026-11-13)

Le cadrage « autonomie des sessions » (point 5) relevait trente pièges connus
des seules mémoires de session, pour lesquels un contrôle était possible.
Cette PR convertit les quatre pièges d'environnement que la conception mettait
en tête de liste :

- **`btrim` à un argument dans une migration** : `scripts/migrations-btrim.test.mjs`
  refuse `btrim(texte)` dans toute migration neuve. Cette forme ne retire que
  l'espace ASCII, si bien qu'un CHECK « non vide » laisse passer une
  tabulation.
  - Le banc lit le SQL sans ses commentaires ni ses chaînes. Il lit aussi le
    corps des fonctions `$$ … $$`.
  - Les huit migrations appliquées qui portent cette forme sont gelées à leur
    compte exact (le resserrage relève de D-111).
  - Le banc est câblé dans `npm run check` et dans le CI (parité).
- **`prisma format`** : `block-risky-commands.mjs` refuse la commande, qui
  réaligne une centaine de lignes de `schema.prisma` étrangères au diff.
  - Le refus est lu sur la commande masquée : une prose qui cite la commande
    reste libre.
  - `prisma format --check` et `prisma validate` passent.
- **Doublons du client Prisma** : `wn-test-worktree.sh` s'arrête après
  `prisma generate` si `web/src/generated/prisma` contient des fichiers
  « * 2.* », laissés par deux `generate` concurrents.
  - Sans ce contrôle, le build échouait plus loin sur une erreur de type qui
    ne ressemblait pas à sa cause.
  - Le message donne le remède.
- **Trace Playwright suivie par Git** : `check_no_secrets.sh` refuse, dans ses
  deux modes, un fichier suivi ou indexé nommé `trace.zip`, `…-trace.zip`,
  `*.trace` ou `*.network`. Le journal réseau d'une trace porte le cookie de
  session.
  - Les traces locales non suivies restent libres.
  - Un `git` en panne fait sortir en 2.
