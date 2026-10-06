### Un NUL dans le libellé, la valeur ou l'unité lus ne fait plus échouer tout l'import — BIO-INGEST (2026-10-06)

- **Pourquoi.** `texteBorne` laissait passer un U+0000 intérieur, que
  PostgreSQL refuse. Le `createMany` des lignes échouait alors et l'import
  entier se clôturait `reponse_invalide`. Dette relevée par la revue Copilot
  de #1333 et routée en file d'attente.
- **Correctif.** Le NUL est retiré avant le rognage, comme c'est déjà le cas
  pour les faits du laboratoire (`D-267`). Cela vaut pour le libellé, la
  valeur, l'unité et le laboratoire lus. Un libellé fait seulement de NUL
  devient vide, et la sortie est invalide, comme pour un libellé blanc.
- **Version du procédé : `bio-extraction-v3`.** Une règle de lecture change,
  et le contrat du littéral impose de l'incrémenter (revue Copilot). Le prompt
  et le schéma restent ceux de la v2 (`D-267`). Aucune extraction v2 n'avait
  encore eu lieu en production (constat par conteneur du 2026-10-06).
- Banc : `extraction.test.ts`. Sans le correctif, les deux nouveaux cas
  échouent.
