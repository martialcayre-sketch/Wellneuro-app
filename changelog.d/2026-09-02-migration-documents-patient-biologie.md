### Ajouté — la table du document patient biologie (décision F, D-122) (2026-09-02)

- **Migration `documents_patient_biologie`** : la trace écrite de ce qui a été
  proposé au patient et pourquoi — la demande, jamais le résultat. Patron
  `correspondances_medecin` (`D-073`) sans le médecin : texte généré côté
  serveur, ancrage de provenance en colonnes (`ancrage_sha256` au format
  vérifié, `ancrage_version`), **non nuls** — ce document n'existe que dérivé
  de la table d'indications signée. Append-only : re-générer fait une ligne de
  plus.
- **Sécurité et complétude dès cette PR** : RLS deny-all (posture `D-005`),
  FK `patients` en RESTRICT, entrée dans la transaction d'effacement IDP2
  (le banc de complétude dérive du schéma), contrat SQL négatif
  `cb_documents_patient_v1_negatif.sql` joué par le CI — liste blanche de
  huit colonnes (aucune colonne de valeur d'analyse), CHECK mordants (dont le
  trou `btrim/1` fermé : un texte de tabulations est refusé), append-only
  prouvé.
- Migration seule dans sa PR (`D-087`) : le générateur, la route et le geste
  cockpit arrivent dans une PR de code, après application `release-db`
  approuvée et constatée par conteneur.
