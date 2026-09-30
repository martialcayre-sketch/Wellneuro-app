# Handoff — Économie de contexte : défaut Opus 5.5 high, délégué Sonnet, un lot par session (PR #1260)

## Branche et état Git

`wn-economie-contexte-2026-09-30`, PR #1260 vers `main`, `origin/main`
fusionné (arbitrage du responsable, 2026-09-30). **À merger après #1259.**

## Objectif

Traduire l'audit de consommation du 2026-09-30 (≈ 5 500 $ équivalent API sur
30 jours ; 90 % de cache ; contexte principal moyen 340k) en réglages et en
méthode de session.

## Décisions prises

- Défaut **Opus 5.5 + high** (responsable, 2026-09-30) : la lecture du cache
  coûte le même prix sur Opus et Sonnet ; changer de modèle en cours de
  session réécrit tout le cache.
- Délégué sur Sonnet : surcharge `Explore`, `CLAUDE_CODE_SUBAGENT_MODEL`.
- Un lot = une session ; `/compact` avant une pause d'une heure, jamais au
  retour ; session principale dans la copie principale (les `/wn-*` y
  tournent), concurrentes en worktree.
- Sondage CI refusé par `block-risky-commands` ; revue de diff par workflow
  réservée au P0.
- Écarté (réfuté en vérification adverse) : skills forkées sur Sonnet pour
  `/wn-test` et l'attente CI.

## Fichiers modifiés

`CLAUDE.md`, `.claude/settings.json`, `.claude/agents/Explore.md`,
`.claude/agents/wn-fable.md`, `.claude/hooks/block-risky-commands.mjs`
(+ banc), `.claude/rules/pr-revue-et-release-db.md`,
`.claude/skills/wn-route`, `.claude/skills/wn-lot`, `POLITIQUE_REVUE.md`,
`CATALOGUE_SKILLS_MODELE.md`, `MATRICE_ROUTAGE.md`,
`README_AUTOMATISATION_CLAUDE_CODE.md`, fragment, ce handoff, `SESSION_LOG.md`.

## Validations exécutées

- Banc `block-risky-commands` : 43/43, dont le cas Copilot (boucle close
  suivie d'une lecture ponctuelle : permis).
- T1 vert (le flake `release-db-comportement` D-248 du premier passage,
  rejoué seul : 21/21). CI vert sur 01d40c7f.
- 4 commentaires Copilot : corrigés (clôture, boucle, catalogue, matrice).

## Problèmes ouverts

- Réglages UTILISATEUR (`~/.claude/settings.json` : effort, autoCompactWindow,
  statusline, promptCacheTtl, crossSessionInbound, gitkraken) : refusés au
  mode auto par le classifieur — bloc remis au responsable.
- Effet à mesurer dans 2 à 4 semaines : contexte moyen, compactions,
  coût par PR (méthode de l'audit : `scratchpad/agg.py` de la session).

## Prochaine action exacte

Après merge de #1259 : CI vert sur la tête, revue relue, merge par Copilot.

## Interdits encore actifs

Pas de `/model` en cours de session ni pendant un workflow ; pas de
`CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (écraserait `wn-reviewer`/`wn-fable`).
