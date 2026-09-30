# Handoff — 2026-09-30 — `/wn-handoff` invocable, fin des renvois à la base Supabase morte (PR #1261)

## Branche et état Git

`wn-skills-wn-2026-09-30`, PR #1261 vers `main`, `origin/main` fusionné
(arbitrage du responsable, 2026-09-30).

## Objectif

Rendre au modèle le seul `/wn-*` qu'il cherchait (9 fois en 30 jours, toutes
en échec) et retirer des skills la lecture de production par le MCP Supabase.

## Décisions prises

- `/wn-handoff` sans `disable-model-invocation`, déclenchement borné : fin de
  lot AVANT la PR, pause d'une heure, demande explicite ; après merge =
  rattrapage seulement. Fait nouveau contre l'arbitrage du 2026-08-03.
- Les autres `/wn-*` restent manuels (aucune demande mesurée ; `wn-pr` et
  `wn-merge` poussent et mergent).
- Écarté : le correctif `${CLAUDE_SKILL_DIR}` des préfixes `cd` (deux fois
  refusé) — la session principale revient dans la copie principale (#1260).

## Fichiers modifiés

`.claude/skills/wn-handoff`, `wn-test` (règle 6), `wn-lot`, `wn-finish`,
`wn-reprompt`, `docs/claude/handoffs/README.md`,
`.claude/rules/docs-changelog.md`, fragment, ce handoff, `SESSION_LOG.md`.

## Validations exécutées

`npm run skills-check` : 21 skills, aucune référence non marquée ; T1 vert ;
CI vert sur 3a2170e1 ; 2 commentaires Copilot corrigés.

## Problèmes ouverts

Aucun sur ce lot. À constater à l'usage : que l'auto-déclenchement tombe bien
avant la PR.

## Prochaine action exacte

CI vert sur la tête, revue relue, merge par Copilot après #1259 et #1260.

## Interdits encore actifs

Ne pas rendre `wn-pr` ni `wn-merge` invocables par le modèle.
