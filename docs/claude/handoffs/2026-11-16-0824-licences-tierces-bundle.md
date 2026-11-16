# Handoff — 2026-11-16 — Mentions de licence des composants livrés au navigateur (lot `licences-tierces-bundle`)

## Branche et état du dépôt

- Branche `chore/licences-tierces-bundle`, créée depuis `origin/main` (`43abb6d7`, merge de #2160), avancée deux fois par `--ff-only` (#2150, #2161, sans recouvrement), dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D). `docs/cockpit-resumes-pages` laissée intacte.
- Un commit, posé juste avant le push. « Prête @<sha> » pour l'intégrateur.
- Lot `licences-tierces-bundle` `pris` au carnet (ordre 83). Lot de suite inscrit `pret` : `licences-hors-graphe` (ordre 85).
- En ouverture de session : `merge_fait` de #2160 accusé (`traite`) ; lot `cockpit-resumes-pages` déjà à `fait` ; consigne « Les résumés des pages de suivi » adressée au registre à A, C, B (session BioFlow : la file B tient la biologie structurelle) et Refonte Lien (documents `lien-praticien` et `lien-patient`, avec le signal du journal praticien arrêté au 2026-11-13).

## Objectif

Le minificateur de Next retire tous les commentaires de licence du bundle : aucune mention de droits ne partait avec le code servi au navigateur. Le lot génère au build un fichier de mentions tierces, servi en fichier statique, avec un banc.

## Décisions prises

- Plugin webpack sur la seule compilation client de `next build` (pas `next dev`), plutôt qu'une liste tirée de `package.json` : la liste lit les modules réellement émis dans les morceaux. `package.json` aurait mêlé le serveur (Prisma, pg, nodemailer) et oublié ce que Next vend sous `next/dist/compiled/` (React, scheduler).
- Les modules concaténés sont dépliés (sinon la plupart des paquets ESM disparaissaient : mutation vérifiée). Hors graphe, ajoutés d'office : le runtime webpack et Tailwind CSS (preflight dans le CSS).
- Sortie `web/public/licences-tierces.txt`, servie à `/licences-tierces.txt` ; non suivie par Git. Le middleware ne vise que `/patient/:path*`.
- Composant sans fichier de licence : texte type MIT ou ISC seulement (recopiés de clsx et d3-color), droits tirés d'`author`.
- Le build rougit, sans écrire le fichier : licence sans fichier autre que MIT/ISC ou absente ; code vendu sous `dist/compiled/` sans manifeste propre ; code (`.js`, `.mjs`, `.wasm`) servi sous `static/` hors des morceaux, hors manifestes de Next et hors `static/chunks/polyfills-<empreinte>.js`.
- Périmètre réduit et dit (revue `wn-reviewer`, P1-c) : les polyfills de Next (core-js et d'autres) et les polices `next/font` (OFL-1.1) sont nommés « non couverts » en fin de fichier ; lot `licences-hors-graphe` au carnet.
- Versions exactes gardées dans le fichier public : elles identifient la copie sous licence (P2 de la revue, usage courant).
- Verrou de `next.config` (`src/lib/bio-parcours/resolutionImports.guard.test.ts`, passes Codex P1-4) : la clé `webpack` y est inscrite nommément. Texte exact exigé (comparé blancs repliés, préfixe d'import de Vitest retiré). Évaluée sur client, serveur et edge, la fonction n'ajoute qu'une instance directe du plugin, sur le client en production. Empreintes de `next.config.mjs` et du plugin figées. Rappel `thisCompilation` éprouvé sous Proxy : seul `processAssets` est touché.
- Ni `import.meta` ni `createRequire` dans `next.config.mjs` ni dans le plugin : le balayage des imports les compte « indéterminés ». Chemins tirés de `compiler.context`.
- Pas de dépendance ajoutée (pas de `license-webpack-plugin`).

## Fichiers modifiés

- `web/scripts/licences-tierces.mjs` (nouveau) : plugin et fonctions pures.
- `web/next.config.mjs` : crochet `webpack` qui installe le plugin (client, production).
- `web/src/lib/licencesTierces.test.ts` (nouveau) : banc Vitest, huit cas.
- `web/src/lib/bio-parcours/resolutionImports.guard.test.ts` : clé `webpack` sous contrat, mutations, test du rappel, deux empreintes.
- `web/.gitignore` : `/public/licences-tierces.txt`.
- `changelog.d/2026-11-16-licences-tierces-bundle.md`, ce handoff.

## Validations exécutées

- Build local de production (compilation client), puis trois T2 (`npm run test:worktree -- --fast`). Le dernier : 18 031 tests Vitest et 412 E2E verts, `code=0`. Le vrai `next build` passe les nouvelles gardes et écrit 72 composants. Section « ne couvre pas encore » : `static/chunks/polyfills-42372ed130431b0a.js` et quatre polices (IBM Plex Mono, Instrument Sans, Lora, Sora).
- Le premier T2 avait rougi sur trois gardes d'imports (clé `webpack`, `import.meta`) : causes corrigées, ces gardes sont vertes (17 fichiers, 128 tests).
- Banc : mutation (modules concaténés non dépliés) rouge, puis fichier restauré.
- `wn-reviewer` : no-go sur trois P1 (contrat évaluable contourné, plugin non figé, paquets hors graphe), puis go après corrections. Deux P2 fermés ensuite : `.mjs`/`.wasm` et motif des polyfills resserré.
- `npm run check` (T1 complet) vert avant les deux P2 ; `check:rapide` rejoué après.

## Problèmes ouverts

- `licences-hors-graphe` : polyfills de Next (à énumérer depuis la source de `@next/polyfill-nomodule`) et polices OFL.
- Restes P2 de la revue, non bloquants : du code vendu hors `dist/compiled/` (sous `vendor/`, bundle prédigéré) reste attribué à son hôte ; un fichier d'un build précédent reste dans `public/` en local si le plugin refuse (sans effet en CI ni sur Scalingo) ; `querystring-es3` et `constants-browserify` (vendus par Next, sans licence) rougiraient le build si un import client les atteignait.
- Le fichier n'est lié depuis aucun écran : la fiche l'excluait.
- Constat en production après déploiement : `curl -s https://app.wellneuro.fr/licences-tierces.txt | head`.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête, « prête » à l'intégrateur au registre.
2. Après le déploiement : constat du fichier servi.
3. Lot suivant de la file D : `garde-segment-stockage-local` (ordre 84).

## Interdits encore actifs

- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Pas de ligne de test dans `reponses`.
- Le cockpit ne répond jamais à une question `clinique` ou `migration`.
- Aucune adresse d'artefact dans le dépôt.
- Horodater en lisant l'heure système, jamais à l'estime.
