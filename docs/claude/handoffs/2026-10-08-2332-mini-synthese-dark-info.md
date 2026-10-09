# Handoff — 2026-10-08 — Mini-synthèse : « Très sévère » et « Léger » nommés (D-274)

## Branche et état Git

- Worktree `.claude/worktrees/mini-synthese-dark`, branche `fix/mini-synthese-dark`,
  partie de `origin/main` (c7d46f78, BP-25 mergé et déployé). Un commit, PR ouverte
  avec ce handoff. Lot hors campagne : défaut découvert pendant BP-26 (LOT-26).

## Objectif

La mini-synthèse ignorait la couleur `dark` (« Très sévère » du DASS-21) : un axe
très sévère sortait du résumé, jusqu'à « Tous les axes explorés sont peu perturbés ».

## Décisions prises

- `D-274` (arbitrage du responsable, 2026-10-08) : `dark` perturbée, rang le plus
  haut ; `info` (« Léger ») perturbée aussi, rang le plus bas ; ordre repris de
  `orientationRulesV1.ts`. Aucun seuil, aucune bande, aucune couleur ne change.

## Fichiers modifiés

- `web/src/lib/scoring/miniSynthese.ts` (`SEVERITE`, `estPerturbe`),
  `miniSynthese.test.ts` (9 cas DASS-21 + garde du catalogue).
- `web/package.json` : `miniSynthese.test.ts` ajouté à `test:court14` (la garde
  balaie le catalogue, donc dépend de la forme servie de `Q_ALI_01`).
- `docs/DECISIONS.md` (D-274), `changelog.d/2026-10-08-mini-synthese-dark-info.md`.

## Validations exécutées

- Mutation : 6 rouges sur l'ancien code ; le test de rang rougit si `dark` = `danger`.
- T1 complet vert ; T3 complet vert (5 min 32 s, 243 E2E, dérive nulle) avant les deux
  tests ajoutés sur revue, banc du module rejoué vert ensuite (34 tests).
- Revue `wn-reviewer` : GO, aucun P0/P1 ; P2-1 (rang) et P2-2 (garde catalogue)
  intégrés, P2-3 routé à l'issue #1368.
- Production, lecture seule en agrégats : 1 DASS-21 sur 7 touché ; ses synthèses IA
  avaient reçu les bandes « Très sévère » ; aucune ne porte la phrase rassurante.

## Problèmes ouverts

- **Passe Codex** à lancer par le responsable (correctif clinique).
- Un export de dossier déjà remis n'est pas réparé (le résumé se recalcule à
  l'affichage seulement).
- Badges `dark` en gris neutre : issue #1368.
- Question de la revue : des `scoresJson` anciens pourraient porter d'autres couleurs
  de rubrique ; un comptage en agrégat par conteneur le lèverait.

## Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`, en fond), commentaires en ligne,
Codex par le responsable, merge, déploiement constaté. En parallèle : dossier de
décision BP-26 (workflow en cours, restitution en artefact).

## Interdits encore actifs

- Aucun rang ni aucune couleur inventés ; toute extension de `SEVERITE` passe par une
  nouvelle décision.
- Pas de donnée patient réelle ni d'identifiant de dossier dans le dépôt.
- Pas d'auto-merge sur une PR de lot ; un merge à la fois, déploiement constaté.
