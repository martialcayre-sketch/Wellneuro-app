# Handoff — t51, D-494 : table d'arrêt re-signée sur { règles, grilles }

## Branche et état Git

- Worktree `.claude/worktrees/t51-empreinte-arret-grilles`, branche `feat/t51-empreinte-arret-grilles`, depuis
  `origin/main` 3b9e318f.
- Commits : 4a8a9aeb (lot), 0ea1c4e3 (date de `docs/FEATURE_FLAGS.md`, constat P1 de wn-reviewer), puis ce handoff.
- La copie principale reste détachée sur 3b9e318f, avec un `ci.yml` modifié par une autre session (BP-17) : ne pas
  y toucher.

## Objectif

Dette t51 (§8), application de D-400 §1. L'empreinte signée de la table d'arrêt couvre la règle STOP-STR et les
grilles qu'elle cite, sans changement de comportement. Le responsable re-signe dans le lot.

## Décisions prises

- Question `20261111-2147-a` (clinique) : le responsable re-signe l'empreinte
  `b73cc1b6879b24026a9c489fe5ae10eb6223bf7d70b7e0de4235ed44b9b5dde2`, en date du 2026-11-11 (D-494).
- Périmètre : `{ regles: STOP_RULES_V1, grilles: GRILLES_ARRET }`, avec `GRILLES_ARRET = grillesCitees(STOP_RULES_V1)`
  (Q_STR_01, Q_STR_03, Q_STR_04). Ni fenêtres ni convergence : elles ne pèsent pas sur l'arrêt.
- Revue wn-reviewer : GO sous réserve. P1-1 (`FEATURE_FLAGS.md:385`, la date rougissait
  `verrousSignatureDocumentes.guard.test.ts`) : corrigé. P2-1 (« deux signatures » dans l'en-tête de
  `grillesSignees.ts`) : écarté, motif : le paragraphe « TROISIÈME TABLE » ajouté corrige le sens ; on évite de
  réécrire un en-tête historique (changement minimal).

## Fichiers modifiés

- `web/src/lib/clinical/stopRulesV1.ts` (+ test) et `web/src/lib/clinical/grillesSignees.ts` (en-tête).
- `docs/decisions/D-494.md`, `changelog.d/2026-11-11-t51-empreinte-arret-grilles.md`.
- `docs/claude/PLAN_WELLNEURO.md` (§8 : t51 soldée), `docs/FEATURE_FLAGS.md`.

## Validations exécutées

- `npm run check` (T1 complet) vert sur 4a8a9aeb. Suites `src/lib/clinical`, `src/lib/synthese` et `e2e/helpers` :
  vertes (1 134 tests). Garde `verrousSignatureDocumentes` et `stopRulesV1.test.ts` verts sur 0ea1c4e3.
- T3 : lancé dès la fin des runs E2E des autres sessions (BP-17, refonte PAT-3), jamais en parallèle d'eux.

## Problèmes ouverts

- Question de wn-reviewer, hors périmètre et antérieure au lot : le moteur d'arrêt évalue STOP-STR sur les dernières
  passations SANS fenêtre de fraîcheur (`orientationEngine.ts`, autour des lignes 1552 et 1793). Un DASS-21 « Normal »
  ancien peut donc éteindre une exploration. À router (dette §8 ou question de la liste commune) sur décision du
  responsable.
- D-493 est en vol (#2001, autre session) : le trou ne produit qu'un avertissement.

## Prochaine action exacte

1. T3 vert sur la tête, puis ouvrir la PR (`--body-file`).
2. CI à 0 (`wn-attendre-ci`). Revue de tête : `@coderabbitai review`, puis Copilot, puis PR-Agent, un verdict par
   constat. Passe Codex P0 manuelle (bloc `$wellneuro-pr-review`).
3. Commentaire « prête @<sha> », puis arrêt : l'intégrateur merge.
4. Après le merge : release-db à approuver (une seule en attente ; BP-17 #1994 est une migration), puis constat par
   conteneur (`b73cc1b6` dans `.next/server`, `1db9a002` absent). Ensuite t51 → fait, et question `20261111-2147-a`
   → close.

## Interdits encore actifs

- Pas de merge par la session ; une seule release-db en attente à la fois.
- Aucune autre re-signature, aucune migration ni modification de `schema.prisma`, aucune borne ni aucun claim touché.
- Prod en lecture seulement, par `scalingo run -d` ; aucune identité réelle.
- Ne pas toucher à t71b, t75, t76, t65, t74, à la refonte Lien ni à BP-17 ; vérifier la branche avant chaque commit.
- Ne jamais relancer un rouge WebKit du CI ; jamais deux runs E2E en parallèle sur le Mac.
