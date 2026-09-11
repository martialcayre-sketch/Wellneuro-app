-- Alliance 6.0-B — LA DEMANDE DE CORRECTION DE L'OBJECTIF : le quatrième verbe
-- du patient, celui qui lui rend un chemin après qu'il a dit « c'est bien ça ».
--
-- Migration confirmée explicitement par le responsable le 2026-09-11 (« go lot
-- 1 et tous les lots suivants »). Gate humain : revue + go avant merge, puis
-- `release-db` approuvée et CONSTATÉE par conteneur — `D-087`. Aucun code
-- consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle. Aucun DROP, aucun renommage, aucun
-- backfill, aucune colonne existante modifiée.
--
-- CE QUE CETTE DEMANDE VIENT RÉPARER, ET LA MESURE QUI L'A DÉCIDÉE. Le dossier
-- PAT006 porte, le 2026-09-11 à 18:14, DEUX ratifications identiques sur le
-- même objectif, à dix secondes d'écart. Ce n'est pas un double-clic : c'est un
-- patient qui a répondu, n'a rien vu changer d'assez net, et a recommencé. Le
-- bloc de réponse se fermera donc après « c'est bien ça » (lot 4) — et un bloc
-- qui se ferme sans rien ouvrir enfermerait le patient dans sa propre réponse.
-- C'est CETTE table qui lui laisse la porte.
--
-- CE QU'ELLE N'EST PAS — ET L'HOMONYME EST DANS LE MÊME COCKPIT.
--
--   · Ce n'est PAS la « demande de correction » de `Assignation`
--     (`correction_commentaire` / `correction_demandee_date`, P5). Celle-là
--     porte sur les RÉPONSES DE QUESTIONNAIRE et le praticien la « débloque ».
--     Celle-ci porte sur le TEXTE DE L'OBJECTIF NÉGOCIÉ et rien ne se débloque :
--     elle se referme quand l'objectif est reformulé. Deux objets, deux tables,
--     et un suffixe `_objectif` qui doit rester dans tous les libellés praticien
--     sous peine de les confondre.
--   · Ce n'est PAS un `amendement_objectif`. L'amendement dit « voici MA
--     version », et son texte est OBLIGATOIRE parce qu'il EST la proposition.
--     La demande dit « reprenez ce texte », et son texte est FACULTATIF parce
--     qu'un patient peut savoir que ça ne va pas sans savoir le dire. Exiger
--     qu'il formule pour avoir le droit de demander serait lui poser une
--     condition d'expression sur sa propre parole.
--   · Ce n'est PAS une ratification de sens `conteste`. Contester se pose
--     AVANT d'avoir accepté ; demander une correction se pose APRÈS. Les ranger
--     ensemble ferait lire « le patient n'était pas d'accord » là où il a été
--     d'accord, puis a changé d'avis — deux trajectoires que `D-110` tient déjà
--     pour distinctes.
--
-- APPEND-ONLY, ET AUCUNE COLONNE DE CLÔTURE. Pas de `close_le`, pas de
-- `traitee_par`, pas de `statut` : une demande est EN ATTENTE tant que
-- l'objectif qu'elle vise est encore une tête active de sa chaîne. Le praticien
-- reformule, la v2 devient la tête, la demande cesse d'être en attente — SANS
-- QU'AUCUNE ROUTE PRATICIEN N'AIT ÉCRIT SUR UNE TABLE DE PAROLE PATIENT. C'est
-- la même discipline que `ratifications_objectif`, lue au cockpit et jamais
-- écrite par lui, et elle vaut mieux qu'un drapeau : un statut se coche sans
-- rien faire, une reformulation ne se simule pas.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI RANG (`DC-19`/`DC-20`). Aucun
-- compteur de demandes non plus : le nombre de fois qu'un patient a redemandé
-- n'est pas une mesure de lui. L'interdit de forme est tenu par la liste
-- blanche de colonnes du contrat
-- `prisma/checks/alli_demande_correction_objectif_v1_negatif.sql`.

-- CreateTable — ce que le patient demande, et sur quelle version il le demande.
CREATE TABLE "demandes_correction_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    -- RÉFÉRENCE DOUCE, SANS FK — patron du dépôt (`amendements_objectif`,
    -- `ratifications_objectif`, `supersedes_objectif_id` : aucune de ces
    -- colonnes ne porte de contrainte référentielle). La demande vise la
    -- VERSION exactement, jamais la chaîne : c'est ce texte-ci que le patient
    -- a lu et refusé, et l'attacher à la racine ferait porter sa demande par
    -- une formulation qu'il n'a jamais vue.
    "id_objectif" TEXT NOT NULL,
    -- FACULTATIF, ET C'EST L'ARBITRAGE DU RESPONSABLE (2026-09-11). Un clic
    -- suffit à lever la demande. NULLABLE plutôt que `DEFAULT ''` : une chaîne
    -- vide dirait « il a écrit, et il n'a rien mis », NULL dit « il n'a pas
    -- écrit » — et ces deux phrases ne se valent pas devant un praticien
    -- (`DC-24` : une absence n'est ni un zéro, ni un refus).
    "texte" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demandes_correction_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index par
-- table (patron 6.0-A).
CREATE INDEX "alli_demande_correction_patient_idx" ON "demandes_correction_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`patient/effacement.ts`, garde de complétude), pas un effet de
-- bord de FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "demandes_correction_objectif" ADD CONSTRAINT "demandes_correction_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- LE TEXTE EST FACULTATIF, MAIS PAS BLANC. `NULL` est un état complet — le
-- patient n'a pas écrit. `''` ou `'   '` n'en est pas un : c'est un envoi qui
-- s'est perdu, et l'enregistrer ferait afficher au praticien une demande
-- « motivée » dont le motif est vide. Les deux cas se distinguent donc ICI.
--
-- `btrim(…, E' \t\r\n')` ET NON `btrim/1`, qui ne retire que l'espace ASCII :
-- un texte fait d'une seule tabulation passerait (leçon du 2026-09-11).
ALTER TABLE "demandes_correction_objectif"
  ADD CONSTRAINT "alli_demande_correction_texte_non_blanc"
    CHECK ("texte" IS NULL OR btrim("texte", E' \t\r\n') <> '');

-- LA MÊME BORNE QUE L'AUTRE SURFACE D'ÉCRITURE DU PATIENT.
-- `LONGUEUR_MAX_AMENDEMENT` vaut 4 000 dans `lib/praticien/objectifNegocie.ts`.
-- Deux champs où le même patient écrit sur le même objectif, avec deux bornes
-- différentes, poseraient une limite que rien ne justifie — et c'est la route
-- qui refusera en 400, cette contrainte étant le filet, pas le message.
ALTER TABLE "demandes_correction_objectif"
  ADD CONSTRAINT "alli_demande_correction_texte_borne"
    CHECK ("texte" IS NULL OR char_length("texte") <= 4000);

-- LA RÉFÉRENCE À LA VERSION EST NOMMÉE, OU LA LIGNE EST IRRATTACHABLE. Sans FK
-- pour la garder, c'est ce CHECK qui empêche une demande de flotter sans viser
-- personne — elle s'afficherait alors sous aucune version, donc nulle part.
ALTER TABLE "demandes_correction_objectif"
  ADD CONSTRAINT "alli_demande_correction_objectif_nomme"
    CHECK (btrim("id_objectif", E' \t\r\n') <> '');

-- Deny-all (`D-005`) : cette table porte la parole du patient sur son propre
-- objectif, au même titre que les cinq du dossier à deux voix.
ALTER TABLE "public"."demandes_correction_objectif" ENABLE ROW LEVEL SECURITY;
