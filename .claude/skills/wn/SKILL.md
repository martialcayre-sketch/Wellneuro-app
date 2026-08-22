---
description: Reprise de session WellNeuro — campagne active, dernière entrée du journal, phase du cycle, prochaine action proposée.
disable-model-invocation: true
effort: low
---

# WellNeuro — reprise

## Contexte

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && tail -n 30 docs/claude/SESSION_LOG.md || true`
!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-cycle.mjs --local 2>/dev/null || true`

## Mission

Proposer la prochaine action, en priorisant (1) un lot de campagne
explicitement actif, (2) la « prochaine action » du SESSION_LOG, (3) les
roadmaps (`docs/ROADMAP_*.md`, à lire seulement dans ce cas). Ne rien modifier
dans ce premier passage.

Skills cœur, tapés par l'utilisateur : `/wn-campaign`, `/wn-lot` (`next` reprend le prochain lot incomplet), `/wn-test`, `/wn-pr`, `/wn-merge`, `/wn-finish`. <!-- mention-seule: wn-campaign, wn-lot, wn-test, wn-pr, wn-merge, wn-finish -->
