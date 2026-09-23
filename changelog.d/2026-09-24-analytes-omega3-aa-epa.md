### Le catalogue biologie reçoit l'index oméga 3 et le rapport AA/EPA (2026-09-24)

- Migration de données `20260924090000_catalogue_biologie_omega3_aa_epa` :
  `BIO_INDEX_OMEGA3` (`%`) et `BIO_RATIO_AA_EPA` (`ratio`), saisis tels que le
  laboratoire les rend — analytes et non `biology_ratios`, selon la précision de
  `D-122` §2 portée par `D-245` §5. Aucune plage, aucune borne, aucune valeur
  patient.
- Contrat `cb_catalogue_niveau_1_donnees.sql` : 49 analytes `saisie_praticien`
  (47 + 2).
- LOT-01 du chantier 6 (porte biologique des assiettes). La migration ne
  s'applique qu'après `release-db` approuvée.
