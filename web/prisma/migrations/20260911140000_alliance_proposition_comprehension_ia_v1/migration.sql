-- Alliance 6.0-B — la proposition de RÉSUMÉ GLOBAL assistée par IA, celle qui
-- pré-remplira « Ce que j'ai compris de vous ».
--
-- Migration confirmée explicitement par le responsable le 2026-09-11 (« go lot
-- 1 »). Gate humain : revue + go avant merge, puis `release-db` approuvée et
-- CONSTATÉE par conteneur — `D-087`. Aucun code consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle. Aucun DROP, aucun renommage, aucun
-- backfill, aucune colonne existante modifiée.
--
-- CE QUE CETTE TABLE N'EST PAS.
--
--   · Ce n'est pas `propositions_priorite_ia`. Celle-là propose UN LIBELLÉ de
--     200 caractères pour l'objectif négocié, à partir d'UNE synthèse et d'UN
--     dépôt. Celle-ci propose un TEXTE LONG pour la compréhension publiée au
--     patient, à partir de PLUSIEURS synthèses validées et des désaccords déjà
--     signalés. Deux surfaces, deux bornes, deux consignes.
--   · Ce n'est pas `syntheses_comprehension`. Celle-là porte ce que le
--     PRATICIEN a écrit et signé ; celle-ci porte ce que la MACHINE a proposé.
--     Rien n'est publié depuis ici : un tirage doit être repris, relu et
--     modifié avant d'exister comme compréhension. Le verrou de publication
--     vit à la route ; la séparation des deux tables le rend lisible en base.
--
-- APPEND-ONLY : aucune route d'update, aucune suppression. Le bouton « une
-- autre » écrit UNE LIGNE DE PLUS, de `rang` suivant. Les tirages précédents
-- restent — auditables en base, JAMAIS affichés.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI RANG CLINIQUE. `rang` compte des
-- TIRAGES, pas des sujets : c'est un numéro d'ordre d'écriture, jamais un
-- classement de ce qui compte (`DC-19`/`DC-20`). L'ORDRE que le texte produit,
-- lui, n'est pas inventé ici : il reprend celui qu'un praticien a déjà validé
-- dans la synthèse citée — c'est l'arbitrage du 2026-09-11, et c'est pour cela
-- que les identifiants de synthèses sont enregistrés plutôt qu'un ordre propre.
-- L'interdit de forme est tenu par la liste blanche de colonnes du contrat
-- `prisma/checks/alli_proposition_comprehension_ia_v1_negatif.sql`.

-- CreateTable — un texte proposé par le modèle, avec toutes ses sources et de
-- quoi le retracer.
CREATE TABLE "propositions_comprehension_ia" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    -- DEUX LISTES ORDONNÉES, ET NON UN BLOB. La matière de ce tirage est
    -- PLURIELLE — c'est ce qui la distingue de la priorité. Un `jsonb` aurait
    -- accepté n'importe quelle forme et rendu les CHECK ci-dessous
    -- inexprimables ; deux colonnes `text[]` se contraignent en SQL.
    "sources_syntheses" TEXT[] NOT NULL,
    "sources_desaccords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "version_consigne" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propositions_comprehension_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- (patron de la campagne).
CREATE INDEX "alli_prop_comprehension_patient_idx" ON "propositions_comprehension_ia"("id_patient", "cree_le");

