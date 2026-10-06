-- ACTE DE LECTURE CLINIQUE D'UN IMPORT BIOLOGIQUE VALIDÉ ([[D-268]],
-- BIO-PARCOURS BP-10, sécurité biologique étage 1).
--
-- Migration demandée explicitement par le responsable le 2026-10-06 (« Go
-- migration »), après la déclaration au registre RGPD (§2 ter, rubrique 5,
-- #1344). MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit
-- encore d'acte, aucun code ne le lit. La carte du Fil et le geste de lecture
-- ne viendront, derrière un drapeau éteint, qu'après l'application CONSTATÉE
-- par conteneur. Le seul code qui l'accompagne est l'effacement nommé du
-- dossier (`patient/effacement.ts`).
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Deux actes, dans une seule table en ajout seul :
--
--  - `lecture` : « le praticien de ce dossier a lu CET import validé ». Un
--    import validé est un import dont au moins une ligne est entrée au
--    dossier ([[D-268]] §1). Valider des lignes n'est pas lire le compte
--    rendu : l'acte est distinct de la validation et ne s'en déduit jamais
--    (§2).
--  - `revocation` : « cette lecture-là est révoquée », avec un code pris dans
--    une liste FERMÉE ([[D-268]] §5, précision du 2026-10-06). Rien ne
--    s'efface : le signalement se rouvre parce qu'une ligne s'ajoute.
--
-- La table ne recopie AUCUNE valeur, aucun libellé, aucun marquage, et ne
-- porte aucun texte libre (contrat négatif, liste blanche des colonnes).
-- Elle SIGNALE, elle ne bloque rien (§3) : aucun geste ne la consulte.
--
-- ── LES CODES DE RÉVOCATION ────────────────────────────────────────────────
--
-- Les trois gestes de procédure que nomme [[D-268]] §5, sans en ajouter :
--   `acte_pose_par_erreur`, `mauvais_import`, `lecture_a_refaire`.
-- Ils décrivent le geste, jamais le patient ni son résultat. Un code neuf
-- passe par une décision, puis une migration.
--
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
--  1. L'IMPORT APPARTIENT AU DOSSIER : clé étrangère composite vers
--     `imports_biologiques(id, id_patient)`, et refus nommé par le trigger.
--  2. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER ([[D-268]] §5) : l'e-mail de
--     l'acte égale, sans égard à la casse, celui que porte le dossier — la
--     règle même de `filtrePatientsDuPraticien`. La route le vérifiera ; la
--     base est la garde qui reste si une route l'oubliait.
--  3. UNE LECTURE PORTE SUR UN IMPORT VALIDÉ : au moins une ligne `validee`.
--  4. AU PLUS UNE LECTURE ACTIVE PAR IMPORT ([[D-268]] §4) : une lecture que
--     n'a révoquée aucune révocation. Après révocation, une nouvelle lecture
--     est admise. Le trigger prend un verrou `FOR NO KEY UPDATE` sur la ligne
--     de l'import : deux actes concurrents sur le même import se sérialisent,
--     et la décision concurrente d'une ligne (qui prend `FOR SHARE`) aussi —
--     la règle 3 ne lit donc pas une validation non encore commise.
--  5. UNE RÉVOCATION VISE UNE LECTURE DU MÊME IMPORT, une fois (index unique
--     partiel).
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, comme
-- pour `adressages_signal_alerte` : chaque ligne est une donnée patient, et
-- l'effacement du dossier la supprime NOMMÉMENT. Qu'aucun autre code ne
-- supprime un acte est tenu par un banc du dépôt
-- (`lecturesImportsBiologiques.guard.test.ts`), pas par la base.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion.

-- CreateTable
CREATE TABLE "lectures_imports_biologiques" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_import" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "id_lecture_revoquee" TEXT,
    "code_revocation" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lectures_imports_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lectures_imports_biologiques_ordre_key" ON "lectures_imports_biologiques"("ordre");

-- CreateIndex
-- « Les actes de ce dossier, dans l'ordre » et « les actes de cet import,
-- dans l'ordre » : les deux lectures que fera la carte du Fil. Le second sert
-- aussi la clé étrangère composite vers l'import.
CREATE INDEX "lectures_imports_biologiques_patient_ordre_idx" ON "lectures_imports_biologiques"("id_patient", "ordre");
CREATE INDEX "lectures_imports_biologiques_import_ordre_idx" ON "lectures_imports_biologiques"("id_import", "ordre");

-- CreateIndex
-- Index ORDINAIRE de la clé interne (constat de revue Copilot, #1288) : la
-- vérification d'une clé étrangère ne se sert pas de l'index unique partiel.
CREATE INDEX "lectures_imports_biologiques_lecture_revoquee_idx" ON "lectures_imports_biologiques"("id_lecture_revoquee");

-- Une lecture ne se révoque qu'une fois. Index partiel : Prisma ne le modélise
-- pas, la parité de schéma ne le voit pas, le contrat négatif l'éprouve.
CREATE UNIQUE INDEX "lectures_imports_biologiques_une_revocation_par_lecture"
  ON "lectures_imports_biologiques"("id_lecture_revoquee") WHERE "acte" = 'revocation';

-- AddForeignKey
-- ON DELETE RESTRICT vers le patient et l'import : l'effacement d'un dossier
-- est une suppression NOMMÉE, qui passe par les actes de lecture avant les
-- imports. En CASCADE, ils partiraient en silence.
ALTER TABLE "lectures_imports_biologiques" ADD CONSTRAINT "lectures_imports_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures_imports_biologiques" ADD CONSTRAINT "lectures_imports_biologiques_id_import_id_patient_fkey" FOREIGN KEY ("id_import", "id_patient") REFERENCES "imports_biologiques"("id", "id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION sur la clé interne : l'effacement supprime les actes d'un dossier
-- en UNE instruction, révocations comprises, et la contrainte n'est vérifiée
-- qu'à la fin de l'instruction (éprouvé par le contrat).
ALTER TABLE "lectures_imports_biologiques" ADD CONSTRAINT "lectures_imports_biologiques_id_lecture_revoquee_fkey" FOREIGN KEY ("id_lecture_revoquee") REFERENCES "lectures_imports_biologiques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — la forme de chaque acte ────────────────────────────────────

ALTER TABLE "lectures_imports_biologiques"
  ADD CONSTRAINT "lectures_imports_biologiques_acte_check"
    CHECK ("acte" IN ('lecture', 'revocation')),
  ADD CONSTRAINT "lectures_imports_biologiques_forme_lecture"
    CHECK ("acte" <> 'lecture' OR (
      "id_lecture_revoquee" IS NULL
      AND "code_revocation" IS NULL
    )),
  ADD CONSTRAINT "lectures_imports_biologiques_forme_revocation"
    CHECK ("acte" <> 'revocation' OR (
      "id_lecture_revoquee" IS NOT NULL
      AND "code_revocation" IS NOT NULL
    )),
  ADD CONSTRAINT "lectures_imports_biologiques_code_revocation_check"
    CHECK ("code_revocation" IN ('acte_pose_par_erreur', 'mauvais_import', 'lecture_a_refaire')),
  ADD CONSTRAINT "lectures_imports_biologiques_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lectures_imports_biologiques_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un acte de lecture est figé (% refusé) ; seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER lectures_imports_biologiques_no_update
  BEFORE UPDATE ON public.lectures_imports_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.lectures_imports_biologiques_figee();

CREATE TRIGGER lectures_imports_biologiques_no_truncate
  BEFORE TRUNCATE ON public.lectures_imports_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.lectures_imports_biologiques_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lectures_imports_biologiques_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  import_trouve text;
  praticien_dossier text;
  cible_import text;
  cible_acte text;
BEGIN
  -- Le verrou d'abord : tout ce qui suit se lit après les actes et les
  -- décisions de ligne concurrents sur cet import.
  SELECT i.id INTO import_trouve
  FROM public.imports_biologiques i
  WHERE i.id = NEW.id_import AND i.id_patient = NEW.id_patient
  FOR NO KEY UPDATE;
  IF import_trouve IS NULL THEN
    RAISE EXCEPTION 'acte de lecture refusé : % n''est pas un import de ce dossier.', NEW.id_import;
  END IF;

  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient;
  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'acte de lecture refusé : seul le praticien du dossier pose ou révoque une lecture.';
  END IF;

  IF NEW.acte = 'lecture' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lignes_biologiques_candidates l
      WHERE l.id_import = NEW.id_import AND l.statut = 'validee'
    ) THEN
      RAISE EXCEPTION 'lecture refusée : l''import % n''a aucune ligne validée.', NEW.id_import;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.lectures_imports_biologiques a
      WHERE a.id_import = NEW.id_import
        AND a.acte = 'lecture'
        AND NOT EXISTS (
          SELECT 1 FROM public.lectures_imports_biologiques r
          WHERE r.acte = 'revocation' AND r.id_lecture_revoquee = a.id
        )
    ) THEN
      RAISE EXCEPTION 'lecture refusée : l''import % porte déjà une lecture active.', NEW.id_import;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    SELECT a.id_import, a.acte INTO cible_import, cible_acte
    FROM public.lectures_imports_biologiques a
    WHERE a.id = NEW.id_lecture_revoquee;
    IF cible_import IS DISTINCT FROM NEW.id_import
       OR cible_acte IS DISTINCT FROM 'lecture' THEN
      RAISE EXCEPTION 'révocation refusée : % n''est pas une lecture de cet import.', NEW.id_lecture_revoquee;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK `acte_check` le refuse
  -- ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.lectures_imports_biologiques', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER lectures_imports_biologiques_avant_insertion
  BEFORE INSERT ON public.lectures_imports_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.lectures_imports_biologiques_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.lectures_imports_biologiques_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."lectures_imports_biologiques" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- ligne n'existe : déployer d'abord le code sans l'effacement des actes de
-- lecture et sans le modèle `LectureImportBiologique`, puis DROP TABLE et
-- DROP FUNCTION des deux fonctions ci-dessus.
