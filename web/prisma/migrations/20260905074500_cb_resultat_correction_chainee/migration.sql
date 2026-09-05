-- Correction d'une saisie de résultat : append-only chaîné (D-124, LOT-02 de
-- la campagne « Biologie exploitée »).
--
-- Le régime est celui de la maison — corriger crée une LIGNE qui référence
-- l'ancienne, jamais un `update` (au moins dix chaînes `supersedes_*` au
-- schéma, esprit DC-30 : une erreur se signale, elle ne disparaît pas).
--
-- L'OBSTACLE, et ce que cette migration en fait. `cb_resultat_bio_patient_
-- analyte_idx` était UNIQUE sur (patient, analyte, date de prélèvement) : une
-- correction, qui porte par définition la MÊME clé, était structurellement
-- impossible. L'unicité devient donc PARTIELLE — elle ne vise que les lignes
-- dont `supersedes_resultat_id IS NULL`, c'est-à-dire les saisies NEUVES.
-- Conséquence tenue exprès : le 409 `doublon_mesure` de la route est un
-- rattrapage de `P2002`, et il ne bouge pas — un doublon de saisie neuve
-- continue de violer l'index. Seule la correction en sort.
--
-- Formes écartées, motifs au registre (D-124) : rendre l'index simplement non
-- unique aurait supprimé EN SILENCE la garde anti-doublon ; un marqueur
-- `remplace_le` sur la ligne d'origine aurait coûté un `UPDATE` et la fin de
-- l'append-only strict pour rien de plus.
--
-- Aucune donnée n'est touchée : la table compte 0 ligne en production et
-- `WN_CB_RESULTS_ENABLED` n'est pas posé.

-- AlterTable — référence SOUPLE, sans clé étrangère : patron des autres
-- chaînes `supersedes_*` du dépôt. La ligne visée est validée côté route.
ALTER TABLE "resultats_biologiques"
  ADD COLUMN "supersedes_resultat_id" TEXT;

-- Une ligne ne se supplante pas elle-même : elle disparaîtrait de la série
-- (aucune ligne n'est jamais tête de fil si elle se pointe), et une mesure
-- perdue en silence est précisément ce que la doctrine refuse.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_supersedes_non_reflexif_check"
    CHECK ("supersedes_resultat_id" IS NULL OR "supersedes_resultat_id" <> "id");

-- DropIndex — l'unicité TOTALE cède la place à l'unicité PARTIELLE. L'index
-- de lecture est recréé juste après, non unique et sous le même nom : la
-- série d'un analyte dans un dossier reste servie par un index.
DROP INDEX "cb_resultat_bio_patient_analyte_idx";

-- CreateIndex — l'unicité, désormais partielle. Prisma ne sait pas exprimer
-- un index partiel : il vit ici seulement, comme ceux de
-- `biology_reference_ranges`, et `schema.prisma` le dit en commentaire.
CREATE UNIQUE INDEX "cb_resultat_bio_courant_key"
  ON "resultats_biologiques"("id_patient", "analyte_code", "preleve_le")
  WHERE "supersedes_resultat_id" IS NULL;

-- CreateIndex — lecture de la série (estimé ↔ mesuré), toutes lignes
-- comprises : une correction doit rester lisible avec ce qu'elle corrige.
CREATE INDEX "cb_resultat_bio_patient_analyte_idx"
  ON "resultats_biologiques"("id_patient", "analyte_code", "preleve_le");

-- CreateIndex — remonter le fil : « qui supplante cette ligne ? »
CREATE INDEX "cb_resultat_bio_supersedes_idx"
  ON "resultats_biologiques"("supersedes_resultat_id");
