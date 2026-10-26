# Handoff — 2026-10-26 — r3_09 : ordre fixe des 12 besoins, provenance de l'onglet (Q1)

## Branche et état du dépôt

- Branche `feat/r3-09-ordre-besoins`, partie de `origin/main` (6bcd57ba),
  worktree `j3-12e-ingestion`. Session concurrente, cycle en `git`/`gh`
  direct.

## Objectif

Lot r3_09 de la file A (audit F59, Q1), détaché de J3-12b le 2026-10-25 :
ordre fixe B1 à B12 groupé par strate, clé « Bn · libellé », dans l'onglet
et dans le tiroir ; fin du tri « creux d'abord » du tiroir, qui contredisait
son sous-titre (D-333 §2 r4) ; provenance du tableau et du radar de l'onglet
(P1 de CodeRabbit sur #1674, routé ici).

## Décisions prises

- Inventaire avant le code : les cercles étaient déjà en ordre fixe avec la
  clé (r3_08), donc inchangés. Seule la route d'équilibre triait. La route
  de l'onglet ne servait aucune provenance.
- Validé par le responsable avant le code (2026-10-26) : une ligne d'en-tête
  par strate (« Corps », « Ancrage », « Esprit ») dans les deux tableaux ;
  sur le radar, l'axe d'une valeur sans provenance dit « source non
  enregistrée », et un seul repli « Source » sous la figure ; pas de drapeau.
- Pas de nouvelle D-xxx : Q1 (2026-10-22, M-2 signée) et D-333 §2 r1 et r4.
- `provenanceDesSources` est sortie de la route d'équilibre
  (`lib/praticien/provenanceSources.ts`) pour que les deux routes disent la
  même provenance de la même valeur.
- L'écran ne croit pas l'ordre reçu (`lib/praticien/ordreBesoins.ts`, module
  pur) : un ancien conteneur sert encore le tri pendant le déploiement.

## Fichiers modifiés

- Routes `web/src/app/api/praticien/equilibre/route.ts` (tri retiré,
  provenance par le module partagé) et `web/src/app/api/praticien/besoins/route.ts`
  (champ `provenance`).
- `web/src/lib/praticien/provenanceSources.ts`, `ordreBesoins.ts` (neufs),
  `provenanceChiffre.ts` (`fusionnerProvenances`).
- `web/src/components/FichePatientPanel.tsx` (tableau du tiroir),
  `DetailBesoinsPanel.tsx` (tableau, radar, repli « Source »),
  `ui/ScoreRadar.tsx` et `ui/scoreRadarPoints.ts` (libellé d'axe d'absence).
- Bancs : les deux routes, les deux panneaux, le radar, la provenance,
  l'ordre, le commentaire du banc des cercles ; E2E `fiche-radar-besoins`.
- `changelog.d/2026-10-26-r3-09-ordre-fixe-provenance-onglet.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Bancs touchés : 82 fichiers, 1700 tests verts ; T1 rapide vert
  (15 étapes).
- `/code-review medium`, sept constats. Corrigé : des versions mélangées
  rendaient le radar muet sur sa source alors qu'il traçait. Elles sont
  désormais dites toutes deux, jamais résumées.
  Écartés avec motif :
  - strate inconnue écartée du groupement : type fermé, servi par les deux
    routes, et les cercles filtrent déjà de la même façon ;
  - `useMemo` : douze lignes ;
  - `agregerEquilibre` : déjà calculé pour le compte, désormais une fois ;
  - axes en double dans la `Map` : les axes sont uniques ;
  - duplication des deux tableaux : leurs branches diffèrent (piste, carte
    liée) et J3-12b réorganise l'onglet.
- T2, premier passage : rouge sur `specs-drapeau-ali01`, parce qu'un
  commentaire du banc de route nommait l'instrument alimentaire. Commentaire
  reformulé, banc vert.
- T2, deuxième passage : 900 fichiers et 15 120 tests Vitest verts ; E2E
  rouge sur `fiche-radar-besoins` (fixture sans provenance, donc plus rien
  de tracé, comportement voulu). Fixture complétée avec un cas sans
  provenance (B12 mesuré sans provenance : 9 points, un axe « source non
  enregistrée », repli « Source » du radar visible). Troisième passage :
  vert en 7 min 7 s (15 120 tests Vitest, 300 E2E, 6 sautés).

## Problèmes ouverts

- Base visuelle `fiche-tiroir-besoins` (et peut-être celle de l'onglet) à
  régénérer par le workflow `visual-baselines` si `verify` la refuse ;
  committer seulement les bases refusées.
- Restent dans la file A : r3_15 (F9a : légende de la table, phrase d'état
  du radar, `role="status"` du chargement, à relire avant le code) et
  r3_12 (attend la lettre o).

## Prochaine action exacte

PR, CI en fond (`wn-attendre-ci`), bases visuelles si besoin, revue de
CodeRabbit sur le sha de tête avec un verdict par commentaire, liste des
runs `release-db` en attente, merge, déploiement observé. Puis pages file A
(r3_09 → fait) et Instruments (v11), mémoires.

## Interdits encore actifs

- Aucune migration ; aucun calcul, seuil ni version ; aucune couleur, aucun
  mot ni rang qui juge une valeur (D-333 §2 r4).
- Portail inchangé (`frontierePortail.guard`) ; production en lecture seule ;
  aucun identifiant de dossier accompagné d'un constat dans le dépôt.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête.
