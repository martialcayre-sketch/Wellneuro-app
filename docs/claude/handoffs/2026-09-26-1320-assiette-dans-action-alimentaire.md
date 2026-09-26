# Handoff — 2026-09-26 — L'assiette se choisit dans l'action « Alimentation »

## 1. Branche et état Git

`wn-assiette-dans-action-alimentaire`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`0840785f` (#1228, la carte n'est plus écrasée).

## 2. Objectif

Demande du responsable, depuis l'écran : choisir l'assiette dans le type
d'action « Alimentation » du constructeur, plus cohérent pour le suivi que le
seul bouton de la carte.

## 3. Décisions prises

- `D-249` : menu « Assiette indiquée » sur une action alimentaire. Il propose
  les indiquées de la carte, et elles seules (`DC-24`). La référence posée est
  celle de `D-240`, contrat V4 compris.
- La liste est remontée par la carte (`onIndiqueesLues`), pas relue : pas de
  seconde journalisation d'accès. Elle est datée du dossier et vidée à son
  changement.
- Gardé : « Retenir pour le protocole » et son bandeau (non retirés sans
  demande).
- Écarté : proposer des assiettes non indiquées (décision clinique, non prise).

## 4. Fichiers modifiés

`web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` (menu,
`choisirAssiette`) · `AssiettesIndiqueesPanel.tsx` (`onIndiqueesLues`) ·
`ClinicalRuntimeSection.tsx` (état daté, câblage) · les trois bancs ·
`docs/DECISIONS.md` (`D-249`) ·
`changelog.d/2026-09-26-assiette-dans-action-alimentaire.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Bancs du constructeur et de la carte : 78/78. Nouveau cas du cockpit (liste
  d'un autre dossier) : vert, et **rouge** quand la remise à zéro et l'état daté
  sont retirés ensemble (mutation jouée).
- T1 vert. T2 vert (598 fichiers Vitest, 10 046 tests ; 213 E2E). Un premier
  T2 avait rougi sur une garde de source (`assietteSurAction.test.ts`) qui lit
  la forme exacte de l'effet de remise à zéro de la sélection : la liste se vide
  désormais dans son propre effet, celui de la sélection est intact.

## 6. Problèmes ouverts

- Aucun E2E ne voit le menu : le drapeau des assiettes est éteint dans les E2E.
- Deux chemins vers la même action (menu, bouton de la carte) : à simplifier
  si le responsable le souhaite.

## 7. Prochaine action exacte

Merger seul ; sur un dossier réel, en phase Actions, ajouter une action
« Alimentation », choisir une assiette au menu, enregistrer la version.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248) jusqu'au lot 4.
- Aucune identité patient dans le dépôt ; dossiers réels lus par identifiant.
