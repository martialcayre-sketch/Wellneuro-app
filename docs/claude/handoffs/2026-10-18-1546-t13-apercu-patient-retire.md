# Handoff — t13 : le bloc « Clôture et aperçu patient » quitte les vrais dossiers

## Branche et état Git

- Branche `t13-apercu-retire`, partie de `origin/main` après #1546. Worktree
  `d281-lot3-portail`. Un commit, PR à ouvrir.

## Objectif

Dette t13 de la page de la file A (plan, dettes §8 : « l'aperçu patient du
cockpit affiche son état vide à tout dossier réel »). Question du responsable :
« le panneau aperçu patient est-il toujours utile ? »

## Décisions prises

- Constat lu dans le code : hors du mode démonstration (actif seulement en
  développement local avec `?validationErgo=c1`), `ProtocolConsultationPanel`
  recevait toujours `protocolDraft={null}` et rendait son état « indisponible…
  aucun contenu transmis », y compris sur un dossier au protocole diffusé.
  L'aperçu réel est la sous-vue « Diffusion » (version active).
- Arbitrage du responsable du 2026-10-18, sur la recommandation : le retirer
  des vrais dossiers et garder un renvoi d'une ligne vers « Diffusion ». Les
  deux options écartées : garder le bloc avec un texte suivant l'état réel
  (doublon de « Diffusion »), et en faire un aperçu du brouillon (lot long,
  touchant au contrat du contenu patient).
- Le renvoi n'apparaît que lorsque le sélecteur de sous-vues existe (carte de
  décision servie) : sans carte, il n'y a pas de « Diffusion » vers où aller.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` : panneau
  monté sur fixture seule ; ligne de renvoi hors fixture.
- `web/src/components/patient-cockpit/ProtocolConsultationPanel.tsx` : prop
  `apercuEnDiffusion` et son paragraphe retirés (le renvoi vit dans la
  section) ; commentaire de tête daté.
- Bancs : `ClinicalRuntimeSection.test.tsx` (cas neuf : bloc absent, renvoi
  qui ouvre « Diffusion »), `ProtocolConsultationPanel.test.tsx` (cas du
  renvoi retiré), `web/e2e/mode-consultation.spec.ts` (bloc absent).
- `docs/claude/PLAN_WELLNEURO.md` (dette soldée), changelog, SESSION_LOG.

## Validations exécutées

- Vitest des deux composants : 65/65. Le cas neuf rougit si le panneau est
  remonté hors fixture (il affiche le titre « Clôture et aperçu patient »).
- T1 complet et T2 : voir la PR.

## Problèmes ouverts

- Aucun pour t13. Le mode démonstration local garde le panneau ; son retrait
  éventuel serait un autre lot.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge avec `--match-head-commit`,
constat du déploiement ; page de la file A, ligne t13 → fait.

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Aucune identité réelle dans le dépôt ; production en lecture seule par
  conteneur.
