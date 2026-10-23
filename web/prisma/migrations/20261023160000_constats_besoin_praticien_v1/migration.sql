-- CONSTATS DU PRATICIEN SUR UN BESOIN SANS SCORE, ET LEURS PIÈCES, EN AJOUT
-- SEUL ([[D-347]], t40, fiche H84 ; précise [[D-338]] §4, patron [[D-331]]).
--
-- Migration demandée par le responsable le 2026-10-23 (lot t40, D-347 « une
-- migration autorisée ») ; déclaration au dossier RGPD validée le
-- 2026-10-23, avant le merge.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore de
-- constat sur un besoin, aucun code ne le lit. La route, la lecture et
-- l'écran viendront dans la PR suivante, sous `WN_CONSTAT_BESOIN`, après
-- l'application CONSTATÉE par conteneur. Le seul code qui l'accompagne est
-- l'effacement nommé du dossier (`patient/effacement.ts`) : le banc de
-- complétude l'exige de toute table qui porte `id_patient`. Entre le
-- déploiement du code et l'approbation de la release-db, un effacement de
-- dossier échouerait donc sur les tables absentes — transaction annulée, rien
-- d'effacé ; d'où l'approbation dans la foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- `constats_besoin_praticien` porte deux actes ([[D-347]] §2) :
--
--  - `pose` : « sur ce besoin, je décide ce verdict », avec un verdict pris
--    parmi quatre (`a_soutenir`, `non_retenu`, `non_evaluable`,
--    `sans_objet`), un motif FERMÉ hors `a_soutenir` (neuf codes, [[D-347]]
--    §3), une note facultative (obligatoire avec `autre`) et une date « à
--    revoir le » facultative (§4).
--  - `retrait` : « je retire le constat en vigueur » ; le besoin revient à
--    « aucun constat posé ». L'acte ne porte ni verdict, ni motif, ni note,
--    ni date, ni pièce.
--
-- Le besoin est son numéro, et la base n'admet que 2, 6, 7 et 11, les
-- besoins sans score de [[D-338]] §4 (arbitrage 5 de [[D-347]]). La route
-- refuse en outre un besoin qui porte une source de score : elle seule suit
-- `BESOIN_SOURCES`.
--
-- `pieces_constats_besoin_praticien` porte les pièces d'une pose, une par
-- ligne, FACULTATIVES pour les quatre verdicts (arbitrage 4) : SOIT une ligne
-- de résultat de biologie, SOIT une réponse de questionnaire, par une vraie
-- clé, du même dossier. Aucune valeur, aucune unité, aucun analyte, aucun
-- score, aucune date de prélèvement ne sont recopiés (§7) : tout se lit sur
-- la pièce, par sa clé. « À relire » (§5) se dérive à la lecture et ne
-- s'écrit jamais.
--
-- ── UN SEUL CONSTAT EN VIGUEUR PAR BESOIN ET PAR DOSSIER ──────────────────
--
-- La TÊTE d'un besoin est la pose que ni un remplacement ni un retrait ne
-- vise (`id_constat_remplace`). Une pose sur un besoin qui a une tête doit la
-- désigner ; une pose sans tête n'en désigne aucune. Un retrait désigne la
-- tête, et elle seule. Un constat déjà remplacé ou retiré ne se remplace ni
-- ne se retire. L'index unique sur `id_constat_remplace` dit la même chose
-- par une autre voie : un constat a au plus un successeur. Un double clic
-- s'arrête là : la seconde pose désigne une tête qui ne l'est plus.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur un constat (trigger `constats_besoin_praticien_avant_insertion`) :
--  1. l'acte d'un autre praticien que celui du dossier (la casse ne compte
--     pas : règle de `filtrePatientsDuPraticien`) ;
--  2. une pose qui ne désigne pas la tête de son besoin, ou qui en désigne
--     une quand il n'y en a pas ;
--  3. un retrait qui ne désigne pas la tête.
-- Puis les CHECK : la forme de chaque acte, le besoin, les verdicts, les
-- motifs par verdict, la note.
--
-- Sur une pièce (trigger `pieces_constats_besoin_praticien_avant_insertion`) :
--  4. une pièce d'un constat d'un autre dossier, ou d'un retrait ;
--  5. une pièce ajoutée hors de la transaction qui a posé le constat — les
--     pièces s'écrivent AVEC le constat (§2). Le trigger du constat pose
--     `transaction_pose`, l'identifiant 64 bits de la transaction de niveau
--     supérieur (`pg_current_xact_id()`, le même dans un point de
--     sauvegarde) ; la pièce le compare au sien ;
--  6. un résultat d'un autre dossier, une ligne déjà corrigée (seule la tête
--     du fil se cite) ou un fil qui porte une annulation active ([[D-294]]) ;
--  7. une réponse de questionnaire d'un autre dossier, ou dont la validité
--     l'exclut du raisonnement clinique (INVALID, SUPERSEDED,
--     HISTORICAL_ONLY : seuls VALID et AMBIGUOUS se citent).
-- Puis le CHECK « une pièce exactement » et l'unicité d'une pièce par
-- constat.
--
-- Aucun contrôle de pièces requises en fin de transaction : à la différence
-- de [[D-331]] §2, aucun verdict n'exige de pièce ([[D-347]] §2).
--
-- Sur les deux tables, en fin de transaction (triggers de contrainte
-- DIFFÉRÉS `…_suppression_nommee`) :
--  8. une suppression dont le dossier survit à la transaction : DELETE est
--     réservé à l'effacement nommé du dossier ([[D-347]] §2), qui supprime
--     le dossier dans la même transaction. Sans cette garde, supprimer une
--     tête ressusciterait le constat qu'elle remplaçait.
--
-- La base NE refuse PAS une date « à revoir le » passée : l'instant de la
-- route et celui de la base ne sont pas le même jour au même moment, et une
-- date atteinte se lit déjà « à relire » (§5) ; la route la refusera.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- Constat : `FOR KEY SHARE` sur la ligne du dossier — AVANT le reste :
-- l'effacement nommé prend le dossier `FOR UPDATE` en premier, et l'ordre
-- « dossier, puis le reste » est le même partout — puis le verrou
-- consultatif du besoin dans le dossier (espace 347). Deux actes sur un même
-- besoin se sérialisent, et le second lit la tête laissée par le premier.
-- REPEATABLE READ est refusé, avec le motif de BP-09 : son instantané
-- masquerait l'acte que le verrou vient de laisser commettre, et deux têtes
-- passeraient.
--
-- Pièce de biologie : les verrous de BP-09 sur la clé de la ligne citée
-- (`resultats_biologiques_verrouiller_cle` : dossier, puis clé), ceux que
-- prennent la correction et l'annulation de la ligne. Pièce de
-- questionnaire : `FOR SHARE` sur la réponse citée, que l'invalidation met à
-- jour. Une correction, une annulation ou une invalidation APRÈS la pose
-- n'est pas refusée : le constat se lit alors « à relire » (§5).
--
-- ── FIGÉES, MAIS EFFAÇABLES ────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger sur les deux tables. DELETE ne
-- l'est qu'en fin de transaction, si le dossier survit (refus 8) : chaque
-- ligne est une donnée patient, et l'effacement du dossier la supprime
-- NOMMÉMENT — les pièces, puis les constats, avant les réponses de
-- questionnaire et les résultats que leurs clés RESTRICT retiennent, puis le
-- dossier.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion,
-- après le verrou : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "constats_besoin_praticien" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "besoin" INTEGER NOT NULL,
    "verdict" TEXT,
    "motif" TEXT,
    "note" TEXT,
    "a_revoir_le" DATE,
    "id_constat_remplace" TEXT,
    "transaction_pose" BIGINT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constats_besoin_praticien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_constats_besoin_praticien" (
    "id" TEXT NOT NULL,
    "id_constat" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT,
    "id_questionnaire_reponse" TEXT,

    CONSTRAINT "pieces_constats_besoin_praticien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "constats_besoin_praticien_ordre_key" ON "constats_besoin_praticien"("ordre");

