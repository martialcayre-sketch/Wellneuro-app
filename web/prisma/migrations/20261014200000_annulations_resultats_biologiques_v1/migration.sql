-- ANNULATION D'UN RÉSULTAT DE BIOLOGIE SAISI PAR ERREUR, EN AJOUT SEUL
-- ([[D-291]], BIO-PARCOURS BP-09, fiche LOT-09).
--
-- Migration demandée explicitement par le responsable le 2026-10-14 (« PR 1,
-- la migration seule »), après la déclaration au registre RGPD (même PR).
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore
-- d'annulation, aucun code ne la lit. Les lecteurs de calcul et la route
-- viendront dans la PR 2 du lot, après l'application CONSTATÉE par conteneur.
-- Le seul code qui l'accompagne est l'effacement nommé du dossier
-- (`patient/effacement.ts`), comme pour `lectures_imports_biologiques` : le
-- banc de complétude de l'effacement l'exige de toute table qui porte
-- `id_patient`. Entre le déploiement du code et l'approbation de la
-- release-db, un effacement de dossier échouerait donc sur la table absente —
-- transaction annulée, rien d'effacé ; d'où l'approbation dans la foulée du
-- merge. Jusqu'à la PR 2, la table reste vide : ses clés RESTRICT ne
-- retiennent rien.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Deux actes, dans une seule table en ajout seul :
--
--  - `annulation` : « ce résultat a été saisi par erreur », avec un motif pris
--    dans une liste FERMÉE ([[D-291]] §2) : `mauvais_dossier`,
--    `mauvaise_date_prelevement`, `mauvais_analyte`. Une erreur de valeur ou
--    d'unité reste une CORRECTION ([[D-124]]), jamais une annulation.
--  - `revocation` : « cette annulation-là était une erreur », avec un motif
--    pris dans une liste FERMÉE ([[D-291]] §4) : `mauvais_resultat_annule`,
--    `resultat_verifie_exact`, `motif_annulation_errone`. Le résultat revient
--    alors dans les séries parce qu'une ligne s'ajoute.
--
-- Rien ne s'efface. La table ne recopie AUCUNE valeur, aucun analyte, aucune
-- date, et ne porte aucun texte libre (contrat négatif, liste blanche des
-- colonnes). Un motif neuf passe par une décision, puis une migration.
--
-- ── LE FIL, ET POURQUOI IL SE LIT PAR SA CLÉ ───────────────────────────────
--
-- L'annulation retire le FIL de correction entier, pas une ligne ([[D-291]]
-- §3). Une correction hérite de l'analyte et de la date de sa cible ([[D-124]],
-- relu par la route), et l'index unique partiel
-- `cb_resultat_bio_patient_analyte_idx` n'admet qu'une racine par clé : le fil
-- d'un résultat est donc exactement l'ensemble des lignes de sa clé (dossier,
-- analyte, date de prélèvement) — la même équivalence que tient
-- `filCorrection.ts`. Un fil est annulé dès qu'UNE de ses lignes porte une
-- annulation non révoquée, quelle que soit la ligne visée : une correction
-- concurrente qui ferait naître une tête nouvelle ne ressuscite pas le fil.
--
-- `resultats_biologiques` ne reçoit RIEN : ni colonne (sa liste blanche,
-- `cb_resultats_biologiques_v1_negatif.sql`, reste intacte), ni trigger.
--
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
--  1. LE RÉSULTAT APPARTIENT AU DOSSIER : refus nommé par le trigger. La clé
--     étrangère vers `resultats_biologiques(id)` est simple — une clé
--     composite exigerait un index unique neuf sur une table qu'on ne touche
--     pas.
--  2. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER : l'e-mail de l'acte égale, sans
--     égard à la casse, celui que porte le dossier — la règle de
--     `filtrePatientsDuPraticien`. La route le vérifiera ; la base est la
--     garde qui reste si une route l'oubliait.
--  3. UNE ANNULATION VISE UNE TÊTE DE FIL : une ligne qu'aucune autre ne
--     supplante. Annuler une ligne déjà corrigée viserait une valeur qui ne
--     fait plus foi. Sur une fourche (deux corrections concurrentes, que
--     [[D-124]] tolère), les deux branches sont des têtes : l'une ou l'autre
--     annule le fil, et l'élection fine reste celle de la route.
--  4. AU PLUS UNE ANNULATION ACTIVE PAR FIL : une annulation que n'a révoquée
--     aucune révocation, sur n'importe quelle ligne de la clé. Après
--     révocation, une nouvelle annulation est admise. Le trigger prend un
--     verrou `FOR NO KEY UPDATE` sur les lignes du fil, dans l'ordre des
--     identifiants : deux actes concurrents sur un même fil se sérialisent.
--     Ce verrou n'entre pas en conflit avec le `FOR KEY SHARE` que prend la
--     clé étrangère d'une ligne d'import vers son résultat.
--     CONDITION POUR L'ÉCRIVAIN (même règle que `lectures_imports_biologiques`) :
--     rester en READ COMMITTED (ou SERIALIZABLE), jamais en REPEATABLE READ —
--     l'instantané de transaction y masquerait l'annulation que le verrou
--     vient de laisser commettre, et deux annulations actives passeraient.
--     Le contrat à une session vérifie la présence du verrou ; la concurrence
--     s'éprouvera avec la route.
--  5. UNE RÉVOCATION VISE UNE ANNULATION DU MÊME RÉSULTAT, une fois (index
--     unique partiel).
--
-- La correction d'un fil annulé, elle, est refusée par la route (PR 2) : la
-- base n'en a pas besoin, puisque le fil reste annulé quelle que soit sa tête
-- (« Le fil », ci-dessus).
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, comme
-- pour `lectures_imports_biologiques` : chaque ligne est une donnée patient,
-- et l'effacement du dossier la supprime NOMMÉMENT, avant les résultats que
-- ses clés RESTRICT retiennent.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion :
-- ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "annulations_resultats_biologiques" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "motif_annulation" TEXT,
    "id_annulation_revoquee" TEXT,
    "motif_revocation" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annulations_resultats_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "annulations_resultats_biologiques_ordre_key" ON "annulations_resultats_biologiques"("ordre");

