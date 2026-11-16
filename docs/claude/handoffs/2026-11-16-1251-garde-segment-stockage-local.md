# Handoff — 2026-11-16 — Garde : le segment de la page ne sert jamais de clé de stockage local (lot `garde-segment-stockage-local`)

## Branche et état du dépôt

- Branche `chore/garde-segment-stockage-local`, créée depuis `origin/main` (`6a32a9d5`, merge de #2167, qui contient #2164 en `3934c3a2`), dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D). `chore/licences-tierces-bundle` laissée intacte.
- Un commit, posé juste avant le push. « Prête @<sha> » pour l'intégrateur.
- Lot `garde-segment-stockage-local` `pris` au carnet (ordre 84).
- En ouverture de session : `merge_fait` de #2164 accusé (`traite`) ; lot `licences-tierces-bundle` déjà à `fait`. Constat en production : `/licences-tierces.txt` servi (HTTP 200, `text/plain`, 72 composants, section « ne couvre pas encore » : polyfills de Next, quatre polices).

## Objectif

Le crochet `useSegmentPage` rend le segment `[token]` du portail aux composants qui ne le reçoivent pas en prop. Il ne sert qu'à l'en-tête `x-wn-dossier-page` (`D-481`, DOC-14). La garde `portail-identite-locale.guard.test.ts` interdisait déjà le jeton dans les clés de stockage de deux surfaces listées, mais ne voyait pas les composants qui lisent le segment par ce crochet. Question de `wn-reviewer` sur #2152, accord du responsable le 2026-11-15.

## Décisions prises

- La garde borne les emplois au lieu de chercher les clés fautives. Le segment est lié une fois, puis n'apparaît que dans `enTeteDossierPage(x)` ou dans un tableau de dépendances (`, [ … ] )`). Une clé construite ailleurs à partir d'une copie, ou un argument passé à un assembleur de clé, rougit donc aussi. Chercher `Storage` sur la même ligne ne l'aurait pas vu.
- Les composants sont découverts (`readdirSync` récursif sur `src/`, hors `*.test.*` et hors le crochet). Un nouvel emploi est gardé sans inscription. Plancher : le panneau du Journal Alimentaire doit être trouvé, seul composant qui écrit en `sessionStorage` et lit aussi le segment.
- Les lignes de commentaire sont retirées avant l'analyse. Un appel non lié (`cle(useSegmentPage())`) ou un segment lié deux fois rend `null` et rougit.
- Pas de garde sur les lectures directes de `useParams` : hors de la fiche. `app/portail/[token]/page.tsx` reste couvert par le banc existant.

## Fichiers modifiés

- `web/src/lib/portail-identite-locale.guard.test.ts` : nouveau `describe` de quatre cas (découverte, un cas par composant, le crochet, banc du banc).
- `changelog.d/2026-11-16-garde-segment-stockage-local.md`, ce handoff.

## Validations exécutées

- `npx vitest run src/lib/portail-identite-locale.guard.test.ts` : 12 tests verts, dont six composants découverts.
- Mutation : clé `wellneuro:x:${segmentPage}` ajoutée dans `PatientFoodObservationPanel.tsx` ⇒ le cas du composant rougit (1 échec sur 12). Fichier restauré par `git checkout`.
- `npm run check` (T1 complet) : `code=0`.
- Pas de T2 : changement limité à un fichier de test, sans UI ni API.

## Problèmes ouverts

- Aucun dans le périmètre du lot.

## Prochaine action exacte

1. Push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, PR-Agent sur la tête, « prête » à l'intégrateur au registre.
2. Lot suivant de la file D : `licences-hors-graphe` (ordre 85). Il s'agit des polyfills de Next (à énumérer depuis la source de `@next/polyfill-nomodule`) et des polices OFL.

## Interdits encore actifs

- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Pas de ligne de test dans `reponses`.
- Le cockpit ne répond jamais à une question `clinique` ou `migration`.
- Aucune adresse d'artefact dans le dépôt.
- Horodater en lisant l'heure système, jamais à l'estime.
