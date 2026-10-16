### BP-12a : la migration des fiches d'usage — quatre tables en ajout seul, un acte par rubrique ; D-314 amendée (LOT-12, 2026-10-16)

- Migration seule (`20261016090000_fiches_usage_v1`, horodatée après celle de
  CC-8, appliquée après elle), aucun code consommateur :
  les versions du texte d'une fiche d'usage et leurs actes par rubrique ; les
  libellés du vocabulaire signé (hypothèses et populations d'usage) et leurs
  actes. Aucune donnée patient, aucune valeur clinique ; le texte ne touche
  jamais le dépôt.
- Un acte valide ou retire UNE rubrique d'une version, dont la base recalcule
  elle-même l'empreinte, ou UN libellé, dont l'empreinte est tenue par CHECK.
- Rubriques en liste fermée par la base (cadrage v3, §3.2), sans
  « explication patient », refusée (arbitrage 6). Identifiants `FU_…`,
  `HYP_…`, `POP_…`, la nature d'un libellé tenue avec son préfixe. Texte et
  libellés portent l'empreinte de la structure signée (arbitrages 10, 15).
- Ajout seul par trigger, numéros contigus, instants et ordre posés par la
  base en UTC, RLS deny-all. Contrat négatif `fiches_usage_v1_negatif.sql`,
  joué au CI et par T3 sous un fuseau de session Europe/Paris ; les CHECK
  doublés par un trigger y sont éprouvés seuls.
- D-314 §8 : cinq arbitrages de forme (quatre tables au lieu de trois,
  populations au vocabulaire, rubriques fermées en base, formats fixés,
  libellés liés à la structure) ; fiche LOT-12, arbitrages 11 à 15.
- Release-db : la suivante du rang 4, après EF-3b ; le code (PR 2) part après
  son constat par conteneur.