-- CreateIndex
-- « Les actes de ce dossier, dans l'ordre » (fiche praticien, lecteurs de
-- calcul) et « les actes de ce résultat, dans l'ordre ». Le second sert aussi
-- la clé étrangère vers le résultat.
CREATE INDEX "annulations_resultats_biologiques_patient_ordre_idx" ON "annulations_resultats_biologiques"("id_patient", "ordre");
CREATE INDEX "annulations_resultats_biologiques_resultat_ordre_idx" ON "annulations_resultats_biologiques"("id_resultat", "ordre");

-- CreateIndex
-- Index ORDINAIRE de la clé interne : la vérification d'une clé étrangère ne
-- se sert pas de l'index unique partiel.
CREATE INDEX "annulations_resultats_biologiques_annulation_revoquee_idx" ON "annulations_resultats_biologiques"("id_annulation_revoquee");

-- Une annulation ne se révoque qu'une fois. Index partiel : Prisma ne le
-- modélise pas, la parité de schéma ne le voit pas, le contrat négatif
-- l'éprouve.
CREATE UNIQUE INDEX "annulations_resultats_biologiques_une_revocation_par_annulation"
  ON "annulations_resultats_biologiques"("id_annulation_revoquee") WHERE "acte" = 'revocation';

-- AddForeignKey
-- ON DELETE RESTRICT vers le patient et le résultat : l'effacement d'un
-- dossier est une suppression NOMMÉE, qui passera par les annulations avant
-- les résultats. En CASCADE, elles partiraient en silence.
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION sur la clé interne : l'effacement supprime les actes d'un dossier
-- en UNE instruction, révocations comprises, et le contrat éprouve que cette
-- instruction passe.
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_annulation_revoquee_fkey" FOREIGN KEY ("id_annulation_revoquee") REFERENCES "annulations_resultats_biologiques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — la forme de chaque acte, les deux listes fermées ───────────

