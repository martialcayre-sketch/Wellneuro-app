# Handoff — 2026-11-13 — t77 : la synthèse IA dit ce que le service n'applique pas (D-511, consigne `synthese-v34`)

## Branche et état Git

`feat/t77-synthese-regles-non-servies`, worktree `.claude/worktrees/t77-cadrage` (session concurrente). La branche est partie de `origin/main` et a été avancée deux fois en `--ff-only`, sans aucun commit propre à ce moment-là (`c8542cab`, puis la tête qui porte D-508). Elle porte deux commits : le lot (`b71c53a6`) et le correctif de la contre-revue Codex (`3ff75ba9`). Il n'y a ni migration ni changement de `schema.prisma`. Le lot touche `web/src/lib/clinical/orientationService.ts` (un contrat écrit en commentaire) : **la release-db est proposée au merge**, sans migration, et attend l'approbation du responsable.

## Objectif

Solder la dette t77 (§8 du plan) : la synthèse IA ne disait ni les règles d'arrêt suspendues ([[D-491]]), ni les règles d'orientation non appliquées ([[D-495]]), ni les règles d'arrêt non évaluées ([[D-500]], [[D-508]]), ni le corpus illisible, que le cockpit dit.

## Décisions prises

- `D-511`, réservée par `wn-reserver-decision` :
  - questions `20261113-0923-a` à `0926-a`, chacune tranchée à l'option recommandée avec des précisions du responsable ;
  - textes du bloc (§2), de la consigne (§3) et de la ligne de vigilance (§4) validés mot pour mot après corrections de sa main ;
  - contrat écrit plutôt que type marqué (P2 4) ; la règle de la mesure datée de [[D-471]] n'est pas étendue (§7).
- Correction de [[D-495]] §8 : aucune convergence « baissée » ne se dit (aucun service ne la calcule, le modèle ne reçoit pas les convergences).
- Contre-revue Codex ([[D-505]] §4) : aucun P0 ni P1, un P2 corrigé (§10).

## Fichiers modifiés

- **Synthèse** : `web/src/lib/synthese/blocReglesNonServies.ts` (nouveau), `generation.ts`, `web/src/lib/anthropic.ts` (v34).
- **Service** : `web/src/lib/clinical/orientationService.ts` (contrat de `lectureOrientation`, commentaire seul) ; `web/src/lib/observability/eventCodes.ts` (`SYNTHESE_IA.REGLES_ORIENTATION.ILLISIBLES`).
- **Bancs** : `blocReglesNonServies.test.ts`, `promptReglesNonServies.guard.test.ts`, `reglesNonServies.generation.test.ts` (nouveaux) ; `orientationService.test.ts` (bancs croisés t71b × t78) ; `orientation.restitution.test.ts` (journalisation) ; mocks de `reglesNonEvaluees.generation.test.ts` et `besoins.generation.test.ts` ; empreintes v34 dans `promptAlimentaire.guard.test.ts` et `anthropic.corpusActif.guard.test.ts` ; bornes de `promptReglesNonEvaluees.guard.test.ts` et `promptBesoins.guard.test.ts`.
- **Docs** : `docs/decisions/D-511.md`, `changelog.d/2026-11-13-d511-regles-non-servies-synthese-v34.md`, `docs/claude/PLAN_WELLNEURO.md` §8 (t77 soldée), ce handoff.

## Validations exécutées

- Vitest ciblé (synthèse, api/praticien, clinical, clinical-engine, observabilité) : 4 902 tests verts.
- T1 complet (`npm run check`) : vert.
- Contre-revue Codex en mode `revue` sur le diff poussé : conforme, un P2 corrigé et banc ajouté.
- T3 (`npm run test:worktree`) : première passe rouge sur un seul test hors du diff (`ProtocolMiniBuilder.test.tsx`, délai de 5 s dépassé sous charge ; 94/94 vert joué seul), qui a arrêté la suite avant les E2E ; seconde passe complète : voir la PR.

## Problèmes ouverts

- [[D-505]] §5 n'a pas été suivi au cadrage : les quatre questions cliniques ont été écrites sans avis Codex préalable (`avis_codex` absent).
- Limites consignées en [[D-511]] §7 : la mesure datée ne couvre pas les arrêts non évalués ; une levée du service d'orientation ne produit aucun bloc.
- Au cockpit, deux lectures du corpus par page (orientation et contradictions), qui peuvent diverger ([[D-511]] §6.5) : non corrigé.

## Prochaine action exacte

1. PR (`--body-file`), contre-revue Codex déposée en commentaire, CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. Revue PR-Agent sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → `0`), sinon `wn-reviewer` ; un verdict par commentaire ; « prête @<sha> » pour l'intégrateur.
3. Après le merge : release-db approuvée par le responsable (aucune migration), puis constat par conteneur que la version servie porte `synthese-v34`.
4. Pages A et D : ligne t77 soldée ; `decision: D-511` sur les quatre questions.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d` ; écriture par release-db approuvée seulement (`D-087`).
- Aucune migration ni modification de `schema.prisma` ; aucune re-signature des tables d'orientation, de priorités ni d'arrêt.
- Textes de D-511 §2 à §4 : toute retouche revient au responsable.
- Pas de pull, de merge ni de rebase d'une branche qui porte des commits sans arbitrage du responsable.
- Aucune identité réelle ; l'adresse de la page D jamais écrite dans le dépôt.
