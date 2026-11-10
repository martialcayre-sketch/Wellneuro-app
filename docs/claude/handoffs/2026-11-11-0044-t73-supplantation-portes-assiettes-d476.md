# Handoff — t73, D-476 : supplantation au service des portes biologiques et des assiettes indiquées

## Branche et état Git

- Branche `feat/t73-portes-assiettes-supplantation`, créée depuis origin/main b50e0fdc (copie principale).
- Premier commit eb57f5a9 ; corrections de revue et ce handoff dans le commit suivant. PR à ouvrir.

## Objectif

Dette t73 (§8), versée par t66 (D-472 §6). Les deux services taisaient un claim
devenu invalide, mais pas un claim encore `VALIDE` et supplanté, que le préflight
de release-db refuse.

## Décisions prises

- Le cadrage a été validé par le responsable le 2026-11-11, avec deux arbitrages :
  - textes alignés sur D-472 (« ne satisfait pas les critères de validité du corpus ») ;
  - t74 inscrite (catalogue décisionnel des compléments).
- Critère : valide ∩ non supplanté, lu en parallèle sur tous les couples de la
  table. Les filtres purs et les tables signées sont inchangés, sans re-signature
  ni migration. L'échec de l'une ou l'autre lecture rend le corpus illisible.
- La lecture des textes des portes exige elle aussi `superseded_at IS NULL` (revue, P2-1).
- t75 est inscrite au §8 (fiches d'assiette, `claimsValidesEtLeursTextes`), à
  la suite de la revue (P2-4). Rien n'est tranché.

## Fichiers modifiés

- `web/src/lib/clinical/portesBiologiquesService.ts`, `indicationsAssiettesService.ts`
- `web/src/components/patient-cockpit/PortesBiologiquesSection.tsx`, `AssiettesIndiqueesPanel.tsx`
- Tests :
  - `indicationsAssiettesService.test.ts` ;
  - les deux `route.test.ts` sous `api/praticien/assiettes-indiquees` ;
  - les deux tests d'écran.
- `docs/decisions/D-476.md`, `changelog.d/2026-11-11-t73-portes-assiettes-supplantation.md`,
  `docs/claude/PLAN_WELLNEURO.md` §8 (lignes t74, t75).

## Validations exécutées

- Vitest ciblé : vert (133 tests, puis 81 après les corrections).
- T1 complet : vert sur eb57f5a9. `check:rapide` : vert après les corrections.
- `wn-reviewer` : GO, ni P0 ni P1. Verdicts en D-476 §7.
- T3 : lancé sur eb57f5a9, puis arrêté pour appliquer la revue. Il est à
  rejouer sur la tête finale avant « prête ».

## Problèmes ouverts

- T3 sur la tête finale.
- Revue de tête : CodeRabbit, puis Copilot, puis PR-Agent.

## Prochaine action exacte

1. T3 complet.
2. Ouvrir la PR (`--body-file`), lancer `wn-attendre-ci` en fond, demander `@coderabbitai review`.
3. Donner un verdict à chaque constat de revue, puis déclarer « prête @<sha> ».
4. Après le merge : release-db à approuver (lib/clinical), puis constat par
   conteneur. Vérifier par ascendance que le commit déployé contient celui du
   merge, et chercher dans `.next/server` « une de ses sources ne satisfait »
   et « un de leurs claims ne satisfait ».
5. Passer t73 à « fait » sur la page et dans la mémoire `suivi-file-a-artefact`.

## Interdits encore actifs

- Pas de merge par la session : l'intégrateur merge.
- Une seule release-db en attente à la fois.
- Pas de migration ni de `schema.prisma`.
- Aucune identité réelle.
- Lecture de la prod uniquement par `scalingo run -d`.
- Pas de pull, merge ou rebase automatique.
- Ne pas toucher à t65 (#1967, autre session) ni à t61.
- Vérifier la branche avant chaque commit : d'autres sessions travaillent sur la même copie.
