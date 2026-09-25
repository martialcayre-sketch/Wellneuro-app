# Handoff — 2026-09-25 — D-248 prérequis du lot 3 : release-db attend le calme

## 1. Branche et état Git

`wn-deploiement-lot3-prerequis`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `29db2532` (lot 2 en service, répétition à vide verte :
run 36136506260, déploiement `3155749f`).

## 2. Objectif

Avant de couper l'auto-déploiement (lot 3), faire attendre à `release-db` qu'aucun
build ne soit en vol avant de déclencher `integration-link-manual-deploy main`,
comme le fait déjà le déployeur de GitHub Actions.

## 3. Décisions prises

- Boucle de calme au début de l'étape « Déclenchement » (40 × 30 s), refus sans
  écriture à la borne ; liste illisible réessayée, jamais lue comme calme.
- `timeout-minutes` du job `release` : 45 → 70.
- Pas de verrou commun aux deux workflows : la fenêtre résiduelle (deux lectures
  calmes simultanées) est de quelques secondes et détectée par le déployeur.

## 4. Fichiers modifiés

`.github/workflows/release-db.yml` · `scripts/release-db-comportement.test.mjs`
(cinq bancs) · `docs/DEPLOIEMENT_RELEASE_DB.md` · `docs/DECISIONS.md` (D-248) ·
`changelog.d/2026-09-25-release-db-attend-le-calme.md` · ce handoff.

## 5. Validations exécutées

- Bancs `release-db` (comportement + invariants) : verts ; les nouveaux bancs
  exécutent l'étape réelle sous `bash -e`, avec un `scalingo` à sorties
  successives et un `sleep` factice dans le PATH (aucune couture de production).
- Mutations : 9/9 attrapées (calme toujours vrai, liste illisible = calme, refus
  désarmé, `aborted` / `*-error` comptés en vol, statut inconnu = calme, échec
  du commit approuvé qui dispense, erreur du CLI jetée, intervalle modifié).
- Revue adverse multi-agents avant PR (9 agents) : 5 constats confirmés (bas),
  tous corrigés ; 1 réfuté. Banc de parité de la règle « en vol » entre
  `release-db` et le déployeur (`enVol` exporté).
- `jouer()` lève désormais sur une étape tuée par le délai (plus de faux refus).

## 6. Problèmes ouverts

- Lot 4 : la garde « dernier déployé » de `release-db` lit la première ligne de
  `deployments` (ordre de DÉBUT de build).
- Fenêtre résiduelle de quelques secondes entre les deux workflows (détectée).

## 7. Prochaine action exacte

Merger, constater le déploiement ; puis lot 3 : le responsable lance
`scalingo --region osc-fr1 --app wellneuro integration-link-update --no-auto-deploy`,
puis merge de la PR du lot 3 (déclencheur `push` + `AUTO_DEPLOIEMENT_ACTIF=false`,
ensemble), puis dispatch du déployeur pour livrer ce merge.

## 8. Interdits encore actifs

- `--no-auto-deploy` reste un geste du responsable.
- La discipline « un merge à la fois, constater le déploiement » reste en vigueur
  jusqu'au lot 4 ; la garde anti-recul de `release-db` aussi.
