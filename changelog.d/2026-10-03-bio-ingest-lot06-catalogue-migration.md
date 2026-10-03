### BIO-INGEST LOT-06 : le catalogue biologie s'étend aux analyses d'un compte rendu courant (2026-10-03)

- **36 analytes ajoutés** ([[D-261]], migration
  `20261003150000_catalogue_biologie_compte_rendu_courant`) : détail de la
  NFS et formule leucocytaire (absolu et %), ionogramme, créatinine et DFG,
  transaminases et GGT, lipides détaillés, transferrine, capacité de
  fixation, vitamine B12 totale, CRP. Le catalogue passe de 49 à 85 analytes.
- **Une unité par analyte, en SI** : la ligne imprimée dans l'autre unité
  est écartée par le praticien, jamais convertie. « mL/min/1,73 m² » entre au vocabulaire
  d'unités, sur les quatre CHECK ensemble.
- Aucune plage, aucune indication ; les quatre composites (NFS, ionogramme,
  bilan hépatique, profil lipidique) restent pour les panels.
- Le contrat `cb_catalogue_niveau_1_donnees.sql` tient les 85, les 36 ligne
  par ligne, l'absence de plage et la présence de la nouvelle unité. Le
  resolver et les notations équivalentes suivent en PR distincte, après
  l'application de la migration.
