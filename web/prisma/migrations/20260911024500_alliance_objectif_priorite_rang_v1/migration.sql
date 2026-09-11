-- Alliance 6.0-B — le RANG du tirage retenu (`D-167` §11, réserve levée le
-- 2026-09-11).
--
-- Migration confirmée explicitement par le responsable le 2026-09-11. Gate
-- humain : revue + go avant merge, puis `release-db` approuvée et CONSTATÉE par
-- conteneur — `D-087`. Aucun code consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : une colonne nullable, une contrainte. Aucun DROP, aucun
-- renommage, aucun backfill.
--
-- CE QUE CETTE COLONNE FERME. `D-167` §11 consignait une réserve sans la
-- lever : « un praticien qui relance jusqu'à retrouver la phrase qu'il avait en
-- tête fait décider la machine par SÉLECTION, ce que la marque ne dit pas ». La
-- marque disait « proposé par la machine » aussi bien pour un premier jet
-- accepté que pour un dixième. Le rang distingue les deux.
--
-- IL NE COMPTE PAS DES PRIORITÉS, IL COMPTE DES TIRAGES. Ce nombre ordonne des
-- ÉCRITURES dans `propositions_priorite_ia` ; il ne classe rien de clinique, ne
-- hiérarchise aucun objectif et n'est comparable à aucun seuil
-- (`DC-19`/`DC-20`, `D-094` §3). La liste blanche de colonnes du contrat
-- `alli_dossier_deux_voix_v1_negatif.sql` l'admet sous cette lecture, et le
-- commentaire est là pour qu'une relecture ne la retourne pas.
--
-- IL TOMBE AVEC LA MARQUE, et c'est l'arbitrage du 2026-09-11. Un texte réécrit
-- par le praticien « redevient ses mots » (`D-167` §6) : lui laisser un rang de
-- tirage garderait une mention de machine sur une phrase qu'elle n'a pas
-- écrite — le faux que §6 nomme. La contrainte ci-dessous le tient : pas de
-- rang sans source de priorité.

ALTER TABLE "objectifs_negocies"
    ADD COLUMN "priorite_source_rang" INTEGER;

-- PAS DE RANG SANS PROPOSITION. Un rang orphelin désignerait un tirage dont
-- rien ne dit qu'il a été retenu.
ALTER TABLE "objectifs_negocies"
  ADD CONSTRAINT "alli_objectif_priorite_rang_avec_source"
    CHECK ("priorite_source_rang" IS NULL OR "priorite_source" IS NOT NULL);

-- UN RANG COMMENCE À 1, comme celui de la table qu'il désigne. Un zéro ou un
-- négatif ne pointerait aucun tirage existant.
ALTER TABLE "objectifs_negocies"
  ADD CONSTRAINT "alli_objectif_priorite_rang_positif"
    CHECK ("priorite_source_rang" IS NULL OR "priorite_source_rang" >= 1);
