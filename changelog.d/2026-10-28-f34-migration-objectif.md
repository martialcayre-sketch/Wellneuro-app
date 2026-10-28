### F34 : la colonne « objectif » des deux panels non indiqués cesse de dire « verbatim » (D-389 §4)

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
- Banc `objectifLectureSignee.migration.test.ts` : chaque valeur écrite égale
  claim et motif lus dans `INDICATIONS_BIOLOGIE_V1` ; « verbatim » absent ;
  aucun DDL ; empreinte de la migration d'août épinglée.
- Application par release-db approuvée ([[D-087]]), constat des deux valeurs
  par conteneur. Aucun code n'en dépend.
