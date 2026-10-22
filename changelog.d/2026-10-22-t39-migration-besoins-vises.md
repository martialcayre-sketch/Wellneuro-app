### t39, migration : les besoins visés d'une priorité libre (D-338 §3, amende D-279 §1, H84, 2026-10-22)

- `web/prisma/migrations/20261022140000_c1_selection_priorite_besoins_vises_v1` :
  colonne `besoins_vises` sur `decision_priority_selections`, au patron de
  D-279 §3 ; entiers de 1 à 12 (les douze admis, ceux sans questionnaire
  compris : arbitrage du responsable du 2026-10-22), à une dimension indicée
  à 1, strictement croissants (fonction IMMUTABLE
  `selection_priorite_besoins_croissants`), `{}` pour l'absence (NOT NULL,
  défaut `{}` : les lignes existantes le reçoivent), réservée aux lignes
  `libre:`. L'identifiant `libre:<domaine>:<empreinte>` est inchangé :
  corriger les seuls besoins visés chaîne sur la même priorité, sans pivot.
- `schema.prisma` : champ `besoinsVises` du modèle `DecisionPrioritySelection`.
- Contrat `c1_selection_priorite_v1_negatif.sql` étendu : huit refus neufs,
  chacun sous le nom de son propre CHECK (bornes, élément NULL, doublon,
  ordre, deux dimensions, indice de départ 0, candidat du moteur), visées
  acceptées (douze, partielle, absente, corrigée), treize colonnes, colonne
  NOT NULL, fonction IMMUTABLE ; chaque CHECK éprouvé par mutation en local.
  Commentaire de l'étape de CI aligné.
- Migration seule : aucun code ne lit ni n'écrit la colonne avant le constat
  par conteneur. Le code consommateur (lecture par la re-passation ciblée
  seule) suit, dans une seconde PR.
