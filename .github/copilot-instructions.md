# Instructions WellNeuro pour GitHub Copilot

WellNeuro est une application de santé en neuronutrition basée sur Next.js 14 App Router, TypeScript, Prisma, PostgreSQL, NextAuth et Scalingo (hébergement HDS, app + base de données).

Lire `AGENTS.md`, `CLAUDE.md` et `docs/claude/PROJET_CONTEXTE.md` avant une tâche structurante.

## Invariants

- Ne jamais inclure de secret, token, mot de passe ou chaîne de connexion.
- Ne jamais lire, afficher ou modifier un fichier `.env*`.
- Tous les textes d’interface sont en français.
- Changement minimal : aucun refactor, renommage ou réorganisation hors demande.
- Aucune migration Prisma/SQL, modification de `schema.prisma` ou écriture en base de production sans demande explicite et confirmation distincte.
- Aucune modification de scoring, seuil ou logique clinique sans demande explicite.
- Tout changement se trace par un fragment `changelog.d/AAAA-MM-JJ-slug.md`, jamais en éditant le haut de `CHANGELOG.md` : c’est ce qui a fait échouer cinq merges le 2026-07-21 (replié par `scripts/changelog-collate.mjs` — voir `changelog.d/README.md`).
- Seuls les patients fictifs Sophie Nicola, Jennifer Martin et Michel Dogné peuvent apparaître dans les exemples, tests ou données de démo.
- Ne jamais reproduire une donnée patient réelle rencontrée dans un fichier, un log ou un message.
- Le code principal est dans `web/`.
- Le portail patient principal est `/portail/[token]`; `/patient/[idAssignation]` est legacy.
- Le runtime utilise PostgreSQL via Prisma ; Google Sheets et GAS sont historiques uniquement.

## Façon de travailler

Avant de modifier :

1. vérifier l’état réel du dépôt ;
2. résumer l’objectif et le périmètre ;
3. identifier les fichiers nécessaires ;
4. choisir les tests adaptés ;
5. signaler immédiatement migration, sécurité, données patients ou logique clinique.

Après modification :

- montrer les fichiers touchés ;
- exécuter le palier qui correspond au périmètre, et le nommer — **T1**
  (`cd web && npm run check`, ~15 s) après chaque édition ; **T2**
  (`npm run test:worktree -- --fast`) avant tout changement d’UI ou d’API, une
  suite Vitest verte ne prouvant rien sur les parcours ; **T3**
  (`npm run test:worktree`) sur une migration, du scoring ou du clinique ;
- expliquer les limites et tests manuels ;
- ne jamais déclarer un test réussi s’il n’a pas été exécuté.

Avant de merger une PR : vérifier que le check **`verify`** a réellement tourné.
D'autres checks au vert ne valent pas vérification — un run gelé en
`action_required` ressemble à un succès sans en être un.

Pour une tâche complexe, utiliser les prompts ou agents WellNeuro présents dans `.github/prompts` et `.github/agents`.
