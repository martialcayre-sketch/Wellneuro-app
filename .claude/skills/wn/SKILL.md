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

Demande : `$ARGUMENTS`

## Mission

Sans argument : menu compact des commandes `/wn-*` et prochaine action
probable. Avec une demande : choisir une seule route, indiquer la raison en
une phrase et la première action sûre. Si des edits sont envisagés : passage
en mode Plan d'abord. Ce skill n'autorise ni migration, ni écriture Supabase,
ni changement clinique. Les routes se tapent par l'utilisateur (`/wn-*`).

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
- modèle : `/wn-model` · mode d'exécution : `/wn-ultra` · les deux : `/wn-route` ; <!-- mention-seule: wn-model, wn-ultra, wn-route -->
- campagne historique R0-R6 : `/wn-auto`. <!-- mention-seule: wn-auto -->
