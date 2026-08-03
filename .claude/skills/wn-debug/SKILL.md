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

- Un symptôme sans observable — « ça ne marche pas », « c'est cassé » — n'est pas une
  entrée de débogage : le passer à `/wn-reprompt` avant d'ouvrir des hypothèses, sinon
  les trois hypothèses portent sur trois bugs différents.
- Reproduire ou obtenir une preuve observable.
- Distinguer UI, API, auth, Prisma, réseau, configuration et données.
- Formuler au maximum trois hypothèses ordonnées.
- Tester l’hypothèse la moins coûteuse.
- Ne pas masquer un symptôme par un fallback silencieux.
- Ne pas afficher de secret ni lire un `.env`.
- Ne pas modifier schéma ou migration.
- Proposer le correctif minimal seulement après identification de la cause.
- Ne pas élargir : un bug à la fois, aucun refactor au-delà du correctif.

## Le test de non-régression doit échouer avant le correctif

Un test écrit après coup et vert du premier coup ne prouve rien : il peut
passer à côté du défaut et personne ne le saura. La séquence est donc :

1. **écrire le test** qui décrit le symptôme ;
2. **le voir échouer** sur le code non corrigé, et noter le message d'échec ;
3. **appliquer le correctif** ;
4. **le voir passer**, et vérifier que le reste de la suite reste vert.

Sans l'étape 2, on ignore ce que le correctif a corrigé. Si le test passe
avant le correctif, l'hypothèse est fausse — revenir aux hypothèses, pas au
code.

Si la reproduction est impossible, s'arrêter et dire ce qui manque
(journal, jeu de données, variable d'environnement, accès) plutôt que de
corriger à l'aveugle.

Sortie : reproduction, preuves, cause probable en une phrase, correctif minimal,
message d'échec du test **avant** correctif, risques, tests de non-régression.
