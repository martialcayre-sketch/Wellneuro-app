### Fiche d'assiette : la migration du catalogue des versions et des actes (2026-09-26)

- **Lot 3 de `D-251`, migration seule, autorisée explicitement par le
  responsable.** Deux tables, sans aucune donnée patient :
  `fiches_assiette_versions` reçoit les adaptations déposées par l'outil hors
  ligne, qui restent des brouillons ; `fiches_assiette_actes` reçoit les actes
  du responsable qui valident ou retirent une version.
- Ce que la base garantit elle-même :
  - les deux tables sont en ajout seul : ni réécriture ni suppression ;
  - les instants sont posés par la base ;
  - les numéros de version se suivent sans trou ;
  - valider exige la déclaration de relecture intégrale, et retirer exige un
    motif ;
  - un acte ne peut porter que l'empreinte exacte du texte de sa version.
- Aucun code ne consomme encore ces tables : l'ingestion vient au lot 4, après
  application approuvée et constat par conteneur.
