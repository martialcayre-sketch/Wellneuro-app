### Base : une version d'objectif négocié ne se révise qu'une fois (dette t11, migration)

- Index unique `alli_objectif_negocie_supersedes_unique` sur
  `objectifs_negocies.supersedes_objectif_id` (migration
  `20261019150000_alli_objectif_supersedes_unique_v1`, contrat
  `alli_objectif_supersedes_unique_v1_negatif.sql`). Deux reformulations
  simultanées d'une même version ne peuvent plus scinder la chaîne en deux
  versions « en cours » ; deux objectifs distincts sur un dossier restent
  possibles. Constat préalable en production : aucune version révisée deux
  fois. Le message rendu à la reformulation perdante arrive avec le code, dans
  la PR suivante.
