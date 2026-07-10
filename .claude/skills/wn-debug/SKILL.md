---
description: Diagnostique un bug WellNeuro par hypothèses falsifiables, sans modifier avant d’avoir identifié une cause probable.
argument-hint: "<symptôme ou erreur>"
disable-model-invocation: true
context: fork
agent: general-purpose
effort: high
---

# WellNeuro — débogage

Symptôme : `$ARGUMENTS`

- Reproduire ou obtenir une preuve observable.
- Distinguer UI, API, auth, Prisma, réseau, configuration et données.
- Formuler au maximum trois hypothèses ordonnées.
- Tester l’hypothèse la moins coûteuse.
- Ne pas masquer un symptôme par un fallback silencieux.
- Ne pas afficher de secret ni lire un `.env`.
- Ne pas modifier schéma ou migration.
- Proposer le correctif minimal seulement après identification de la cause.

Sortie : reproduction, preuves, cause probable, correctif minimal, risques, tests de non-régression.
