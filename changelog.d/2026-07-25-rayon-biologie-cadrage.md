### Documentation

- Cadrage du rayon « Biologie fonctionnelle » de la bibliothèque (CB-00) :
  modèle à deux étages sous verrou HDS (catalogue documentaire maintenant,
  résultats patient après attestation), catalogue d'analyses à double
  référentiel de valeurs (laboratoire / fonctionnel sourcé claims D-003),
  concept de proposition d'exploration (jamais une prescription — courrier
  médecin C3 pour le remboursé NABM, document patient pour le non-remboursé),
  extension du moteur d'orientation vers des cibles biologiques, lots
  CB-00 → CB-09 et **huit décisions structurantes actées par le praticien le
  2026-07-25** (nommage CB, deux flags dont `WN_CB_RESULTS_ENABLED` gardant
  l'étage résultats, extension du moteur existant, table de règles séparée de
  NNPP2, contrat protocole V4 `BiologyCatalogRef`, NABM complet en brouillons,
  document patient systématique, ingestion du notebook après la certification)
  (`docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/`).
  Aucun code ni migration dans cette campagne de cadrage.
- Audit de la source de la nomenclature des actes de biologie médicale
  (`AUDIT-SOURCE-NABM.md`) : source retenue = Serveur Multi-Terminologies de
  l'ANS (FHIR, Licence Ouverte v2, API anonyme) plutôt que le portail ameli,
  volumétrie réelle 988 actes sur 1050 concepts, propriétés de facturation
  disponibles mais aucune métadonnée clinique (unité, préanalytique, valeurs de
  référence), et cœur de la biologie fonctionnelle absent de la nomenclature.
  Deux corrections au modèle du cadrage : correspondance analyte ↔ acte
  plusieurs-à-plusieurs (`BiologyAnalyteNabm`) et `sourceProvenance` en
  `nabm_smt_ans`.
