### Corrigé

- **Le moteur d'orientation ne pouvait proposer aucun pack.** Les identifiants de
  packs du code (`PACKS_REGISTRY`, `pack_socle_initial_neuronutrition`) et ceux de
  la base (`packs.id_pack`, `PACK_SOCLE_INIT`) forment deux espaces de noms
  disjoints ; `/api/praticien/orientation` les comparait directement, si bien que
  `compositionPacks` restait toujours vide et que le filtre fail-closed rejetait
  toute recommandation de pack. Même dotée d'une table de règles signée, la route
  n'aurait jamais rendu que des cibles `questionnaire`. Une traduction explicite est
  posée dans les deux sens (`packIdDepuisIdBase`, `idBaseDepuisPackId`), et la
  réponse porte l'`id_pack` attendu par `/api/praticien/packs/assign` — sans quoi
  une recommandation suivie d'un clic aurait rendu `pack_not_found`.
  LOT-03 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`.

### Ajouté

- `PackRegistryItem` porte `idPackBase` (l'`id_pack` réel quand le pack existe en
  base — 6 cas sur 16) et `axeId` (lien vers le registre des sources
  d'intervention du LOT-00). Un `idPackBase: null` dit que le pack n'est pas
  assignable, au lieu de laisser deviner.
- Le repli de composition sur `packs.qids` distingue ses causes
  (`registre_absent` / `registre_vide` / `ensembles_divergents`) et n'émet
  `ASSIGNATION.PACK.REGISTRE_REPLI_LEGACY` que sur une divergence réelle, avec les
  deux comptages. Le pack par défaut étant en dérive (5 qids contre 4 au registre),
  alerter sur toutes les causes aurait allumé l'alarme en permanence.
- Bancs : correspondance bidirectionnelle, exhaustivité `PackId` ↔ registre, axes
  vérifiés contre `nnpp2_interventions_registry.json`, et un garde qui échouera si
  une règle d'orientation cite un pack sans existence en base — vacant tant que la
  table est vide, ce qui est précisément le moment de l'écrire.
- `checkPackRegistryConsistency` signale les correspondances de doctrine
  orphelines et les packs de base hors doctrine.
