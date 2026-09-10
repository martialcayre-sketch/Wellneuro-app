-- Alliance 6.0-B — l'accord attesté en consultation (une table événement).
-- Migration confirmée explicitement par le responsable le 2026-09-10 (feu vert
-- rendu en session : « construire la table maintenant » ; gate humain = revue +
-- go explicite avant merge, puis `release-db` approuvée et CONSTATÉE par
-- conteneur — `D-087`).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill. `objectifs_negocies.negocie_le`
-- N'EST PAS TOUCHÉE : elle reste en place, et son remplacement est une lecture
-- qui viendra APRÈS l'application — le code consommateur ne part jamais avec sa
-- migration (`D-087`).
--
-- DEUX DATES, jamais confondues (patron relecture_notes) — avec un ÉCART
-- ASSUMÉ : `convenu_le` est une date d'ÉVÉNEMENT, mais elle est NOT NULL, là où
-- les autres tables la laissent nullable. Ici la date n'est pas un accessoire de
-- la ligne, elle EN EST L'OBJET : une attestation sans date ne dit rien de plus
-- que sa propre écriture, et `cree_le` dirait alors que l'accord a eu lieu au
-- moment où on l'a saisi — la date inventée que `D-165` refuse.
--
-- APPEND-ONLY PAR CONVENTION : aucune route d'update, aucune contrainte
-- d'UNICITÉ — se raviser fait UNE LIGNE DE PLUS. `id_objectif` est une
-- référence SOUPLE, sans FK : existence et appartenance sont vérifiées à la
-- route, patron de toute la campagne.
--
-- PAS DE `voix` NI DE `consignee_par`, ET C'EST DÉLIBÉRÉ. Sur `fins_objectif`
-- ces deux colonnes sont nécessaires parce que la parole du patient et son
-- attestation vivent dans la MÊME table. Ici la table elle-même dit la forme :
-- le geste que le patient pose lui-même vit dans `ratifications_objectif`, dont
-- l'écrivain unique est le portail. Les porter ici serait ajouter des colonnes
-- dont la valeur ne varie jamais — ce que `D-165` vient de nommer.
--
-- AUCUNE COLONNE DE SCORE, SEUIL OU BANDE : l'interdit de forme est tenu par la
-- liste blanche de colonnes du contrat
-- `prisma/checks/alli_accord_atteste_v1_negatif.sql`.

-- CreateTable — le praticien atteste qu'un accord a été conclu en consultation,
-- sur une version précise, à une date qu'il nomme.
CREATE TABLE "accords_attestes_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_objectif" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "convenu_le" TIMESTAMP(3) NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accords_attestes_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- (patron de la campagne).
CREATE INDEX "alli_accord_atteste_patient_idx" ON "accords_attestes_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`effacerDossier`, garde de complétude), pas un effet de bord de
-- FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "accords_attestes_objectif" ADD CONSTRAINT "accords_attestes_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- `praticien_email` NON VIDE : une attestation dit QUI atteste, sinon elle
-- n'atteste rien. `btrim(…, E' \t\r\n')` ET NON `btrim/1`, qui ne retire que
-- l'espace ASCII — un e-mail fait d'une tabulation passerait.
ALTER TABLE "accords_attestes_objectif"
  ADD CONSTRAINT "accords_attestes_objectif_praticien_email_check"
    CHECK (btrim("praticien_email", E' \t\r\n') <> '');

-- `id_objectif` NON VIDE, même motif : un accord porte sur UNE VERSION précise.
-- Un accord sans version prêterait au patient un consentement sur des mots qu'on
-- ne saurait plus nommer.
ALTER TABLE "accords_attestes_objectif"
  ADD CONSTRAINT "accords_attestes_objectif_id_objectif_check"
    CHECK (btrim("id_objectif", E' \t\r\n') <> '');

-- PAS DE CHECK « date non future » sur `convenu_le` : Postgres refuse `now()`
-- dans une contrainte (fonction non immutable). La garde se pose à la route,
-- comme pour `negocie_le`, `geste_le` et `exprime_le` des lots précédents —
-- dette nommée, reconduite ici telle quelle.

ALTER TABLE "public"."accords_attestes_objectif" ENABLE ROW LEVEL SECURITY;
