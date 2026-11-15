-- NF-7, troisième migration de H59 (J2-base ; [[D-303]], amendée par
-- [[D-493]] ; [[D-515]] §6 étape 4, [[D-524]] §3) — le CHECK « valide ⇒
-- déclaré » sur `cabinet_instruments`. Migration SEULE : aucun code ne change.
--
-- Réponses du responsable du 2026-11-11 (liste commune) :
--   - 20261111-0028-a : NULL signifie « non déclaré », jamais « non » ; tout
--     instrument `valide` sans déclaration repasse en `grille_a_relire` ;
--     le CHECK est posé dès que la publication écrit la déclaration ;
--   - 20261111-0029-a : le CHECK part dans une migration APRÈS l'allumage de
--     `WN_ENABLE_DECLARATION_SUICIDE_CAB`, et le drapeau se retire ensuite.
--
-- Le drapeau est allumé en production depuis le 2026-11-15 à 13:03:07 UTC
-- (#2154). Drapeau allumé, la publication est le seul passage vers `valide`
-- et elle exige la déclaration (`api/praticien/instruments`, action
-- `publier`) ; une modification des questions repasse l'instrument en
-- brouillon et efface sa déclaration. Les deux écritures satisfont le CHECK.
--
-- 1. REPRISE : un instrument `valide` dont la déclaration est NULL repasse en
--    `grille_a_relire` (même geste que la migration du lot 1,
--    `20261111100000_nf7_declaration_suicide_cabinet_v1`, borné ici aux
--    seuls non déclarés). Il devra être redéclaré à sa publication. Une
--    passation déjà partie reste servie (`lib/instruments.ts`,
--    `pourPassation`). En production le 2026-11-15 (recomptage par
--    conteneur, one-off-3958, agrégats) : 0 instrument du cabinet.
--
-- 2. CHECK : un instrument `valide` porte une déclaration, « oui » ou
--    « non ». `statut_relecture` est NOT NULL. La cohérence de la
--    désignation reste à `cabinet_instruments_designation_suicide_coherente`,
--    inchangée.
--
-- CONSÉQUENCE CONNUE (question 20261111-0029-a) : drapeau ÉTEINT, la
-- publication d'avant NF-7 écrit `valide` sans déclaration ; sur un
-- instrument jamais déclaré, la base la refuse désormais. Le retrait du
-- drapeau est le lot suivant.
--
-- AUCUNE ligne effacée, aucune colonne retirée. L'UPDATE a son WHERE. Le
-- CHECK est vérifié contre l'existant, qui le satisfait après la reprise.
-- CHECK non modélisé par Prisma ; éprouvé par
-- `prisma/checks/nf7_valide_declare_v1_negatif.sql`.

UPDATE "cabinet_instruments"
SET "statut_relecture" = 'grille_a_relire',
    "updated_at" = now()
WHERE "statut_relecture" = 'valide'
  AND "pose_question_suicide" IS NULL;

ALTER TABLE "cabinet_instruments"
  ADD CONSTRAINT "cabinet_instruments_valide_declare"
    CHECK ("statut_relecture" <> 'valide' OR "pose_question_suicide" IS NOT NULL);
