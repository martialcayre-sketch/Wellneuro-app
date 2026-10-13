-- G3 DE BIOFLOW — LA FILE DURABLE DES LECTURES DE COMPTES RENDUS ([[D-282]],
-- lot 2 : la migration seule).
--
-- CE QUE LA MIGRATION RÉPARE. La lecture d'un compte rendu tourne aujourd'hui
-- dans le processus web, après la réponse (`after()`). Si ce processus meurt
-- (redéploiement, panne), l'import reste `en_cours` en base : un fantôme,
-- clos seulement au geste suivant ou par la purge horaire. Aucune ligne ne dit
-- « cette lecture est demandée, et voici où elle en est » d'une façon qui
-- survive au processus.
--
-- MIGRATION SEULE : aucun code ne lit ni n'écrit cette table avant la
-- `release-db` et son constat ; le processus de fond et la bascule de la route
-- arrivent ensuite, sous drapeau éteint. Aucune donnée n'est touchée, et
-- aucun travail n'est rétro-posé sur les imports historiques ([[D-282]] §5.4).
--
-- CE QUE LA BASE TIENT :
--   1. statut fermé (`en_attente`, `en_cours`, `termine`, `echec`), et sa
--      cohérence avec la réservation, la fin et le motif d'échec ;
--   2. deux tentatives au plus — chiffre TECHNIQUE (`DC-20`, [[D-282]] §4) ;
--   3. UN SEUL travail ouvert par compte rendu (index unique partiel) ;
--   4. l'import courant n'existe qu'à partir de la RÉCLAMATION — jamais à la
--      demande —, et il appartient au même patient (clé composite) ET au même
--      compte rendu (trigger) ;
--   5. l'identité d'un travail est figée, et un travail terminé ne bouge plus ;
--   6. RLS deny-all (posture D-005).
--
-- RESTRICT PARTOUT, ET C'EST TENABLE : aucune ligne n'existe avant le code du
-- lot 3, qui supprime les travaux avant tout retrait de document. L'effacement
-- IDP2 les supprime avant les imports et les comptes rendus dès cette PR.

-- CreateTable
CREATE TABLE "travaux_extraction_biologique" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_compte_rendu" TEXT NOT NULL,
    "id_import_courant" TEXT,
    "demande_par" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "reserve_jusqua" TIMESTAMP(3),
    "motif_echec" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "travaux_extraction_biologique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travaux_extraction_bio_patient_idx" ON "travaux_extraction_biologique"("id_patient");

-- CreateIndex
CREATE INDEX "travaux_extraction_bio_import_idx" ON "travaux_extraction_biologique"("id_import_courant");

-- UN SEUL TRAVAIL OUVERT PAR COMPTE RENDU. Unicité PARTIELLE, portée par le SQL
-- seul — ne PAS la redéclarer au schéma, ce qui la rendrait totale et
-- interdirait une seconde lecture après la première. Elle double le refus
-- `extraction_en_cours` du verrou consultatif : deux clics simultanés
-- n'enfilent pas deux travaux.
CREATE UNIQUE INDEX "travaux_extraction_bio_ouvert_unique"
  ON "travaux_extraction_biologique"("id_compte_rendu")
  WHERE "statut" IN ('en_attente', 'en_cours');

-- LA FILE : les travaux ouverts, dans l'ordre de leur demande. C'est l'index que
-- la réclamation (`FOR UPDATE SKIP LOCKED … ORDER BY cree_le`) parcourt.
CREATE INDEX "travaux_extraction_bio_file_idx"
  ON "travaux_extraction_biologique"("cree_le")
  WHERE "statut" IN ('en_attente', 'en_cours');

