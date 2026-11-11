-- NF-7, lot 1 (J2-base, H59) — la déclaration « pose-t-il une question sur
-- le suicide » des instruments du cabinet ([[D-303]], lettre m). Migration
-- SEULE : aucun code ne lit ni n'écrit ces colonnes avant le lot 2, servi
-- derrière le drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint par défaut.
--
-- Réponses du responsable du 2026-11-11 (liste commune, questions
-- 20261111-0027-a à 0029-a) :
--
-- 1. Sur `cabinet_instruments`, deux colonnes nullables :
--    - `pose_question_suicide` : la déclaration. NULL signifie « non
--      déclaré », jamais « non » ;
--    - la désignation de la question (`question_suicide_id`) et de la valeur
--      de son option « non » (`question_suicide_option_non`, entière comme
--      les valeurs d'option du cabinet). Elle sert au volet D-277, qui est un
--      lot à part (20261111-0030-a). La désignation se conserve dès la
--      publication.
--    Un CHECK de COHÉRENCE seulement : la désignation est entière ou absente,
--    et il n'y a pas de désignation sans « oui ». Le CHECK « valide ⇒
--    déclaré » n'est PAS posé ici. Il viendrait après l'allumage du drapeau,
--    par une troisième migration de H59 (20261111-0029-a). Le poser
--    maintenant ferait échouer la publication tant que le drapeau est éteint.
--
-- 2. Sur `assignations`, une copie nullable de la déclaration, prise à
--    l'envoi d'un instrument du cabinet (lot 2). Un instrument se modifie
--    dès que toutes ses passations sont verrouillées
--    (`api/praticien/instruments`, `nbEnvoisEnCours`), et l'écran
--    « transmis » d'une ancienne assignation affiche l'encart : la lecture
--    patient se fera sur cette copie, sans repli sur la déclaration courante
--    de l'instrument. NULL pour le catalogue et pour l'existant ; un CHECK
--    refuse une copie sur un questionnaire hors cabinet.
--
-- 3. Les instruments encore `valide` au moment de la release-db repassent en
--    `grille_a_relire` : publiés sans déclaration, ils devront être
--    redéclarés (20261111-0028-a). Une passation déjà partie reste servie
--    (`lib/instruments.ts`, `pourPassation`). En production le 2026-11-11
--    (one-off-8230, lecture seule, agrégats) : 0 instrument du cabinet,
--    0 assignation `CAB_`. Le compte se refait par conteneur juste avant la
--    release-db.
--
-- AJOUTS SEULS : aucune colonne retirée, aucune ligne effacée. Les colonnes
-- sont nullables, sans défaut, donc sans réécriture de table. Les CHECK sont
-- vérifiés contre l'existant, qui les satisfait : toutes les colonnes
-- neuves y sont NULL. CHECK non modélisés par Prisma ; éprouvés par
-- `prisma/checks/nf7_declaration_suicide_cabinet_v1_negatif.sql`.

ALTER TABLE "cabinet_instruments"
  ADD COLUMN "pose_question_suicide" BOOLEAN,
  ADD COLUMN "question_suicide_id" TEXT,
  ADD COLUMN "question_suicide_option_non" INTEGER,
  ADD CONSTRAINT "cabinet_instruments_designation_suicide_coherente"
    CHECK (
      ("question_suicide_id" IS NULL) = ("question_suicide_option_non" IS NULL)
      AND ("question_suicide_id" IS NULL OR "pose_question_suicide" IS TRUE)
    );

ALTER TABLE "assignations"
  ADD COLUMN "pose_question_suicide" BOOLEAN,
  ADD CONSTRAINT "assignations_declaration_suicide_cabinet_seul"
    CHECK (
      "pose_question_suicide" IS NULL
      OR left("id_questionnaire", 4) = 'CAB_'
    );

UPDATE "cabinet_instruments"
SET "statut_relecture" = 'grille_a_relire',
    "updated_at" = now()
WHERE "statut_relecture" = 'valide';
