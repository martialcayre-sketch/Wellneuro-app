-- DOCUMENT POUR LE MÉDECIN — LES IMPRESSIONS FIGÉES ET LES TÉLÉCHARGEMENTS
-- DU PATIENT ([[D-307]], fiche F38, lettre q et J2-med).
--
-- Migration demandée explicitement par le responsable le 2026-10-18 (« Tout en
-- un lot, migration acceptée »), sur trois arbitrages du même jour : chaque
-- téléchargement journalisé, le patient reçoit l'instantané de la DERNIÈRE
-- impression, conservé la vie du dossier.
-- MIGRATION SEULE ([[D-087]]) : aucun code n'écrit encore d'impression ni de
-- téléchargement. Le geste « Imprimer » côté praticien, la ligne au fil de
-- correspondance et la page « Pour votre médecin » du portail viendront dans
-- la PR suivante, après l'application CONSTATÉE par conteneur. Le seul code qui
-- l'accompagne est l'effacement nommé du dossier (`patient/effacement.ts`) :
-- le banc de complétude de l'effacement l'exige de toute table qui porte
-- `id_patient`.
--
-- ── DEUX TABLES, EN AJOUT SEUL ─────────────────────────────────────────────
--
--  - `documents_medecin_imprimes` : UNE ligne par impression CONFIRMÉE du
--    document pour le médecin ([[D-307]] §2 : « Imprimer » demande une
--    confirmation, puis la trace « Document pour le médecin imprimé le … » ;
--    l'aperçu relu n'en laisse pas). Le HTML IMPRIMÉ EST RECOPIÉ, avec son
--    empreinte : le document se recompose à chaque ouverture à partir de la
--    synthèse, et seul un instantané dit ce qui a été imprimé — et remis.
--  - `telechargements_documents_medecin` : UNE ligne par téléchargement, par
--    le patient, de « Pour votre médecin » (§3 : « le téléchargement est
--    journalisé »). Elle désigne l'impression téléchargée.
--
-- Le patient reçoit l'instantané de la DERNIÈRE impression de son dossier
-- (par `ordre`) ; rien tant qu'aucune impression n'existe. Une impression
-- neuve remplace ce qu'il voit ; l'ancienne reste à l'historique.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur une impression :
--  1. LA SYNTHÈSE EST CELLE DU DOSSIER, et VALIDÉE par le praticien
--     (`Validee_Praticien` ou `Corrigee_Praticien`, la liste de
--     `STATUTS_SYNTHESE_VALIDES`) : le document ne se compose que d'elle.
--  2. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER (sans égard à la casse, règle
--     de `filtrePatientsDuPraticien`).
--  3. LE HTML N'EST PAS VIDE, et son empreinte est la sienne (sha-256 du texte
--     en UTF-8, calculée par la base — CHECK).
-- Sur un téléchargement :
--  4. L'IMPRESSION EST CELLE DU DOSSIER.
--  5. ELLE EST LA DERNIÈRE IMPRESSION DU DOSSIER : le patient télécharge ce
--     qui lui est servi, jamais une version remplacée.
--
-- CE QUE LA BASE NE RELIT PAS : le consentement au partage avec le médecin
-- traitant. « Imprimer » est bloqué si le patient l'a refusé, retiré, ou ne
-- l'a jamais exprimé (arbitrage du 2026-10-18 : même règle que la
-- correspondance médecin) ; cette règle vit en code
-- (`trust/consentementPartage.ts`, projection des choix courants), et la
-- recopier ici ferait deux définitions qui divergeraient. La route la garde,
-- comme celle de la correspondance. Le téléchargement par le patient n'est pas
-- gardé par ce consentement : le patient reçoit SON document, et le remet
-- lui-même (§3 ; `consentementPartage.ts`, en-tête).
--
-- ── LES VERROUS ────────────────────────────────────────────────────────────
--
-- Les deux triggers prennent, dans cet ordre : le dossier `FOR KEY SHARE`
-- (l'effacement nommé le prend `FOR UPDATE` en premier — même ordre partout),
-- puis un verrou consultatif par dossier, PARTAGÉ par les deux tables
-- (`hashtext('documents_medecin:' || id_patient)`). Une impression et un
-- téléchargement concurrents du même dossier se sérialisent : le refus 5 lit
-- l'impression que le verrou vient de laisser commettre. Tout niveau autre
-- que READ COMMITTED est REFUSÉ par les deux triggers, SERIALIZABLE compris :
-- l'instantané de la transaction, pris avant l'attente du verrou, masquerait
-- cette impression, et le refus 5 journaliserait une version tout juste
-- remplacée — la détection de conflit de SERIALIZABLE ne suit pas un écrivain
-- en READ COMMITTED (même discipline que l'exclusion NABM, revue wn-reviewer
-- de cette migration). Aucun écrivain de l'application n'emploie un autre
-- niveau au 2026-10-18 : un écrivain futur qui l'emploierait échoue, il
-- n'écrit pas à tort.
--
-- ── FIGÉES, MAIS EFFAÇABLES ────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE refusés. DELETE admis : chaque ligne est une donnée de
-- santé du patient, que l'effacement nommé du dossier supprime —
-- téléchargements, puis impressions, avant les synthèses que leurs clés
-- RESTRICT retiennent. Conservation : la vie du dossier (arbitrage du
-- 2026-10-18, patron [[D-262]]).
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `imprime_le` et `telecharge_le` en `clock_timestamp() AT TIME ZONE 'UTC'`,
-- `ordre` tiré sous le verrou : ni l'un ni l'autre ne s'antidate.

-- ═══ A. LES IMPRESSIONS ══════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "documents_medecin_imprimes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_synthese" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "html_sha256" TEXT NOT NULL,
    "imprime_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_medecin_imprimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_medecin_imprimes_ordre_key" ON "documents_medecin_imprimes"("ordre");

-- CreateIndex
-- « La dernière impression du dossier » (portail, refus 5) et « les
-- impressions du dossier, dans l'ordre » (fil de correspondance).
CREATE INDEX "documents_medecin_imprimes_patient_ordre_idx" ON "documents_medecin_imprimes"("id_patient", "ordre");

-- CreateIndex
CREATE INDEX "documents_medecin_imprimes_synthese_idx" ON "documents_medecin_imprimes"("id_synthese");

-- AddForeignKey
-- ON DELETE RESTRICT : l'effacement d'un dossier est une suppression NOMMÉE.
ALTER TABLE "documents_medecin_imprimes" ADD CONSTRAINT "documents_medecin_imprimes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_medecin_imprimes" ADD CONSTRAINT "documents_medecin_imprimes_id_synthese_fkey" FOREIGN KEY ("id_synthese") REFERENCES "syntheses_ia"("id_synthese") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents_medecin_imprimes"
  ADD CONSTRAINT "documents_medecin_imprimes_html_non_vide" CHECK ("html" ~ '\S'),
  ADD CONSTRAINT "documents_medecin_imprimes_html_sha256" CHECK (
    "html_sha256" = encode(sha256(convert_to("html", 'UTF8')), 'hex')
  ),
  ADD CONSTRAINT "documents_medecin_imprimes_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

-- ═══ B. LES TÉLÉCHARGEMENTS ══════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "telechargements_documents_medecin" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_impression" TEXT NOT NULL,
    "telecharge_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telechargements_documents_medecin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telechargements_documents_medecin_ordre_key" ON "telechargements_documents_medecin"("ordre");

-- CreateIndex
CREATE INDEX "telechargements_documents_medecin_patient_ordre_idx" ON "telechargements_documents_medecin"("id_patient", "ordre");

-- CreateIndex
CREATE INDEX "telechargements_documents_medecin_impression_idx" ON "telechargements_documents_medecin"("id_impression");

-- AddForeignKey
ALTER TABLE "telechargements_documents_medecin" ADD CONSTRAINT "telechargements_documents_medecin_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telechargements_documents_medecin" ADD CONSTRAINT "telechargements_documents_medecin_id_impression_fkey" FOREIGN KEY ("id_impression") REFERENCES "documents_medecin_imprimes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── FIGÉES : NI UPDATE NI TRUNCATE ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.documents_medecin_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une trace du document pour le médecin est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER documents_medecin_imprimes_no_update
  BEFORE UPDATE ON public.documents_medecin_imprimes
  FOR EACH ROW EXECUTE FUNCTION public.documents_medecin_figee();

CREATE TRIGGER documents_medecin_imprimes_no_truncate
  BEFORE TRUNCATE ON public.documents_medecin_imprimes
  FOR EACH STATEMENT EXECUTE FUNCTION public.documents_medecin_figee();

CREATE TRIGGER telechargements_documents_medecin_no_update
  BEFORE UPDATE ON public.telechargements_documents_medecin
  FOR EACH ROW EXECUTE FUNCTION public.documents_medecin_figee();

CREATE TRIGGER telechargements_documents_medecin_no_truncate
  BEFORE TRUNCATE ON public.telechargements_documents_medecin
  FOR EACH STATEMENT EXECUTE FUNCTION public.documents_medecin_figee();

-- ── AU MOMENT DE L'IMPRESSION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.documents_medecin_imprimes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  synthese_patient text;
  synthese_statut text;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'écriture refusée en % : la trace du document pour le médecin exige READ COMMITTED.', upper(current_setting('transaction_isolation'));
  END IF;
  -- Le dossier d'abord (en-tête, « Les verrous »).
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;

  -- 1. La synthèse du dossier, validée.
  SELECT s.id_patient, s.statut INTO synthese_patient, synthese_statut
  FROM public.syntheses_ia s
  WHERE s.id_synthese = NEW.id_synthese;
  IF synthese_patient IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'impression refusée : la synthèse % ne porte pas sur ce dossier.', NEW.id_synthese;
  END IF;
  IF synthese_statut IS NULL OR synthese_statut NOT IN ('Validee_Praticien', 'Corrigee_Praticien') THEN
    RAISE EXCEPTION 'impression refusée : la synthèse % n''est pas validée par le praticien.', NEW.id_synthese;
  END IF;

  -- 2. Le praticien du dossier.
  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'impression refusée : seul le praticien du dossier imprime le document pour le médecin.';
  END IF;

  -- Puis le dossier, pour l'ordre (verrou partagé avec les téléchargements).
  PERFORM pg_advisory_xact_lock(hashtext('documents_medecin:' || NEW.id_patient));

  NEW.imprime_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.documents_medecin_imprimes', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_medecin_imprimes_avant_insertion
  BEFORE INSERT ON public.documents_medecin_imprimes
  FOR EACH ROW EXECUTE FUNCTION public.documents_medecin_imprimes_avant_insertion();

-- ── AU MOMENT DU TÉLÉCHARGEMENT ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.telechargements_documents_medecin_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  impression_patient text;
  derniere text;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'écriture refusée en % : la trace du document pour le médecin exige READ COMMITTED.', upper(current_setting('transaction_isolation'));
  END IF;
  PERFORM 1 FROM public.patients p WHERE p.id_patient = NEW.id_patient FOR KEY SHARE;

  -- 4. L'impression du dossier.
  SELECT i.id_patient INTO impression_patient
  FROM public.documents_medecin_imprimes i
  WHERE i.id = NEW.id_impression;
  IF impression_patient IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'téléchargement refusé : l''impression % ne porte pas sur ce dossier.', NEW.id_impression;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('documents_medecin:' || NEW.id_patient));

  -- 5. La dernière impression du dossier, lue sous le verrou.
  SELECT i.id INTO derniere
  FROM public.documents_medecin_imprimes i
  WHERE i.id_patient = NEW.id_patient
  ORDER BY i.ordre DESC
  LIMIT 1;
  IF derniere IS DISTINCT FROM NEW.id_impression THEN
    RAISE EXCEPTION 'téléchargement refusé : l''impression % a été remplacée par une impression plus récente.', NEW.id_impression;
  END IF;

  NEW.telecharge_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.telechargements_documents_medecin', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER telechargements_documents_medecin_avant_insertion
  BEFORE INSERT ON public.telechargements_documents_medecin
  FOR EACH ROW EXECUTE FUNCTION public.telechargements_documents_medecin_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.documents_medecin_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.documents_medecin_imprimes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.telechargements_documents_medecin_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.documents_medecin_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.documents_medecin_imprimes_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.telechargements_documents_medecin_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."documents_medecin_imprimes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."telechargements_documents_medecin" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans
-- l'effacement des deux tables et sans leurs modèles ; puis DROP TABLE
-- (téléchargements, puis impressions) et DROP FUNCTION des trois fonctions.
-- Entre ces deux temps, un dossier qui porte une impression ne s'efface plus
-- (les clés RESTRICT refusent, la transaction d'effacement est annulée
-- entière) : la fenêtre se tient courte. Tant qu'aucune impression n'existe,
-- rien ne se perd ; après la première, le DROP efface des documents remis :
-- le retour arrière devient une décision.
