# Handoff — 2026-08-07 — Hygiène du workflow : clôture opposable, sync origin, état atomique

## Branche et état Git

- Branche : `claude/wellneuro-workflow-tokens-5x6jyy`, basée sur `origin/main` (63fcbc2).
- 4 commits, un par lot (A→D), plus la clôture. PR de lot unique (session distante,
  une seule branche désignée) — dérogation assumée au « une PR par lot ».
- `main` local du poste principal : ahead 50 / behind 51 d'`origin/main` — **hors
  périmètre, arbitrage humain à planifier** (condition 2 du cadrage, actée).

## Objectif

Durcir la chaîne de clôture : skills legacy supprimés, clôture
(SESSION_LOG + handoff) opposable à chaque PR, pointage `.wn/state.json`
fiable même en sessions simultanées, sync `origin` systématique.

## Décisions prises

- §3 du cadrage tranché en option (i) : `recent_decision_ids` alimenté
  mécaniquement depuis `docs/DECISIONS.md` (5 dernières, append-en-tête).
- La clôture se vérifie dans les `files` de la PR (wn-merge) et dans le verdict
  de cycle (wn-pr) — refus mécanique, la PR de rattrapage d'une fenêtre ratée
  passant par construction.
- Sync = `git fetch` seulement, tolérant au hors-ligne ; jamais de
  réconciliation automatique d'un `main` divergent.
- Dérive du pointage : avertissement, jamais un blocage (worktrees parallèles).

## Fichiers modifiés

- `scripts/wn-cycle.mjs` (+ `scripts/wn-cycle.test.mjs`, 38 tests) — sync,
  pointage, décisions.
- `scripts/wn-state.mjs` — écriture atomique (write-temp + rename).
- `scripts/wn-check-automation.sh` — liste des skills à jour + garde des ancres
  sed de CLAUDE.md.
- `.claude/skills/wn-merge/SKILL.md`, `wn-pr/SKILL.md` — clôture opposable ;
  ancre sed « Attendre le CI » réparée (elle rendait une plage vide en silence).
- `.claude/skills/wn-r{0..6}/` supprimés ; références purgées
  (`README_AUTOMATISATION`, `PROJET_CONTEXTE`, `CLAUDE_MD_MINIMAL`,
  `HISTORIQUE_CHANTIERS_TECHNIQUES`).
- `CLAUDE.md` — règle « se baser sur origin/main fraîchement fetché ».
- `.wn/state.json` — pointage resynchronisé, décisions D-027…D-031.

## Validations exécutées

- `node --test scripts/wn-cycle.test.mjs` : 38/38.
- `bash scripts/wn-check-automation.sh` : vert (arbre propre).
- Concurrence : 2 écrivains × 500 écritures sur `state.json`, JSON final valide.
- T1 (`npm run check`) : vert — 268 tests, anti-secrets OK.

## Problèmes ouverts

- La réactivation d'un pack reste possible par API directe (dette D-030, sans
  rapport avec ce lot).
- `next_action` / `blocking_issues` de `state.json` restent de la prose humaine :
  détectés comme périmés, jamais réécrits mécaniquement.

## Prochaine action exacte

Ouvrir la PR (draft), lire son CI (`verify` inclus), puis ressort Copilot ou
`/wn-merge apply` selon le régime courant. Après merge : arbitrer la
réconciliation du `main` local divergent, désormais visible à chaque
`node scripts/wn-cycle.mjs`.

## Interdits encore actifs

- Pas de `pull`/`merge`/`rebase` automatique sur le `main` divergent.
- Ne pas rebrancher sur cette branche après squash.
