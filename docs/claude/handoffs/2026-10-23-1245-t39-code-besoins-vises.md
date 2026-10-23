# Handoff — t39 : besoins visés de la priorité libre, PR 2 (code consommateur)

## Branche et état du dépôt

- Branche `lot/t39-code-besoins-vises`, worktree `d281-lot3-portail`, partie
  de `origin/main` (4654b13d, #1652), main fusionnée (64b94294, #1653).
  Session concurrente, cycle en `git`/`gh` direct. PR 2 sur 2 du lot t39.

## Objectif

H84 : la priorité libre reçoit des « besoins visés » facultatifs, lus par la
re-passation ciblée seule (D-338 §3, amende D-279 §1), pour que les besoins
sans règle puissent être re-mesurés.

## Décisions prises

- Constat préalable (2026-10-23) : release-db 39920257712 approuvée,
  sentinelle `WN_RELEASE_DB_OK id=39920257712-1`, `prisma migrate status` à
  jour (128 migrations) par conteneur, colonne `besoins_vises` NOT NULL
  défaut `{}`, trois CHECK validés, fonction IMMUTABLE, 0 ligne remplie ;
  première ligne des déploiements = 4654b13d.
- Arbitrage du 2026-10-22 appliqué : douze cases ; mention « Aucun
  questionnaire à re-passer pour ce besoin. » dérivée de
  `questionnairesCiblesPourPriorite`, jamais d'une liste recopiée.
- Question de la revue de #1652 tranchée : canal distinct
  (`besoinsVisesPrioriteLibre` → `besoinsVisesPraticien`), et texte du bloc
  propre au choix du praticien. Exclusif des `needIds` par construction.
- Clé `besoinsVises` absente quand vide, à la carte comme à la lecture ;
  `VERSION_DECISION_CARD` inchangée ; identifiant `libre:` inchangé.
- Liste des douze prise à `fiches-usage/vocabulaire` (`BESOINS`, pur), parité
  avec les clés de `BESOIN_SOURCES` déjà épinglée par `clesLien.test.ts` :
  aucun test neuf ne nomme `BESOIN_SOURCES`.

## Fichiers modifiés

- `web/src/lib/clinical-engine/prioriteLibre.ts` (type, `BESOINS_VISABLES`,
  `estBesoinsVisesCanoniques`, `canoniserBesoinsVises`, en-tête amendé),
  `decisionCard.ts`, `selectionPrioritePrisma.ts`.
- `web/src/app/api/praticien/cockpit/priorite/route.ts`.
- `web/src/components/patient-cockpit/SelectionPrioritePanel.tsx`,
  `ClinicalRuntimeSection.tsx`, `TrajectoirePanel.tsx`,
  `web/src/components/FichePatientPanel.tsx`.
- Bancs : `prioriteLibre`, `decisionCard`, `selectionPrioritePrisma`, route,
  `SelectionPrioritePanel`, `TrajectoirePanel`.
- `changelog.d/2026-10-23-t39-code-besoins-vises.md`, SESSION_LOG.

## Validations exécutées

- Six bancs touchés : 136 tests verts ; `tsc` vert ; T1 rapide vert.
- T3 et `wn-reviewer` : voir la PR.

## Problèmes ouverts

- Aucun pour le lot. t40 (H84, acte daté, autre migration) s'ouvre après
  le constat de t39.

## Prochaine action exacte

CI (`wn-attendre-ci`), CodeRabbit sur la tête avec un verdict par
commentaire, aucune release-db d'une autre session en attente, merge
`--match-head-commit`, détacher le worktree ; observer le déploiement
(`wn-deploiement-observation.mjs`) ; t39 « fait » au suivi de la file A.

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; aucune image antérieure à 257807e3
  redéployée ; rien de clinique hors D-338 ; ni la hiérarchie des assiettes,
  ni les règles, ni le score, ni le portail ne lisent les besoins visés ; les
  PR et release-db des autres sessions ne sont pas à cette session ; M-2, t36,
  m38 sont des gestes du responsable.
