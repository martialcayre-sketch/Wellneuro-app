-- SP-FIL — LA LECTURE D'UNE CARTE DU FIL, ENREGISTRÉE COMME UNE LECTURE.
--
-- Migration confirmée explicitement par le responsable le 2026-09-12 (arbitrage
-- en session : « Nouvelle table de lecture (migration) »). Gate humain : revue
-- + go avant merge, puis `release-db` approuvée et CONSTATÉE par conteneur —
-- `D-087`. Aucun code consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle. Aucun DROP, aucun renommage, aucun
-- backfill, aucune colonne existante modifiée. L'absence de ligne signifie
-- « aucune carte lue », ce qui est l'état actuel de tous les dossiers.
-- Rollback = abandon de la table.
--
-- CE QU'ELLE VIENT RÉPARER. Le Fil du jour fait UNE carte par geste du patient
-- sur son objectif, ancrée sur sa ligne source. PAT006 en porte donc DEUX,
-- identiques, parce qu'il a ratifié deux fois à dix secondes d'écart le
-- 2026-09-11 — et rien ne les retire, puisque le seul geste qui écarte une
-- carte est « Écarter », un refus explicite. Le praticien qui a OUVERT la
-- fiche, LU la réponse et repris l'objectif retrouve les mêmes cartes le
-- lendemain, et doit les refuser une à une pour dire qu'il a fait son travail.
--
-- POURQUOI UNE TABLE ET NON LA RÉUTILISATION DE `fil_card_rejections`. Le Fil
-- distingue déjà, et exprès, « écartée sans avoir été vue » de « traitée » :
-- `lib/fil/inbox.ts` l'écrit noir sur blanc à propos des réponses lues, et le
-- dépôt porte pour cela une table de lecture praticien dédiée
-- (`questionnaire_lectures_praticien`). Écrire une lecture dans la table des
-- refus ferait afficher « Carte écartée — … » pour une carte qu'on a traitée :
-- le dossier dirait que le praticien l'a refusée. Un écran qui ment sur ce que
-- son lecteur a fait est pire qu'un écran qui ne dit rien.
--
-- ANCRÉE SUR LE DOSSIER ET LE TYPE, JAMAIS SUR LA CARTE — et c'est l'arbitrage
-- du responsable. Une lecture n'est pas l'acquittement d'une ligne : c'est le
-- constat qu'on a ouvert la phase où ces gestes se lisent, et on les y voit
-- TOUS. Ancrer sur la clé de carte laisserait à PAT006 une carte orpheline
-- après la lecture, qu'il faudrait écarter à la main — c'est-à-dire refuser une
-- parole qu'on vient de lire. `type_carte` porte donc le TYPE (aujourd'hui le
-- seul `geste_objectif`), et `lue_le` fait la coupure : sont lues les cartes de
-- ce dossier et de ce type ANTÉRIEURES à cet instant. Un geste postérieur
-- reparaît, et c'est voulu — un fait nouveau mérite une nouvelle lecture.
--
-- PAS D'UNICITÉ SUR (id_patient, type_carte) — même motif que sa sœur
-- `fil_card_rejections` : la lecture est append-only chaînée, et son annulation
-- (« Remettre ») est une SECONDE ligne (`lue = false`) qui supplante la
-- première. Une unicité rendrait l'annulation impossible, or une carte qui part
-- toute seule doit pouvoir revenir : le lien peut avoir été ouvert par mégarde.
-- L'index sert la lecture, il ne contraint rien.
--
-- AUCUN SCORE, AUCUN COMPTEUR (`DC-19`/`DC-20`). Ni « nombre de cartes lues »,
-- ni délai de lecture, ni rang : la vitesse à laquelle un praticien ouvre un
-- dossier n'est pas une mesure de lui, et le nombre de fois qu'un patient s'est
-- prononcé n'est pas une mesure de lui non plus. L'interdit de forme est tenu
-- par la liste blanche de colonnes du contrat
-- `prisma/checks/fil_lecture_carte_v1_negatif.sql`.

-- CreateTable — qui a lu quoi, sur quel dossier, et quand.
CREATE TABLE "fil_card_lectures" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    -- LE TYPE DE CARTE, pas sa clé. Aujourd'hui `geste_objectif` et lui seul —
    -- le comportement est délibérément étroit (arbitrage du 2026-09-12) : une
    -- carte qui appelle un GESTE ailleurs (signalement, biologie arbitrée,
    -- assignation en retard) ne se règle pas en la lisant, et la faire partir
    -- à l'atterrissage perdrait le suivi. Le CHECK ne fige pourtant PAS la
    -- valeur : c'est la route qui décide quels types s'acquittent par lecture,
    -- et une liste figée en base se périmerait sans que personne ne la relise.
    "type_carte" TEXT NOT NULL,
    -- `false` = lecture ANNULÉE (« Remettre »). Même forme que `refusee` chez
    -- la sœur, et pour la même raison : c'est la ligne la plus récente du
    -- couple (dossier, type) qui dit l'état.
    "lue" BOOLEAN NOT NULL DEFAULT true,
    "lue_par" TEXT NOT NULL,
    "supersedes_lecture_id" TEXT,
    "lue_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fil_card_lectures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — la timeline du dossier.
CREATE INDEX "fil_lecture_patient_idx" ON "fil_card_lectures"("id_patient", "lue_le");

-- CreateIndex — la question que pose le Fil à chaque ouverture : « ce dossier,
-- ce type, quelle est la dernière lecture ? »
CREATE INDEX "fil_lecture_type_idx" ON "fil_card_lectures"("id_patient", "type_carte");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`patient/effacement.ts`, garde de complétude), pas un effet de
-- bord de FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "fil_card_lectures" ADD CONSTRAINT "fil_card_lectures_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- UN TYPE VIDE NE DÉSIGNE RIEN, et une ligne qui ne désigne rien acquitterait
-- tout ou rien selon la façon dont on la lit. `btrim(…, E' \t\r\n')` ET NON
-- `btrim/1`, qui ne retire que l'espace ASCII : un type fait d'une seule
-- tabulation passerait (leçon du 2026-09-11).
ALTER TABLE "fil_card_lectures"
  ADD CONSTRAINT "fil_lecture_type_nomme"
    CHECK (btrim("type_carte", E' \t\r\n') <> '');

-- QUI A LU EST AUSSI IMPORTANT QUE QUAND. Une lecture anonyme ne se conteste
-- pas et ne s'explique pas : c'est une trace d'audit, pas un drapeau.
ALTER TABLE "fil_card_lectures"
  ADD CONSTRAINT "fil_lecture_lecteur_nomme"
    CHECK (btrim("lue_par", E' \t\r\n') <> '');

-- Deny-all (`D-005`) : même régime que `fil_card_rejections`, sa sœur.
ALTER TABLE "public"."fil_card_lectures" ENABLE ROW LEVEL SECURITY;