-- CreateIndex
-- Un constat a au plus un successeur (remplacement ou retrait). Les NULL ne
-- se comparent pas : les poses sans prédécesseur coexistent.
CREATE UNIQUE INDEX "constats_besoin_praticien_id_constat_remplace_key" ON "constats_besoin_praticien"("id_constat_remplace");

-- CreateIndex
-- « Les constats de ce dossier, dans l'ordre » (écran du cockpit) et « les
-- constats de ce besoin » (la tête, que relit le trigger).
CREATE INDEX "constats_besoin_praticien_patient_ordre_idx" ON "constats_besoin_praticien"("id_patient", "ordre");
CREATE INDEX "constats_besoin_praticien_patient_besoin_idx" ON "constats_besoin_praticien"("id_patient", "besoin");

-- CreateIndex
-- Une pièce par constat : la même ligne ne se cite pas deux fois.
CREATE UNIQUE INDEX "pieces_constats_besoin_praticien_constat_resultat_key" ON "pieces_constats_besoin_praticien"("id_constat", "id_resultat");
CREATE UNIQUE INDEX "pieces_constats_besoin_praticien_constat_reponse_key" ON "pieces_constats_besoin_praticien"("id_constat", "id_questionnaire_reponse");

-- CreateIndex
-- Le dossier (effacement), et les pièces d'une ligne citée : « à relire »
-- part de la ligne corrigée, annulée ou invalidée, et la clé RESTRICT relit
-- cet index à chaque suppression de la ligne.
CREATE INDEX "pieces_constats_besoin_praticien_id_patient_idx" ON "pieces_constats_besoin_praticien"("id_patient");
CREATE INDEX "pieces_constats_besoin_praticien_id_resultat_idx" ON "pieces_constats_besoin_praticien"("id_resultat");
CREATE INDEX "pieces_constats_besoin_praticien_id_questionnaire_reponse_idx" ON "pieces_constats_besoin_praticien"("id_questionnaire_reponse");

