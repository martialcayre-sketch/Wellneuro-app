### F34 : la colonne « objectif » des deux panels non indiqués cesse de dire « verbatim » (D-389 §4) (2026-10-28)

- Migration de données `20261028120000_biology_panels_objectif_lecture_signee` :
  la colonne `objectif` de `PANEL_MG_PLASMATIQUE` et `PANEL_CORTISOL_ISOLE`
  devient `Non indiqué actuellement — <claim>, lecture signée du responsable :
  « <motif> »`, le motif reproduit mot pour mot de la table signée — apostrophe
  typographique (’) comprise, là où la migration d'août écrivait l'apostrophe
  droite ([[D-389]] §1 et §4).
- Mise à jour ciblée par code de panel, précédée d'une garde d'existence des
  deux panels ; idempotente (rejouée, elle ne change aucune ligne). Aucun DDL,
  aucun schéma, aucune règle, empreinte ni signature touchée ; la migration
  d'août reste intacte.
- Banc `objectifLectureSignee.migration.test.ts`, lu sur le SQL sans ses
  commentaires : chaque valeur écrite égale claim et motif lus dans
  `INDICATIONS_BIOLOGIE_V1` ; deux écritures exactement ; garde d'existence
  présente avant elles ; « verbatim » absent ; aucun DDL ; empreintes de cette
  migration et de celle d'août épinglées (une migration appliquée ne se
  réécrit pas : un motif re-signé appellera une nouvelle migration).
- Reste à faire après le merge : l'application par release-db approuvée
  ([[D-087]]), puis le constat des deux valeurs par conteneur. Aucune logique n'en dépend ; la proposition de bilan du
  cockpit affiche la nouvelle valeur telle quelle ; le courrier et le document
  patient ne servent pas ces deux panels.
