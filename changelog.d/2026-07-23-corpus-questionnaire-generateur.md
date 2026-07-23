### Ajouté

- **Générateur de questionnaire de restitution** : `tools/corpus/claims/questionnaire.mjs`
  produit, à partir d'un draft de claims, un questionnaire par source — une
  question de restitution par chunk atteignable, rédigée depuis les seuls
  claims de ce chunk. La couverture exigée par la voie rapide (Atelier v2) est
  garantie par construction (1 question ↔ 1 chunk) ; tout chunk sans question
  est signalé bruyamment. Sortie hors dépôt, aucune écriture base.
