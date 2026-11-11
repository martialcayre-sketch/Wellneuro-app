# Handoff — t72, D-491 : arrêts, contradictions, conflits de sources — validité des claims constatée au service

## Branche et état Git

- Branche `feat/t72-arrets-contradictions-conflits-admissibilite`, créée depuis origin/main 637d6284 (copie principale).
- Premier commit b120fe23 ; corrections de revue et ce handoff dans le commit suivant. PR à ouvrir.

## Objectif

Dette t72 (§8), versée par t66 (D-472 §6) : `STOP_RULES_V1` (5 couples), `CONTRADICTIONS_RULES_V1` (1)
et `CONFLITS_SOURCES_V1` (23) étaient servis sans constat d'admissibilité de leurs claims à la lecture.

## Décisions prises

- Cadrage soumis sans code ; responsable a tranché le 2026-11-11 les questions 20261111-1552-a à 1555-a
  (options recommandées), avec « Registre de conflits à relire » et « corpus illisible ⇒ jamais d'extinction ».
- Arrêt : une règle dont un couple n'est pas admissible n'est pas passée au moteur, rien n'est éteint,
  `arretsSuspendus` servi et affiché (« Règle d’arrêt suspendue »). `dejaRepondu` inchangé.
- Contradiction : constat brut et frein (D-053 §5) intacts ; réserve à l'affichage seulement (`reserveSource`).
- Conflits : conservés et escaladés ; réserve désignant le claim en cause.
- §8 : ligne t72 corrigée (arrêt = extinction D-053, pas DC-12) et soldée ; t77 inscrite (synthèse IA muette
  sur la suspension, t71 y ajoutera les règles d'orientation non appliquées).
- Module partagé `lib/clinical/admissibiliteClaims.ts`, à réutiliser par t71.
- Les 4 questions de t71 (1556-a à 1559-a) sont aussi répondues : t71 vient après t72, un seul lot ;
  la CONVERGENCE (claims d'orientation) reste à traiter dans t71 (D-491 §7).

## Fichiers modifiés

- `web/src/lib/clinical/admissibiliteClaims.ts` (+ test), `orientationService.ts` (+ test),
  `contradictionsService.ts`, `contradictionsReserveSource.test.ts`
- `web/src/app/api/praticien/orientation/route.ts`
- `web/src/components/patient-cockpit/OrientationPanel.tsx`, `MissingDataPanel.tsx` (+ tests)
- `web/src/lib/synthese/blocReglesNonEvaluees.test.ts` (fixture)
- `docs/decisions/D-491.md`, `changelog.d/2026-11-11-t72-arrets-contradictions-conflits-admissibilite.md`,
  `docs/claude/PLAN_WELLNEURO.md` §8 (t72, t77)

## Validations exécutées

- Vitest ciblé : vert (cliniques, routes, cockpit, synthèse : 3025 puis bancs D-491 ajoutés, verts).
- T1 complet vert sur b120fe23 ; `check:rapide` vert après les corrections de revue.
- `wn-reviewer` sur b120fe23 : GO, aucun P0 ; verdicts en D-491 §10.
- T3 lancé sur b120fe23 (en cours au moment de l'écriture) : à constater ou rejouer sur la tête finale.

## Problèmes ouverts

- T3 sur la tête finale.
- Revue de tête : CodeRabbit, puis Copilot (quota), puis PR-Agent ; passe Codex manuelle (P0 clinique).
- Textes affichés rédigés par la session (D-491 §6), hormis « Registre de conflits à relire » : validation
  du responsable demandée.

## Prochaine action exacte

1. Résultat de T3 (rejouer sur la tête finale si besoin).
2. Ouvrir la PR (`--body-file`), `wn-attendre-ci` en fond, `@coderabbitai review`, préparer le bloc Codex.
3. Verdict pour chaque constat, puis « prête @<sha> » en commentaire.
4. Après merge : release-db à approuver (lib/clinical), constat conteneur : ascendance du commit déployé,
   puis `arretsSuspendus`, `validite_non_verifiee`, « Registre de conflits » dans `.next/server`.
5. t72 → fait (page t72, mémoire `suivi-file-a-artefact`), questions 1552-a à 1555-a → close. Puis t71.

## Interdits encore actifs

- Pas de merge par la session : l'intégrateur merge.
- Une seule release-db en attente à la fois (#1976, migration H59, ouverte).
- Pas de migration ni de `schema.prisma` ; aucune re-signature de table.
- Aucune identité réelle ; lecture prod uniquement par `scalingo run -d`.
- Pas de pull, merge ou rebase automatique ; vérifier la branche avant chaque commit.
- Ne pas toucher à t65, t74, t75 (autres sessions).
