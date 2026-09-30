# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 3c : bandeau et trajectoires (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-3c`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `b5a76b7c` (#1267, lot 3b). Un merge à la fois.

## 2. Objectif

Compter le bandeau d'épisode et le résumé des trajectoires depuis le jour 0
du suivi (`D-255`), avec le libellé arbitré « Jour n du protocole ».

## 3. Décisions prises

- **Libellé** (arbitrage du responsable) : « Jour n du protocole · vous êtes
  ici » ; sans diffusion : « T0 · protocole non diffusé », avec le nom de
  l'ancre du cycle courant.
- **Origine du compte** (choix d'exécution, à confirmer en revue) : `n` =
  jours révolus depuis la diffusion, 0 le jour même, pour que « Jour 21 »
  coïncide avec le jalon J21. Un pivot relance le compte.
- **Résumé des trajectoires** : l'échéance d'un jalon de mesure part du
  jour 0, celle d'une ancre de sa confirmation ; sans diffusion, pas de date
  et « après diffusion du protocole ».

## 4. Fichiers modifiés

- `web/src/lib/trajectoire-partagee/contrat.ts` : `CycleBandeau.jourZero`,
  `positionJours` nullable, libellés.
- `web/src/lib/protocol/resumeTrajectoire.ts` : `episodeEnCours.jourZero`,
  échéance depuis le jour 0.
- `web/src/components/trajectoires/TrajectoiresPanel.tsx` : badge et libellé
  d'échéance ; `FichePatientPanel.tsx` : commentaire seul.
- Bancs : `contrat.test.ts`, `resumeTrajectoire.test.ts`,
  `TrajectoiresPanel.test.tsx`.
- `docs/DECISIONS.md` (complément à `D-255`), changelog, ce handoff,
  SESSION_LOG.

## 5. Validations exécutées

- Bancs touchés et composants consommateurs : verts.
- Mutations : 9 jouées, toutes détectées.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- Lot 4 : garde serveur au POST du cockpit (jalon de mesure hors fenêtre,
  409) ; rail « Suivi » et panneau J21 sans protocole.

## 7. Prochaine action exacte

PR du lot 3c, CI, revue Copilot, merge, déploiement constaté. Puis le lot 4.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; rien sous `lib/clinical/`.
- Ne jamais confirmer un J21 pour débloquer une saisie.