-- CreateIndex — DEUX TIRAGES NE PARTAGENT PAS UN RANG, à matière et consigne
-- égales. Sans cette unicité, resservir le tirage courant n'aurait pas de
-- réponse déterministe : à `cree_le` égal — deux écritures dans la même
-- milliseconde — l'ordre serait celui que la base voudrait bien rendre.
--
-- LES DEUX LISTES ENTRENT DANS LA CLÉ, et l'ordre y compte : `{A,B}` et `{B,A}`
-- sont deux matières distinctes pour Postgres, donc deux séries de rangs. C'est
-- le comportement voulu — l'ordre des synthèses est justement ce que le texte
-- produit reprend, et deux ordres différents ne produisent pas le même texte.
CREATE UNIQUE INDEX "alli_prop_comprehension_tirage_unique" ON "propositions_comprehension_ia"("id_patient", "sources_syntheses", "sources_desaccords", "version_consigne", "rang");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`effacerDossier`, garde de complétude), pas un effet de bord de
-- FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "propositions_comprehension_ia" ADD CONSTRAINT "propositions_comprehension_ia_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- LA BORNE DE 4 000 CARACTÈRES EST CELLE DU CHAMP QU'IL PRÉ-REMPLIT.
-- `LONGUEUR_MAX_SYNTHESE` vaut 4 000 dans `lib/praticien/syntheseComprehension.ts`
-- et la route de compréhension l'oppose en refus. Un tirage plus long que le
-- champ où il doit atterrir serait un tirage inutilisable : il se refuse ICI,
-- au lieu d'être coupé plus tard. Tronquer serait l'« ALTÉRATION DE DONNÉE »
-- que `lib/patient/ceQuiCompte.ts` nomme en contre-patron.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_texte_borne"
    CHECK (char_length("texte") <= 4000);

-- `texte` NON VIDE : un modèle qui ne rend rien est un ÉCHEC, et un échec se
-- dit — il ne s'enregistre pas comme une ligne muette qu'on resservirait.
-- `btrim(…, E' \t\r\n')` ET NON `btrim/1`, qui ne retire que l'espace ASCII :
-- un texte fait d'une tabulation passerait.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_texte_non_vide"
    CHECK (btrim("texte", E' \t\r\n') <> '');

-- DEUX SYNTHÈSES VALIDÉES AU MINIMUM — la règle du responsable, 2026-09-11,
-- dans la BASE et pas seulement dans la route. Un dossier qui n'a pas fait
-- deux tours n'a pas de quoi nourrir un résumé global : le refus est la bonne
-- réponse, pas un texte produit sur une matière trop mince.
--
-- `coalesce(…, 0)` EST LA MOITIÉ DE CETTE CONTRAINTE. `array_length('{}', 1)`
-- rend NULL et non 0 : écrit sans `coalesce`, ce CHECK vaudrait NULL sur un
-- tableau vide, donc PASSERAIT — un tirage sans aucune source aurait été
-- accepté par la contrainte censée l'interdire.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_deux_syntheses"
    CHECK (coalesce(array_length("sources_syntheses", 1), 0) >= 2);

-- AUCUNE SOURCE VIDE, AUCUN TROU. Une liste qui contient `''` ou NULL nomme une
-- source qui n'existe pas : la ligne devient irrejouable sans que rien ne le
-- dise. L'ORDRE DES DEUX TESTS COMPTE — `'' = ANY(arr)` vaut NULL dès qu'un
-- élément est NULL, et `NOT NULL` vaut NULL, donc PASSE. C'est le test de NULL
-- qui rend le test de vide digne de confiance ; retirer le premier désarme le
-- second en silence.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_sources_propres"
    CHECK (
      array_position("sources_syntheses", NULL) IS NULL
      AND NOT ('' = ANY ("sources_syntheses"))
      AND array_position("sources_desaccords", NULL) IS NULL
      AND NOT ('' = ANY ("sources_desaccords"))
    );

-- CE QUI REND LA PHRASE DU DOCUMENT PATIENT VRAIE. La v2 de « L'intelligence
-- artificielle dans Wellneuro » dit au patient : « Le modèle utilisé et la
-- version du procédé sont enregistrés à chaque fois, ce qui permet de retracer
-- l'origine de chaque texte. » Ces deux colonnes portent cette promesse ; les
-- laisser vides la rendrait fausse sans que rien ne rougisse.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_tracable"
    CHECK (btrim("version_consigne", E' \t\r\n') <> '' AND btrim("modele", E' \t\r\n') <> '');

-- `rang` COMMENCE À 1 ET COMPTE DES TIRAGES. Un rang nul ou négatif n'aurait
-- pas de sens d'ordre ; et il faut redire ici ce que le commentaire de tête
-- pose : ce nombre ordonne des ÉCRITURES, il ne classe rien de clinique.
ALTER TABLE "propositions_comprehension_ia"
  ADD CONSTRAINT "alli_prop_comprehension_rang_positif"
    CHECK ("rang" >= 1);

ALTER TABLE "public"."propositions_comprehension_ia" ENABLE ROW LEVEL SECURITY;
