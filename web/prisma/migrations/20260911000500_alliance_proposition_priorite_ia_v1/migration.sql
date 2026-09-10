-- Alliance 6.0-B — la proposition de priorité assistée par IA (`D-167` §11),
-- et la contrainte que l'arbitrage du soir a ajoutée au lot précédent.
--
-- Migration confirmée explicitement par le responsable le 2026-09-11 (« go lot
-- 2 »). Gate humain : revue + go avant merge, puis `release-db` approuvée et
-- CONSTATÉE par conteneur — `D-087`. Aucun code consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, une contrainte ajoutée. Aucun DROP,
-- aucun renommage, aucun backfill, aucune colonne existante modifiée.
--
-- CETTE TABLE N'EST PAS `propositions_objectif`, ET NE DOIT JAMAIS LE DEVENIR.
-- Celle-là est le moteur DÉTERMINISTE de `D-094` §4 — mêmes entrées, mêmes
-- propositions, même empreinte, ce qui rend sa caducité calculable. Y faire
-- entrer un appel IA détruirait cette propriété (`D-167` §5). Les deux objets
-- portent le mot « proposition » et n'ont pas la même nature : le nom de table
-- les sépare, et rien ne doit les réunir.
--
-- APPEND-ONLY : aucune route d'update, aucune suppression. Le bouton « une
-- autre » écrit UNE LIGNE DE PLUS, de `rang` suivant. Les tirages précédents
-- restent — auditables en base, JAMAIS affichés (`D-167` §11).
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI RANG CLINIQUE. `rang` compte des
-- TIRAGES, pas des priorités : c'est un numéro d'ordre d'écriture, jamais un
-- classement de ce qui compte (`DC-19`/`DC-20`, `D-094` §3). L'interdit de
-- forme est tenu par la liste blanche de colonnes du contrat
-- `prisma/checks/alli_proposition_priorite_ia_v1_negatif.sql`.

-- CreateTable — un libellé proposé par le modèle, avec ses deux sources et de
-- quoi le retracer.
CREATE TABLE "propositions_priorite_ia" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_synthese" TEXT NOT NULL,
    "id_depot" TEXT NOT NULL,
    "version_consigne" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propositions_priorite_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- (patron de la campagne).
CREATE INDEX "alli_prop_priorite_patient_idx" ON "propositions_priorite_ia"("id_patient", "cree_le");

-- CreateIndex — DEUX TIRAGES NE PARTAGENT PAS UN RANG. Sans cette unicité,
-- « resservir la proposition figée » n'aurait pas de réponse déterministe : à
-- `cree_le` égal — deux écritures dans la même milliseconde — l'ordre serait
-- celui que la base voudrait bien rendre. C'est `rang` qui tranche, et c'est
-- cette contrainte qui le rend digne de confiance.
CREATE UNIQUE INDEX "alli_prop_priorite_tirage_unique" ON "propositions_priorite_ia"("id_patient", "id_synthese", "id_depot", "version_consigne", "rang");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`effacerDossier`, garde de complétude), pas un effet de bord de
-- FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "propositions_priorite_ia" ADD CONSTRAINT "propositions_priorite_ia_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- LA BORNE DE 200 CARACTÈRES EST DANS LA BASE, pas seulement dans le prompt.
-- `D-167` §3 : « La borne ne bouge pas : c'est l'appel qui s'y plie », et un
-- dépassement SE REFUSE au lieu de se couper. Un modèle qui rend 260 caractères
-- ne doit pas pouvoir laisser sa trace ici : la route refuse, et si elle
-- oubliait, la base refuse aussi. Tronquer serait l'« ALTÉRATION DE DONNÉE »
-- que `lib/patient/ceQuiCompte.ts` nomme en contre-patron.
ALTER TABLE "propositions_priorite_ia"
  ADD CONSTRAINT "alli_prop_priorite_texte_borne"
    CHECK (char_length("texte") <= 200);

