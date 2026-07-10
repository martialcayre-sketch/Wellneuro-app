---
description: Cadre une tâche WellNeuro en lecture seule avant toute modification : périmètre, fichiers, risques, tests et critères de done.
argument-hint: "<tâche>"
disable-model-invocation: true
context: fork
agent: Explore
effort: medium
---

# WellNeuro — plan de tâche

Tâche : `$ARGUMENTS`

## Règles

- Lire d’abord `CLAUDE.md`, la dernière entrée de `SESSION_LOG.md` et uniquement les fichiers nécessaires.
- Ne modifier aucun fichier.
- Vérifier l’état réel du dépôt avant d’accepter une hypothèse.
- Choisir le changement minimal.
- Identifier explicitement toute migration, logique clinique, donnée sensible ou dépendance production.

## Sortie

1. Objectif et résultat observable.
2. Hypothèses vérifiées.
3. Hors périmètre.
4. Fichiers à lire.
5. Fichiers potentiellement modifiables.
6. Plan en lots atomiques si nécessaire.
7. Risques et garde-fous.
8. Tests minimaux puis tests complets.
9. Critères de done.
10. Go/no-go pour commencer.
