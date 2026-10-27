# Handoff — 2026-10-27 — File C : bb, lot 2 — les trois plans au portail, sous drapeau éteint (D-384 §2-§4, D-386, H49)

## Branche et état du dépôt

- Branche `feat/bb-lot2-trois-plans-portail`, partie de `origin/main`
  (78edfba9, #1730), main refusionné après #1727 (1fd2a4b9) ; worktree
  `act5-mineurs`, session concurrente, cycle en `git`/`gh` direct.
- Ni migration, ni release-db attendue (aucun fichier sous
  `web/src/lib/clinical/**`).

## Objectif

Lot 2 de bb : le détail du protocole lit les trois plans de chaque action
ferme, et « Jour difficile ? » propose le plan de secours, sous drapeau éteint,
pour les seules versions créées sous la garde étendue du lot 1 (#1725).

## Décisions prises

- Drapeau `WN_PORTAIL_TROIS_PLANS` (chaîne exacte `true`), neuf et éteint ;
  instant `2026-10-27T00:00:00.000Z` ; marque = colonne
  `protocol_drafts.created_at` strictement postérieure ; doute = refus. Écrits
  dans D-386 (paragraphe « Lot 2 ») et `docs/FEATURE_FLAGS.md`.
- Circuit : la route `api/portail/protocole` sert `troisPlans` hors de la vue
  signée (`c1-patient-protocol-view-v2` inchangée), comme les pauses ; le
  composant rend ce qui est servi, avec un filtre de défense (attente, pause).
- Forme : par action, chapeau « Selon votre journée : » puis liste de
  définitions dans l'ordre de D-384 §2 ; une action sans ses deux plans garde
  son plan minimal seul.
- Arbitrage du responsable (question à options, 2026-10-27) : l'orientation
  vers le médecin (D-257) n'entre jamais dans les trois plans ; elle garde son
  régime, et le jour difficile lui propose son plan minimal. Écartés : passer
  au geste suivant ; la lettre de D-384.

## Fichiers modifiés

- `web/src/lib/portail/troisPlans.ts` (+ test), `texteTroisPlans.ts` (+ test)
- `web/src/app/api/portail/protocole/route.ts` et `route.test.ts`
- `web/src/components/patient-companion/PatientCompanionHome.tsx` et test
- `web/src/lib/gamification-patient.guard.test.ts` (texte inscrit)
- `docs/DECISIONS.md` (D-386, lot 2), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H49),
  `changelog.d/2026-10-27-bb-trois-plans-portail.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Bancs ciblés (module, texte relu contre D-384 §2, route, composant, garde de
  gamification) : 124 tests verts.
- T1 complet vert avant chaque commit.
- T2 (`test:worktree -- --fast`) vert sur 01b0904d (10 min 15 s, E2E
  Chromium + WebKit). Rejoué sur 368662e6 : trois échecs de bornes de temps
  dans des fichiers hors du lot (`ProtocolMiniBuilder`, `masquage`), charge
  de la machine autour de 20 ; ces deux fichiers rejoués seuls : 256 verts.
  T2 à rejouer après la fusion de main.
- `wn-reviewer` : GO drapeau éteint, aucun P0. P1 (orientation) tranché et
  corrigé ; P2 repris : texte sous le garde de gamification, banc inverse du
  `createdAt` du payload, absence de « INTERNE » drapeau ouvert, détail replié
  et fin de cycle.

## Problèmes ouverts

- Avant l'activation : le miroir praticien (`ApercuPatientProtocole`) et la
  version imprimable (bh) lisent encore le plan minimal seul.
- « Jour difficile ? » ajoute un point après le plan : un plan minimal qui
  finit déjà par un point s'affiche « .. » (défaut antérieur au lot, relevé par
  la revue et par CodeRabbit ; non corrigé ici pour que rien ne change drapeau
  éteint). Le plan de secours, lui, perd son point final avant le gabarit.
- Constat d'activation : vérifier que les plans apparaissent bien sur une
  version récente (un refus silencieux de la marque passerait inaperçu), et
  qu'aucun recul de production sous 39131a45 n'a eu lieu après l'instant.

## Prochaine action exacte

T2 après la fusion de main, PR, CI (`wn-attendre-ci`), revue CodeRabbit de la
tête, sonde des runs `release-db` non conclus (D-374 §5), merge
`--match-head-commit`, déploiement constaté sur Scalingo ; puis ligne o02 de
la page de suivi de la file C.

## Interdits encore actifs

- Aucune migration ; aucun texte patient, seuil ou fenêtre inventés.
- Production lue par identifiant, depuis un conteneur seulement, en
  agrégats ; dans le dépôt, « un dossier de test ».
- Aucun lien d'artefact dans le dépôt.
- Rien de bb servi avant son activation (porte 18, après l'encart) ; place 7
  dans sa fenêtre seulement (2026-11-01 au 2026-11-07) ; places 8 à 11
  bloquées.
