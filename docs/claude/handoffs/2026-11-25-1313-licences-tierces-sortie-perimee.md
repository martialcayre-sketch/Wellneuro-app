# Handoff — 2026-11-25 — Mentions tierces : sortie périmée retirée au refus

Lot `licences-tierces-sortie-perimee` (file D, P2, lieu cloud), mené par la
passe de l'orchestrateur cloud `20261125-1309-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-vq0qz8`, tirée d'`origin/main` à `6ea7ee88`.
- Un commit de lot (correctif, banc, empreinte, fragment, ce handoff), poussé ;
  PR en brouillon ouverte sur `main`.

## Objectif

Reste P2 de la revue du lot `licences-tierces-bundle` (handoff
`2026-11-16-0824-licences-tierces-bundle.md`, § problèmes ouverts) : quand le
plugin refuse l'émission, le `licences-tierces.txt` d'un build précédent ne
doit pas rester servi en local depuis `public/`.

## Décisions prises

- Retrait plutôt qu'invalidation : `fs.rmSync(sortie, { force: true })` dans
  la branche de refus, juste avant le `return`. Le fichier est déjà ignoré par
  Git (`web/.gitignore`) ; l'absence se constate simplement (404 en local).
- Empreinte `EMPREINTE_PLUGIN_LICENCES` ajustée dans
  `resolutionImports.guard.test.ts`, après la vérification qu'exige son
  commentaire : aucun crochet de résolution, ni `normalModuleFactory`, ni
  `contextModuleFactory`, ni `compiler.options` touché.

## Fichiers modifiés

- `web/scripts/licences-tierces.mjs` (trois lignes, branche de refus).
- `web/src/lib/licencesTierces.test.ts` (un cas : fichier périmé posé, refus,
  fichier absent).
- `web/src/lib/bio-parcours/resolutionImports.guard.test.ts` (empreinte).
- `changelog.d/2026-11-25-licences-tierces-sortie-perimee.md`, ce handoff.

## Validations exécutées

- `vitest run` sur `licencesTierces.test.ts` et `resolutionImports.guard.test.ts` :
  2 fichiers, 18 tests verts.
- Contre-épreuve : sans la ligne `rmSync`, le nouveau cas rougit (1 échec sur
  14), les autres restent verts ; fichier restauré à l'identique (empreinte
  `b304dcca…` revérifiée).
- T1 `npm run check:rapide` → 0. Ni T2 ni T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Ligne `20261125-1300-b` de la boîte `D` (E2E instable
  `e2e/portail-rail-lateral.spec.ts:128`, #2335, #2341) : lue, laissée `lu` —
  geste hors de ce lot, pour la file qui tient la CI.
- Autres restes P2 du handoff d'origine (code vendu sous `vendor/`,
  `querystring-es3`, `constants-browserify`) : hors de ce lot.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

Passe cloud : ni merge, ni release-db, ni T2/T3, ni `test:e2e`, ni lot
suivant. Aucune modification du graphe de détection, des exclusions ni de
`next.config.mjs`.
