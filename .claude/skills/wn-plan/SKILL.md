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

- **Si la tâche n’est pas exécutable telle qu’écrite** — aucun résultat observable, terme ambigu dans ce dépôt, ou deux lectures menant à deux diffs différents —, rendre la reformulation (`/wn-reprompt`) au lieu de bâtir un plan sur une hypothèse. Un plan cadré sur la mauvaise demande fait payer l’erreur au lot entier, pas au cadrage.
- Lire d’abord `CLAUDE.md`, la dernière entrée de `SESSION_LOG.md` et uniquement les fichiers nécessaires.
- Ne modifier aucun fichier.
- Ce skill cadre la tâche ; il ne remplace pas le mode Plan pour la planification technique détaillée.
- Vérifier l’état réel du dépôt avant d’accepter une hypothèse.
- Choisir le changement minimal.
- Identifier explicitement toute migration, logique clinique, donnée sensible ou dépendance production.
- **Modèle et réflexion ne sont pas fixes.** Le fork `Explore` ci-dessus est le
  défaut ; si les fichiers visés relèvent d'une classe à risque du tableau de
  `/wn-lot` (Scoring/clinique, Prisma/migration, Auth), déléguer explicitement
  le cadrage via `Agent(subagent_type: "wn-reviewer")` plutôt que le fork par
  défaut, et porter le mot-clé de réflexion de cette classe (`think hard` ou
  `think harder`) dans le prompt envoyé à l'agent — jamais en réglage caché,
  toujours écrit dans le texte de l'appel.

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
11. Instruction finale explicite : « Passer en mode Plan avant toute modification ».
