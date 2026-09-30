# Handoff — 2026-09-30 — Gardes fermés et agents de revue en lecture seule (PR #1259)

## Branche et état Git

`wn-gardes-fail-closed-2026-09-30`, PR #1259 vers `main`, `origin/main`
fusionné (arbitrage du responsable, 2026-09-30).

## Objectif

Qu'un garde de `.claude/settings.json` introuvable bloque au lieu de laisser
passer en silence, et qu'un agent de revue ne puisse plus déplacer la copie
partagée.

## Décisions prises

- Lanceur fermé : `$CLAUDE_PROJECT_DIR`, puis racine Git du répertoire
  courant, puis code 2 ; code 2 aussi si `node` manque. Une exception DANS un
  garde reste en code 1 (la rendre bloquante bloquerait tout Bash sur un bug).
- `lecture-seule-git.mjs` en liste blanche, armé par `wn-reviewer` et
  `wn-fable` ; couvre aussi les `gh` mutants.
- Écarté : `isolation: worktree` pour `wn-reviewer` (partirait de `main`).

## Fichiers modifiés

`.claude/settings.json`, `.claude/hooks/lecture-seule-git.mjs` (+ banc),
`.claude/hooks/settings-gardes.test.mjs`, `.claude/agents/wn-reviewer.md`,
`.claude/agents/wn-fable.md`, `.claude/rules/hooks-garde-fous.md`, fragment
de changelog, ce handoff, `SESSION_LOG.md`.

## Validations exécutées

- `node --test .claude/hooks/*.test.mjs` : 219/219.
- Lanceur éprouvé en direct dans la session (il a exécuté le vrai garde).
- Revue adverse `wn-reviewer` : GO, constats P1/P2 corrigés (0238ef19) ;
  3 commentaires Copilot : corrigés (liste blanche).
- T1 vert ; CI vert sur 0238ef19.

## Problèmes ouverts

- Le garde exécuté est celui de la branche de la copie : copie repassée sur
  une branche antérieure → l'agent perd son Bash (fermé, message explicite).
- Les agents intégrés (general-purpose, sous-agents de `/code-review`) ne
  portent pas ce garde.

## Prochaine action exacte

CI vert sur la tête, revue relue, puis merge par Copilot — avant #1260, dont
la surcharge `Explore` arme ce garde.

## Interdits encore actifs

Ne jamais revenir à un `node "$CLAUDE_PROJECT_DIR/…"` nu ; ne pas élargir la
liste blanche à une commande qui écrit.
