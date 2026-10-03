# Handoff — 2026-10-03 — Levée du blocage par signal d'alerte : revue des lots mergés et correctifs

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, PR **#1295**, base `main` (`8cf8f80`). Deux
  commits : la mesure de production, puis les correctifs de revue + cette
  clôture.

## Objectif

Rendre l'allumage de `WN_LEVEE_ADRESSAGE` sûr : consigner la mesure, appliquer
les P2 de la revue `wn-reviewer` des LOT-04a/04b/05.

## Décisions prises

- Revue : **allumage possible**, aucun P0/P1.
- Q4 (arbitrage pris par défaut prudent, à confirmer) : au moins une action du
  praticien en plus de l'orientation, tenu au serveur.
- Q2 laissée ouverte et documentée (lettre sous cotation antérieure).
- Révocation présentée par lettre ; orientation `active` seule, sans référence.

## Fichiers modifiés

- Moteur : `protocolDraft.ts`, `contenuPatientProtocole.ts` (+ bancs).
- Écran : `ClinicalRuntimeSection.tsx`, `SignauxAdressesPanel.tsx`,
  `AdressagePanel.tsx` (+ bancs) ; garde `couverturesAdressageAppelants`.
- Docs : cadrage §1, `FEATURE_FLAGS.md` (retour arrière non neutre), changelog.

## Validations exécutées

- `npm run check` vert ; Vitest complet 665 fichiers verts ; mutation 5/5.
- E2E : job `e2e` du CI.

## Problèmes ouverts

- Q1 : les autres lecteurs de signaux (assiettes, orientation, biologie)
  ignorent la levée — prudent, à confirmer.
- Q2 ouverte. Q3 (identifiant réservé déjà en production) non lu.
- Tests de route `protocoles/versions` et `diffusion` sur carte adressée non
  ajoutés (couverts au moteur).

## Prochaine action exacte

1. Merge de #1295.
2. Vérifier par contenance que le déploiement contient `8cf8f80` et le merge
   de #1295.
3. Pose de `WN_LEVEE_ADRESSAGE=true` sur ordre du responsable, redémarrage
   web, constat par le comportement sur le dossier déjà adressé.

## Interdits encore actifs

- Réteindre après des levées n'est pas neutre (dossiers rebloqués, écran
  patient éteint).
- Aucun nom ni identifiant de dossier réel dans le dépôt.
