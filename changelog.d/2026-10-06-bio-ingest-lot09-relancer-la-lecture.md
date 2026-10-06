### Relancer la lecture d'un compte rendu sans ligne validée — BIO-INGEST LOT-09 (2026-10-06)

- **Pourquoi.** Relire un compte rendu déjà lu, par exemple sous
  `bio-extraction-v2` ou après une évolution du resolver, obligeait à retirer
  le dépôt puis à le redéposer, ce qui effaçait la lecture précédente.
- **Écran.** « Relancer la lecture » apparaît sur une lecture aboutie, non
  purgée, dont aucune ligne n'a été validée. Une confirmation dit que le
  document repart au service de lecture et que les lignes déjà écartées
  restent consignées.
- **Serveur.** La relance est refusée (409 `ligne_validee`) dès qu'une ligne
  d'un import de ce compte rendu est validée. Le contrôle se fait sous le
  verrou que prend aussi la décision. Rien de ce qui est enregistré n'est
  effacé, réécrit ni remplacé.
- **Import précédent.** Il reste tel quel. Le nouvel import devient le seul
  dont les lignes se décident. Si la relance échoue, l'ancien redevient le
  courant.
- Aucune migration.
