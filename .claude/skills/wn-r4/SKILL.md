---
description: LEGACY R4 — alias historique. En cas de doublon fonctionnel, redirige vers le flux campagnes WellNeuro.
argument-hint: "[plan|apply|verify]"
disable-model-invocation: true
effort: low
---

# R4 — legacy (redirigé)

!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`git status --short`

Argument : `$ARGUMENTS`

Ce skill est conservé pour compatibilité historique.

En cas de doublon fonctionnel, utiliser le flux canonique :

- reprise de lot : `/wn-campaign-run` ;
- cadrage : `/wn-plan` ;
- exécution bornée : `/wn-campaign-run apply` (uniquement après plan validé).

Interdits inchangés : pas de migration, pas d'écriture Supabase, pas de changement clinique sans validation explicite.

Sortie attendue : rappeler la redirection, proposer le prochain lot actif et exiger le passage en mode Plan avant toute modification.