-- AddForeignKey
-- ON DELETE RESTRICT vers le dossier, la ligne de résultat et la réponse :
-- l'effacement d'un dossier est une suppression NOMMÉE, qui passe par les
-- pièces et les constats avant les lignes qu'ils citent. En CASCADE, ils
-- partiraient en silence.
ALTER TABLE "constats_besoin_praticien" ADD CONSTRAINT "constats_besoin_praticien_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION, comme en [[D-331]] : l'effacement supprime les constats du
-- dossier en une instruction, et la clé se vérifie à sa fin.
ALTER TABLE "constats_besoin_praticien" ADD CONSTRAINT "constats_besoin_praticien_id_constat_remplace_fkey" FOREIGN KEY ("id_constat_remplace") REFERENCES "constats_besoin_praticien"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pieces_constats_besoin_praticien" ADD CONSTRAINT "pieces_constats_besoin_praticien_id_constat_fkey" FOREIGN KEY ("id_constat") REFERENCES "constats_besoin_praticien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_besoin_praticien" ADD CONSTRAINT "pieces_constats_besoin_praticien_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_besoin_praticien" ADD CONSTRAINT "pieces_constats_besoin_praticien_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_besoin_praticien" ADD CONSTRAINT "pieces_constats_besoin_praticien_id_questionnaire_reponse_fkey" FOREIGN KEY ("id_questionnaire_reponse") REFERENCES "questionnaire_reponses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — la forme de chaque acte, les listes fermées ────────────────

