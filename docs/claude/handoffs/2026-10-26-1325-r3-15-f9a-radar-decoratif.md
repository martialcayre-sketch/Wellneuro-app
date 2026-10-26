# Handoff — 2026-10-26 — r3_15 (F9a, H64) : radar des 12 besoins décoratif, la table porte tout

## Branche et état du dépôt

- Branche `feat/r3-15-f9a-radar-accessibilite`, partie de `origin/main`
  (d645bfd8), fusionnée sur 91f53ad7 (#1712, #1713) avec l'accord du
  responsable. Worktree `j3-12e-ingestion`, session concurrente, cycle en
  `git`/`gh` direct.

## Objectif

Lot r3_15 de la file A : F9a (H64), l'accessibilité du radar et de la table
de l'onglet « Les 12 besoins ». Détaché de J3-12b par #1706, il se fait sur
l'onglet actuel ; J3-12b le reprendra.

## Décisions prises

- Arbitrages du 2026-10-25, appliqués tels quels : le radar est décoratif
  (`aria-hidden`, sans phrase de résumé) ; les graduations perdent leurs
  nombres et gardent leurs anneaux, comme en mode consultation (l'axe radial
  est retiré aussi, comme là).
- Couche d'accessibilité de recharts coupée (`accessibilityLayer={false}`).
  Sans cela, le svg masqué restait un arrêt de tabulation
  `role="application"` (`aria-hidden-focus`).
- Textes validés par le responsable avant le code (2026-10-26) :
  - légende `sr-only` « Couverture des 12 besoins, de B1 à B12, par strate » ;
  - le tiret reste visible (D-301 §1), mais le lecteur d'écran lit « non
    mesuré » à sa place ;
  - aucune phrase d'état au-dessus du radar ;
  - `role="status"` sur le chargement, texte inchangé ;
  - repli « Source » sous la figure renommé « Source — ensemble des valeurs
    du tableau ».
- Pas de D-xxx : H64 et les arbitrages du 2026-10-25 suffisent.
- Tiroir non touché : `CerclesBesoinsCockpit` et le tableau du tiroir n'ont
  pas de radar.

## Fichiers modifiés

- `web/src/components/ui/ScoreRadar.tsx` : figure masquée, graduations sans
  nombre.
- `web/src/components/DetailBesoinsPanel.tsx` : légende, « non mesuré » lu,
  nom du repli « Source », `role="status"`.
- Bancs : `DetailBesoinsPanel.test.tsx` (légende, statut, nom du repli,
  cellule « non mesuré ») ; E2E `fiche-radar-besoins.spec.ts` (figure
  masquée, hors tabulation, anneaux sans nombre, légende).
- `changelog.d/2026-10-26-r3-15-f9a-radar-decoratif.md`, ce handoff.

## Validations exécutées

- T1 rapide vert (15 étapes).
- T2, premier passage : Vitest vert (900 fichiers, 15 123 tests). E2E rouge
  sur `fiche-radar-besoins` (2 projets). L'assertion « aucun `[tabindex]`
  dans la figure » comptait les 12 portails `tabindex="-1"` de recharts,
  qui ne sont pas dans la tabulation ; le banc axe, lui, était vert.
  L'assertion vise maintenant le seul élément tabulable.
- T2, second passage : vert en 2,3 min d'E2E (Vitest 900 fichiers et
  15 123 tests ; 300 E2E, 6 sautés), banc axe compris.
- `/code-review medium`, six constats :
  - corrigé : le sélecteur E2E de la figure, désormais sur la surface ;
  - écarté, banc du tiroir (`FichePatientPanel.test.tsx:1227`) : le tiroir
    ne rend pas `DetailBesoinsPanel`, et Vitest est vert ;
  - écarté, axe radial retiré : l'arbitrage dit « comme en mode
    consultation », où il l'est aussi ;
  - écarté, renommage du repli : aucun autre consommateur (grep) ;
  - écarté, nom de cellule suivi du motif : l'E2E le lit par préfixe, et le
    test exact vise l'ancien conteneur sans motif ;
  - écarté, `role="status"` sur le seul chargement : l'arbitrage porte sur
    lui, et l'erreur a déjà `role="alert"`.

## Problèmes ouverts

- Aucune base visuelle ne couvre l'onglet (`visual.spec.ts` capture le
  tiroir seul) : régénérer seulement si `verify` refuse une base.
- File A : reste r3_12 seul (attend la lettre o). La passe humaine E67 reste
  un geste de la file D.

## Prochaine action exacte

PR, CI en fond, revue de CodeRabbit sur le sha de tête avec un verdict par
commentaire, liste des runs `release-db` en attente (D-374 §5), merge,
déploiement observé. Puis : page file A (r3_15 → fait), page Instruments
v11 → v12, mémoires.

## Interdits encore actifs

- Aucune migration ; aucun calcul ni seuil ; portail inchangé ; production
  en lecture seule ; aucun identifiant de dossier accompagné d'un constat
  dans le dépôt.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête.
