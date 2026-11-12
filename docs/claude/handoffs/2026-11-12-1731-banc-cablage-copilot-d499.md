# Handoff — 2026-11-12 — banc de câblage du lecteur Copilot accordé à D-499

## Branche et état Git

- Worktree `.claude/worktrees/practical-lamarr-b045ee`, branche
  `fix/banc-cablage-copilot-d499`, partie de `origin/main` `b56ca4d9`.
- Un commit ; PR à déclarer « prête @<sha> » (régime intégrateur, `D-454`).

## Objectif

Remettre au vert T1 complet (`cd web && npm run check`) : depuis `D-499`
(#2017), le test « câblage » de `scripts/wn-revue-copilot.test.mjs`
attendait `wn-revue-copilot.mjs` dans `.claude/skills/wn-merge/SKILL.md` et
`.claude/rules/pr-revue-et-release-db.md`, d'où D-499 l'a retiré. Le banc
n'est cité par aucun workflow : le CI restait vert.

## Décisions prises

- Aucune D-xxx. Lecture de `D-499` : §1 « ne demande plus Copilot », §2
  « CodeRabbit et Copilot ne sont plus des recours » ; « Ce qu'elle ne décide
  pas » ne vise pas le script. D-499 retire donc le lecteur des consignes sans
  le supprimer : le banc s'accorde, le câblage n'est pas rétabli.
- Le test vérifie désormais : `D-468` nomme le lecteur ; `wn-merge` et la
  règle §1.6 citent `D-499` et `wn-revue-pr-agent.mjs` et ne nomment plus
  `wn-revue-copilot.mjs` (un retour du câblage sans décision rougirait).
- D-499 et D-468 inchangées.

## Fichiers modifiés

- `scripts/wn-revue-copilot.test.mjs` : le test « câblage » seul.
- `changelog.d/2026-11-12-banc-cablage-copilot-d499.md`.
- Ce handoff.

## Validations exécutées

- `node --test scripts/wn-revue-copilot.test.mjs` : 10 tests verts.
- `cd web && npm run check` (T1 complet) : voir la description de la PR.

## Problèmes ouverts

- Le sort du lecteur `scripts/wn-revue-copilot.mjs` (garder pour une demande
  du responsable, `D-499` §3, ou retirer) n'est pas décidé ; hors périmètre.

## Prochaine action exacte

Merge par l'intégrateur après PR-Agent → `0` sur la tête.

## Interdits encore actifs

- Pas de changement de `D-499` ni de `D-468` sans arbitrage du responsable.
- Session concurrente : aucun `/wn-*`, pas de checkout dans la copie principale.
