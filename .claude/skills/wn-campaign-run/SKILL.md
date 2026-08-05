---
description: Reprend le prochain lot incomplet d’une campagne WellNeuro. Par défaut plan seulement ; `apply` autorise les modifications bornées par le lot.
argument-hint: "[apply] [chemin-campagne]"
disable-model-invocation: true
effort: high
---

# WellNeuro — exécution de campagne

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`

Arguments : `$ARGUMENTS`

## Mode par défaut

- Lire la campagne et le prochain lot incomplet.
- Vérifier que ses hypothèses correspondent au dépôt réel.
- Présenter le plan stratégique du lot, déléguer le plan technique détaillé au mode Plan, puis s’arrêter avant toute modification.

## Mode `apply`

- N’exécuter `apply` qu’après un plan technique validé en mode Plan.
- Modifier seulement les fichiers nécessaires au lot.
- Ne pas élargir le périmètre.
- Ne jamais lancer migration, écriture Supabase, déploiement ou changement clinique sans confirmation distincte.
- Lancer les validations du lot.
- Mettre à jour seulement le statut et les résultats du fichier de lot.
- Terminer par une revue indépendante : `Agent(wn-reviewer)` sur
  Scoring/Migration/Auth, un fork `Explore` ailleurs.
- Recommander alors à l'utilisateur, qui les tapera lui-même, `/wn-finish` puis <!-- mention-seule: wn-finish -->
  `/wn-handoff write` <!-- mention-seule: wn-handoff --> : ils produisent l'entrée
  `SESSION_LOG.md` et le fragment `docs/claude/handoffs/` qui closent le lot.
- Ensuite seulement la PR, puis le merge selon le régime de `CLAUDE.md` — leur
  gabarit vit dans `/wn-pr` et `/wn-merge` <!-- mention-seule: wn-pr, wn-merge -->, qui s'invoquent
  eux aussi à la main. Cet ordre n'est pas
  cosmétique — le merge est un squash, et une clôture écrite après lui ne
  remonte plus vers `main`. `node scripts/wn-cycle.mjs` rend la phase courante.
