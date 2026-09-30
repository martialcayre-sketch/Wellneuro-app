# Handoff — 2026-09-30 — Diffusion : le badge dit ce que le portail sert

## 1. Branche et état Git

`fix/diffusion-etat-reel`, worktree `.claude/worktrees/diffusion-etat-reel`,
partie de `origin/main` à `fcf47425` (#1268), avancée en `--ff-only` sur
`53d7e923` (#1269, documentation seule) avec l'accord du responsable. Un merge
à la fois (D-248).

## 2. Objectif

- Remplacer le badge figé « Non transmis » du panneau « Validation pour
  diffusion » par le constat réel, sur la question du responsable depuis un
  dossier réel (`PAT007`) : e-mail et fiche reçus, badge « Non transmis ».

## 3. Décisions prises

- Le badge suit `servieAuPatient`, déjà rendu par
  `api/praticien/protocoles/diffusion` avec la fonction du portail
  (`vuePatientOuRefus`) : « Servi sur le portail » / « Plus servi au patient ».
- `null` (rien de diffusé, constat non lu) et « sans approbation » : aucun
  badge — ne rien affirmer sur un état inconnu.
- Aucune API touchée. L'accès du patient à son portail (`actif`,
  `accessTokenRevoked`) n'entre pas dans le constat : non ajouté, ce serait
  une extension d'API.
- Laissés tels quels, parce que vrais : « non transmise » du constructeur
  (enregistrer une version ne transmet rien) et de l'historique des versions ;
  `ProtocolConsultationPanel` (fixture).

## 4. Fichiers modifiés

- `web/src/components/patient-cockpit/ProtocolDiffusionPanel.tsx`
- `web/src/components/patient-cockpit/ProtocolDiffusionPanel.test.tsx`
  (4 cas : servi, éteint, non lu, sans approbation)
- `changelog.d/2026-09-30-diffusion-etat-reel.md`, ce handoff.

## 5. Validations exécutées

- Banc du panneau : 25 tests verts.
- T1 (`check:rapide`) : vert.
- T2 (`test:worktree --fast`) : voir la PR.

## 6. Problèmes ouverts

- Coquille dans le protocole réel de `PAT007` (« dompaminergique », ligne
  d'action visible du patient) : à corriger depuis le constructeur par le
  praticien, puis re-valider.
- Lot 4 de D-255 : garde serveur au POST du cockpit, rail « Suivi » et
  panneau J21 sans protocole.

## 7. Prochaine action exacte

PR, CI, revue Copilot, merge, déploiement constaté. Puis le lot 4 de D-255.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Rien sous `lib/clinical/` ; aucune API ni migration pour ce lot.
- Aucun dossier réel désigné par son nom dans le dépôt.
