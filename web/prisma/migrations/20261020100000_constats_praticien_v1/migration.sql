-- CONSTATS DU PRATICIEN SUR UNE HYPOTHÈSE DU PARCOURS, ET LEURS PIÈCES, EN
-- AJOUT SEUL ([[D-331]], BP-11, LOT-11, fiche F06 ; précise [[D-122]]).
--
-- Migration demandée par le cadrage v3 (ligne BP-11) et la fiche F06,
-- confirmée par le responsable le 2026-10-19 (D-331, « une migration
-- autorisée ») ; déclaration au dossier RGPD validée le 2026-10-20.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore de
-- constat, aucun code ne le lit. La route, la lecture et l'écran viendront
-- dans la PR suivante, sous `WN_BIO_CONSTAT`, après l'application CONSTATÉE
-- par conteneur. Le seul code qui l'accompagne est l'effacement nommé du
-- dossier (`patient/effacement.ts`) : le banc de complétude l'exige de toute
-- table qui porte `id_patient`. Entre le déploiement du code et
-- l'approbation de la release-db, un effacement de dossier échouerait donc sur
-- les tables absentes — transaction annulée, rien d'effacé ; d'où
-- l'approbation dans la foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- `constats_praticien` porte deux actes ([[D-331]] §2) :
--
--  - `pose` : « sur cette hypothèse, je constate ce verdict », avec un
--    verdict pris parmi quatre (`confirmee`, `non_retenue`, `non_evaluable`,
--    `sans_objet`), un motif FERMÉ hors `confirmee` (neuf codes, [[D-331]]
--    §3), une note facultative (obligatoire avec `autre`), une date « à
--    revoir le » facultative (§4) et l'empreinte de la structure signée en
--    vigueur (BP-12a, [[D-314]]).
--  - `retrait` : « je retire le constat en vigueur » ; l'hypothèse revient à
--    « aucun constat posé ». L'acte ne porte ni verdict, ni motif, ni note.
--
-- L'hypothèse est un identifiant `HYP_…` (format de [[D-314]] §8, celui de
-- `fiches_usage_libelles`), jamais un texte. Son appartenance à la structure
-- signée se vérifie à la route : la structure est une table TS.
--
-- `pieces_constats_praticien` porte les pièces d'une pose, une par ligne :
-- SOIT une ligne de résultat de biologie, SOIT une réponse de questionnaire
-- (arbitrage 1), par une vraie clé, du même dossier. Aucune valeur, aucune
-- unité, aucun analyte, aucune date de prélèvement ne sont recopiés (§7) :
-- tout se lit sur la pièce, par sa clé. « À relire » (§5) se dérive à la
-- lecture et ne s'écrit jamais.
--
-- ── UN SEUL CONSTAT EN VIGUEUR PAR HYPOTHÈSE ET PAR DOSSIER ───────────────
--
-- La TÊTE d'une hypothèse est la pose que ni un remplacement ni un retrait
-- ne vise (`id_constat_remplace`). Une pose sur une hypothèse qui a une tête
-- doit la désigner ; une pose sans tête n'en désigne aucune. Un retrait
-- désigne la tête, et elle seule. Un constat déjà remplacé ou retiré ne se
-- remplace ni ne se retire : si `B` a remplacé `A`, le retrait de `A` est
-- refusé (revue CodeRabbit de #1589). L'index unique sur
-- `id_constat_remplace` dit la même chose par une autre voie : un constat a
-- au plus un successeur. Un double clic s'arrête là : la seconde pose désigne
-- une tête qui ne l'est plus.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur un constat (trigger `constats_praticien_avant_insertion`) :
--  1. l'acte d'un autre praticien que celui du dossier (la casse ne compte
--     pas : règle de `filtrePatientsDuPraticien`) ;
--  2. une pose qui ne désigne pas la tête de son hypothèse, ou qui en
--     désigne une quand il n'y en a pas ;
--  3. un retrait qui ne désigne pas la tête.
-- Puis les CHECK : la forme de chaque acte, les verdicts, les motifs par
-- verdict, la note, le format `HYP_…` et celui de l'empreinte.
--
-- Sur une pièce (trigger `pieces_constats_praticien_avant_insertion`) :
--  4. une pièce d'un constat d'un autre dossier, ou d'un retrait ;
--  5. une pièce ajoutée hors de la transaction qui a posé le constat — les
--     pièces s'écrivent AVEC le constat (§2). La règle compare le `xmin` du
--     constat à la transaction courante : constat et pièces s'écrivent au
--     même niveau, hors point de sauvegarde ; un constat écrit dans un point
--     de sauvegarde refuse ses pièces (l'erreur tombe du côté du refus) ;
--  6. un résultat d'un autre dossier, une ligne déjà corrigée (seule la tête
--     du fil se cite) ou un fil qui porte une annulation active ([[D-294]]) ;
--  7. une réponse de questionnaire d'un autre dossier, ou dont la validité
--     l'exclut du raisonnement clinique (INVALID, SUPERSEDED,
--     HISTORICAL_ONLY : seuls VALID et AMBIGUOUS se citent, la doctrine des
--     cinq statuts de `QuestionnaireReponse`).
-- Puis le CHECK « une pièce exactement » et l'unicité d'une pièce par
-- constat.
--
-- En fin de transaction (trigger de contrainte DIFFÉRÉ
-- `constats_praticien_pieces_requises`) :
--  8. une pose `confirmee` ou `non_retenue` sans pièce. `non_evaluable` et
--     `sans_objet` peuvent n'en porter aucune.
--
-- La base NE refuse PAS une date « à revoir le » passée : l'instant de la
-- route et celui de la base ne sont pas le même jour au même moment, et une
-- date passée se lit déjà « à relire » (§5.6) ; la route la refusera.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- Constat : `FOR KEY SHARE` sur la ligne du dossier — AVANT le reste :
-- l'effacement nommé prend le dossier `FOR UPDATE` en premier, et l'ordre
-- « dossier, puis le reste » est le même partout — puis le verrou
-- consultatif de l'hypothèse dans le dossier (espace 331). Deux actes sur une
-- même hypothèse se sérialisent, et le second lit la tête laissée par le
-- premier. REPEATABLE READ est refusé, avec le motif de BP-09 : son
-- instantané masquerait l'acte que le verrou vient de laisser commettre, et
-- deux têtes passeraient. Aucun écrivain de l'application n'emploie ce niveau
-- au 2026-10-20.
--
-- Pièce de biologie : les verrous de BP-09 sur la clé de la ligne citée
-- (`resultats_biologiques_verrouiller_cle` : dossier, puis clé), ceux que
-- prennent la correction et l'annulation de la ligne — une pièce et une
-- correction concurrentes se sérialisent, et la seconde voit la première.
-- Pièce de questionnaire : `FOR SHARE` sur la réponse citée, que
-- l'invalidation met à jour : elle attend la fin de la pose. Une correction,
-- une annulation ou une invalidation APRÈS la pose n'est pas refusée : le
-- constat se lit alors « à relire » (§5.1, §5.2, §5.5).
--
-- ── FIGÉES, MAIS EFFAÇABLES ────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger sur les deux tables. DELETE ne
-- l'est PAS, comme pour les annulations et les statuts posés : chaque ligne
-- est une donnée patient, et l'effacement du dossier la supprime NOMMÉMENT —
-- les pièces, puis les constats, avant les réponses de questionnaire et les
-- résultats que leurs clés RESTRICT retiennent.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion,
-- après le verrou : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "constats_praticien" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "hypothese_code" TEXT NOT NULL,
    "verdict" TEXT,
    "motif" TEXT,
    "note" TEXT,
    "a_revoir_le" DATE,
    "id_constat_remplace" TEXT,
    "structure_sha256" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constats_praticien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_constats_praticien" (
    "id" TEXT NOT NULL,
    "id_constat" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT,
    "id_questionnaire_reponse" TEXT,

    CONSTRAINT "pieces_constats_praticien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "constats_praticien_ordre_key" ON "constats_praticien"("ordre");

