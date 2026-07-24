### Ajouté

- **C4 / LOT-02a (première tranche)** : outillage d'import hors runtime
  `tools/supplements/` — parseur de l'open data Compl'Alim (« Déclarations de
  compléments alimentaires », DGAL/DGCCRF, Licence Ouverte v2.0) vers des
  fiches normalisées (produit + composition + provenance/fraîcheur), avec
  calcul déterministe du niveau de complétude (`bien_documentee` / `partielle`
  / `lacunaire`) et liste explicite des données manquantes (dimensions
  qualitatives, jamais de score agrégé), puis chargement en **brouillons**
  (`statut = 'importee'`) dans une base PostgreSQL éphémère dev-locale.
  Garde-fous : brouillons seulement (décision n°11 du moteur d'intention),
  refus de toute cible non locale, ré-import qui n'écrase jamais une fiche
  vérifiée, statut `verifiee` jamais posé par l'outil. Le DDL local
  (`ddl-attendu.sql`) est une hypothèse à réconcilier avec la migration LOT-01.
