-- BIOFLOW — L'IDENTITÉ MASQUÉE AVANT L'ENVOI À ANTHROPIC ([[D-284]] §5,
-- lot (j) ; arbitrages du responsable du 2026-10-14).
--
-- CE QUE LA MIGRATION PRÉPARE. Le compte rendu part aujourd'hui ENTIER chez
-- Anthropic, nom du patient compris. Les comptes rendus déposés sont des scans
-- ou des photos, sans couche texte (constat en agrégats du 2026-10-14) : le nom
-- ne se repère pas par le texte. Le praticien masque donc l'identité lui-même,
-- à l'écran, avant la lecture : le navigateur rend chaque page, y brûle les
-- rectangles noirs et envoie une image JPEG par page. Ce sont CES pages, et
-- elles seules, que le processus de fond enverra : jamais plus le document
-- d'origine, qui reste en base HDS, inchangé, sous sa purge ([[D-258]]).
--
-- La lecture reste BLOQUÉE tant qu'aucune zone n'est masquée, sauf si le
-- praticien déclare « aucune identité sur ce document » : la déclaration est
-- tracée ici, par son auteur et sa date.
--
-- MIGRATION SEULE : aucun code n'y insère ni ne la lit avant la `release-db` et
-- son constat. L'effacement IDP2 et le retrait d'un document la vident dès
-- cette PR (RESTRICT partout, comme la file du G3) : entre le déploiement et
-- l'approbation, ces deux gestes échouent sans rien perdre (table absente),
-- comme pour #1408 et #1412 — approuver dans la foulée du merge.
--
-- CE QUE LA BASE TIENT :
--   1. un masquage porte ses pages JPEG (1 à 20), chacune bornée, leur total
--      borné : la requête au fournisseur est plafonnée à 32 Mo en base64 ;
--   2. il DÉCLARE soit des zones masquées, soit « aucune identité » — jamais
--      les deux, jamais aucun des deux ;
--   3. il est horodaté par la base et FIGÉ : la seule modification admise est
--      la purge de ses pages, et seulement une fois le document purgé ;
--   4. la purge du document PURGE SES MASQUAGES, dans la même instruction
--      (trigger) : `purge.ts`, `decisions.ts` et `ecart.ts` n'ont rien à
--      changer, et aucun oubli de code ne peut laisser une page survivre ;
--   5. on ne masque ni un document purgé, ni un document dont une lecture est
--      demandée ou en cours ;
--   6. la file refuse une lecture sans masquage (motif `masquage_absent`) ;
--   7. RLS deny-all (posture D-005).

-- CreateTable
CREATE TABLE "masquages_comptes_rendus" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_compte_rendu" TEXT NOT NULL,
    "pages" BYTEA[] NOT NULL,
    "nombre_pages" INTEGER NOT NULL,
    "zones_masquees" INTEGER NOT NULL,
    "aucune_identite" BOOLEAN NOT NULL,
    "pose_par" TEXT NOT NULL,
    "pose_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purge_le" TIMESTAMP(3),

    CONSTRAINT "masquages_comptes_rendus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "masquages_comptes_rendus_patient_idx" ON "masquages_comptes_rendus"("id_patient");

-- CreateIndex — le DERNIER masquage d'un compte rendu, celui que la lecture envoie.
CREATE INDEX "masquages_comptes_rendus_compte_rendu_idx" ON "masquages_comptes_rendus"("id_compte_rendu", "pose_le");

