-- BP-12b (F09, LOT-28) — deux dossiers de preuve entrent dans la liste
-- fermée des positions d'expert ([[D-464]], qui amende [[D-439]] §2 et §5).
--
-- `iode_selenium` : prévu par D-439 §2 « à sa clôture, par migration » ; le
-- dossier est clos depuis le 2026-11-05 (D-446). `polyphenols_antioxydants` :
-- dossier clos le 2026-11-07 (D-457), même clé que le registre des conflits
-- (`conflitsSourcesV1`). D-464 fait du geste une règle : chaque dossier entre
-- à sa clôture par une migration comme celle-ci, puis par le code
-- consommateur. La liste reste FERMÉE : une valeur hors liste est refusée.
--
-- AJOUT SEUL. La contrainte garde son nom ; la liste élargie contient
-- l'ancienne, donc aucune ligne existante ne peut la violer. Aucune ligne
-- n'est écrite ni modifiée. Les triggers (dont « une révision reste dans son
-- dossier ») sont inchangés. En production le 2026-11-08 (one-off-6041,
-- lecture seule) : aucune version de position. Une seule instruction
-- `ALTER TABLE` : retrait et ajout sont atomiques, sans fenêtre où la colonne
-- serait ouverte.
--
-- CHECK non modélisé par Prisma : `schema.prisma` ne change pas. Éprouvé par
-- `prisma/checks/positions_expert_dossiers_v2_negatif.sql`.
ALTER TABLE "positions_expert_versions"
  DROP CONSTRAINT "positions_expert_versions_dossier_ferme",
  ADD CONSTRAINT "positions_expert_versions_dossier_ferme"
    CHECK ("dossier" IN (
      'fer',
      'vitamine_d',
      'zinc',
      'magnesium',
      'b9_b12',
      'iode_selenium',
      'polyphenols_antioxydants'
    ));
