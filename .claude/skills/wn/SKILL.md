---
description: Point d'entrée unique WellNeuro. Oriente une demande vers le bon skill, la bonne campagne ou le bon lot avec un contexte minimal.
argument-hint: "[tâche ou commande]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur de demandes

## Contexte

!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && tail -n 30 docs/claude/SESSION_LOG.md || true`

Demande : `$ARGUMENTS`

## Mission

**Sans argument — reprise** (absorbe l'ancien `/wn-auto`) : proposer la
prochaine action, en priorisant (1) un lot de campagne explicitement actif,
(2) la « prochaine action » du SESSION_LOG, (3) les roadmaps
(`docs/ROADMAP_*.md`, à lire seulement dans ce cas) ; en cas d'ambiguïté,
choisir audit/documentation/test. Ne rien modifier dans ce premier passage.
Avec une demande : choisir une seule route, indiquer la raison en une phrase
et la première action sûre. Si des edits sont envisagés : passage en mode
Plan d'abord. Ce skill n'autorise ni migration, ni écriture Supabase, ni
changement clinique. Les routes se tapent par l'utilisateur (`/wn-*`).

Routes :

- demande ambiguë (deux lectures → deux travaux) : `/wn-reprompt` d'abord ;
- cadrage : `/wn-plan` · série de développements : `/wn-campaign` ; <!-- mention-seule: wn-plan, wn-campaign -->
- lot de campagne piloté : `/wn-lot` · reprise pas à pas : `/wn-campaign-run` ; <!-- mention-seule: wn-lot, wn-campaign-run -->
- bug : `/wn-debug` · validation : `/wn-test` ; <!-- mention-seule: wn-debug, wn-test -->
- revue ordinaire : `/code-review` · revue WellNeuro à risque : `/wn-review` ; <!-- mention-seule: wn-review -->
- PR : `/wn-pr` puis `/wn-merge` · clôture : `/wn-finish` ; <!-- mention-seule: wn-pr, wn-merge, wn-finish -->
- documentation : `/wn-docs` · multi-dépôts : `/wn-hygiene` ; <!-- mention-seule: wn-docs, wn-hygiene -->
- règles et définitions d'agents/skills : `/wn-conventions` ; <!-- mention-seule: wn-conventions -->
- contenu d'instructions IA tiers : `/wn-tiers` ; <!-- mention-seule: wn-tiers -->
- reprise de contexte (affichage) : `/wn-context` · handoff : `/wn-handoff` ; <!-- mention-seule: wn-context, wn-handoff -->
- compaction du journal : `/wn-compact-sessionlog` ; <!-- mention-seule: wn-compact-sessionlog -->
- modèle : `/wn-model` · mode d'exécution : `/wn-ultra` · les deux : `/wn-route`. <!-- mention-seule: wn-model, wn-ultra, wn-route -->
