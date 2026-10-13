### BioFlow : un seul chemin de lecture, la file — G3 levé (D-282, lot 5, 2026-10-13)

- **Constat de mise en service** : première lecture par la file en production,
  sur un dossier de test, lue par conteneur — travail terminé à la première
  tentative, compte rendu lu, aucun import fantôme. Signal de vie au vert.
- **`after()` retiré** de la route de lecture : elle demande toujours la
  lecture à la file (202, travail en attente). Le drapeau
  `WN_BIO_EXTRACTION_ASYNC` n'est plus lu ; la variable posée sur Scalingo est
  inerte.
- **Horloge** : à l'ouverture d'un import, la fraîcheur d'un import déjà
  `en_cours` se juge à l'horloge de la base, plus à celle du processus (revue
  de #1414).
- **Feuille de route** : G3 levé dans `BIOFLOW_ROADMAP.md`.