-- AddForeignKey — RESTRICT : la suppression nommée reste celle de l'effacement
-- IDP2 et du retrait d'un document.
ALTER TABLE "masquages_comptes_rendus" ADD CONSTRAINT "masquages_comptes_rendus_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masquages_comptes_rendus" ADD CONSTRAINT "masquages_comptes_rendus_id_compte_rendu_id_patient_fkey" FOREIGN KEY ("id_compte_rendu", "id_patient") REFERENCES "comptes_rendus_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul. Chaque
-- CHECK porte UN motif ; les cohérences s'écrivent en `CASE` (une disjonction
-- sur une colonne nullable s'évalue à NULL, et un CHECK à NULL passe).
ALTER TABLE "masquages_comptes_rendus"
  -- Chiffre TECHNIQUE : au-delà de 20 images par requête, le fournisseur
  -- refuse toute image de plus de 2 000 pixels de côté. En deçà, sa borne est
  -- de 8 000 pixels : la base ne lit pas les dimensions, la route les tient au
  -- réencodage.
  ADD CONSTRAINT "masquages_comptes_rendus_nombre_pages_check"
    CHECK ("nombre_pages" BETWEEN 1 AND 20),
  ADD CONSTRAINT "masquages_comptes_rendus_zones_check"
    CHECK ("zones_masquees" BETWEEN 0 AND 1000),
  ADD CONSTRAINT "masquages_comptes_rendus_declaration_check"
    CHECK (CASE WHEN "aucune_identite" THEN "zones_masquees" = 0 ELSE "zones_masquees" > 0 END),
  ADD CONSTRAINT "masquages_comptes_rendus_pose_par_check"
    CHECK ("pose_par" ~ '\S' AND char_length("pose_par") <= 320),
  -- Purgé ⇔ plus aucune page : la liste vide, et non NULL, est la forme purgée
  -- (une liste Prisma n'est jamais nulle).
  ADD CONSTRAINT "masquages_comptes_rendus_purge_check"
    CHECK ((cardinality("pages") = 0) = ("purge_le" IS NOT NULL)),
  ADD CONSTRAINT "masquages_comptes_rendus_pages_check"
    CHECK (CASE WHEN "purge_le" IS NULL THEN cardinality("pages") = "nombre_pages" ELSE TRUE END);

-- ── LE MASQUAGE : JUGÉ À L'INSERTION, HORODATÉ PAR LA BASE ─────────────────

CREATE OR REPLACE FUNCTION public.bio_ingest_masquage_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  page bytea;
  total bigint := 0;
  document_purge boolean;
BEGIN
  IF NEW.purge_le IS NOT NULL THEN
    RAISE EXCEPTION 'masquage refusé : il naît avec ses pages, jamais purgé.';
  END IF;
  IF array_ndims(NEW.pages) IS DISTINCT FROM 1 OR array_lower(NEW.pages, 1) <> 1 THEN
    RAISE EXCEPTION 'masquage refusé : les pages forment une liste simple, numérotée depuis 1.';
  END IF;
  FOREACH page IN ARRAY NEW.pages LOOP
    IF page IS NULL THEN
      RAISE EXCEPTION 'masquage refusé : une page est absente.';
    END IF;
    -- 3,75 Mio : 5 Mio en base64, la borne d'une image chez le fournisseur.
    IF octet_length(page) NOT BETWEEN 4 AND 3932160 THEN
      RAISE EXCEPTION 'masquage refusé : une page est vide ou dépasse 3,75 Mio.';
    END IF;
    IF substring(page FROM 1 FOR 3) <> '\xffd8ff'::bytea THEN
      RAISE EXCEPTION 'masquage refusé : une page n''est pas une image JPEG.';
    END IF;
    total := total + octet_length(page);
  END LOOP;
  -- 20 Mio : moins de 27 Mo en base64, sous le plafond de 32 Mo d'une requête.
  IF total > 20971520 THEN
    RAISE EXCEPTION 'masquage refusé : les pages dépassent 20 Mio au total.';
  END IF;
  -- FOR SHARE : la purge du document (FOR NO KEY UPDATE) et ce masquage se
  -- SÉRIALISENT. Sans ce verrou, une purge concurrente validée avant le
  -- masquage ne verrait pas ses pages, et rien ne les purgerait plus (revue du
  -- lot 1, P1). Même verrou que l'ouverture d'un import (`bio_ingest_purge_v1`).
  SELECT c.contenu IS NULL INTO document_purge
  FROM public.comptes_rendus_biologiques c
  WHERE c.id = NEW.id_compte_rendu
  FOR SHARE;
  IF document_purge THEN
    RAISE EXCEPTION 'masquage refusé : le document de ce compte rendu est purgé.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.travaux_extraction_biologique t
    WHERE t.id_compte_rendu = NEW.id_compte_rendu AND t.statut IN ('en_attente', 'en_cours')
  ) OR EXISTS (
    SELECT 1 FROM public.imports_biologiques i
    WHERE i.id_compte_rendu = NEW.id_compte_rendu AND i.statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'masquage refusé : une lecture de ce compte rendu est demandée ou en cours.';
  END IF;
  NEW.pose_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER masquages_comptes_rendus_avant_insertion
  BEFORE INSERT ON public.masquages_comptes_rendus
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_masquage_avant_insertion();

-- ── FIGÉ, SAUF LA PURGE DE SES PAGES — ET SEULEMENT APRÈS CELLE DU DOCUMENT ─

CREATE OR REPLACE FUNCTION public.bio_ingest_masquage_avant_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.purge_le IS NOT NULL THEN
    RAISE EXCEPTION 'masquage figé : ses pages sont déjà purgées.';
  END IF;
  IF cardinality(NEW.pages) <> 0 THEN
    RAISE EXCEPTION 'masquage refusé : seule la purge de ses pages le modifie.';
  END IF;
  IF (NEW.id, NEW.id_patient, NEW.id_compte_rendu, NEW.nombre_pages, NEW.zones_masquees,
      NEW.aucune_identite, NEW.pose_par, NEW.pose_le)
     IS DISTINCT FROM
     (OLD.id, OLD.id_patient, OLD.id_compte_rendu, OLD.nombre_pages, OLD.zones_masquees,
      OLD.aucune_identite, OLD.pose_par, OLD.pose_le) THEN
    RAISE EXCEPTION 'masquage refusé : la purge n''efface que les pages.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.comptes_rendus_biologiques c
    WHERE c.id = OLD.id_compte_rendu AND c.contenu IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'purge refusée : le document de ce compte rendu n''est pas purgé.';
  END IF;
  NEW.purge_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER masquages_comptes_rendus_avant_purge
  BEFORE UPDATE ON public.masquages_comptes_rendus
  FOR EACH ROW EXECUTE FUNCTION public.bio_ingest_masquage_avant_purge();

CREATE TRIGGER masquages_comptes_rendus_no_truncate
  BEFORE TRUNCATE ON public.masquages_comptes_rendus
  FOR EACH STATEMENT EXECUTE FUNCTION public.bio_ingest_figee();

-- ── LA PURGE DU DOCUMENT EMPORTE SES MASQUAGES ─────────────────────────────
-- AFTER : le trigger de purge du compte rendu a déjà jugé le motif ; ses pages
-- masquées suivent, dans la même instruction, quel que soit le chemin
-- (dernière décision, échéance, écart).

CREATE OR REPLACE FUNCTION public.bio_ingest_compte_rendu_apres_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.masquages_comptes_rendus
     SET pages = '{}'
   WHERE id_compte_rendu = NEW.id AND purge_le IS NULL;
  RETURN NULL;
END;
$$;

CREATE TRIGGER comptes_rendus_biologiques_apres_purge
  AFTER UPDATE OF contenu ON public.comptes_rendus_biologiques
  FOR EACH ROW
  WHEN (OLD.contenu IS NOT NULL AND NEW.contenu IS NULL)
  EXECUTE FUNCTION public.bio_ingest_compte_rendu_apres_purge();

-- ── LA FILE REFUSE UNE LECTURE SANS MASQUAGE ───────────────────────────────
-- Un refus de la réclamation, sans import ni appel : il rejoint la liste
-- FERMÉE des motifs de la file ([[D-282]]).
ALTER TABLE "travaux_extraction_biologique"
  DROP CONSTRAINT "travaux_extraction_bio_motif_echec_check",
  ADD CONSTRAINT "travaux_extraction_bio_motif_echec_check"
    CHECK ("motif_echec" IN ('tentatives_epuisees', 'compte_rendu_introuvable',
                             'document_purge', 'extraction_en_cours', 'ligne_validee',
                             'masquage_absent'));

-- Hygiène d'exécution : les trois fonctions ne servent qu'à leurs triggers.
REVOKE EXECUTE ON FUNCTION public.bio_ingest_masquage_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_masquage_avant_purge() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_apres_purge() FROM PUBLIC;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_masquage_avant_insertion() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_masquage_avant_purge() FROM %I', role_name);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.bio_ingest_compte_rendu_apres_purge() FROM %I', role_name);
    END IF;
  END LOOP;
END $$;

-- Sécurité : deny-all RLS par défaut (posture D-005). Les pages sont celles d'un
-- compte rendu biologique ; accès applicatif en connexion directe Prisma.
ALTER TABLE "public"."masquages_comptes_rendus" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE (si jamais) : par une NOUVELLE migration compensatrice, relue
-- et approuvée (`release-db`), jamais en réécrivant l'historique. DANS CET
-- ORDRE : déployer d'abord le code qui n'écrit ni ne lit plus les masquages
-- (la lecture enverrait alors de nouveau le document entier : c'est rouvrir
-- l'exposition que [[D-284]] §5 ferme, un arbitrage du responsable), avec un
-- `schema.prisma` sans `MasquageCompteRendu` ; puis supprimer le trigger
-- `comptes_rendus_biologiques_apres_purge`, la table et ses trois fonctions,
-- et rendre au CHECK des motifs de la file sa liste antérieure — après avoir
-- requalifié tout travail en échec `masquage_absent`.
