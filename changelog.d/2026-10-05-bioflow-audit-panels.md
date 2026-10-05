### BioFlow : audit des panels biologiques et cible de rationalisation (2026-10-05)

- Le premier livrable du cadrage directeur BioFlow est versé, comme snapshot
  daté (`docs/architecture/bioflow/AUDIT_PANELS_BIOLOGIE_2026-10-05.md`).
- Mesures de production, en agrégats lus en lecture seule :
  - 15 panels, 78 items, 35 analytes distincts ;
  - 987 actes NABM et 0 correspondance signée, donc 0 analyte évaluable en
    remboursement ;
  - 0 lien vers un axe, 0 panel documenté, 0 action `biological_exploration`.
- Classification : aucun vrai panel technique, dix axes cliniques déguisés,
  trois panels d'indication ou de population, un template optionnel, deux
  coquilles « non indiqué ».
- La cible s'appuie au maximum sur l'existant (`BiologyAnalyteLink`,
  `indicationsBiologieV1`, BP-04/BP-16/BP-18). Le plan propose trois
  prochaines PR : une décision, une proposition dédoublonnée, des axes.
- La roadmap gagne une Track C (BIO-PRESCRIPTION, en cadrage) et la règle de
  gel des nouveaux packs cliniques.
- Rien n'est migré ni supprimé.
