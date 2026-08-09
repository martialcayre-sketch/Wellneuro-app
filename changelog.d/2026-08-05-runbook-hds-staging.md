### Ajouté

- **Le runbook HDS porte enfin l'état réel du staging Scalingo.** Le staging a été
  provisionné et validé de bout en bout le 2026-07-24 — app `wellneuro-staging`,
  région `osc-fr1`, `HDS: true`, add-on `postgresql-business-512`, 2 containers
  `web` en taille `S`, 35 migrations Prisma appliquées sur base vierge — mais ces
  faits vivaient sur un HEAD détaché non committé : le worktree supprimé, ils
  disparaissaient.

  Ils sont désormais dans `main`, **revérifiés le 2026-08-05** par `scalingo
  apps-info`, `addons` et `ps` : l'app tourne toujours, dans la configuration
  décrite.

  **Amendé le 2026-08-09, avant publication** (les deux fragments sortiront dans
  la même release) : ce texte disait « l'orientation du 2026-07-22 — rester sur
  l'hébergement actuel — tient ». Elle ne tient plus : `docs/DECISIONS.md` D-006
  (2026-07-28) puis D-037 (2026-08-09) décident la migration. Et « validé de bout
  en bout » désignait un **boot technique**, pas une recette : les trois items
  fonctionnels de la checklist ne sont pas cochés.

  S'y ajoutent neuf gestes opérationnels appris au provisionnement, dont trois
  pièges qui coûtent une app à refaire ou un secret exposé : `--hds-resource` ne
  se rattrape pas après `create`, une ressource HDS refuse de descendre sous
  2 containers, et `scalingo env-set` **réaffiche la valeur** qu'on vient de
  poser.

### Corrigé

- **L'étape 1 du runbook ne contredit plus ses propres prérequis.** #425 avait
  corrigé la région en tête du document (`osc-fr1` + `--hds-resource`, la réalité)
  sans toucher la procédure, restée à « confirmer la syntaxe exacte du flag HDS ».
  Une correction appliquée à un seul des deux endroits laisse le lecteur suivre
  celui qui est faux.

- **Le runbook ne décrit plus un mécanisme de build qui n'existe plus.** Il
  attribuait l'application des migrations à une branche `else` de
  `vercel-build.sh` ; ce script n'écrit plus en base depuis #435, sur aucun
  chemin. Sur Scalingo, c'est l'entrée `postdeploy` du `Procfile`
  (`npm run db:deploy`) qui les applique, et rien d'autre.
