# Handoff — 2026-10-18 — J2-radar : un besoin non mesuré n'est pas un zéro (D-301, H12)

## Branche et état Git

- Branche `j2-radar-non-mesure`, depuis `origin/main` 03dd8c00, worktree
  `d281-lot3-portail` (session concurrente, cycle en git/gh direct ; file A
  en autonomie, délégation du 2026-10-18).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan, fiche H12, rang 1 : exécuter D-301. Au radar des douze besoins, un
besoin non mesuré est un axe sans point, nommé « non mesuré », jamais un
zéro. Le lot lève la porte 3.

## Décisions prises

- Aucune décision neuve : D-301 est appliquée telle quelle. Le tableau voisin
  (« — ») ne change pas.
- recharts 3.9 trace une valeur absente au centre, donc comme un zéro. On
  passe par une forme personnalisée : `Polygon`, avec des sommets `NaN` sur
  les axes non mesurés, coupe le tracé ; une mesure porte son point ; le
  libellé de l'axe reçoit une seconde ligne « non mesuré ».
- La règle vit dans un module pur (`components/ui/scoreRadarPoints.ts`),
  selon la consigne des composants `'use client'`.

## Fichiers modifiés

- `web/src/components/ui/scoreRadarPoints.ts` (+ test) ;
  `web/src/components/ui/ScoreRadar.tsx` ;
  `web/src/components/DetailBesoinsPanel.tsx`.
- `web/e2e/fiche-radar-besoins.spec.ts` (neuf).
- `docs/claude/PLAN_WELLNEURO.md` (H12, porte 3) ;
  `changelog.d/2026-10-18-j2-radar-non-mesure.md`.

## Validations exécutées

- T1 complet vert.
- T2 (`--fast`) vert : Vitest 13 434 verts et 4 sautés, E2E 276 verts et
  6 sautés ; le nouveau spec est vert sur Desktop Chromium et sur iPhone 13.
- Banc du `Polygon` réel de recharts, avec contre-épreuve « tout mesuré,
  contour fermé et rempli ».

## Problèmes ouverts

- La porte 3 se lève au déploiement constaté.
- Aucune base visuelle n'est touchée : le tiroir capturé par `visual.spec.ts`
  n'a pas de radar.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge, constat du déploiement ;
page de la file A : r1_01 passe à fait. Lot suivant de la file A, dans
l'ordre du plan.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
