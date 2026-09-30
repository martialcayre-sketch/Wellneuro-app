# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 1 (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-lot1`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `30011914` (#1258, `D-254`, déployé). Un merge à la
fois.

## 2. Objectif

Le responsable : « tous les jalons doivent donc redémarrer une fois que le
protocole initial complet est rendu et publié au patient ». Ce lot pose le
calcul du jour 0 et sa lecture en base, sans consommateur.

## 3. Décisions prises

- **`D-255`** : un seul jour 0 par cycle, la première diffusion recevable de
  son protocole ; seul un pivot (priorité changée) le relance ; l'ancre garde
  sa date ; sans diffusion, aucun jalon ne court.
- **Rattachement** : par `protocol_drafts.assessment_episode_id`, repli par
  date au rang le plus haut, diffusion orpheline nommée.
- **Plan en quatre lots**, validé par le responsable (voir `D-255` §5).

## 4. Fichiers modifiés

- `web/src/lib/protocol/calendrierSuivi.ts` et son banc : module pur.
- `web/src/lib/protocol/calendriersPersistes.ts` et son banc : lecture Prisma
  (une requête sur les approbations, jointes à la version et à son épisode,
  plus les ancres).
- `docs/DECISIONS.md` (`D-255`), changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Bancs : 28 pour le module, 4 pour la lecture, verts.
- Mutations : 12 jouées, toutes détectées (liste dans `D-255`).
- Constat par conteneur : une seule diffusion en production (`PAT032`),
  rattachée à son `T0` par `assessment_episode_id`.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- Lots 2 à 4 de `D-255`.
- Avant le lot 3 : constater par conteneur qu'aucun jalon de mesure n'a été
  confirmé sur un cycle diffusé après coup (le rejeu tomberait).
- Le constat de l'espace de lecture des fiches sur `PAT032` reste à faire.

## 7. Prochaine action exacte

PR du lot 1, CI, revue Copilot, merge, déploiement constaté. Puis le lot 2
(portail) sur une branche neuve partie de `main`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; rien sous `lib/clinical/`.
- Les dossiers se lisent par identifiant, jamais par nom.
- Ne jamais confirmer un J21 pour débloquer une saisie.
