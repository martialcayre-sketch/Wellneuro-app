# Handoff — t61 (file A) : la synthèse IA reçoit les règles d'orientation non évaluées (D-471, consigne v33)

## Branche et état Git
- `feat/t61-regles-non-evaluees-synthese`, worktree `.claude/worktrees/t61-regles-non-evaluees`, depuis
  `origin/main` `7af75e657` (#1952). La copie principale était occupée par une autre session (`fix/t67-…`) :
  ne pas y travailler. PR à ouvrir.

## Objectif
Dette t61 (P2-2 de la revue de #1862) : `buildBlocOrientation` ne disait rien au modèle des règles non évaluées
de D-433 §3 ; sans recommandation, l'absence du bloc d'orientation se lisait « rien à explorer » (`DC-24`), et une
passation hors fenêtre se rapportait au présent.

## Décisions prises
- Questions `20261109-1355-a` à `1357-a` (liste commune), option recommandée chacune : mention unique au praticien,
  mesure datée et non état actuel, rien au patient. Texte de la section v33 validé après deux corrections du
  responsable (« certaines règles », exemple PSS-10 seul). D-471 réservée par `wn-reserver-decision.mjs`.
- Le bloc lit le seul `reglesNonEvaluees` du moteur, jamais l'âge des passations (exigence du responsable) ; sans
  identifiant de règle ni nombre ; identifiants gardés dans `donneesEntree.reglesNonEvaluees`.
- Ligne du bloc : `Q_STR_02 — Échelle de stress perçu (PSS-10), passation du … : au-delà de sa fenêtre de 30 jours.`
  (titre réel du catalogue, tiret pour éviter les parenthèses imbriquées).
- Revue `wn-reviewer` : GO avec mineurs. P2-1 (instrument du bloc absent des résultats reproché par le garde)
  corrigé : il entre dans `questionnairesCitables`, banc ajouté. P2-3 (trace recalculée) corrigé : le texte
  envoyé passe par `GenererArgs`. P2-2 (dernière passation écartée datée par le bloc, drapeau de validité) écrit
  comme limite au §4 de D-471, texte validé non retouché.
- Prod lue le 2026-11-09 par conteneur, agrégats, majorant : 14 dossiers sur 21 ont une passation hors fenêtre
  à leur dernière synthèse (médiane 3 instruments, max 10).

## Fichiers modifiés
`web/src/lib/synthese/blocReglesNonEvaluees.ts` (neuf) et son test ; `web/src/lib/synthese/generation.ts` ;
`web/src/lib/anthropic.ts` (section, v33) ; `promptReglesNonEvaluees.guard.test.ts` et
`reglesNonEvaluees.generation.test.ts` (neufs) ; empreintes v33 dans `promptAlimentaire.guard.test.ts` et
`anthropic.corpusActif.guard.test.ts` ; ordre des blocs dans `promptBesoins.guard.test.ts` ;
`docs/decisions/D-471.md`, ligne soldée au §8 du plan, `changelog.d/2026-11-09-d471-regles-non-evaluees-synthese-v33.md`.

## Validations exécutées
- `npm run check` (T1 complet) vert, avant et après les corrections de revue (avertissement attendu : D-470 en vol).
- T2 (`npm run test:worktree -- --fast`) vert avant les corrections : 16 632 tests, 357 E2E ; rejoué après.
- Suites synthèse et consigne : 364 tests verts après corrections.

## Problèmes ouverts
- Limite §4 de D-471 (passation écartée sous drapeau de validité) : au responsable s'il paraît.
- Libellé « fenêtre de fraîcheur inconnue » différent du cockpit (« sans fenêtre de fraîcheur connue ») ; cas
  impossible en production (`tableSignee()`).
- Aucune synthèse v33 encore observée : ce que le modèle écrit n'est pas prouvé par les bancs.

## Prochaine action exacte
Commit, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, revue CodeRabbit sur la tête, lire les
trois sorties de revue, puis « prête @<sha> » à l'intégrateur. Page de suivi A : t61 → fait après merge. Pas de
release-db (`lib/clinical` non touché). Suite de l'ordre de la file A : t67 (déjà portée par une autre session dans la copie principale, branche
`fix/t67-convergence-limite-declenchee`), puis t66, puis t65.

## Interdits encore actifs
Pas de merge par la session (intégrateur, D-454) ; une seule release-db en attente toutes files ; ne pas toucher
la copie principale tant qu'une autre session y travaille ; aucune identité patient dans le dépôt.