-- CreateIndex
-- Un constat a au plus un successeur (remplacement ou retrait). Les NULL ne
-- se comparent pas : les poses sans prédécesseur coexistent.
CREATE UNIQUE INDEX "constats_praticien_id_constat_remplace_key" ON "constats_praticien"("id_constat_remplace");

-- CreateIndex
-- « Les constats de ce dossier, dans l'ordre » (écran du parcours) et « les
-- constats de cette hypothèse » (la tête, que relit le trigger).
CREATE INDEX "constats_praticien_patient_ordre_idx" ON "constats_praticien"("id_patient", "ordre");
CREATE INDEX "constats_praticien_patient_hypothese_idx" ON "constats_praticien"("id_patient", "hypothese_code");

-- CreateIndex
-- Une pièce par constat : la même ligne ne se cite pas deux fois.
CREATE UNIQUE INDEX "pieces_constats_praticien_constat_resultat_key" ON "pieces_constats_praticien"("id_constat", "id_resultat");
CREATE UNIQUE INDEX "pieces_constats_praticien_constat_reponse_key" ON "pieces_constats_praticien"("id_constat", "id_questionnaire_reponse");

-- CreateIndex
-- Le dossier (effacement), et les pièces d'une ligne citée : « à relire »
-- part de la ligne corrigée, annulée ou invalidée, et la clé RESTRICT relit
-- cet index à chaque suppression de la ligne.
CREATE INDEX "pieces_constats_praticien_id_patient_idx" ON "pieces_constats_praticien"("id_patient");
CREATE INDEX "pieces_constats_praticien_id_resultat_idx" ON "pieces_constats_praticien"("id_resultat");
CREATE INDEX "pieces_constats_praticien_id_questionnaire_reponse_idx" ON "pieces_constats_praticien"("id_questionnaire_reponse");

