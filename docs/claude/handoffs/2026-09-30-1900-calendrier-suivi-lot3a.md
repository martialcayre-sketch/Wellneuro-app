# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 3a : trajectoire et cockpit (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-3a`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `013930df` (#1259, garde-fous d'une autre session,
arrivé après le lot 2). Le travail, encore non commité, a été reporté depuis
une branche partie de `ad8e9889` ; aucun fichier n'est commun avec #1259. Un
merge à la fois.

## 2. Objectif

Compter les jalons de mesure depuis le jour 0 du suivi (`D-255`) côté
praticien : trajectoire, jalon dû, cockpit, résumé J21, cabinet, Fil.

## 3. Décisions prises

- **Découpage du lot 3 en trois PR**, arbitré par le responsable : 3a (ce lot),
  3b (jalons d'objectif portail et praticien, E2E), 3c (bandeau, libellé
  « Jour n du protocole » ; sans diffusion « T0 · protocole non diffusé »).
- **Moteur Équilibre à deux dates.** L'ancre date la lecture d'ancre ; le jour 0
  date les lectures de mesure. Le paramètre est facultatif ; « Mon équilibre »
  n'est pas concerné.
- **Sans diffusion** : aucun jalon dû. Les lectures gardent l'ancre en repli,
  et le cockpit aussi, pour rejouer l'historique.
- Complément du lot 3a écrit dans `D-255`.

## 4. Fichiers modifiés

- **Moteur Équilibre** : `web/src/lib/equilibre/depuisPrisma.ts`,
  `momentumParBesoin.ts`.
- **Protocole** :
  - `web/src/lib/protocol/trajectoire.ts` : `jourZero` par cycle ;
  - `jalonDu.ts`, `resumeJ21.ts` ;
  - `calendrierSuivi.ts` : `joursZeroParCycle` ;
  - `calendriersPersistes.ts` : ancres déjà lues, `lireJoursZeroParPatient`.
- **Runtime** : `web/src/lib/clinical-engine/runtimeFromPrisma.ts`, qui porte
  `jourZero` sur l'ancre du cycle courant.
- **Routes et chargeurs** :
  - `praticien/cockpit`, `praticien/trajectoire`,
    `praticien/protocoles/checkins` ;
  - `lib/praticien/chargementCabinet.ts`, `lib/fil/momentumJ21.ts`.
- **Bancs** :
  - fixtures de cycle complétées (`jourZero` égal à la date d'ancre, donc
    comportement inchangé) ;
  - banc de parité D-058 réécrit ;
  - cas D-255 neufs.
- **Documents** : `docs/DECISIONS.md`, changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Bancs des répertoires touchés : verts, plus de 8 200 tests.
- Mutations : 18 jouées, toutes détectées. Quatre survivaient d'abord (câblage
  de la route, du cabinet et du Fil, filtre par dossier) ; les bancs ajoutés
  les tiennent.
- Constat par conteneur : un seul jalon de mesure en production (J21 de
  `PAT006`, cycle sans diffusion).
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- 3b : jalons d'objectif (`jalonObjectifDu`, portail dossier GET et garde POST,
  praticien objectifs) et l'E2E `portail-dossier-deux-voix`, qui devra
  provisionner une diffusion sur une fixture.
- 3c : bandeau (`contrat.ts`) et résumé des trajectoires.
- Lot 4 : garde serveur au POST du cockpit ; rail « Suivi » et panneau J21
  sans protocole.
- Entre 3a et 3b, les jalons d'objectif comptent encore depuis l'ancre.

## 7. Prochaine action exacte

PR du lot 3a, CI, revue Copilot, merge, déploiement constaté. Puis le lot 3b
sur une branche neuve partie de `main`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; `equilibre/constants.ts` intact ; rien
  sous `lib/clinical/`.
- Les dossiers se lisent par identifiant, jamais par nom.
- Ne jamais confirmer un J21 pour débloquer une saisie.
