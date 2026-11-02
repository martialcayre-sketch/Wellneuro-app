# Handoff — 2026-11-02 — H94 (D-406 §7), seconde tranche : QIF incomplet sans bande (D-428), QIF au registre de comparaison (D-429)

## Branche et état du dépôt

- Branche `feat/h94-qif-total-incomplet`, worktree
  `.claude/worktrees/d281-lot3-portail`, partie de `origin/main` 845a900c
  (#1826), avancée par `--ff-only` à 63d0e8c0 (#1830) avant le premier
  commit (branche vide, aucune fusion).
- Commits a42b18ce (lot), puis revue `wn-reviewer` et ce handoff.
- PR du lot, une seule finalité : D-406 §7, seconde tranche (QIF).

## Objectif

Corriger le défaut consigné par D-421 §3 (bande servie sur un total QIF
incomplet) et faire entrer le QIF au registre de comparaison de D-406 §2,
à une date fondée sur le déploiement constaté de D-421.

## Décisions prises

- **Constat** : 845a900c en service en production le 2026-11-02 à
  20:54 UTC (conteneur détaché, `CONTAINER_VERSION`, sans lecture de
  dossier) ; déploiement Scalingo démarré à 20:27:44 UTC, 4 min 39 s.
- **D-428** : dès que `missing` > 0, `interpretation` vaut `null` ; total et
  `maxTotal` inchangés (modèle D-014). 10/x écarté. Bande du zéro maintenue
  à vingt sur vingt (Codex recommandait `missing` = 0 ; le responsable a
  maintenu). Q13/Q14 vides : aucune règle nouvelle, total `null`. Amende
  D-421 §3 : le retrait pour une personne qui ne travaille pas est propre à
  la version originale du FIQ ; depuis 1997, le travail inclut les tâches
  ménagères (Bennett 2005, section « Modifications », relu sur le PDF).
  §5 : aucun recalcul rétroactif, limite nommée.
- **D-429** : `Q_FIB_02` dans `COMPARABLE_DEPUIS` au 2026-11-03T00:00:00Z,
  premier jour entier après le déploiement constaté (un `missing` absent
  passe `estComplete`) ; l'instant exact est écarté.
- Arbitrages du responsable du 2026-11-02, sur questions à options, après
  contre-avis Codex (collé en conversation), tous sur la recommandation.

## Fichiers modifiés

- `web/src/lib/questions.ts` (moteur `qif`, retour `interpretation`) ;
  `web/src/lib/doctrine/seuilsCatalogue.instantane.json` (étape D-428).
- `web/src/lib/scoring/comparaisonPassations.ts` et son banc ;
  `web/src/lib/scoring/qifCompletude.test.ts` ;
  `web/src/lib/valeursDeRepli.guard.test.ts` (affirmait l'ancienne bande
  d'un QIF partiel).
- `docs/DECISIONS.md` (D-428, D-429) ; `docs/questionnaires-drive-mapping.md`
  (ligne `Q_FIB_02`).
- `docs/claude/plan-journal/H94/2026-11-02-02-qif-bande-incomplet-registre.md` ;
  `changelog.d/2026-11-02-h94-qif-bande-incomplet-registre.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert sur a42b18ce ; T1 rapide vert après la
  revue.
- `wn-reviewer` sur a42b18ce : GO, aucun P0/P1 ; trois P2 traités (D-429 §2
  « sans total » au lieu de « nul » ; D-428 §4 vise aussi l'exemple de
  D-421 §3 ; D-428 §5 limite rétroactive) ; test NaN de l'item 1 ajouté.
- T3 sur a42b18ce : Vitest vert (1706), E2E 302/303 — un rouge iPhone 13
  `mode-consultation-sans-chiffre.spec.ts:161` (tiroir non ouvert après
  activation du mode consultation ; API moquées, aucun lien avec le QIF).
  T3 rejoué sur la tête suivante : résultat dans la PR.

## Problèmes ouverts

- Constat par conteneur du déploiement de D-428 après le merge (même
  geste que pour D-421).
- Passations QIF incomplètes déjà enregistrées : gardent leur bande
  stockée (D-428 §5) ; non comptées en production.
- Libellé de Q13/Q14 (« travail », sans tâches ménagères) contre la
  version 1997 : consigné, acte distinct.
- Écart 3,3 contre 3,33 : consigné (D-421 §2).
- MFI-20 : à instruire sur texte intégral (Smets 1995, Gentile 2003) si le
  responsable les fournit ; DNST et mode de vie SIIN : absence consignée.

## Prochaine action exacte

`@coderabbitai review` à chaque tête ; « prête @<sha> » seulement avec
`node scripts/wn-attendre-ci.mjs <N>` = 0 et
`node scripts/wn-revue-pr-agent.mjs <N>` = 0 sur le même sha ; chaque
commentaire reçoit un verdict. Fusion de `main` dans la branche seulement
sur accord du responsable. Après le merge : page de suivi de la file A
(r4_16 mise à jour ; prochain id r4_17), puis `/clear`.

## Interdits encore actifs

- Aucune migration, aucun `schema.prisma` ; rien n'est écrit en base.
- Aucun facteur ni seuil inventé ; 10/x non appliqué ; aucune bande ni
  « stable » sur un écart (porte 11).
- Aucun verbatim d'item SIIN dans le dépôt ni dans un service externe.
- Aucun seed ni E2E sur un dossier réel ; aucun identifiant de dossier
  accompagné de mesures dans un fichier durable.
