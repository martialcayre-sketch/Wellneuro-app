---
description: Reprend le prochain lot incomplet d’une campagne WellNeuro. Par défaut plan seulement ; `apply` autorise les modifications bornées par le lot.
argument-hint: "[apply] [chemin-campagne]"
disable-model-invocation: true
effort: high
---

# WellNeuro — exécution de campagne

!`node scripts/wn-campaign.mjs next --quiet 2>/dev/null || true`
!`git status --short`

Arguments : `$ARGUMENTS`

## Mode par défaut

- Lire la campagne et le prochain lot incomplet.
- Vérifier que ses hypothèses correspondent au dépôt réel.
- Présenter le plan et s’arrêter avant toute modification.

## Mode `apply`

- Modifier seulement les fichiers nécessaires au lot.
- Ne pas élargir le périmètre.
- Ne jamais lancer migration, écriture Supabase, déploiement ou changement clinique sans confirmation distincte.
- Lancer les validations du lot.
- Mettre à jour seulement le statut et les résultats du fichier de lot.
- Terminer par `/wn-review`, puis recommander `/wn-finish`.
