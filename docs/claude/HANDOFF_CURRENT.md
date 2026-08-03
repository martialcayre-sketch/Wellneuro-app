# Handoff — 2026-08-03 — Fenêtre de clôture d'un lot (`wn-cycle`)

## Git

- Worktree `.claude/worktrees/wn-cycle-cloture-lot`, branche
  `worktree-wn-cycle-cloture-lot`, partie de `main` à `a3d3c29a`, **PR #549**.
- `main` a avancé pendant le lot (#546 code, #547 clôture, #548 handoff, jusqu'à
  `d8d3c69c`) : `origin/main` fusionné dans la branche. Un seul conflit,
  `HANDOFF_CURRENT.md`, résolu **en faveur de la branche** — ce fichier est
  remplacé à chaque handoff, jamais fusionné. `SESSION_LOG.md` s'est fusionné
  seul, étant append-only.
- Campagne : aucune active (`.wn/state.json` = idle) — ce lot est orthogonal aux
  campagnes en cours, il porte sur l'orchestration.

Ce conflit est le sujet du lot : #547 et #548 sont deux PR de doc post-merge, et
ce sont elles qui ont conflicté. Une clôture partie dans la PR du lot n'aurait
produit ni l'une ni l'autre.

## Objectif

Rendre exécutable l'ordre du cycle de lot. Le merge d'une PR de lot est un
squash : `SESSION_LOG.md` et `HANDOFF_CURRENT.md` écrits après lui ne sont plus
dans l'ascendance de `main` et coûtent une seconde PR de doc. Cas réel du
2026-08-03 : PR #545 (le lot) ne portait que `SESSION_LOG.md`, puis #547 et #548
ont suivi en PR de doc séparées.

## Décisions prises, et pourquoi

1. **La frontière est le merge, pas la suppression de la branche.** Écrire après
   le merge et avant le nettoyage ne sert à rien — sous squash, les commits
   postérieurs au merge ne remontent pas vers `main`.
2. **La clôture passe avant `/wn-pr`, dans le même push.** Zéro CI
   supplémentaire, zéro cycle de PR en plus. Perte assumée : le handoff ne cite
   pas le numéro de PR, que `git log` rend de toute façon.
3. **L'automatisation est un script, pas de la prose.** Les 31 skills portent
   `disable-model-invocation: true` et un contrôle CI bloquant
   (`scripts/lib/skill-cross-invocation.mjs`) refuse toute consigne impérative
   d'un skill vers un autre. Le seul chaînage exécutable est un bloc `!`.
4. **Constat par défaut, réparation sous `--appliquer`** (convention de
   `nettoyage-branches.sh`). Le script n'écrit jamais `SESSION_LOG.md` ni
   `HANDOFF_CURRENT.md` : leur contenu est du raisonnement.

## Fichiers modifiés

- **Nouveau** `scripts/wn-cycle.mjs` — 5 phases (`hors-lot`, `travail`,
  `pret-pr`, `pr-ouverte`, `apres-merge`), logique pure `diagnostiquer()`
  exportée, câblage CLI séparé. Sorties 0 / 1 (fenêtre ratée) / 2 (hors dépôt).
- **Nouveau** `scripts/wn-cycle.test.mjs` — 15 cas sur faits injectés, sans git
  ni réseau. Câblé dans `ci.yml` (job `verify`, hors filtre `docs_only`).
- `.claude/skills/wn-finish/SKILL.md`, `wn-handoff/SKILL.md` — bloc
  `!node scripts/wn-cycle.mjs` + garde après-merge.
- `.claude/skills/wn-lot/SKILL.md` (étape 6), `wn-campaign-run/SKILL.md`,
  `CLAUDE.md` — ordre explicité.
- `scripts/wn-campaign.mjs` — `writeActiveCampaignView()` tronquait le garde
  « cette vue est générée » dans sa branche idle ; rétabli.
- `changelog.d/2026-08-03-wn-cycle-fenetre-de-cloture.md`.

## Validations exécutées

`node --test scripts/wn-cycle.test.mjs` 15/15 · `wn-campaign.test.mjs` 6/6 ·
`skill-cross-invocation.mjs` 0 violation sur 32 skills · `wn-campaign-audit.mjs`
avec les 7 codes bloquants 0 · `check_no_secrets.sh` 0 · **T1**
(`npm run check`) vert, 70 tests. Chemin `gh` vérifié sur #545/#547/#548 réels.
`wn-kit-doctor.mjs` rend 41/42 — le seul échec est « git status (dirty) »,
attendu sur un arbre en cours, et il n'est pas en CI.

Worktree neuf : `npx prisma generate` est requis avant `npm run check`, sinon
`@/generated/prisma` manque et le type-check casse en cascade.

## Problèmes ouverts

- `--appliquer` écrit `git.branch` dans `.wn/state.json` : un nom de worktree
  éphémère. Committé, c'est du bruit à chaque PR et un conflit entre sessions
  parallèles. **Non committé ici** — à trancher avant de l'ajouter à un
  workflow.
- La détection `apres-merge` repose sur `gh`. Hors ligne, le verdict est partiel
  (`PR inconnue`) et ne peut pas signaler une fenêtre ratée. Choix assumé : un
  verdict partiel vaut mieux qu'un skill qui ne se charge pas.
- `scripts/changelog-collate.test.mjs` reste non câblé en CI (constat, hors
  périmètre).

## Prochaine action exacte

Ouvrir la PR (`--body-file`), attendre le CI avec l'idiome bloquant, **vérifier
que `verify` a tourné** et pas seulement les checks Vercel, puis merger.

## Interdits encore actifs

Aucune migration, aucune écriture Supabase, aucun changement clinique dans ce
lot. Ne pas forcer un merge sur une PR gelée en `action_required`. Après un
merge en squash, repartir de `main` — jamais de la branche squashée.
