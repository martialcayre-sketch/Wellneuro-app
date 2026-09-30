# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 2 : le portail (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-lot2`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `88739b60` (#1262, lot 1, déployé). Un merge à la
fois.

## 2. Objectif

Brancher le portail sur le jour 0 du cycle (`D-255`) : points d'étape, fin et
début de cycle, carnet praticien.

## 3. Décisions prises

- **Les check-ins se lisent sur les versions diffusées depuis le jour 0.** Ils
  s'écrivent toujours sous la version active.
- **L'identité de l'épisode d'agenda (`cycleRef`) est gardée par version** ;
  seul son début passe au jour 0.
- **Prévol, clôture et boussole** gardent `approvedAt` : ils le lisent comme un
  fait, pas comme un calendrier.
- **Repli journalisé** sur l'approbation active si le calendrier ne se résout
  pas.
- Complément du lot 2 écrit dans `D-255`.

## 4. Fichiers modifiés

- `web/src/lib/protocol/calendrierSuivi.ts` : `versionIds` sur le calendrier,
  `cycleParDiffusion` sur le résultat.
- `web/src/lib/protocol/calendriersPersistes.ts` : identifiant de version lu,
  `calendrierDuProtocoleDiffuse`.
- `web/src/lib/protocol/portailProtocol.ts` : `approbationId` rendu.
- Routes : `portail/protocole/checkin`, `portail/protocole`,
  `praticien/ja/cycle`.
- Les bancs des cinq fichiers ; `docs/DECISIONS.md`, changelog, ce handoff,
  SESSION_LOG.

## 5. Validations exécutées

- Bancs des répertoires touchés : 868 tests verts.
- Mutations : 13 jouées, toutes détectées.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- Lots 3 et 4 de `D-255`.
- Entre les lots 2 et 3, portail et cockpit comptent depuis deux dates
  différentes. Ce n'est pas pire qu'avant.
- Avant le lot 3 : constater par conteneur qu'aucun jalon de mesure n'a été
  confirmé sur un cycle diffusé après coup.
- Le constat de l'espace de lecture des fiches sur `PAT032` reste à faire.

## 7. Prochaine action exacte

PR du lot 2, CI, revue Copilot, merge, déploiement constaté. Puis le lot 3,
trajectoire et cockpit, sur une branche neuve partie de `main`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; rien sous `lib/clinical/`.
- Les dossiers se lisent par identifiant, jamais par nom.
- Ne jamais confirmer un J21 pour débloquer une saisie.
