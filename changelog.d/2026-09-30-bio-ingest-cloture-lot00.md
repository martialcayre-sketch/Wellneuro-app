### Biologie : LOT-00 de BIO-INGEST clos, LOT-01 devient le lot courant (2026-09-30)

- **Aucun code, aucune migration.** La fiche LOT-00 restait « en cours » alors que
  #1269 était mergée. Elle, le tableau de la campagne et l'état machine disent
  maintenant LOT-00 terminé et LOT-01 à ouvrir.
- **`last_completed_lot` suit le lot clos.** Il désignait encore la campagne du
  2026-09-17 : la surface de reprise aurait rendu le mauvais dernier lot terminé.