ALTER TABLE "constats_besoin_praticien"
  ADD CONSTRAINT "constats_besoin_praticien_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  -- Les besoins sans score de [[D-338]] §4, seuls ([[D-347]] §2). En ouvrir
  -- un autre exige une décision et une migration.
  ADD CONSTRAINT "constats_besoin_praticien_besoin_check"
    CHECK ("besoin" IN (2, 6, 7, 11)),
  -- Une pose porte un verdict.
  ADD CONSTRAINT "constats_besoin_praticien_forme_pose"
    CHECK ("acte" <> 'pose' OR "verdict" IS NOT NULL),
  -- Un retrait désigne le constat qu'il retire, et ne dit rien d'autre.
  ADD CONSTRAINT "constats_besoin_praticien_forme_retrait"
    CHECK ("acte" <> 'retrait' OR (
      "id_constat_remplace" IS NOT NULL
      AND "verdict" IS NULL AND "motif" IS NULL AND "note" IS NULL
      AND "a_revoir_le" IS NULL
    )),
  ADD CONSTRAINT "constats_besoin_praticien_verdict_check"
    CHECK ("verdict" IN ('a_soutenir', 'non_retenu', 'non_evaluable', 'sans_objet')),
  -- Le motif appartient à son verdict ([[D-347]] §3) ; `a_soutenir` n'en
  -- porte pas, les trois autres en portent un. Une conjonction, et
  -- `coalesce(… IN …, false)` : un CHECK qui vaut NULL passe, et un motif
  -- absent ferait d'un `IN` un NULL. Un verdict inconnu n'y est pas jugé :
  -- `verdict_check` le refuse, seul.
  ADD CONSTRAINT "constats_besoin_praticien_motif_selon_verdict"
    CHECK (
      ("verdict" IS NOT NULL OR "motif" IS NULL)
      AND ("verdict" IS DISTINCT FROM 'a_soutenir' OR "motif" IS NULL)
      AND ("verdict" IS DISTINCT FROM 'non_retenu' OR coalesce("motif" IN (
        'non_ressorti_entretien', 'autre_besoin_d_abord', 'deja_accompagne', 'autre'), false))
      AND ("verdict" IS DISTINCT FROM 'non_evaluable' OR coalesce("motif" IN (
        'non_aborde', 'piece_attendue_manquante', 'donnee_a_verifier', 'autre'), false))
      AND ("verdict" IS DISTINCT FROM 'sans_objet' OR coalesce("motif" IN (
        'hors_population', 'question_ne_se_pose_plus', 'autre'), false))
    ),
  ADD CONSTRAINT "constats_besoin_praticien_note_avec_autre"
    CHECK ("motif" IS DISTINCT FROM 'autre' OR "note" IS NOT NULL),
  -- `~ '\S'` et non `btrim/1` : une note faite de tabulations et de retours
  -- à la ligne n'est pas une note.
  ADD CONSTRAINT "constats_besoin_praticien_note_forme"
    CHECK ("note" IS NULL OR ("note" ~ '\S' AND char_length("note") <= 2000)),
  ADD CONSTRAINT "constats_besoin_praticien_ne_se_remplace_pas"
    CHECK ("id_constat_remplace" IS DISTINCT FROM "id"),
  ADD CONSTRAINT "constats_besoin_praticien_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

ALTER TABLE "pieces_constats_besoin_praticien"
  ADD CONSTRAINT "pieces_constats_besoin_praticien_une_piece"
    CHECK (num_nonnulls("id_resultat", "id_questionnaire_reponse") = 1);

-- ── FIGÉES : NI UPDATE NI TRUNCATE ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.constats_besoin_praticien_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un constat sur un besoin et ses pièces sont figés (% refusé) ; seul l''effacement du dossier les supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER constats_besoin_praticien_no_update
  BEFORE UPDATE ON public.constats_besoin_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_besoin_praticien_figee();

CREATE TRIGGER constats_besoin_praticien_no_truncate
  BEFORE TRUNCATE ON public.constats_besoin_praticien
  FOR EACH STATEMENT EXECUTE FUNCTION public.constats_besoin_praticien_figee();

CREATE TRIGGER pieces_constats_besoin_praticien_no_update
  BEFORE UPDATE ON public.pieces_constats_besoin_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_besoin_praticien_figee();

