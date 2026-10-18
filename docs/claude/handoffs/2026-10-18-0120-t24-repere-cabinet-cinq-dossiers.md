# Handoff — 2026-10-18 — t24 : le repère de cabinet compte les dossiers distincts (D-298 §5)

## Branche et état Git

- Branche `t24-repere-cabinet-cinq-dossiers`, depuis `origin/main` 9aec4a5b,
  worktree `d281-lot3-portail` (session concurrente, cycle en git/gh direct ;
  file A en autonomie, délégation du 2026-10-18).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan §8, ligne « repère de cabinet masqué sous cinq cycles » (D-298 §5) :
masquer aussi sous cinq dossiers distincts, avec affichage des effectifs et
banc « sous cinq », avant la lettre y (H58).

## Décisions prises

- Aucune décision neuve : D-298 est appliquée telle quelle. Le seuil de cinq
  cycles est gardé (A6-2) et la condition des cinq dossiers s'ajoute : les
  deux valent ensemble.
- Une médiane par jalon dont les valeurs viennent de moins de cinq dossiers
  est masquée (D-298 §2). L'écran dit combien de jalons sont masqués et
  pourquoi.
- Le dossier est l'indice dans `cyclesParPatient` : la route fournit une
  entrée par patient.

## Fichiers modifiés

- `web/src/lib/protocol/cabinet.ts` (+ test) ;
  `web/src/components/patient-cockpit/MomentumPanel.tsx` (+ test).
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldé, fiche des effectifs) ;
  `changelog.d/2026-10-18-t24-repere-cabinet-cinq-dossiers.md`.

## Validations exécutées

- T1 complet vert.
- T2 (`--fast`) vert : Vitest 13 431 verts et 4 sautés, E2E 274 verts et 6 sautés.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge. Page de la file A :
l'élément t24 passe à fait. Lot suivant de la file A, dans l'ordre du plan.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