-- AddForeignKey
-- ON DELETE RESTRICT vers le dossier, la ligne de résultat et la réponse :
-- l'effacement d'un dossier est une suppression NOMMÉE, qui passe par les
-- pièces et les constats avant les lignes qu'ils citent. En CASCADE, ils
-- partiraient en silence.
ALTER TABLE "constats_praticien" ADD CONSTRAINT "constats_praticien_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION, comme la révocation d'une annulation : l'effacement supprime
-- les constats du dossier en une instruction, et la clé se vérifie à sa fin.
ALTER TABLE "constats_praticien" ADD CONSTRAINT "constats_praticien_id_constat_remplace_fkey" FOREIGN KEY ("id_constat_remplace") REFERENCES "constats_praticien"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pieces_constats_praticien" ADD CONSTRAINT "pieces_constats_praticien_id_constat_fkey" FOREIGN KEY ("id_constat") REFERENCES "constats_praticien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_praticien" ADD CONSTRAINT "pieces_constats_praticien_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_praticien" ADD CONSTRAINT "pieces_constats_praticien_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_constats_praticien" ADD CONSTRAINT "pieces_constats_praticien_id_questionnaire_reponse_fkey" FOREIGN KEY ("id_questionnaire_reponse") REFERENCES "questionnaire_reponses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — la forme de chaque acte, les listes fermées ────────────────