CREATE TRIGGER pieces_constats_besoin_praticien_no_truncate
  BEFORE TRUNCATE ON public.pieces_constats_besoin_praticien
  FOR EACH STATEMENT EXECUTE FUNCTION public.constats_besoin_praticien_figee();

-- ── LE CONSTAT, À L'INSERTION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.constats_besoin_praticien_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  tete text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'constat sur un besoin refusé en REPEATABLE READ : la tête d''un besoin exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous d'abord (en-tête, « Les verrous ») : le dossier, puis le
  -- besoin dans le dossier.
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(347, hashtext(NEW.id_patient || '|' || NEW.besoin::text));

  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'constat sur un besoin refusé : seul le praticien du dossier pose ou retire un constat.';
  END IF;

  -- La tête : la pose de ce besoin que rien ne vise. L'invariant en garde
  -- une au plus ; `ordre` départage si un état antérieur en laissait deux,
  -- sans échec.
  SELECT c.id INTO tete
  FROM public.constats_besoin_praticien c
  WHERE c.id_patient = NEW.id_patient
    AND c.besoin = NEW.besoin
    AND c.acte = 'pose'
    AND NOT EXISTS (
      SELECT 1 FROM public.constats_besoin_praticien s
      WHERE s.id_constat_remplace = c.id
    )
  ORDER BY c.ordre DESC
  LIMIT 1;

  IF NEW.acte = 'pose' THEN
    IF tete IS NULL AND NEW.id_constat_remplace IS NOT NULL THEN
      RAISE EXCEPTION 'pose refusée : aucun constat n''est en vigueur sur ce besoin ; une pose neuve ne remplace rien.';
    ELSIF tete IS NOT NULL AND NEW.id_constat_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'pose refusée : le besoin porte un constat en vigueur (%) ; une pose doit le remplacer, lui seul.', tete;
    END IF;
  ELSIF NEW.acte = 'retrait' THEN
    IF tete IS NULL OR NEW.id_constat_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'retrait refusé : seul le constat en vigueur sur ce besoin se retire.';
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK le refuse ensuite. Le
  -- trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.constats_besoin_praticien', 'ordre'));
  NEW.transaction_pose := pg_current_xact_id()::text::bigint;
  RETURN NEW;
END;
$$;

CREATE TRIGGER constats_besoin_praticien_avant_insertion
  BEFORE INSERT ON public.constats_besoin_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_besoin_praticien_avant_insertion();

-- ── LA PIÈCE, À L'INSERTION ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pieces_constats_besoin_praticien_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  constat_acte text;
  constat_transaction bigint;
  cible_id text;
  cible_analyte text;
  cible_preleve timestamp(3);
  validite text;
