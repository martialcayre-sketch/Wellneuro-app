# Handoff — 2026-11-16 — Mentions de licence des polyfills de Next et des polices next/font (lot `licences-hors-graphe`)

## Branche et état du dépôt

- Branche `chore/licences-hors-graphe`, créée depuis `origin/main` (`a3abf821`), dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D). Avancée trois fois par `--ff-only` pendant le lot, sur des commits sans fichier commun : #2174, #2173, #2175, #2176, puis la tête du moment (#2177 et D-530).
- Un commit, posé juste avant le push. « Prête @<sha> » pour l'intégrateur.
- Lot `licences-hors-graphe` `pris` au carnet (ordre 85).
- En ouverture de session : `merge_fait` de #2168 (squash `e9da2b71`) accusé (`traite`). Le signal `20261116-1330-a` de la file A (T2 rouge dans un worktree sans installation propre : chemins `node_modules` en dur du plugin) est passé à `lu`, puis traité dans ce lot.

## Objectif

`/licences-tierces.txt` déclarait « non couverts » deux composants livrés hors du graphe des modules : le fichier de polyfills de Next et les polices de `next/font`. Le lot en reproduit les mentions (P1-c de la revue `wn-reviewer` du lot `licences-tierces-bundle`).

## Décisions prises

- **Polyfills reconnus par l'empreinte SHA-256 du fichier servi**, pas par la version de Next. Le fichier émis est la copie octet pour octet de `next/dist/build/polyfills/polyfill-nomodule.js` (`0973c1d6…`, vérifié sur `.next`). Une montée de Next qui ne touche pas ce fichier reste verte. Si elle le touche, le build rougit, et l'on réénumère.
- **Énumération depuis la source** de `@next/polyfill-nomodule` au tag v15.5.25 (`src/index.js`, `package.json`) : core-js 3.38.1, object-assign 4.1.1, whatwg-fetch 3.0.0, compilés par microbundle. Les marques des trois composants sont confirmées dans le fichier compilé : version et droits de core-js, `polyfill=!0` de whatwg-fetch, message d'object-assign. Aucun helper Babel n'y figure.
- **Textes recopiés depuis l'amont aux tags** (via `gh api`). LICENSE de core-js v3.38.1, LICENSE de whatwg-fetch v3.0.0 (JakeChampion/fetch), license d'object-assign v4.1.1. Pour les polices, l'en-tête de droits de `ofl/<famille>/OFL.txt` dans google/fonts. Le corps OFL est identique dans les quatre fichiers (même SHA une fois les fins de ligne normalisées) : il est reproduit une seule fois.
- **Données dans un module à part**, `web/scripts/licences-hors-graphe.mjs`, qui ne contient que des littéraux exportés. Le verrou `resolutionImports.guard.test.ts` le fige par son empreinte, comme le plugin, puisqu'il s'exécute avec lui.
- **Signal de la file A** : `horsGrapheParDefaut` résout `next` et `tailwindcss` par `createRequire(compiler.context/package.json)`, avec repli sur le chemin attendu. Un paquet introuvable rougit le build en le nommant, comme avant.
- **Revue `wn-reviewer` : go, aucun P0 ni P1.**
  - P2-1 : une police `next/font/local` passerait sans être vue (requête sans nom). Aucune n'est en service. La limite est dite dans le changelog et dans la PR, sans correctif.
  - P2-2 : build réel exigé. Fait, voir T2.
  - P2-3 : l'énumération des composants n'est prouvée mécaniquement que pour core-js. Dit dans la PR.

## Fichiers modifiés

- `web/scripts/licences-hors-graphe.mjs` (neuf) : tables `POLYFILLS_NEXT`, `POLICES_OFL` et `TEXTE_OFL`.
- `web/scripts/licences-tierces.mjs` : refus nouveaux (empreinte de polyfills inconnue, police sans mention), composition des deux sections et résolution des dossiers hors graphe.
- `web/src/lib/licencesTierces.test.ts` : trois cas de compilation (police connue, police inconnue, empreinte inconnue) et deux cas sur les données réelles (version installée de Next, imports de `app/layout.tsx`). Le premier cas est mis à jour.
- `web/src/lib/bio-parcours/resolutionImports.guard.test.ts` : empreinte du plugin mise à jour (`b8c06798…`) et empreinte neuve du module de données (`ead0885c…`).
- `changelog.d/2026-11-16-licences-hors-graphe.md`, ce handoff.

## Validations exécutées

- Bancs ciblés (`licencesTierces`, `resolutionImports.guard`, `importeurs.guard`) : 27 verts.
- `npm run check` (T1 complet) : `code=0`.
- Premier T2 : rouge sur un seul test, sans rapport avec le lot. Un test de durée de `src/lib/export-dossier/masquage.test.ts` a pris 79 ms pour un seuil de 50 ms, sous la charge de la suite. Rejoué seul : 170 verts. Le build n'avait pas été joué.
- Second T2 (`npm run test:worktree -- --fast`) : `code=0`, 18 005 tests Vitest et 412 E2E. Le vrai `next build` écrit `public/licences-tierces.txt` (72 composants) : section « Fichier de polyfills de Next.js (static/chunks/polyfills-42372ed130431b0a.js) » avec core-js@3.38.1, object-assign@4.1.1 et whatwg-fetch@3.0.0 ; section des polices (IBM Plex Mono, Instrument Sans, Lora, Sora) ; texte OFL. Plus de section « ne couvre pas encore ».

## Problèmes ouverts

- `next/font/local` n'est pas détecté (P2-1). À reprendre si une police locale entre un jour.
- Le test de durée de `masquage.test.ts` (seuil de 50 ms) peut rougir sous charge. Constaté une fois ici, hors du lot, non corrigé.
- Une `node_modules` racine périmée (`~/Developer/Wellneuro-app/node_modules`, 2026-10-14) est l'ancêtre de résolution des worktrees sans installation. Un build depuis un tel worktree résoudrait ce `next` et rougirait sur l'empreinte des polyfills. C'est attendu : `npm ci` dans le worktree.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête, « prête » à l'intégrateur au registre. Passer le signal `20261116-1330-a` à `traite` au même moment.
2. Constat en production après déploiement : `/licences-tierces.txt` porte les deux nouvelles sections.

## Interdits encore actifs

- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Pas de ligne de test dans `reponses`.
- Le cockpit ne répond jamais à une question `clinique` ou `migration`.
- Aucune adresse d'artefact dans le dépôt.
- Horodater en lisant l'heure système, jamais à l'estime.
