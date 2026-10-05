### BIO-INGEST LOT-07 : un fait du laboratoire non transcrit se dit — migration seule (2026-10-05)

- **Pourquoi.** L'arbitrage du responsable veut qu'un intervalle imprimé de
  plus de 300 caractères reste NULL, sans troncature, sans échec de l'import
  et sans borne nouvelle, et que ce soit **signalé à la validation**. La
  migration #1326 n'avait aucune colonne pour porter ce signal : la validation
  a lieu après l'extraction, donc le signal se perdait.
- **Migration `20261005210000_bio_ingest_faits_non_transcrits_v1`.**
  `intervalle_non_transcrit` et `marquage_non_transcrit` sont deux booléens
  `NOT NULL DEFAULT false`. Deux CHECK imposent qu'un signal vrai
  n'accompagne qu'un fait NULL. La fonction de modification de la ligne les
  fige à la décision.
- Contrat `bio_ingest_faits_non_transcrits_v1_negatif.sql` et son étape de
  CI ; le contrat du staging liste les deux colonnes. `D-267` gagne un §10 ;
  la table santé du dossier RGPD mentionne les deux indicateurs.
- Aucun code consommateur : il suit, après `release-db` et le constat.
