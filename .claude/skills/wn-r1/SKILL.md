---
description: LEGACY R1 — alias historique. En cas de doublon fonctionnel, redirige vers le flux campagnes WellNeuro.
argument-hint: "[plan|apply|verify]"
disable-model-invocation: true
effort: low
---

# R1 — legacy (redirigé)

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`

Argument : `$ARGUMENTS`

Ce skill est conservé pour compatibilité historique.

En cas de doublon fonctionnel, ce que ce skill produit est une **redirection
adressée à l'utilisateur** : nommer le flux canonique et s'arrêter là. Ces flux
s'invoquent **à la main**, en tapant leur nom en commande (barre oblique puis le
nom) — ils portent `disable-model-invocation`, donc aucun skill n'en ouvre un
autre :

- reprise de lot : `/wn-campaign-run` ; <!-- mention-seule: wn-campaign-run -->
- cadrage : `/wn-plan` ; <!-- mention-seule: wn-plan -->
- exécution bornée : `/wn-campaign-run apply` (uniquement après plan validé). <!-- mention-seule: wn-campaign-run -->

Interdits inchangés : pas de migration, pas d'écriture Supabase, pas de changement clinique sans validation explicite.

Sortie attendue : rappeler la redirection, proposer le prochain lot actif et exiger le passage en mode Plan avant toute modification.
