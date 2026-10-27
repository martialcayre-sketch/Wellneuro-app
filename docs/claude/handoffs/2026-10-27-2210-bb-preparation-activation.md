# Handoff — 2026-10-27 — File C : bb, préparation de l'activation — miroir praticien et « .. » (D-386, H49)

## Branche et état du dépôt

- Branche `bb-activation-preparation`, partie de `origin/main` (419bc470,
  #1731), main refusionné après #1743 (07027127) ; worktree
  `j3-12e-ingestion`, session concurrente, cycle en `git`/`gh` direct.
- Ni migration, ni release-db attendue (aucun fichier sous
  `web/src/lib/clinical/**`).

## Objectif

Régler les trois points ouverts avant de poser `WN_PORTAIL_TROIS_PLANS`
(handoff de #1735) : miroir praticien, dépli d'office, « .. » du jour
difficile. Le drapeau reste éteint ; l'activation se fait hors lot.

## Décisions prises

- Préalable vérifié : l'encart « quand ralentir » (D-384 §6, H71) est
  constaté depuis le 2026-10-24. bh n'est pas construite : rien à faire ici.
- Arbitrages du responsable (questions à options, 2026-10-27), écrits dans
  D-386 (« Préparation de l'activation ») :
  - le miroir de la sous-vue « Diffusion » lit les trois plans par la règle
    du portail ; le panneau de consultation, monté sur fixture seule depuis
    t13, garde le plan minimal (second arbitrage, posé quand ce fait est
    apparu) ;
  - le détail déplié d'office est le détail de D-384 §3 : aucun code.
    `WN_PORTAIL_LECTURE_PROTOCOLE` vaut `true` en production (relu par
    `env-get`) ;
  - « Jour difficile ? » retire aussi le point final du plan minimal, drapeau
    fermé compris.

## Fichiers modifiés

- `web/src/app/api/praticien/protocoles/diffusion/route.ts` (+ test)
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx`,
  `ProtocolDiffusionPanel.tsx` (+ test), `ApercuPatientProtocole.tsx`
  (+ test)
- `web/src/components/patient-companion/PatientCompanionHome.tsx` (+ test)
- `docs/DECISIONS.md` (D-386), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H49),
  `changelog.d/2026-10-27-bb-preparation-activation.md`, ce handoff.

## Validations exécutées

- Bancs ciblés (route de diffusion, miroir, panneau de diffusion, portail,
  route du portail, garde de gamification) verts.
- T1 complet vert ; T2 (`test:worktree -- --fast`) vert en 7 min 15 s
  (E2E Chromium + WebKit) avant la fusion de main, qui n'apporte que de
  l'outillage (H87).
- `wn-reviewer` : GO, aucun P0 ni P1. P2 repris : test du passage de la prop
  par le panneau, renvoi sur la phrase dépassée de D-386. P2 écartés : la
  ponctuation « … », « ! », « ? » suivie du point (défaut antérieur, non
  aggravé) ; le jour difficile absent du miroir (hors du périmètre de D-386).

## Problèmes ouverts

- Constat d'activation (hors lot) : vérifier qu'aucun recul de la production
  sous 39131a45 n'a eu lieu après l'instant (D-386 §2). Puis poser le drapeau
  sur accord du responsable, et constater sur un vrai dossier que les plans
  apparaissent au portail ET dans l'aperçu de la sous-vue « Diffusion » (un
  refus silencieux de la marque passerait inaperçu).

## Prochaine action exacte

PR, CI (`wn-attendre-ci`), revue CodeRabbit de la tête, sonde des runs
`release-db` non conclus (D-374 §5), merge `--match-head-commit`. Ensuite,
session d'activation : constat de non-recul, drapeau, constat.

## Interdits encore actifs

- Aucune migration ; aucun texte patient inventé.
- Production lue en lecture seule, par identifiant, depuis un conteneur ;
  dans le dépôt, « un dossier de test ».
- Le drapeau reste éteint jusqu'à l'activation, hors lot (porte 18).
