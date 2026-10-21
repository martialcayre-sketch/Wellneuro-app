-- DONNÉES PHYSIOLOGIQUES DÉCLARÉES ET TRAITEMENTS EN COURS, EN LIGNES DATÉES
-- ET EN AJOUT SEUL, À DEUX MAINS ; LE TRAITEMENT DEVIENT UNE PIÈCE DE
-- CONSTAT ([[D-335]], BP-13, LOT-13, fiche F07 ; amende [[D-331]] §2).
--
-- Migration demandée par le cadrage v3 (ligne BP-13) et le responsable le
-- 2026-10-21 (« tables, plus la clé traitement ajoutée aux pièces de
-- constat ») ; D-335 acceptée, déclaration au dossier RGPD et texte patient
-- validés le 2026-10-21.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore de
-- ligne, aucun code ne la lit. Routes, formulaire du portail, panneau du
-- cockpit et synthèse viendront dans la PR suivante, sous
-- `WN_PHYSIO_TRAITEMENTS`, après l'application CONSTATÉE par conteneur. Le
-- seul code qui l'accompagne est l'effacement nommé du dossier
-- (`patient/effacement.ts`) : le banc de complétude l'exige de toute table
-- qui porte `id_patient`. Entre le déploiement du code et l'approbation de la
-- release-db, un effacement de dossier échouerait donc sur les tables
-- absentes — transaction annulée, rien d'effacé ; d'où l'approbation dans la
-- foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- `donnees_physiologiques` : une réponse fermée ou une mesure datée sur l'un
-- de six critères ([[D-335]] §2). `traitements_en_cours` : un médicament ou
-- un complément, tel que le patient le déclare ou que le praticien le
-- confirme (§3, §4). Chaque ligne porte un acte :
--
--  - `pose` : « voici l'état de ce critère, ou de ce traitement » ;
--  - `retrait` : « la ligne en vigueur a été posée par erreur » ; le fil
--    revient à « non renseigné ». L'acte ne porte rien d'autre que la ligne
--    qu'il retire.
--
-- Et une source : `patient` (posée au portail ; aucun e-mail) ou `praticien`
-- (posée au cockpit par le praticien du dossier ; son e-mail). Confirmer,
-- corriger, arrêter un traitement : poser en remplacement de la tête.
--
-- `inconnu` est une RÉPONSE écrite : il n'est pas l'absence de ligne, et ni
-- l'un ni l'autre ne se lit comme « non » (DC-24). Les bornes de poids et de
-- taille sont TECHNIQUES (arbitrage du 2026-10-20) : elles refusent une
-- saisie absurde et n'ont aucun sens clinique. Aucune colonne ne porte un
-- IMC, une classe ou un code de référentiel (§10).
--
-- ── UNE TÊTE PAR FIL ───────────────────────────────────────────────────────
--
-- Le fil d'une donnée physiologique est le couple (dossier, critère) ; celui
-- d'un traitement naît avec sa première pose, sans prédécesseur. La TÊTE est
-- la pose que ni un remplacement ni un retrait ne vise
-- (`id_ligne_remplacee`). Patron de [[D-331]] §2 : une pose sur un fil qui a
-- une tête la désigne ; une pose sans tête n'en désigne aucune ; un retrait
-- désigne la tête, et elle seule ; une ligne déjà remplacée ou retirée ne se
-- remplace ni ne se retire. L'index unique sur `id_ligne_remplacee` dit la
-- même chose par une autre voie : une ligne a au plus un successeur.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- À l'insertion (triggers `…_avant_insertion`) :
--  1. une ligne `praticien` d'un autre praticien que celui du dossier (la
--     casse ne compte pas : règle de `filtrePatientsDuPraticien`) ;
--  2. une pose qui ne désigne pas la tête de son fil, ou qui en désigne une
--     quand il n'y en a pas (donnée physiologique) ; une pose de traitement
--     qui désigne une ligne qui n'est pas une tête de ce dossier ;
--  3. un retrait qui ne désigne pas une tête ; le retrait `patient` d'une
--     tête posée par le praticien ([[D-335]] §5).
-- Puis les CHECK : la forme de chaque acte, les listes fermées, les bornes
-- techniques, l'accord d'une date et de sa précision, la source et l'e-mail,
-- les critères que le patient pose (sexe déclaré, statut menstruel).
--
-- La base NE refuse PAS : un statut menstruel posé quand le sexe en vigueur
-- n'est ni `feminin` ni `autre` (la règle lit une autre ligne ; la route le
-- refuse, [[D-335]] §2) ; une date future (l'instant de la route et celui de
-- la base ne sont pas le même jour au même moment ; la route la refuse) ; un
-- dossier mineur (la garde d'âge est celle de la route, [[D-335]] §6).
--
-- Sur une pièce de constat qui cite un traitement
-- (`pieces_constats_praticien_avant_insertion`, réécrite) :
--  4. une ligne de traitement d'un autre dossier, un retrait, ou une ligne
--     qui n'est plus la tête de son fil.
-- Et le CHECK « une pièce exactement » porte désormais sur trois clés.
--
-- En fin de transaction (triggers de contrainte DIFFÉRÉS
-- `…_suppression_nommee`) :
--  5. une suppression dont le dossier survit à la transaction : DELETE est
--     réservé à l'effacement nommé du dossier. Sans cette garde, supprimer
--     une tête ressusciterait la ligne qu'elle remplaçait.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- `FOR KEY SHARE` sur la ligne du dossier d'abord (l'effacement nommé la
-- prend `FOR UPDATE` en premier : l'ordre « dossier, puis le reste » est le
-- même partout), puis un verrou consultatif (espace 335) : celui du critère
-- dans le dossier pour une donnée physiologique, celui des traitements du
-- dossier pour un traitement. Deux actes sur un même fil se sérialisent, et
-- le second lit la tête laissée par le premier. La pièce de constat qui
-- cite un traitement prend les mêmes deux verrous : un remplacement
-- concurrent la suit ou la précède, jamais ne la croise. REPEATABLE READ est
-- refusé, avec le motif de BP-09 et BP-11 : son instantané masquerait l'acte
-- que le verrou vient de laisser commettre.
--
-- ── FIGÉES, MAIS EFFAÇABLES ────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est qu'en fin de
-- transaction, si le dossier survit (refus 5) : l'effacement du dossier
-- supprime NOMMÉMENT les pièces de constat, les constats, puis ces lignes,
-- avant le dossier.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` et `ordre` tiré à
-- l'insertion, après le verrou : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "donnees_physiologiques" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "critere" TEXT NOT NULL,
    "reponse" TEXT,
    "mesure" DECIMAL(4,1),
    "mesure_le" DATE,
    "source" TEXT NOT NULL,
    "id_ligne_remplacee" TEXT,
    "praticien_email" TEXT,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donnees_physiologiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traitements_en_cours" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "nature" TEXT,
    "nom" TEXT,
    "dose" TEXT,
    "moment" TEXT,
    "motif" TEXT,
    "debut" DATE,
    "debut_precision" TEXT,
    "fin" DATE,
    "fin_precision" TEXT,
    "prescrit_par_tiers" TEXT,
    "source" TEXT NOT NULL,
    "id_ligne_remplacee" TEXT,
    "praticien_email" TEXT,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traitements_en_cours_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- La troisième clé d'une pièce de constat ([[D-335]] §7, amende [[D-331]]
-- §2). Ajoutée nullable, sans défaut : aucune ligne existante n'est
-- réécrite.
ALTER TABLE "pieces_constats_praticien" ADD COLUMN "id_traitement" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "donnees_physiologiques_ordre_key" ON "donnees_physiologiques"("ordre");
CREATE UNIQUE INDEX "traitements_en_cours_ordre_key" ON "traitements_en_cours"("ordre");

-- CreateIndex
-- Une ligne a au plus un successeur (remplacement ou retrait). Les NULL ne
-- se comparent pas : les poses sans prédécesseur coexistent.
CREATE UNIQUE INDEX "donnees_physiologiques_id_ligne_remplacee_key" ON "donnees_physiologiques"("id_ligne_remplacee");
CREATE UNIQUE INDEX "traitements_en_cours_id_ligne_remplacee_key" ON "traitements_en_cours"("id_ligne_remplacee");

-- CreateIndex
-- « Les lignes de ce dossier, dans l'ordre » (écrans) et « les lignes de ce
-- critère » (la tête, que relit le trigger).
CREATE INDEX "donnees_physiologiques_patient_ordre_idx" ON "donnees_physiologiques"("id_patient", "ordre");
CREATE INDEX "donnees_physiologiques_patient_critere_idx" ON "donnees_physiologiques"("id_patient", "critere");
CREATE INDEX "traitements_en_cours_patient_ordre_idx" ON "traitements_en_cours"("id_patient", "ordre");

-- CreateIndex
-- Une pièce par constat, et les pièces d'une ligne citée : « à relire »
-- part de la ligne remplacée ou retirée, et la clé RESTRICT relit cet index
-- à chaque suppression de la ligne.
CREATE UNIQUE INDEX "pieces_constats_praticien_constat_traitement_key" ON "pieces_constats_praticien"("id_constat", "id_traitement");
CREATE INDEX "pieces_constats_praticien_id_traitement_idx" ON "pieces_constats_praticien"("id_traitement");

-- AddForeignKey
-- ON DELETE RESTRICT vers le dossier : l'effacement est une suppression
-- NOMMÉE. En CASCADE, ces lignes partiraient en silence.
ALTER TABLE "donnees_physiologiques" ADD CONSTRAINT "donnees_physiologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "traitements_en_cours" ADD CONSTRAINT "traitements_en_cours_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION, comme pour les constats : l'effacement supprime les lignes du
-- dossier en une instruction, et la clé se vérifie à sa fin.
ALTER TABLE "donnees_physiologiques" ADD CONSTRAINT "donnees_physiologiques_id_ligne_remplacee_fkey" FOREIGN KEY ("id_ligne_remplacee") REFERENCES "donnees_physiologiques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "traitements_en_cours" ADD CONSTRAINT "traitements_en_cours_id_ligne_remplacee_fkey" FOREIGN KEY ("id_ligne_remplacee") REFERENCES "traitements_en_cours"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pieces_constats_praticien" ADD CONSTRAINT "pieces_constats_praticien_id_traitement_fkey" FOREIGN KEY ("id_traitement") REFERENCES "traitements_en_cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — la forme de chaque acte, les listes fermées ────────────────

ALTER TABLE "donnees_physiologiques"
  ADD CONSTRAINT "donnees_physiologiques_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  ADD CONSTRAINT "donnees_physiologiques_critere_check"
    CHECK ("critere" IN ('sexe_declare', 'statut_menstruel', 'grossesse', 'allaitement', 'poids', 'taille')),
  -- Un retrait désigne la ligne qu'il retire, et ne dit rien d'autre.
  ADD CONSTRAINT "donnees_physiologiques_forme_retrait"
    CHECK ("acte" <> 'retrait' OR (
      "id_ligne_remplacee" IS NOT NULL
      AND "reponse" IS NULL AND "mesure" IS NULL AND "mesure_le" IS NULL
    )),
  -- Une pose d'un critère fermé porte une réponse de SA liste, sans mesure ;
  -- `coalesce(… IN …, false)` : un CHECK qui vaut NULL passe, et une réponse
  -- absente ferait d'un `IN` un NULL.
  ADD CONSTRAINT "donnees_physiologiques_reponse_selon_critere"
    CHECK ("acte" <> 'pose' OR "critere" IN ('poids', 'taille') OR (
      "mesure" IS NULL AND "mesure_le" IS NULL
      AND ("critere" <> 'sexe_declare' OR coalesce("reponse" IN (
        'feminin', 'masculin', 'autre', 'inconnu'), false))
      AND ("critere" <> 'statut_menstruel' OR coalesce("reponse" IN (
        'cycles_reguliers', 'cycles_irreguliers', 'absence_de_cycles', 'menopause', 'inconnu'), false))
      AND ("critere" NOT IN ('grossesse', 'allaitement') OR coalesce("reponse" IN (
        'oui', 'non', 'inconnu'), false))
    )),
  -- Une pose d'une mesure porte la mesure et sa date, sans réponse. Bornes
  -- TECHNIQUES (arbitrage du 2026-10-20) : poids de 1 à 500 kg au dixième
  -- (le type le tient), taille de 30 à 260 cm à l'unité.
  ADD CONSTRAINT "donnees_physiologiques_mesure_selon_critere"
    CHECK ("acte" <> 'pose' OR "critere" NOT IN ('poids', 'taille') OR (
      "reponse" IS NULL AND "mesure" IS NOT NULL AND "mesure_le" IS NOT NULL
      AND ("critere" <> 'poids' OR "mesure" BETWEEN 1 AND 500)
      AND ("critere" <> 'taille' OR ("mesure" BETWEEN 30 AND 260 AND "mesure" = trunc("mesure")))
    )),
  ADD CONSTRAINT "donnees_physiologiques_source_check"
    CHECK ("source" IN ('patient', 'praticien')),
  -- La ligne du praticien porte son e-mail ; celle du patient n'en porte pas.
  ADD CONSTRAINT "donnees_physiologiques_auteur_selon_source"
    CHECK (
      ("source" = 'praticien') = ("praticien_email" IS NOT NULL)
      AND ("praticien_email" IS NULL OR ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320))
    ),
  -- Au portail, le patient pose le sexe déclaré et le statut menstruel ;
  -- grossesse, allaitement, poids et taille restent des questions de
  -- l'anamnèse (arbitrage du 2026-10-21, pas de doublon).
  ADD CONSTRAINT "donnees_physiologiques_criteres_du_patient"
    CHECK ("source" <> 'patient' OR "critere" IN ('sexe_declare', 'statut_menstruel')),
  ADD CONSTRAINT "donnees_physiologiques_ne_se_remplace_pas"
    CHECK ("id_ligne_remplacee" IS DISTINCT FROM "id");

ALTER TABLE "traitements_en_cours"
  ADD CONSTRAINT "traitements_en_cours_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  ADD CONSTRAINT "traitements_en_cours_forme_retrait"
    CHECK ("acte" <> 'retrait' OR (
      "id_ligne_remplacee" IS NOT NULL
      AND "nature" IS NULL AND "nom" IS NULL AND "dose" IS NULL AND "moment" IS NULL
      AND "motif" IS NULL AND "debut" IS NULL AND "debut_precision" IS NULL
      AND "fin" IS NULL AND "fin_precision" IS NULL AND "prescrit_par_tiers" IS NULL
    )),
  ADD CONSTRAINT "traitements_en_cours_forme_pose"
    CHECK ("acte" <> 'pose' OR (
      "nature" IS NOT NULL AND "nom" IS NOT NULL
      AND "debut_precision" IS NOT NULL AND "prescrit_par_tiers" IS NOT NULL
    )),
  ADD CONSTRAINT "traitements_en_cours_nature_check"
    CHECK ("nature" IN ('medicament', 'complement')),
  ADD CONSTRAINT "traitements_en_cours_prescrit_check"
    CHECK ("prescrit_par_tiers" IN ('oui', 'non', 'inconnu')),
  -- `~ '\S'` et non `btrim/1` : un nom fait de tabulations n'est pas un nom.
  ADD CONSTRAINT "traitements_en_cours_textes_forme"
    CHECK (
      ("nom" IS NULL OR ("nom" ~ '\S' AND char_length("nom") <= 200))
      AND ("dose" IS NULL OR ("dose" ~ '\S' AND char_length("dose") <= 200))
      AND ("moment" IS NULL OR ("moment" ~ '\S' AND char_length("moment") <= 200))
      AND ("motif" IS NULL OR ("motif" ~ '\S' AND char_length("motif") <= 500))
    ),
  -- Une date au jour, au mois ou à l'année, rangée au premier jour de sa
  -- période ; `inconnu`, aucune date ([[D-335]] §4). La fin absente dit
  -- « en cours » : sa précision manque avec elle.
  ADD CONSTRAINT "traitements_en_cours_precision_check"
    CHECK (
      ("debut_precision" IS NULL OR "debut_precision" IN ('jour', 'mois', 'annee', 'inconnu'))
      AND ("fin_precision" IS NULL OR "fin_precision" IN ('jour', 'mois', 'annee', 'inconnu'))
    ),
  ADD CONSTRAINT "traitements_en_cours_debut_selon_precision"
    CHECK (
      ("debut_precision" IS DISTINCT FROM 'inconnu' OR "debut" IS NULL)
      AND ("debut_precision" NOT IN ('jour', 'mois', 'annee') OR "debut" IS NOT NULL)
      AND ("debut_precision" IS DISTINCT FROM 'mois' OR extract(day FROM "debut") = 1)
      AND ("debut_precision" IS DISTINCT FROM 'annee' OR (extract(day FROM "debut") = 1 AND extract(month FROM "debut") = 1))
      AND ("debut_precision" IS NOT NULL OR "debut" IS NULL)
    ),
  ADD CONSTRAINT "traitements_en_cours_fin_selon_precision"
    CHECK (
      ("fin_precision" IS DISTINCT FROM 'inconnu' OR "fin" IS NULL)
      AND ("fin_precision" NOT IN ('jour', 'mois', 'annee') OR "fin" IS NOT NULL)
      AND ("fin_precision" IS DISTINCT FROM 'mois' OR extract(day FROM "fin") = 1)
      AND ("fin_precision" IS DISTINCT FROM 'annee' OR (extract(day FROM "fin") = 1 AND extract(month FROM "fin") = 1))
      AND ("fin_precision" IS NOT NULL OR "fin" IS NULL)
    ),
  -- Une fin connue ne précède pas un début connu. Chaque date est rangée au
  -- premier jour de sa période : la période de la fin doit FINIR après le
  -- début. Un début le 10 mai et une fin « mai » passent ; une fin en
  -- février et un début en mars, non. Comparer les deux premiers jours
  -- refuserait une fin moins précise que le début dans la même période, et
  -- obligerait à inventer une précision (revue `wn-reviewer`, arbitrage du
  -- responsable du 2026-10-21).
  ADD CONSTRAINT "traitements_en_cours_fin_apres_debut"
    CHECK ("fin" IS NULL OR "debut" IS NULL OR
           "fin" + CASE "fin_precision" WHEN 'annee' THEN interval '1 year'
                                        WHEN 'mois' THEN interval '1 month'
                                        ELSE interval '1 day' END > "debut"),
  ADD CONSTRAINT "traitements_en_cours_source_check"
    CHECK ("source" IN ('patient', 'praticien')),
  ADD CONSTRAINT "traitements_en_cours_auteur_selon_source"
    CHECK (
      ("source" = 'praticien') = ("praticien_email" IS NOT NULL)
      AND ("praticien_email" IS NULL OR ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320))
    ),
  ADD CONSTRAINT "traitements_en_cours_ne_se_remplace_pas"
    CHECK ("id_ligne_remplacee" IS DISTINCT FROM "id");

-- Une pièce désigne une seule des trois clés ([[D-335]] §7). Même nom : les
-- contrats de BP-11 la reconnaissent à son nom.
ALTER TABLE "pieces_constats_praticien"
  DROP CONSTRAINT "pieces_constats_praticien_une_piece",
  ADD CONSTRAINT "pieces_constats_praticien_une_piece"
    CHECK (num_nonnulls("id_resultat", "id_questionnaire_reponse", "id_traitement") = 1);

-- ── FIGÉES : NI UPDATE NI TRUNCATE ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.donnees_parcours_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une ligne est figée (% refusé) ; on la remplace ou on la retire, et seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER donnees_physiologiques_no_update
  BEFORE UPDATE ON public.donnees_physiologiques
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_figee();

CREATE TRIGGER donnees_physiologiques_no_truncate
  BEFORE TRUNCATE ON public.donnees_physiologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.donnees_parcours_figee();

CREATE TRIGGER traitements_en_cours_no_update
  BEFORE UPDATE ON public.traitements_en_cours
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_figee();

CREATE TRIGGER traitements_en_cours_no_truncate
  BEFORE TRUNCATE ON public.traitements_en_cours
  FOR EACH STATEMENT EXECUTE FUNCTION public.donnees_parcours_figee();

-- ── LA DONNÉE PHYSIOLOGIQUE, À L'INSERTION ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.donnees_physiologiques_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  tete text;
  tete_source text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'ligne refusée en REPEATABLE READ : la tête d''un fil exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous d'abord : le dossier, puis le critère dans le dossier.
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(335, hashtext(NEW.id_patient || '|physio|' || NEW.critere));

  IF NEW.source = 'praticien' AND lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'ligne refusée : seul le praticien du dossier pose ou retire une ligne du praticien.';
  END IF;

  -- La tête : la pose de ce critère que rien ne vise. L'invariant en garde
  -- une au plus ; `ordre` départage si un état antérieur en laissait deux.
  SELECT d.id, d.source INTO tete, tete_source
  FROM public.donnees_physiologiques d
  WHERE d.id_patient = NEW.id_patient
    AND d.critere = NEW.critere
    AND d.acte = 'pose'
    AND NOT EXISTS (
      SELECT 1 FROM public.donnees_physiologiques s
      WHERE s.id_ligne_remplacee = d.id
    )
  ORDER BY d.ordre DESC
  LIMIT 1;

  IF NEW.acte = 'pose' THEN
    IF tete IS NULL AND NEW.id_ligne_remplacee IS NOT NULL THEN
      RAISE EXCEPTION 'pose refusée : aucune ligne n''est en vigueur sur ce critère ; une pose neuve ne remplace rien.';
    ELSIF tete IS NOT NULL AND NEW.id_ligne_remplacee IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'pose refusée : le critère porte une ligne en vigueur (%) ; une pose doit la remplacer, elle seule.', tete;
    END IF;
  ELSIF NEW.acte = 'retrait' THEN
    IF tete IS NULL OR NEW.id_ligne_remplacee IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'retrait refusé : seule la ligne en vigueur sur ce critère se retire.';
    END IF;
    IF NEW.source = 'patient' AND tete_source <> 'patient' THEN
      RAISE EXCEPTION 'retrait refusé : le patient ne retire que les lignes qu''il a déclarées.';
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK le refuse ensuite.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.donnees_physiologiques', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER donnees_physiologiques_avant_insertion
  BEFORE INSERT ON public.donnees_physiologiques
  FOR EACH ROW EXECUTE FUNCTION public.donnees_physiologiques_avant_insertion();

-- ── LE TRAITEMENT, À L'INSERTION ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.traitements_en_cours_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  cible_acte text;
  cible_source text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'ligne refusée en REPEATABLE READ : la tête d''un fil exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous d'abord : le dossier, puis les traitements du dossier.
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(335, hashtext(NEW.id_patient || '|traitement'));

  IF NEW.source = 'praticien' AND lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'ligne refusée : seul le praticien du dossier pose ou retire une ligne du praticien.';
  END IF;

  -- Une pose sans prédécesseur ouvre un fil. Toute ligne qui en désigne une
  -- autre la désigne TÊTE : une pose de ce dossier que rien ne vise encore.
  IF NEW.id_ligne_remplacee IS NOT NULL THEN
    SELECT t.acte, t.source INTO cible_acte, cible_source
    FROM public.traitements_en_cours t
    WHERE t.id = NEW.id_ligne_remplacee AND t.id_patient = NEW.id_patient;
    IF cible_acte IS DISTINCT FROM 'pose' OR EXISTS (
      SELECT 1 FROM public.traitements_en_cours s
      WHERE s.id_ligne_remplacee = NEW.id_ligne_remplacee
    ) THEN
      RAISE EXCEPTION '% refusé : seule une ligne en vigueur de ce dossier se remplace ou se retire.',
        CASE WHEN NEW.acte = 'retrait' THEN 'retrait' ELSE 'remplacement' END;
    END IF;
    IF NEW.acte = 'retrait' AND NEW.source = 'patient' AND cible_source <> 'patient' THEN
      RAISE EXCEPTION 'retrait refusé : le patient ne retire que les lignes qu''il a déclarées.';
    END IF;
  END IF;
  -- Un retrait sans cible passe ici : le CHECK `forme_retrait` le refuse.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.traitements_en_cours', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER traitements_en_cours_avant_insertion
  BEFORE INSERT ON public.traitements_en_cours
  FOR EACH ROW EXECUTE FUNCTION public.traitements_en_cours_avant_insertion();

-- ── LA PIÈCE DE CONSTAT, À L'INSERTION (réécrite : la clé de traitement) ───
--
-- Corps de [[D-331]] repris tel quel pour les deux premières clés ; la
-- troisième prend les verrous des traitements du dossier, puis vérifie que
-- la ligne citée est une pose de ce dossier, tête de son fil.

CREATE OR REPLACE FUNCTION public.pieces_constats_praticien_avant_insertion()
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
  traitement_acte text;
BEGIN
  SELECT c.acte, c.transaction_pose INTO constat_acte, constat_transaction
  FROM public.constats_praticien c
  WHERE c.id = NEW.id_constat AND c.id_patient = NEW.id_patient;
  IF constat_acte IS NULL THEN
    RAISE EXCEPTION 'pièce refusée : % n''est pas un constat de ce dossier.', NEW.id_constat;
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

  IF NEW.id_traitement IS NOT NULL THEN
    -- Les verrous des actes de traitement (dossier, puis traitements du
    -- dossier), avant le contrôle de tête : un remplacement concurrent
    -- passe avant ou après, jamais entre.
    PERFORM 1 FROM public.patients p WHERE p.id_patient = NEW.id_patient FOR KEY SHARE;
    PERFORM pg_advisory_xact_lock(335, hashtext(NEW.id_patient || '|traitement'));
    SELECT t.acte INTO traitement_acte
    FROM public.traitements_en_cours t
    WHERE t.id = NEW.id_traitement AND t.id_patient = NEW.id_patient;
    IF traitement_acte IS NULL THEN
      RAISE EXCEPTION 'pièce refusée : % n''est pas un traitement de ce dossier.', NEW.id_traitement;
    END IF;
    IF traitement_acte <> 'pose' THEN
      RAISE EXCEPTION 'pièce refusée : un retrait de traitement ne se cite pas.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.traitements_en_cours s
      WHERE s.id_ligne_remplacee = NEW.id_traitement
    ) THEN
      RAISE EXCEPTION 'pièce refusée : % a été remplacé ou retiré ; seule la ligne en vigueur se cite.', NEW.id_traitement;
    END IF;
  END IF;
  -- Aucune clé, ou plusieurs : le CHECK `une_piece` le refuse ensuite.

  RETURN NEW;
END;
$$;

-- ── EN FIN DE TRANSACTION : LA SUPPRESSION EST CELLE DU DOSSIER ────────────

CREATE OR REPLACE FUNCTION public.donnees_parcours_suppression_nommee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.id_patient = OLD.id_patient) THEN
    RAISE EXCEPTION '% : suppression refusée ; une ligne ne s''efface qu''avec son dossier.', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER donnees_physiologiques_suppression_nommee
  AFTER DELETE ON public.donnees_physiologiques
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_suppression_nommee();

CREATE CONSTRAINT TRIGGER traitements_en_cours_suppression_nommee
  AFTER DELETE ON public.traitements_en_cours
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_suppression_nommee();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers. La
-- fonction des pièces, remplacée, garde ses droits révoqués par BP-11 ;
-- `CREATE OR REPLACE` ne les rend pas.
REVOKE EXECUTE ON FUNCTION public.donnees_parcours_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.donnees_physiologiques_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.traitements_en_cours_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.donnees_parcours_suppression_nommee() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.donnees_parcours_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.donnees_physiologiques_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.traitements_en_cours_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.donnees_parcours_suppression_nommee() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."donnees_physiologiques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."traitements_en_cours" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans
-- l'effacement de ces lignes, sans les modèles `DonneePhysiologique` et
-- `TraitementEnCours` ni la clé `idTraitement` ; puis supprimer la colonne
-- `id_traitement` (et rétablir `pieces_constats_praticien_une_piece` sur
-- deux clés, et la fonction des pièces de [[D-331]]), DROP TABLE des deux
-- tables et DROP FUNCTION des quatre fonctions ci-dessus. Tant qu'aucun code
-- ne les écrit, les tables sont vides ; après la première ligne, le DROP
-- efface des déclarations du patient et des actes du praticien : le retour
-- arrière devient une décision.
