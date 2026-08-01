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
!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`

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
- lot de campagne piloté de bout en bout (classe le lot, en déduit modèle, palier,
  revue et gardes, propose la séquence puis s'arrête) : `/wn-lot` ;
- reprise du prochain lot, étape par étape : `/wn-campaign-run` ;
- documentation : `/wn-docs` ;
- compaction du journal de session : `/wn-compact-sessionlog` ;
- bug : `/wn-debug` ;
- validation : `/wn-test` ;
- revue : `/wn-review` ;
- contrôle d'un contenu d'instructions IA tiers avant activation (skill, agent,
  commande, hook, serveur MCP, prompt collé) : `/wn-tiers` ;
- audit des fichiers de règles et des définitions d'agents/skills :
  `/wn-conventions` ;
- PR : `/wn-pr` (ouverture) puis `/wn-merge` (CI, régime de merge, clôture) ;
- hygiène documentaire multi-dépôts : `/wn-hygiene` ;
- clôture : `/wn-finish` ;
- reprise de contexte, affichage seul : `/wn-context` ;
- document de reprise écrit (`docs/claude/HANDOFF_CURRENT.md`) : `/wn-handoff` ;
- choix du modèle/effort selon le contexte : `/wn-model` ;
- choix du mode d'exécution (solo / multi-agent / ultracode) : `/wn-ultra` ;
- routage combiné (route + modèle + mode en une passe) : `/wn-route` — normalement automatique en début de session, voir `CLAUDE.md` ;
- campagne historique R0-R6 : `/wn-auto`.

Répondre avec : route choisie, raison en une phrase, première action sûre, et instruction explicite de passage en mode Plan avant modification si le lot peut impliquer des edits.