ALTER TABLE "annulations_resultats_biologiques"
  ADD CONSTRAINT "annulations_resultats_biologiques_acte_check"
    CHECK ("acte" IN ('annulation', 'revocation')),
  ADD CONSTRAINT "annulations_resultats_biologiques_forme_annulation"
    CHECK ("acte" <> 'annulation' OR (
      "motif_annulation" IS NOT NULL
      AND "id_annulation_revoquee" IS NULL
      AND "motif_revocation" IS NULL
    )),
  ADD CONSTRAINT "annulations_resultats_biologiques_forme_revocation"
    CHECK ("acte" <> 'revocation' OR (
      "id_annulation_revoquee" IS NOT NULL
      AND "motif_revocation" IS NOT NULL
      AND "motif_annulation" IS NULL
    )),
  ADD CONSTRAINT "annulations_resultats_biologiques_motif_annulation_check"
    CHECK ("motif_annulation" IN ('mauvais_dossier', 'mauvaise_date_prelevement', 'mauvais_analyte')),
  ADD CONSTRAINT "annulations_resultats_biologiques_motif_revocation_check"
    CHECK ("motif_revocation" IN ('mauvais_resultat_annule', 'resultat_verifie_exact', 'motif_annulation_errone')),
  ADD CONSTRAINT "annulations_resultats_biologiques_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.annulations_resultats_biologiques_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un acte d''annulation est figé (% refusé) ; seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER annulations_resultats_biologiques_no_update
  BEFORE UPDATE ON public.annulations_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.annulations_resultats_biologiques_figee();

CREATE TRIGGER annulations_resultats_biologiques_no_truncate
  BEFORE TRUNCATE ON public.annulations_resultats_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.annulations_resultats_biologiques_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.annulations_resultats_biologiques_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cible_id text;
  cible_analyte text;
  cible_preleve timestamp(3);
  praticien_dossier text;
  vise_resultat text;
  vise_acte text;
BEGIN
  SELECT r.id, r.analyte_code, r.preleve_le INTO cible_id, cible_analyte, cible_preleve
  FROM public.resultats_biologiques r
  WHERE r.id = NEW.id_resultat AND r.id_patient = NEW.id_patient;
  IF cible_id IS NULL THEN
    RAISE EXCEPTION 'acte d''annulation refusé : % n''est pas un résultat de ce dossier.', NEW.id_resultat;
  END IF;

  -- Le verrou du FIL : tout ce qui suit se lit après les actes concurrents
  -- sur la même clé (dossier, analyte, date).
  PERFORM 1
  FROM public.resultats_biologiques r
  WHERE r.id_patient = NEW.id_patient
    AND r.analyte_code = cible_analyte
    AND r.preleve_le = cible_preleve
  ORDER BY r.id
  FOR NO KEY UPDATE;

  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient;
  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'acte d''annulation refusé : seul le praticien du dossier annule ou révoque.';
  END IF;

  IF NEW.acte = 'annulation' THEN
    IF EXISTS (
      SELECT 1 FROM public.resultats_biologiques s
      WHERE s.supersedes_resultat_id = NEW.id_resultat
    ) THEN
      RAISE EXCEPTION 'annulation refusée : % a été corrigé ; seule la tête du fil s''annule.', NEW.id_resultat;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.annulations_resultats_biologiques a
      JOIN public.resultats_biologiques r ON r.id = a.id_resultat
      WHERE a.id_patient = NEW.id_patient
        AND a.acte = 'annulation'
        AND r.id_patient = NEW.id_patient
        AND r.analyte_code = cible_analyte
        AND r.preleve_le = cible_preleve
        AND NOT EXISTS (
          SELECT 1 FROM public.annulations_resultats_biologiques v
          WHERE v.acte = 'revocation' AND v.id_annulation_revoquee = a.id
        )
    ) THEN
      RAISE EXCEPTION 'annulation refusée : le fil de % porte déjà une annulation active.', NEW.id_resultat;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    SELECT a.id_resultat, a.acte INTO vise_resultat, vise_acte
    FROM public.annulations_resultats_biologiques a
    WHERE a.id = NEW.id_annulation_revoquee;
    IF vise_resultat IS DISTINCT FROM NEW.id_resultat
       OR vise_acte IS DISTINCT FROM 'annulation' THEN
      RAISE EXCEPTION 'révocation refusée : % n''est pas une annulation de ce résultat.', NEW.id_annulation_revoquee;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK `acte_check` le refuse
  -- ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.annulations_resultats_biologiques', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER annulations_resultats_biologiques_avant_insertion
  BEFORE INSERT ON public.annulations_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.annulations_resultats_biologiques_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."annulations_resultats_biologiques" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- ligne n'existe : déployer d'abord le code sans l'effacement des
-- annulations et sans le modèle `AnnulationResultatBiologique`, puis DROP
-- TABLE et DROP FUNCTION des deux fonctions ci-dessus.
