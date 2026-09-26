# Handoff — 2026-09-26 — La carte des assiettes indiquées était écrasée à hauteur nulle

## 1. Branche et état Git

`wn-assiettes-carte-ecrasee`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `92fc5cfa`.

## 2. Objectif

Le praticien ne voyait aucune proposition d'assiette au cockpit, phase Actions,
sur un dossier réel qui en justifiait sept. Trouver pourquoi, et corriger.

## 3. Décisions prises

- Correctif minimal : `shrink-0` sur la section de `AssiettesIndiqueesPanel`,
  seule carte du fragment de `ClinicalRuntimeSection` montée sans enveloppe
  avec `overflow-hidden`. Le conteneur de la zone focale n'est pas touché
  (commun à toutes les phases).
- Écarté : proposer les assiettes dans le type d'action « Alimentation » —
  chantier neuf qui reviendrait sur D-240, non demandé en l'état.

## 4. Fichiers modifiés

`web/src/components/patient-cockpit/AssiettesIndiqueesPanel.tsx` (une classe,
un commentaire) · `AssiettesIndiqueesPanel.test.tsx` (un cas) ·
`changelog.d/2026-09-26-assiettes-carte-ecrasee.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Production, lecture seule (drapeau, journal d'accès, dossier par
  identifiant) : drapeau `true`, table signée, route servie ; données du
  dossier qui ouvrent les sept lignes publiées ; 16 claims valides. Réponse
  brute de la route relevée par le praticien : `actif: true`, sept assiettes
  indiquées.
- Preuve du montage : la section biologie, montée DANS la carte, était lue au
  même instant — la carte existait, écrasée.
- Mécanisme reproduit dans Chromium (Playwright) : 2 px sans `shrink-0`,
  195 px avec.
- Banc de la carte : 26/26 ; le nouveau cas rougit quand `shrink-0` est retiré.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- Aucun E2E ne voit la carte : le drapeau est éteint dans les E2E. Le banc
  garde la classe, pas la hauteur.
- Ergonomie : la carte est au-dessus du constructeur ; « Alimentation » dans
  le menu du type d'action ne propose rien (D-240). À arbitrer par le
  responsable s'il le souhaite.

## 7. Prochaine action exacte

Merger seul ; constater en production, sur le dossier du praticien, que la
carte montre les sept assiettes et que « Retenir pour le protocole » alimente
le constructeur.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248) jusqu'au lot 4.
- Aucune identité patient dans le dépôt ; dossiers réels lus par identifiant.
