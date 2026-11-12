# Handoff — 2026-11-12 — t78 : fenêtre d'extinction de la table d'arrêt (D-500)

## Branche et état Git

- Branche `feat/t78-fenetre-extinction`, dans le worktree `.claude/worktrees/t78-cadrage`. Base `origin/main`
  228121080, puis `origin/main` 07644dfc9 fusionné par arbitrage du responsable (merge sans conflit).
- Session concurrente (file A) : `git` et `gh` en direct. Le worktree `t71b-cadrage` (File A bis, t71, D-495) n'a
  pas été touché.

## Objectif

Solder la dette t78 du §8 du plan : la table d'arrêt lisait la dernière passation de chaque instrument, quelle que
soit sa date.

## Décisions prises

- D-500, arbitrages A / A / A du responsable sur `20261112-1216-a` à `1218-a` :
  - une passation hors de sa fenêtre d'extinction n'éteint plus. Les fenêtres sont gardées dans un registre
    distinct, `FENETRES_ARRET`. Cungi et DASS-21 : 7 jours, arbitrage neuf sans source ;
  - aucune fenêtre pour Q_STR_01 : STOP-STR est inopérante jusqu'à un arbitrage sur cet instrument ;
  - sans horloge, aucune extinction : le repli de D-433 §5 n'est pas repris ;
  - le cockpit affiche l'arrêt non évalué, avec deux textes du responsable ;
  - pour la synthèse, l'extinction est refusée dès maintenant ; son explication au modèle est versée à t77.
    t61 est soldée par D-471.
- L'empreinte `{ regles, grilles, fenetres }` = `0f153aac…` a été re-signée le 2026-11-12 par le responsable.
- Choix non arbitré, inscrit au §4 de D-500 : une règle n'est rapportée « non évaluée » que si elle avait au moins
  une exploration à retirer.

## Fichiers modifiés

- `web/src/lib/clinical/orientationEngine.ts` : boucle d'arrêt, `arretsNonEvalues`, `fenetresArret`.
- `web/src/lib/clinical/stopRulesV1.ts` : `FENETRES_ARRET`, formule de l'empreinte, re-signature.
- `web/src/lib/clinical/orientationService.ts`, `web/src/app/api/praticien/orientation/route.ts`,
  `web/src/components/patient-cockpit/OrientationPanel.tsx`.
- Bancs : `orientationEngine.test.ts`, `stopRulesV1.test.ts`, `convergenceEngine.test.ts`,
  `orientationService.test.ts`, `route.test.ts`, `OrientationPanel.test.tsx`, `blocReglesNonEvaluees.test.ts`.
- `docs/decisions/D-500.md`, `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md` (lignes t78 et t77),
  `changelog.d/2026-11-12-t78-fenetre-extinction.md`, ce handoff.

## Validations exécutées

- Mesure en production (conteneur en lecture seule, agrégats sans identité) : aucun dossier n'a les trois
  instruments de STOP-STR. Le déploiement ne change rien de visible.
- Mutations (`lues`→`dernieres`, suppression de `ajouterPerimees()`) : chacune rougit le banc, code restauré.
- Revue `wn-reviewer` : GO, aucun P0. P1-1 et P2-1 corrigés ; P2-2 et ses deux questions inscrits à D-500 comme
  limites connues.
- Après la re-signature :
  - T1 complet (`npm run check`) : `exit 0` ;
  - suites `src/lib/clinical/` : 37 fichiers, 1080 tests verts ;
  - T2 (`test:worktree --fast`) : `exit 0` — Vitest 17012 verts, E2E 368 verts.

## Problèmes ouverts

- Fenêtre de Q_STR_01 à arbitrer : c'est ce qui rouvrira STOP-STR (nouvelle re-signature).
- t77 : explication au modèle des arrêts non évalués.
- Conflit textuel possible avec t71b, qui touche le service, la route, le panneau et leurs bancs. Les ajouts sont
  placés à l'écart de ses hunks ; la PR qui merge en second vérifie.
- Revue Codex : geste manuel du responsable (clinique P0).

## Prochaine action exacte

1. CI de la tête, revue bot selon la règle en vigueur sur `main`, puis lecture de ses trois sorties.
2. Déclarer la PR « prête @<sha> » ; l'intégrateur merge.
3. Release-db au merge (chemin clinique), à approuver. Constat par conteneur : `0f153aac` présent dans
   `.next/server`, `b73cc1b6` absent.
4. Après le merge : clore `1216-a` à `1218-a` dans la liste commune et mettre à jour la page de suivi de la file A.

## Interdits encore actifs

- Production en lecture seule, par conteneur.
- Aucune durée de fenêtre sans source ni décision (DC-19, DC-20) ; aucune durée implicite pour Q_STR_01.
- Ni signature ni arbitrage par l'assistant sans délégation explicite.
- Ne pas toucher au worktree `t71b-cadrage`.
- Pas de migration, pas de modification de `schema.prisma`.
