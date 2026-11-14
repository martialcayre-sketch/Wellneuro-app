-- D-515 §4 (H59, J2-base ; lot D-277, étape 1 du §6) — la copie de la
-- DÉSIGNATION de la question sur le suicide, prise sur l'assignation à
-- l'envoi d'un instrument du cabinet, à côté de la copie de la déclaration
-- posée par NF-7 ([[D-303]], [[D-493]] ; migration
-- `20261111100000_nf7_declaration_suicide_cabinet_v1`). Migration SEULE :
-- aucun code ne lit ni n'écrit ces colonnes avant le lot de code de D-515,
-- servi derrière `WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint par défaut.
--
-- Réponses du responsable (liste commune) : 20261112-2025-a (la copie),
-- 20261113-1807-a (la désignation inconnue, D-515 §7).
--
-- Sur `assignations`, trois colonnes nullables, sur le nommage de
-- `cabinet_instruments` :
--   - `question_suicide_id` : l'identifiant de la question désignée ;
--   - `question_suicide_option_non` : la valeur entière de son option
--     « non », entière comme les valeurs d'option du cabinet ;
--   - `question_suicide_copie` : une copie JSON figée — le nom de
--     l'instrument, l'énoncé de la question désignée et ses options (valeurs
--     et libellés), VERBATIM. La lettre, le courriel, le message et le
--     producteur `SAF-QUEST-02` liront cette copie et jamais l'instrument,
--     qui reste modifiable (D-515 §4). La forme interne de l'objet est celle
--     du lot de code ; ici, seulement un objet JSON.
--
-- Un CHECK de COHÉRENCE avec `pose_question_suicide` : les trois colonnes
-- sont toutes remplies ou toutes vides, et remplies seulement si la copie de
-- déclaration vaut « oui » (IS TRUE : ni « non », ni NULL). Comme
-- `pose_question_suicide` n'est admise que sur un `CAB_`
-- (`assignations_declaration_suicide_cabinet_seul`), la désignation ne
-- l'est pas davantage ailleurs.
--
-- AUCUNE REPRISE DE DONNÉES. Les assignations existantes restent NULL : une
-- désignation absente reste INCONNUE, jamais « non » (DC-24, D-515 §7) ; elle
-- n'est jamais reconstituée depuis l'instrument courant. En production le
-- 2026-11-12 (lecture par conteneur) : 0 assignation `CAB_`.
--
-- AJOUTS SEULS : aucune colonne retirée, aucune ligne effacée, ni le trigger
-- de `adressages_signal_alerte` ni aucune autre contrainte modifiés (D-515
-- §2). Colonnes nullables, sans défaut, donc sans réécriture de table. Le
-- CHECK est vérifié contre l'existant, qui le satisfait : les trois colonnes
-- y sont NULL. CHECK non modélisé par Prisma ; éprouvé par
-- `prisma/checks/d515_designation_suicide_assignation_v1_negatif.sql`.

ALTER TABLE "assignations"
  ADD COLUMN "question_suicide_id" TEXT,
  ADD COLUMN "question_suicide_option_non" INTEGER,
  ADD COLUMN "question_suicide_copie" JSONB,
  ADD CONSTRAINT "assignations_designation_suicide_coherente"
    CHECK (
      ("question_suicide_id" IS NULL) = ("question_suicide_option_non" IS NULL)
      AND ("question_suicide_id" IS NULL) = ("question_suicide_copie" IS NULL)
      AND ("question_suicide_id" IS NULL OR "pose_question_suicide" IS TRUE)
      AND ("question_suicide_copie" IS NULL OR jsonb_typeof("question_suicide_copie") = 'object')
    );