-- AddForeignKey — RESTRICT : la suppression nommée reste celle de
-- l'effacement IDP2 et, au lot 3, du retrait d'un document.
ALTER TABLE "travaux_extraction_biologique" ADD CONSTRAINT "travaux_extraction_biologique_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travaux_extraction_biologique" ADD CONSTRAINT "travaux_extraction_biologique_id_compte_rendu_id_patient_fkey" FOREIGN KEY ("id_compte_rendu", "id_patient") REFERENCES "comptes_rendus_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travaux_extraction_biologique" ADD CONSTRAINT "travaux_extraction_biologique_id_import_courant_id_patient_fkey" FOREIGN KEY ("id_import_courant", "id_patient") REFERENCES "imports_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul. Chaque
-- CHECK porte UN motif, et les cohérences s'écrivent en `CASE` : une
-- disjonction sur des colonnes nullables s'évalue à NULL, et un CHECK à NULL
-- passe (piège attrapé par le contrat de [[D-281]]).
ALTER TABLE "travaux_extraction_biologique"
  ADD CONSTRAINT "travaux_extraction_bio_statut_check"
    CHECK ("statut" IN ('en_attente', 'en_cours', 'termine', 'echec')),
  ADD CONSTRAINT "travaux_extraction_bio_tentatives_check"
    CHECK ("tentatives" BETWEEN 0 AND 2),
  ADD CONSTRAINT "travaux_extraction_bio_demande_par_check"
    CHECK ("demande_par" ~ '\S' AND char_length("demande_par") <= 320),
  -- Liste FERMÉE : un texte libre pourrait recopier une valeur lue dans le
  -- compte rendu (revue du lot 2). Les quatre refus de l'ouverture d'une
  -- lecture, et l'épuisement des tentatives.
  ADD CONSTRAINT "travaux_extraction_bio_motif_echec_check"
    CHECK ("motif_echec" IN ('tentatives_epuisees', 'compte_rendu_introuvable',
                             'document_purge', 'extraction_en_cours', 'ligne_validee')),
  ADD CONSTRAINT "travaux_extraction_bio_coherence_check"
    CHECK (
      CASE "statut"
        WHEN 'en_attente' THEN "id_import_courant" IS NULL AND "tentatives" = 0
                           AND "reserve_jusqua" IS NULL AND "termine_le" IS NULL AND "motif_echec" IS NULL
        WHEN 'en_cours'   THEN "id_import_courant" IS NOT NULL AND "tentatives" >= 1
                           AND "reserve_jusqua" IS NOT NULL AND "termine_le" IS NULL AND "motif_echec" IS NULL
        WHEN 'termine'    THEN "id_import_courant" IS NOT NULL
                           AND "reserve_jusqua" IS NULL AND "termine_le" IS NOT NULL AND "motif_echec" IS NULL
        -- Un échec peut naître à la réclamation, avant tout import (document
        -- purgé, ligne validée…) : l'import y reste facultatif.
        WHEN 'echec'      THEN "reserve_jusqua" IS NULL AND "termine_le" IS NOT NULL AND "motif_echec" IS NOT NULL
        ELSE TRUE
      END
    );

-- ── L'IMPORT COURANT, ET CE QUI EST FIGÉ ────────────────────────────────────
-- L'import ne s'ouvre qu'à la RÉCLAMATION : sa péremption de 5 min se compte
-- depuis sa création, et un import ouvert à la demande perdrait le temps passé
-- dans la file (revue du lot 2, arbitrage du responsable du 2026-10-13). La
-- clé composite garantit le même PATIENT ; le même COMPTE RENDU ne se dit
-- qu'en lisant l'import. Une reprise change l'import courant (nouvel import de
-- la relance) : c'est la seule colonne d'identité qui bouge, et toujours vers un
-- import du même compte rendu.
CREATE OR REPLACE FUNCTION public.travaux_extraction_bio_garde()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.statut IN ('termine', 'echec') THEN
      RAISE EXCEPTION '% : un travail terminé est figé (%).', TG_TABLE_NAME, OLD.statut;
    END IF;
    IF NEW.id_patient IS DISTINCT FROM OLD.id_patient
       OR NEW.id_compte_rendu IS DISTINCT FROM OLD.id_compte_rendu
       OR NEW.demande_par IS DISTINCT FROM OLD.demande_par
       OR NEW.cree_le IS DISTINCT FROM OLD.cree_le THEN
      RAISE EXCEPTION '% : l''identité d''un travail est figée.', TG_TABLE_NAME;
    END IF;
    IF NEW.tentatives < OLD.tentatives THEN
      RAISE EXCEPTION '% : le compte des tentatives ne recule pas.', TG_TABLE_NAME;
    END IF;
    IF OLD.id_import_courant IS NOT NULL AND NEW.id_import_courant IS NULL THEN
      RAISE EXCEPTION '% : un import courant posé ne se retire pas.', TG_TABLE_NAME;
    END IF;
  END IF;

  IF NEW.id_import_courant IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM imports_biologiques i
    WHERE i.id = NEW.id_import_courant AND i.id_compte_rendu = NEW.id_compte_rendu
  ) THEN
    RAISE EXCEPTION '% : l''import courant n''appartient pas au compte rendu du travail.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER travaux_extraction_bio_garde
  BEFORE INSERT OR UPDATE ON public.travaux_extraction_biologique
  FOR EACH ROW EXECUTE FUNCTION public.travaux_extraction_bio_garde();

-- Sécurité : deny-all RLS par défaut (posture D-005). La ligne nomme un dossier
-- et un compte rendu biologique ; accès applicatif en connexion directe Prisma.
ALTER TABLE "public"."travaux_extraction_biologique" ENABLE ROW LEVEL SECURITY;
