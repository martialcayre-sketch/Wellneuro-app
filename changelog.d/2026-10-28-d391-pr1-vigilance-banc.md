### Données physiologiques et traitements : la vigilance de la synthèse lit les traitements en lignes, un point par traitement (BP-13, D-391 PR 1)

- Aucun changement visible aujourd'hui : `WN_PHYSIO_TRAITEMENTS` reste éteint
  et aucun dossier ne porte de traitement en lignes.
- La ligne de vigilance de la synthèse lit les traitements en vigueur du
  dossier même drapeau éteint : une extinction après un allumage ne retire
  plus rien d'une synthèse. Le texte transmis à l'IA ne change pas.
- Chaque traitement en lignes fait son propre point de vigilance ; un point de
  plus de 500 caractères est scindé aux mots, sans rien retirer. Les
  traitements déclarés à l'anamnèse gardent leur forme d'avant.
- Un banc sur vraie base joue l'écriture des lignes (pose, remplacement,
  retrait, écritures concurrentes) au CI.