ALTER TABLE "constats_praticien"
  ADD CONSTRAINT "constats_praticien_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  ADD CONSTRAINT "constats_praticien_hypothese_format"
    CHECK ("hypothese_code" ~ '^HYP_[A-Z0-9_]+$' AND char_length("hypothese_code") <= 128),
  -- Une pose porte un verdict et l'empreinte de la structure qu'elle a lue.
  ADD CONSTRAINT "constats_praticien_forme_pose"
    CHECK ("acte" <> 'pose' OR ("verdict" IS NOT NULL AND "structure_sha256" IS NOT NULL)),
  -- Un retrait désigne le constat qu'il retire, et ne dit rien d'autre.
  ADD CONSTRAINT "constats_praticien_forme_retrait"
    CHECK ("acte" <> 'retrait' OR (
      "id_constat_remplace" IS NOT NULL
      AND "verdict" IS NULL AND "motif" IS NULL AND "note" IS NULL
      AND "a_revoir_le" IS NULL AND "structure_sha256" IS NULL
    )),
  ADD CONSTRAINT "constats_praticien_verdict_check"
    CHECK ("verdict" IN ('confirmee', 'non_retenue', 'non_evaluable', 'sans_objet')),
  -- Le motif appartient à son verdict ([[D-331]] §3) ; `confirmee` n'en
  -- porte pas, les trois autres en portent un. Une conjonction, et
  -- `coalesce(… IN …, false)` : un CHECK qui vaut NULL passe, et un motif
  -- absent ferait d'un `IN` un NULL. Un verdict inconnu n'y est pas jugé :
  -- `verdict_check` le refuse, seul.
  ADD CONSTRAINT "constats_praticien_motif_selon_verdict"
    CHECK (
      ("verdict" IS NOT NULL OR "motif" IS NULL)
      AND ("verdict" IS DISTINCT FROM 'confirmee' OR "motif" IS NULL)
      AND ("verdict" IS DISTINCT FROM 'non_retenue' OR coalesce("motif" IN (
        'pieces_ne_soutiennent_pas', 'autre_hypothese_retenue', 'contexte_explique', 'autre'), false))
      AND ("verdict" IS DISTINCT FROM 'non_evaluable' OR coalesce("motif" IN (
        'piece_attendue_manquante', 'contexte_inconnu', 'donnee_a_verifier', 'autre'), false))
      AND ("verdict" IS DISTINCT FROM 'sans_objet' OR coalesce("motif" IN (
        'hors_population', 'question_ne_se_pose_plus', 'autre'), false))
    ),
  ADD CONSTRAINT "constats_praticien_note_avec_autre"
    CHECK ("motif" IS DISTINCT FROM 'autre' OR "note" IS NOT NULL),
  -- `~ '\S'` et non `btrim/1` : une note faite de tabulations et de retours
  -- à la ligne n'est pas une note.
  ADD CONSTRAINT "constats_praticien_note_forme"
    CHECK ("note" IS NULL OR ("note" ~ '\S' AND char_length("note") <= 2000)),
  ADD CONSTRAINT "constats_praticien_structure_format"
    CHECK ("structure_sha256" IS NULL OR "structure_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "constats_praticien_ne_se_remplace_pas"
    CHECK ("id_constat_remplace" IS DISTINCT FROM "id"),
  ADD CONSTRAINT "constats_praticien_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

ALTER TABLE "pieces_constats_praticien"
  ADD CONSTRAINT "pieces_constats_praticien_une_piece"
    CHECK (num_nonnulls("id_resultat", "id_questionnaire_reponse") = 1);

-- ── FIGÉES : NI UPDATE NI TRUNCATE ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.constats_praticien_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un constat et ses pièces sont figés (% refusé) ; seul l''effacement du dossier les supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER constats_praticien_no_update
  BEFORE UPDATE ON public.constats_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_praticien_figee();

CREATE TRIGGER constats_praticien_no_truncate
  BEFORE TRUNCATE ON public.constats_praticien
  FOR EACH STATEMENT EXECUTE FUNCTION public.constats_praticien_figee();

CREATE TRIGGER pieces_constats_praticien_no_update
  BEFORE UPDATE ON public.pieces_constats_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_praticien_figee();

CREATE TRIGGER pieces_constats_praticien_no_truncate
  BEFORE TRUNCATE ON public.pieces_constats_praticien
  FOR EACH STATEMENT EXECUTE FUNCTION public.constats_praticien_figee();

-- ── LE CONSTAT, À L'INSERTION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.constats_praticien_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  tete text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'constat refusé en REPEATABLE READ : la tête d''une hypothèse exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous d'abord (en-tête, « Les verrous ») : le dossier, puis
  -- l'hypothèse dans le dossier.
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(331, hashtext(NEW.id_patient || '|' || NEW.hypothese_code));

  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'constat refusé : seul le praticien du dossier pose ou retire un constat.';
  END IF;

  -- La tête : la pose de cette hypothèse que rien ne vise. L'invariant en
  -- garde une au plus ; `ordre` départage si un état antérieur en laissait
  -- deux, sans échec.
  SELECT c.id INTO tete
  FROM public.constats_praticien c
  WHERE c.id_patient = NEW.id_patient
    AND c.hypothese_code = NEW.hypothese_code
    AND c.acte = 'pose'
    AND NOT EXISTS (
      SELECT 1 FROM public.constats_praticien s
      WHERE s.id_constat_remplace = c.id
    )
  ORDER BY c.ordre DESC
  LIMIT 1;

  IF NEW.acte = 'pose' THEN
    IF tete IS NULL AND NEW.id_constat_remplace IS NOT NULL THEN
      RAISE EXCEPTION 'pose refusée : aucun constat n''est en vigueur sur cette hypothèse ; une pose neuve ne remplace rien.';
    ELSIF tete IS NOT NULL AND NEW.id_constat_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'pose refusée : l''hypothèse porte un constat en vigueur (%) ; une pose doit le remplacer, lui seul.', tete;
    END IF;
  ELSIF NEW.acte = 'retrait' THEN
    IF tete IS NULL OR NEW.id_constat_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'retrait refusé : seul le constat en vigueur sur cette hypothèse se retire.';
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK le refuse ensuite. Le
  -- trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.constats_praticien', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER constats_praticien_avant_insertion
  BEFORE INSERT ON public.constats_praticien
  FOR EACH ROW EXECUTE FUNCTION public.constats_praticien_avant_insertion();

-- ── LA PIÈCE, À L'INSERTION ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pieces_constats_praticien_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  constat_acte text;
  constat_xmin xid;
  cible_id text;
  cible_analyte text;
  cible_preleve timestamp(3);
  validite text;
BEGIN
  SELECT c.acte, c.xmin INTO constat_acte, constat_xmin
  FROM public.constats_praticien c
  WHERE c.id = NEW.id_constat AND c.id_patient = NEW.id_patient;
  IF constat_acte IS NULL THEN
    RAISE EXCEPTION 'pièce refusée : % n''est pas un constat de ce dossier.', NEW.id_constat;
  END IF;
  IF constat_acte <> 'pose' THEN
    RAISE EXCEPTION 'pièce refusée : un retrait ne porte pas de pièce.';
  END IF;
  IF constat_xmin IS DISTINCT FROM pg_current_xact_id()::xid THEN
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

CREATE TRIGGER pieces_constats_praticien_avant_insertion
  BEFORE INSERT ON public.pieces_constats_praticien
  FOR EACH ROW EXECUTE FUNCTION public.pieces_constats_praticien_avant_insertion();

-- ── EN FIN DE TRANSACTION : LES PIÈCES REQUISES ────────────────────────────

CREATE OR REPLACE FUNCTION public.constats_praticien_pieces_requises()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Un constat effacé dans la même transaction n'a plus rien à prouver.
  IF NOT EXISTS (SELECT 1 FROM public.constats_praticien c WHERE c.id = NEW.id) THEN
    RETURN NULL;
  END IF;
  IF NEW.acte = 'pose' AND NEW.verdict IN ('confirmee', 'non_retenue')
     AND NOT EXISTS (
       SELECT 1 FROM public.pieces_constats_praticien p WHERE p.id_constat = NEW.id
     ) THEN
    RAISE EXCEPTION 'constat refusé : un verdict « % » porte au moins une pièce.', NEW.verdict;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER constats_praticien_pieces_requises
  AFTER INSERT ON public.constats_praticien
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.constats_praticien_pieces_requises();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.constats_praticien_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.constats_praticien_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pieces_constats_praticien_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.constats_praticien_pieces_requises() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_praticien_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_praticien_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.pieces_constats_praticien_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.constats_praticien_pieces_requises() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."constats_praticien" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pieces_constats_praticien" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Déployer d'abord
-- le code sans l'effacement des constats et sans les modèles
-- `ConstatPraticien` et `PieceConstatPraticien` ; puis DROP TABLE des deux
-- tables (pièces d'abord) et DROP FUNCTION des quatre fonctions ci-dessus.
-- Entre ces deux temps, un dossier qui porte un constat ne s'efface plus (les
-- clés RESTRICT refusent, la transaction d'effacement est annulée entière) :
-- la fenêtre se tient courte. En production, aucun constat ne se pose avant
-- la signature de la structure de BP-12a ([[D-314]] §10) ; après la première
-- pose, le DROP efface des actes du praticien : le retour arrière devient une
-- décision.
