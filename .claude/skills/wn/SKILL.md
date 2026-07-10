---
description: Point d’entrée unique WellNeuro. Oriente une demande vers le bon skill, la bonne campagne ou le bon lot avec un contexte minimal.
argument-hint: "[tâche ou commande]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur

## Contexte

!`git status --short`
!`test -f docs/claude/SESSION_LOG.md && tail -n 45 docs/claude/SESSION_LOG.md || true`
!`node scripts/wn-campaign.mjs next --quiet 2>/dev/null || true`

Demande : `$ARGUMENTS`

## Mission

- Sans argument : afficher un menu compact des commandes `/wn-*` et indiquer la prochaine action probable.
- Avec une demande : choisir une seule route principale.
- Préférer audit, plan et test avant développement.
- Si une modification de code est envisagée, imposer explicitement le passage en mode Plan avant toute édition.
- Ne pas dupliquer le travail d’un skill spécialisé.
- Ne jamais interpréter cette commande comme une autorisation de migration, d’écriture Supabase, de déploiement ou de modification clinique.

Routes possibles :

- cadrage : `/wn-plan` ;
- série de développements : `/wn-campaign` ;
- reprise du prochain lot : `/wn-campaign-run` ;
- documentation : `/wn-docs` ;
- bug : `/wn-debug` ;
- validation : `/wn-test` ;
- revue : `/wn-review` ;
- PR : `/wn-pr` ;
- clôture : `/wn-finish` ;
- reprise de contexte : `/wn-context` ou `/wn-handoff` ;
- campagne historique R0-R6 : `/wn-auto`.

Répondre avec : route choisie, raison en une phrase, première action sûre, et instruction explicite de passage en mode Plan avant modification si le lot peut impliquer des edits.
