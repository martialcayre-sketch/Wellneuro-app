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

- **Si la tâche n’est pas exécutable telle qu’écrite** — aucun résultat observable, terme ambigu dans ce dépôt, ou deux lectures menant à deux diffs différents —, ne pas bâtir de plan sur une hypothèse : rendre « PASSE — demande ambiguë, la faire d'abord reformuler via `/wn-reprompt` » et s'arrêter. Un plan cadré sur la mauvaise demande fait payer l’erreur au lot entier, pas au cadrage. <!-- mention-seule: wn-reprompt -->
- Lire d’abord `CLAUDE.md`, la dernière entrée de `SESSION_LOG.md` et uniquement les fichiers nécessaires.
- Ne modifier aucun fichier.
- Ce skill cadre la tâche ; il ne remplace pas le mode Plan pour la planification technique détaillée.
- Vérifier l’état réel du dépôt avant d’accepter une hypothèse.
- Choisir le changement minimal.
- Identifier explicitement toute migration, logique clinique, donnée sensible ou dépendance production.
- **Ce corps s'exécute dans le fork `Explore` (lecture seule, sans outil
  `Agent`) : ne déléguer à personne d'ici.** Si les fichiers visés relèvent
  d'une classe à risque (scoring/clinique, Prisma/migration, auth), l'écrire
  EN TÊTE de la sortie : « Classe à risque — faire relire ce cadrage par
  `Agent(subagent_type: "wn-reviewer")` avant le plan technique ». C'est la
  session, au retour du fork, qui délègue.
- Ne pas cumuler ce skill et le mode Plan natif sur la même tâche : ce skill
  cadre le périmètre ; le plan technique détaillé revient au mode Plan natif.

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