BEGIN
  SELECT c.acte, c.transaction_pose INTO constat_acte, constat_transaction
  FROM public.constats_besoin_praticien c
  WHERE c.id = NEW.id_constat AND c.id_patient = NEW.id_patient;
  IF constat_acte IS NULL THEN
    RAISE EXCEPTION 'pièce refusée : % n''est pas un constat sur un besoin de ce dossier.', NEW.id_constat;
  END IF;
  IF constat_acte <> 'pose' THEN
    RAISE EXCEPTION 'pièce refusée : un retrait ne porte pas de pièce.';
  END IF;
  IF constat_transaction IS DISTINCT FROM pg_current_xact_id()::text::bigint THEN
    RAISE EXCEPTION 'pièce refusée : les pièces s''écrivent avec leur constat, dans la transaction qui le pose.';
  END IF;

  IF NEW.id_resultat IS NOT NULL THEN
    SELECT r.id, r.analyte_code, r.preleve_le INTO cible_id, cible_analyte, cible_preleve
    FROM public.resultats_biologiques r
    WHERE r.id = NEW.id_resultat AND r.id_patient = NEW.id_patient;
    IF cible_id IS NULL THEN
      RAISE EXCEPTION 'pièce refusée : % n''est pas un résultat de ce dossier.', NEW.id_resultat;
    END IF;
    -- Les verrous de BP-09 (dossier, puis clé), avant les contrôles de tête
    -- et d'annulation : la correction et l'annulation prennent les mêmes.
    PERFORM public.resultats_biologiques_verrouiller_cle(NEW.id_patient, cible_analyte, cible_preleve);
    IF EXISTS (
      SELECT 1 FROM public.resultats_biologiques s
      WHERE s.supersedes_resultat_id = NEW.id_resultat
    ) THEN
      RAISE EXCEPTION 'pièce refusée : % a été corrigé ; seule la tête du fil se cite.', NEW.id_resultat;
    END IF;
    IF public.resultats_biologiques_racine_annulee(
         public.resultats_biologiques_racine(NEW.id_resultat),
         NEW.id_patient, cible_analyte, cible_preleve) THEN
      RAISE EXCEPTION 'pièce refusée : le fil de % porte une annulation active.', NEW.id_resultat;
    END IF;
  END IF;

  IF NEW.id_questionnaire_reponse IS NOT NULL THEN
    PERFORM 1 FROM public.patients p WHERE p.id_patient = NEW.id_patient FOR KEY SHARE;
    SELECT q.statut_validite INTO validite
    FROM public.questionnaire_reponses q
    WHERE q.id = NEW.id_questionnaire_reponse AND q.id_patient = NEW.id_patient
    FOR SHARE;
    IF validite IS NULL THEN
      RAISE EXCEPTION 'pièce refusée : % n''est pas une réponse de questionnaire de ce dossier.', NEW.id_questionnaire_reponse;
    END IF;
    IF validite NOT IN ('VALID', 'AMBIGUOUS') THEN
      RAISE EXCEPTION 'pièce refusée : la passation % est exclue du raisonnement (%).', NEW.id_questionnaire_reponse, validite;
    END IF;
  END IF;
  -- Ni l'une ni l'autre, ou les deux : le CHECK `une_piece` le refuse ensuite.

  RETURN NEW;
END;
$$;

CREATE TRIGGER pieces_constats_besoin_praticien_avant_insertion
  BEFORE INSERT ON public.pieces_constats_besoin_praticien
  FOR EACH ROW EXECUTE FUNCTION public.pieces_constats_besoin_praticien_avant_insertion();

-- ── EN FIN DE TRANSACTION : LA SUPPRESSION EST CELLE DU DOSSIER ────────────

CREATE OR REPLACE FUNCTION public.constats_besoin_praticien_suppression_nommee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.id_patient = OLD.id_patient) THEN
    RAISE EXCEPTION '% : suppression refusée ; un constat sur un besoin et ses pièces ne s''effacent qu''avec leur dossier.', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER constats_besoin_praticien_suppression_nommee
  AFTER DELETE ON public.constats_besoin_praticien
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.constats_besoin_praticien_suppression_nommee();

CREATE CONSTRAINT TRIGGER pieces_constats_besoin_praticien_suppression_nommee
  AFTER DELETE ON public.pieces_constats_besoin_praticien
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.constats_besoin_praticien_suppression_nommee();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pieces_constats_besoin_praticien_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_suppression_nommee() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.pieces_constats_besoin_praticien_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_besoin_praticien_suppression_nommee() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."constats_besoin_praticien" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pieces_constats_besoin_praticien" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Déployer d'abord
-- le code sans l'effacement des constats sur un besoin et sans les modèles
-- `ConstatBesoinPraticien` et `PieceConstatBesoinPraticien` ; puis DROP TABLE
-- des deux tables (pièces d'abord) et DROP FUNCTION des quatre fonctions
-- ci-dessus. Entre ces deux temps, un dossier qui porte un constat ne
-- s'efface plus (les clés RESTRICT refusent, la transaction d'effacement est
-- annulée entière) : la fenêtre se tient courte. Après la première pose, le
-- DROP efface des actes du praticien : le retour arrière devient une
-- décision.
