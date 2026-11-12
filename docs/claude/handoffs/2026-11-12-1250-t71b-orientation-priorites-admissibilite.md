# Handoff — 2026-11-12 — t71b : validité des claims d'orientation et de priorité constatée au service (D-495)

## Branche et état Git

`feat/t71b-signature-claims-orientation-priorites`, worktree `.claude/worktrees/t71b-cadrage` (session concurrente). La branche est rebasée sur `origin/main` `fe308255` avec l'accord du responsable, et les deux commits de travail sont regroupés en un seul avant la PR. Il n'y a ni migration ni changement de `schema.prisma`. Le lot touche `web/src/lib/clinical/**` : **la release-db est proposée au merge**, et elle n'applique aucune migration. `D-496`, réservée par une autre session dans ce même worktree, reste un numéro sans usage.

## Objectif

Solder la dette t71 (§8 du plan), versée par t66. Une règle d'orientation ou de priorité dont un claim cité n'est pas admissible au corpus (`D-472` §2 : valide et non supplanté) ne propose plus rien, et le cockpit le dit.

## Décisions prises

- `D-495`, sur les arbitrages du responsable :
  - `20261111-1556-a` à `1559-a` ;
  - `2116-a` : A amendée, une règle inadmissible perd ses deux apports à la convergence, et la synthèse est renvoyée à t77 ;
  - `2117-a` : C, T1 à T3 tels que proposés, T4 et T5 reformulés ;
  - `2118-a` : A amendée, interruption sans révocation, référence `D-191` §2-4.
- Le texte de l'écran de diffusion reste inchangé. Son attribution inexacte au « dossier » est consignée en `D-495` §6.6 et en dette au §8 du plan.
- Revue `wn-reviewer`, sans P0 ni P1 :
  - P2-1 conservé, conforme à §5.3 et §6.3 ;
  - P2-2 consigné en §6.3, sans refus d'approbation ajouté ;
  - P2-3, le coût des lectures du corpus, reste non traité.

## Fichiers modifiés

- **Service et moteur** :
  - `web/src/lib/clinical/orientationAdmissible.ts` et `prioritesAdmissibles.ts`, tous deux nouveaux ;
  - `orientationService.ts`, `contradictionsService.ts` ;
  - `web/src/lib/synthese/generation.ts` ;
  - `web/src/lib/clinical-engine/{chaineC1,decisionCard,types,rejeuCarteDecision,rejeuEpisodeCockpit,verifierChaineC1}.ts`.
- **Routes** : `api/praticien/cockpit/route.ts`, `api/praticien/orientation/route.ts`.
- **Écrans** : `OrientationPanel.tsx`, `MissingDataPanel.tsx`, `ClinicalRuntimeSection.tsx`, `DecisionSummaryCard.tsx`.
- **Bancs** : ceux de ces modules, plus la garde des quatre constructions, `safetyQuestionnaire.integration.test.ts` et la fixture E2E `web/e2e/helpers/db.ts`.
- **Docs** :
  - `docs/decisions/D-495.md` ;
  - `changelog.d/2026-11-12-t71b-orientation-priorites-admissibilite.md` ;
  - `docs/claude/PLAN_WELLNEURO.md` §8 : t71 soldée, t77 complétée, nouvelle dette de l'écran de diffusion ;
  - ce handoff.

## Validations exécutées

- **Vitest ciblé**, vert :
  - clinical, clinical-engine, synthese, api/praticien, api/portail : 6 187 tests ;
  - patient-cockpit : 966 tests ;
  - après la revue : 52 tests dans `contradictionsService`, 14 dans `rejeuCarteDecision`, 11 dans `safetyQuestionnaire.integration`.
- **Empreinte** : celle de la carte de référence reste égale à la valeur figée `f2e808ad…`, mesurée par une sonde temporaire puis supprimée.
- **T1 complet** (`cd web && npm run check`) : vert, après une erreur de type corrigée dans un banc ajouté.
- **T3** (`npm run test:worktree`, E2E compris) : voir la PR ; il est joué avant son ouverture.
- **Revue** `wn-reviewer` sur `origin/main...HEAD`.

## Problèmes ouverts

- La synthèse n'explique ni une règle non appliquée, ni une convergence retirée, ni un corpus illisible. C'est rattaché à t77 (§8).
- La phrase de repli du panneau d'orientation est inchangée, comme le message générique de la route d'écartement quand le corpus est illisible (`D-495` §8).
- Le texte de l'écran de diffusion attribue la dérive au « dossier ». La dette est au §8, en file A, sans porteur.
- Une page du cockpit relit le corpus environ quatre fois (P2-3) ; une mémoïsation par requête reste possible.

## Prochaine action exacte

1. PR (`--body-file`), puis CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. Revue CodeRabbit sur la tête, sinon Copilot (`D-468`), sinon PR-Agent prouvé. Un verdict par commentaire, puis « prête @<sha> » pour l'intégrateur.
3. Après le merge : release-db approuvée par le responsable, puis constat par conteneur des fragments de `D-495` §10 : `reglesNonAppliquees`, `prioritesNonProposees`, `convergencesNonEvaluees`.
4. Pages A et D : statut t71b ; `decision: D-495` sur 2116, 2117 et 2118.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d` ; écriture par release-db approuvée seulement (`D-087`).
- Aucune migration ni modification de `schema.prisma` ; aucune re-signature de `ORIENTATION_RULES_V1` ni de `PRIORITY_RULES_V1`.
- Ne pas toucher t75 (#1990).
- Pas de pull, de merge ni de rebase d'une branche qui porte des commits sans arbitrage du responsable.
- Aucune identité réelle, et l'adresse de la page D jamais écrite dans le dépôt.