-- `texte` NON VIDE : une proposition vide n'est pas une proposition. Un modèle
-- qui ne rend rien est un ÉCHEC, et un échec se dit (`D-167` §3) — il ne
-- s'enregistre pas comme une ligne muette qu'on resservirait ensuite.
-- `btrim(…, E' \t\r\n')` ET NON `btrim/1`, qui ne retire que l'espace ASCII :
-- un texte fait d'une tabulation passerait.
ALTER TABLE "propositions_priorite_ia"
  ADD CONSTRAINT "alli_prop_priorite_texte_non_vide"
    CHECK (btrim("texte", E' \t\r\n') <> '');

-- LES DEUX SOURCES SONT NOMMÉES, TOUJOURS. `D-167` §3 amendé : les deux pièces
-- sont EXIGÉES — sans dépôt patient, pas de proposition, même si la synthèse
-- validée est là. La parole du patient est une condition, pas un complément.
-- Une ligne dont une source manquerait serait irrejouable : on ne saurait plus
-- sur quoi la phrase a été produite.
ALTER TABLE "propositions_priorite_ia"
  ADD CONSTRAINT "alli_prop_priorite_sources_nommees"
    CHECK (btrim("id_synthese", E' \t\r\n') <> '' AND btrim("id_depot", E' \t\r\n') <> '');

-- CE QUI REND LA PHRASE DU DOCUMENT PATIENT VRAIE. La v2 de « L'intelligence
-- artificielle dans Wellneuro » dit au patient : « Le modèle utilisé et la
-- version du procédé sont enregistrés à chaque fois, ce qui permet de retracer
-- l'origine de chaque texte. » Ces deux colonnes portent cette promesse ; les
-- laisser vides la rendrait fausse sans que rien ne rougisse.
ALTER TABLE "propositions_priorite_ia"
  ADD CONSTRAINT "alli_prop_priorite_tracable"
    CHECK (btrim("version_consigne", E' \t\r\n') <> '' AND btrim("modele", E' \t\r\n') <> '');

-- `rang` COMMENCE À 1 ET COMPTE DES TIRAGES. Un rang nul ou négatif n'aurait
-- pas de sens d'ordre ; et il faut redire ici ce que le commentaire de tête
-- pose : ce nombre ordonne des ÉCRITURES, il ne classe pas des priorités.
ALTER TABLE "propositions_priorite_ia"
  ADD CONSTRAINT "alli_prop_priorite_rang_positif"
    CHECK ("rang" >= 1);

ALTER TABLE "public"."propositions_priorite_ia" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- CE QUE LE LOT PRÉCÉDENT NE POUVAIT PAS SAVOIR.
--
-- La migration du 2026-09-10 a posé `alli_objectif_priorite_source_rejouable`,
-- qui exige l'identifiant de synthèse et la version de consigne dès qu'une
-- provenance de priorité est écrite — mais PAS l'identifiant de dépôt. C'était
-- fidèle à `D-167` §3 tel qu'il était rédigé le matin : le dépôt y accompagnait
-- la synthèse sans être posé en condition.
--
-- L'arbitrage du soir a tranché « les deux pièces exigées ». La contrainte
-- ci-dessous ferme l'écart. Elle est purement additive : l'unique ligne de
-- production porte ses huit colonnes de provenance à NULL et la satisfait.
--
-- AUCUNE CONTRAINTE N'EST REMPLACÉE. `alli_objectif_priorite_source_rejouable`
-- reste en place telle quelle : deux contraintes qui se complètent valent mieux
-- qu'un DROP suivi d'un ADD, où le DROP réussit et l'ADD peut échouer.
ALTER TABLE "objectifs_negocies"
  ADD CONSTRAINT "alli_objectif_priorite_source_depot_requis"
    CHECK ("priorite_source" IS NULL OR "priorite_source_depot_id" IS NOT NULL);
