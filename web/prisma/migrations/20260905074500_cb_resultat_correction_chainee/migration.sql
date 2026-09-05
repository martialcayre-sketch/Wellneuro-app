-- Correction d'une saisie de résultat : append-only chaîné (D-124, LOT-02 de
-- la campagne « Biologie exploitée »).
--
-- Le régime est celui de la maison — corriger crée une LIGNE qui référence
-- l'ancienne, jamais un `update` (au moins dix chaînes `supersedes_*` au
-- schéma, esprit DC-30 : une erreur se signale, elle ne disparaît pas).
--
-- L'OBSTACLE, et ce que cette migration en fait. L'index
-- `cb_resultat_bio_patient_analyte_idx` était UNIQUE sur (patient, analyte,
-- date de prélèvement) : une correction, qui porte par définition la MÊME
-- clé, était structurellement impossible. L'unicité devient donc PARTIELLE — elle ne vise que les lignes
-- dont `supersedes_resultat_id IS NULL`, c'est-à-dire les saisies NEUVES.
-- Conséquence tenue exprès : le 409 `doublon_mesure` de la route est un
-- rattrapage de `P2002`, et il ne bouge pas — un doublon de saisie neuve
-- continue de violer l'index. Seule la correction en sort.
--
-- LE NOM RESTE SUR LA GARDE. `cb_resultat_bio_patient_analyte_idx` désigne
-- l'unicité depuis la création de la table : il continue de la désigner, et
-- l'index de LECTURE qui apparaît ici prend un nom NEUF. Recycler l'ancien
-- nom pour un index non unique ferait dire à `\d resultats_biologiques`, en
-- production, le contraire de ce que le registre promet — et un auditeur qui
-- « réparerait » la garde en la rendant totale tuerait toute correction.
--
-- Formes écartées, motifs au registre (D-124) : rendre l'index simplement non
-- unique aurait supprimé EN SILENCE la garde anti-doublon ; un marqueur
-- `remplace_le` sur la ligne d'origine aurait coûté un `UPDATE` et la fin de
-- l'append-only strict pour rien de plus.
--
-- Aucune donnée n'est touchée : la table compte 0 ligne en production et
-- `WN_CB_RESULTS_ENABLED` n'est pas posé.

-- AlterTable — référence SOUPLE, sans clé étrangère : patron des autres
-- chaînes `supersedes_*` du dépôt. La ligne visée est validée côté route, et
-- cette validation N'EST PAS FACULTATIVE : une ligne au `supersedes` non nul
-- est hors index par construction, si bien qu'un `supersedes` accepté sans
-- contrôle contournerait la garde anti-doublon autant de fois qu'on veut.
-- Les quatre contrôles dus sont inscrits au Done du LOT-02.
ALTER TABLE "resultats_biologiques"
  ADD COLUMN "supersedes_resultat_id" TEXT;

-- Une ligne ne se supplante pas elle-même : elle disparaîtrait de la série
-- (aucune ligne n'est jamais tête de fil si elle se pointe), et une mesure
-- perdue en silence est précisément ce que la doctrine refuse. ÉCART ASSUMÉ
-- au patron maison — aucune des dix autres chaînes `supersedes_*` ne porte ce
-- CHECK ; il est strictement resserrant et l'asymétrie est nommée à D-124.
ALTER TABLE "resultats_biologiques"
  ADD CONSTRAINT "resultats_biologiques_supersedes_non_reflexif_check"
    CHECK ("supersedes_resultat_id" IS NULL OR "supersedes_resultat_id" <> "id");

-- DropIndex — l'unicité TOTALE cède la place à l'unicité PARTIELLE, SOUS LE
-- MÊME NOM. Pas d'`IF EXISTS` : si l'état divergeait, la migration doit
-- échouer bruyamment plutôt que continuer sur une base qu'on croit connaître.
DROP INDEX "cb_resultat_bio_patient_analyte_idx";

-- CreateIndex — la garde, désormais partielle, et toujours sous son nom
-- d'origine. Prisma ne sait pas exprimer un index partiel : il vit ici
-- seulement, comme ceux de `biology_reference_ranges`, et `schema.prisma` le
-- dit en commentaire. Le fichier n'ayant aucun `CONCURRENTLY`, Prisma
-- l'enveloppe dans UNE transaction : il n'existe aucune fenêtre entre le DROP
-- ci-dessus et ce CREATE où l'unicité serait relâchée.
CREATE UNIQUE INDEX "cb_resultat_bio_patient_analyte_idx"
  ON "resultats_biologiques"("id_patient", "analyte_code", "preleve_le")
  WHERE "supersedes_resultat_id" IS NULL;

-- CreateIndex — index de LECTURE, nom neuf. Il n'était pas prévu par D-124 et
-- il manquait à sa forme littérale : la garde partielle ne couvre que les
-- lignes non supplantées, alors que la série d'un analyte doit se lire
-- ENTIÈRE — une correction reste lisible avec ce qu'elle corrige.
CREATE INDEX "cb_resultat_bio_serie_idx"
  ON "resultats_biologiques"("id_patient", "analyte_code", "preleve_le");

-- CreateIndex — remonter le fil : « qui supplante cette ligne ? »
CREATE INDEX "cb_resultat_bio_supersedes_idx"
  ON "resultats_biologiques"("supersedes_resultat_id");
