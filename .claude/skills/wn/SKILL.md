---
description: Reprise de session WellNeuro — campagne active, dernier handoff de la branche, phase du cycle, prochaine action proposée.
disable-model-invocation: true
effort: low
---

# WellNeuro — reprise

## Contexte

!`test -f ${CLAUDE_PROJECT_DIR}/docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat ${CLAUDE_PROJECT_DIR}/docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`node ${CLAUDE_PROJECT_DIR}/scripts/wn-context-pack.mjs --format markdown 2>/dev/null || true`
!`node ${CLAUDE_PROJECT_DIR}/scripts/wn-cycle.mjs --local 2>/dev/null || true`

## Mission

Proposer la prochaine action, en priorisant (1) un lot de campagne
explicitement actif, (2) la « prochaine action exacte » du dernier handoff
(bloc « Dernier handoff » ci-dessus : celui créé par la branche, à défaut le
dernier au tri ; le handoff du lot repris, si la tâche le désigne, se lit à la
main — D-372 §2), (3) les
roadmaps (`docs/ROADMAP_*.md`, à lire seulement dans ce cas). Ne rien modifier
dans ce premier passage.

Skills cœur, tapés par l'utilisateur : `/wn-campaign`, `/wn-lot` (`next` reprend le prochain lot incomplet), `/wn-test`, `/wn-pr`, `/wn-merge`, `/wn-finish`. <!-- mention-seule: wn-campaign, wn-lot, wn-test, wn-pr, wn-merge, wn-finish -->
