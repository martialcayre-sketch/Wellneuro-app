# Handoff — J3-12f, lot d'interface : radar (D-550) et vignette du constat (D-551, D-553) (2026-11-25)

## 1. Branche et état Git

- Branche `fix/j312f-interface-radar-vignette`, avancée en ff-only sur `origin/main` (68c0d494a, #2328 mergée), via
  l'arbitrage D-518 du 2026-11-25 (1005-b) : patch du seul `FichePatientPanel.test.tsx` mis de côté dans le scratchpad,
  fichier restauré, avance, réapplication en `--3way`, conflit résolu à la main sans perdre aucun test de #2328.
  Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (D-518).

## 2. Objectif

D-550 (radar descriptif : mention, douze axes, conditions déjà servies constatées) et D-551 (vignette qualitative du
constat sur les besoins 2, 6, 7, 11, derrière `WN_CONSTAT_BESOIN`), avec le masquage de consultation de D-553. La vue du
besoin 2 (D-554) est exclue.

## 3. Décisions prises

- Textes validés par le responsable (1000-b à 1003-b) : mention du radar, vignette « constat du praticien : <verdict> »
  et variante « — à relire », mention de consultation existante.
- **Écart à D-550 §3.1** (arbitrage 1004-b) : les axes du radar restent « B1 » à « B12 ». Les libellés praticien réels
  (jusqu'à 43 caractères) sont coupés par le cadre du radar : mesuré en rendu réel du composant, Chromium, 10 libellés
  sur 12 coupés à 390 px et à 320 px, aucun à 1280 px mais un chevauchement entre « Sensations favorables (cinq sens) »
  et la mention « non mesuré » du besoin voisin. Captures hors dépôt (non versées) :
  `/private/tmp/claude-501/-Users-wellneuro-Developer-Wellneuro-app/da262ced-29b0-4f05-ad45-9a8e4c4d4ba4/scratchpad/radar/`
  (`radar-390.png`, `radar-320.png`, `radar-1280.png`, `radar-390-masque.png`). §3.1 se lit comme satisfait par la ligne
  « Bn · libellé » du tableau voisin ; le banc `DetailBesoinsPanel.test.tsx` lie chaque axe à sa ligne, pour les douze.
- La vignette disparaît dès que le besoin porte une source de score ; reste avec « à relire » pour les raisons de
  D-347 §5.1 et §5.2 (D-551 §3) ; masquée en consultation (D-553 §2).

## 4. Fichiers modifiés

- Radar : `web/src/lib/equilibre/natureIndiceGlobal.ts`, `web/src/components/DetailBesoinsPanel.tsx`.
- Vignette : `web/src/lib/constats-besoin/vignette.ts`, `web/src/app/api/praticien/besoins/vignettes/route.ts`,
  `web/src/components/besoins/VignetteConstatBesoin.tsx`, `web/src/components/besoins/useVignettesConstats.ts`,
  `web/src/components/DetailBesoinsPanel.tsx`, `web/src/components/FichePatientPanel.tsx`.
- Gardes et tests : `lecteursConstatsBesoin.guard.test.ts` (route inscrite), `bioflowPublie.guard.test.ts` et
  `importeursBiologyLibrary.guard.test.ts` (route inscrite : elle lit le drapeau de l'étage des résultats comme la route
  du panneau), `vignetteConstat.guard.test.ts` (neuf), `vignette.test.ts` et `vignettes/route.test.ts` (neufs),
  `DetailBesoinsPanel.test.tsx`, `FichePatientPanel.test.tsx`.
- E2E : `web/e2e/mode-consultation-sans-chiffre.spec.ts` étendu (verdict sentinelle, onglet et tiroir, clic et clavier,
  D-553 §5) ; `web/playwright.config.ts` force `WN_CONSTAT_BESOIN` allumé pour le serveur d'essai, donc pour toutes les specs (le
  panneau du constat se monte sous l'onglet « Besoins » ; seule cette spec en juge l'effet).
- Relecture des vignettes après un geste : `ConstatsBesoinPanel.tsx` (prop `onActe`), `FichePatientPanel.tsx`.
- Le panneau du constat lui-même (verdict, motif, note, e-mail du praticien) est remplacé par la mention neutre en mode
  consultation, `FichePatientPanel.tsx` : trouvé par la revue, D-553 §3 ne le nomme pas (voir § 6).
- Documents périmés corrigés (D-551 §6) : `docs/FEATURE_FLAGS.md`, `web/src/lib/bio-parcours/constats/structure.ts`.
- Fragments : changelog, journal H15, ce handoff.

## 5. Validations exécutées

- Tests ciblés verts (vue, tiroir, route, logique pure, gardes). Revue `wn-reviewer` : NO-GO sur la première tête
  (deux bancs de la biologie rouges, tests de la route et de la logique absents, E2E de D-553 §5 non étendu), levé dans
  ce lot. Résultats de T1, T2 et de la relecture `ui-ux-pro-max` consignés à la déclaration « prête » sur la PR.
- Aucune version, aucun `inputHash`, aucun instantané clinique touché.

## 6. Problèmes ouverts

- Hors lot, geste du responsable : table de familles de D-554 §10 et migration « familles concernées » (vue du besoin 2).
- À arbitrer par le responsable : l'écart à D-550 §3.1 (axes « B1 » à « B12 », 1004-b) et le masquage du panneau du
  constat en consultation n'ont pas d'amendement de décision ; D-553 §3 ne nomme que le bloc de la vue du besoin 2.
- P2 de la revue, traités : la fiche lit les vignettes UNE fois et les passe à l'onglet (un seul accès journalisé) ; une
  relecture après un geste garde l'ancienne vignette jusqu'à la réponse. Reste : la lecture se lance au montage de la
  fiche, tiroir fermé (une ligne de journal par visite, drapeau allumé).
- Le drapeau `WN_CONSTAT_BESOIN` reste éteint jusqu'à la fin des douze besoins : la vignette n'a donc pas encore
  été vue sur un dossier réel.
- Restes de D-548 §3 (BMS-10, DASS-21, Karasek, R-SOM-01, table regroupée) : sur ordre seulement.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha » ; puis, sur ordre, la vue du besoin 2 dès la table signée.

## 8. Interdits encore actifs

Aucune signature, aucun rejet, aucune écriture en production ; aucun texte de claim au dépôt ; un merge à la fois ;
pas de changement de version, d'`inputHash` ni d'instantané ; la session ne merge pas.
