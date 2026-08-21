# 2026-08-21 20:30 — Refonte de l'environnement Claude Code (PR #727)

## Ce qui a changé

- **`CLAUDE.md`** — 271 → 186 lignes. Les règles de sous-système partent dans
  `.claude/rules/` (path-scopées, mécanisme natif) : constitution clinique
  complète et contrôles de revue scoring dans `clinique-scoring.md`,
  historique E2E/D-049 dans `tests-validation.md` (nouveau). Le tableau de
  validation ne porte plus de durées — elles vivent dans `/wn-test`, qui fait
  foi.
- **Routage** — une règle de six lignes (défaut Sonnet 5 + high + solo ; Opus
  sur risque ; Fable sur ≥ 2 signaux forts ; Ultracode = largeur opt-in).
  Supprimés car recouverts par le natif : `wn-plan` (mode Plan), `wn-review`
  (`/code-review` + `Agent(wn-reviewer)`), `wn-context` (doublon
  `wn-handoff`), agent `wn-explorer` (`Explore`).
- **Réseau** — `wn-cycle.mjs --local` existe pour les lectures d'état pures
  (`/wn` reprise) ; **`/wn-finish` et `/wn-handoff` restent en mode réseau** :
  leur verdict PR est le seul garde de la fenêtre post-squash (repris en
  revue). `wn-attendre-ci.mjs` plafonne à 120 s au-delà de 15 min ; le
  préambule de `/wn-merge` réutilise le snapshot final.
- **CI** — 129 lignes de récits historiques déplacées vers l'ADR
  `2026-08-07-commentaires-workflows.md` ; invariants courts sur place ;
  aucune clé YAML/commande/`if:` modifiée.

## À savoir pour la suite

- **Aucun hook ni garde-fou modifié** — vérifié motif par motif (10+3 Bash,
  9+3 fichiers, 6+24 SQL). `log-bash-command` était déjà `async: true`.
- **La revue bloquante du 2026-08-21** a repris quatre P0 : fenêtre post-merge
  (réglée en retirant `--local` des skills écrivains), référence morte
  `wn-explorer` dans `wn-fable.md`, couverture des surfaces API cliniques par
  `clinique-scoring.md`, et ce fragment de handoff lui-même.
- **Le mode Plan dans `/wn-lot`** est désormais réservé aux changements de
  code non triviaux et aux classes à risque — plus de double planification
  pour une édition documentaire bornée.

## Ouvert

- Contradiction « une session = un worktree » (CLAUDE.md) vs incompatibilité
  pratique de la suite `wn-*` avec un worktree — à arbitrer séparément.
- `.github/instructions/` : miroirs Copilot conservés, double maintenance
  assumée.
