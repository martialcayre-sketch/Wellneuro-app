# Handoff — 2026-10-27 — File C : bb, lot 2 — les trois plans au patient, sous drapeau éteint (D-384 §2-§4, D-386, H49)

## Branche et état du dépôt

- Branche `lot/bb-lot2-detail-trois-plans`, partie de `origin/main`
  (78edfba9, #1730) ; worktree `j3-12e-ingestion`, session concurrente, cycle
  en `git`/`gh` direct.
- Ni migration, ni release-db attendue de ce lot.

## Objectif

Lot 2 de bb : le détail du protocole servi au patient lit les trois plans, et
« Jour difficile ? » mène au plan de secours, sous drapeau éteint, pour les
seules versions créées sous la garde étendue (lot 1, #1725).

## Décisions prises

- D-386, amendement du 2026-10-27 : instant `2026-10-27T00:00:00Z` comparé à
  la colonne `created_at` de la ligne (strictement postérieure) ; drapeau
  `WN_PORTAIL_TROIS_PLANS` ; chapeau une fois sous « Vos actions » ;
  l'orientation vers le médecin garde son plan minimal au jour difficile.
- Les plans voyagent hors de la vue signée (`troisPlans`, comme `pauses`) :
  `c1-patient-protocol-view-v2` et ses empreintes inchangés ; seuls ceux des
  actions fermes et hors pause quittent le serveur.

## Fichiers modifiés

- `web/src/lib/portail/troisPlans.ts` (+ banc) : drapeau, instant, sélection.
- `web/src/lib/portail/texteTroisPlans.ts` (+ banc relisant D-384 §2).
- `web/src/app/api/portail/protocole/route.ts` (+ banc).
- `web/src/components/patient-companion/PatientCompanionHome.tsx` (+ banc).
- `docs/DECISIONS.md` (D-386, amendement), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H49), `changelog.d/2026-10-27-bb-trois-plans.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Bancs ciblés verts (route 35, accueil 50, modules).
- T1 (`check:rapide`) vert ; T3 (`test:worktree`) vert, séquence complète,
  300 E2E (après regénération de `MATRICE_CONSOMMATION.md`).
- `/code-review medium` : trois constats corrigés (plans rognés comme le
  minimal, filtre rejoué à l'écran, boucle typée), cinq écartés avec motif
  (instant vérifié : déploiement de #1725 fini avant minuit UTC, aucun recul ;
  orientation = arbitrage ; garde à la lecture écartée par D-386).
- `wn-reviewer` : GO, ni P0 ni P1 ; P2-1 repris (test d'écran de la pause).

## Problèmes ouverts

- Le miroir praticien (`api/praticien/ja/cycle`) ne sert pas `troisPlans` :
  il n'alimente que l'épisode du carnet, hors de ce lot.
- Le double point final de « Si vous le pouvez aujourd'hui : … » (plan déjà
  ponctué) existe en production avant ce lot ; non traité.

- À trancher avant l'activation (`wn-reviewer`, P2) : le miroir praticien
  ne montrera que le plan minimal quand le patient lit trois plans ; et tant
  que `WN_PORTAIL_LECTURE_PROTOCOLE` est fermé, le détail est déplié d'office,
  donc les trois plans se lisent dès l'arrivée (régime de D-315).

## Prochaine action exacte

PR, CI (`wn-attendre-ci`), revue CodeRabbit de la tête ; sonder les runs
`release-db` en attente (D-374 §5) ; merge `--match-head-commit` ; déploiement
constaté sur Scalingo.

## Interdits encore actifs

- Drapeau éteint ; activation hors lot (file C, porte 18), constatée sur un
  vrai dossier dont la version est postérieure à l'instant, après contrôle
  d'absence de recul sous #1725 (D-386 §2).
- Aucune migration ; aucun texte patient inventé ; production en lecture seule.
