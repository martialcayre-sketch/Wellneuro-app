### Base : positions d'expert et arbitrages de conflits, tables vides (BP-12b, D-439, 2026-11-05)

- Trois tables neuves, en ajout seul et sans donnée patient :
  `positions_expert_versions`, `positions_expert_actes`,
  `arbitrages_conflits_sources` (migration `positions_expert_v1`).
- Une position se versionne comme un claim (`WN-PE-NNNN@vN.M`). Elle porte
  quatre rubriques, au moins un claim d'appui et son dossier de preuve, pris
  dans une liste fermée. Seule sa version courante se signe ou se retire,
  et la base recalcule l'empreinte du contenu.
- Un arbitrage vise un conflit déclaré pour une fiche d'usage. Il y a une
  tête par couple, et une révocation ne vise que la tête. Il retient l'un
  des claims ou une position en vigueur, et atteste à la pose l'empreinte
  du conflit et celle de la structure. Son motif est obligatoire.
- Contrat SQL négatif `positions_expert_v1_negatif.sql`, joué en CI.
- Migration seule : aucun code ne lit ni n'écrit encore ces tables. Les
  tables naissent vides ; le versement passe par l'atelier, après la
  release-db.
