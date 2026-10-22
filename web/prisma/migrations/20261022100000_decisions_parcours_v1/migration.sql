-- DÉCISIONS DE PARCOURS : CHOIX DU PATIENT, MISE EN ŒUVRE RÉELLE, RÉVISION DU
-- PRATICIEN, EN LIGNES EN AJOUT SEUL ANCRÉES SUR UNE VERSION DU PROTOCOLE
-- ([[D-343]], BP-15, LOT-15, fiche F08 ; précise [[D-255]] §2).
--
-- Migration demandée par le cadrage v3 (ligne BP-15) et le responsable le
-- 2026-10-22 ; D-343 acceptée, déclaration au dossier RGPD validée le même
-- jour.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore de
-- ligne, aucun code ne la lit. Route et panneau du cockpit viendront dans la
-- PR suivante, sous `WN_DECISIONS_PARCOURS`, après l'application CONSTATÉE
-- par conteneur. Le seul code qui l'accompagne est l'effacement nommé du
-- dossier (`patient/effacement.ts`) : le banc de complétude l'exige de toute
-- table qui porte `id_patient`. Entre le déploiement du code et
-- l'approbation de la release-db, un effacement de dossier échouerait donc
-- sur la table absente — transaction annulée, rien d'effacé ; d'où
-- l'approbation dans la foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Une ligne désigne UNE VERSION du protocole (`protocol_drafts.id`, du même
-- dossier) et, facultativement, une ACTION de cette version (son
-- `actionId`, un texte : l'action vit dans le contenu de la version ; son
-- appartenance se vérifie à la route). Elle porte un acte :
--
--  - `pose` : un fait ou une décision, de l'une des sept natures ;
--  - `retrait` : « la ligne en vigueur ne vaut plus » (posée par erreur, ou
--    refus levé, [[D-343]] §5). L'acte ne porte rien d'autre que la ligne
--    qu'il retire et sa version.
--
-- Les sept natures, en trois familles ([[D-343]] §3) :
--  - choix du patient : `preference`, `refus` — motif de la liste « choix » ;
--  - mise en œuvre : `debut`, `reprise` (sans motif), `interruption`,
--    `arret` (motif de la liste « interruption ») — chacune avec la date où
--    l'événement a eu lieu, au jour, ou « inconnue » écrit ;
--  - révision : `revision`, sur la version ENTIÈRE (jamais d'action), issue
--    `maintenir` (sans motif), `ajuster` ou `arreter` (motif de la liste
--    « révision ») ; `ajuster` peut désigner la version suivante.
-- Choix et mise en œuvre disent leur source : `rapporte_par_patient` ou
-- `constate_par_praticien`. La révision n'en porte pas : c'est la décision
-- du praticien. Aucun motif d'efficacité (DC-39) ; aucune colonne de score,
-- de résultat, de valeur ni d'attribution ([[D-343]] §10).
--
-- ── LES FILS, ET LEUR TÊTE ─────────────────────────────────────────────────
--
-- Une révision a UN fil par version : sa tête est la décision en vigueur sur
-- la version, et une révision nouvelle la remplace. Choix et mise en œuvre
-- ouvrent UN fil par événement (un début, une interruption, une reprise
-- coexistent) ; le remplacement n'y sert qu'à corriger. La TÊTE d'un fil est
-- la pose que ni un remplacement ni un retrait ne vise
-- (`id_ligne_remplacee`). Patron de [[D-331]] §2 : un remplacement garde la
-- version, l'action et la famille de la ligne qu'il remplace ; un retrait
-- désigne une tête, et elle seule ; une ligne déjà remplacée ou retirée ne
-- se remplace ni ne se retire. L'index unique sur `id_ligne_remplacee` dit
-- la même chose par une autre voie : une ligne a au plus un successeur.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- À l'insertion (trigger `decisions_parcours_avant_insertion`) :
--  1. la ligne d'un autre praticien que celui du dossier (la casse ne compte
--     pas : règle de `filtrePatientsDuPraticien`) ;
--  2. une version, ou une version suivante, d'un autre dossier ;
--  3. une révision qui ne désigne pas la tête de révision de sa version, ou
--     qui en désigne une quand il n'y en a pas ;
--  4. une ligne qui désigne autre chose qu'une tête de ce dossier, ou une
--     tête d'une autre version ; un remplacement qui change d'action ou de
--     famille.
-- Puis les CHECK : la forme de chaque acte, les listes fermées (nature,
-- issue, motif selon la nature, source), la note (obligatoire avec `autre`
-- et pour une préférence), la date de l'événement, la version suivante.
--
-- La base NE refuse PAS : une date d'événement future (l'instant de la route
-- et celui de la base ne sont pas le même jour au même moment ; la route la
-- refuse) ; une action absente de la version (le contenu est un JSON ; la
-- route le vérifie) ; une mise en œuvre ou une révision sur une version non
-- diffusée (l'approbation est une autre table ; la route, [[D-343]] §7) ; un
-- dossier mineur (la route, §8) ; une séquence lacunaire (une reprise sans
-- interruption se pose : ce sont des déclarations, §3).
--
-- En fin de transaction (trigger de contrainte DIFFÉRÉ
-- `decisions_parcours_suppression_nommee`, fonction de BP-13) :
--  5. une suppression dont le dossier survit à la transaction : DELETE est
--     réservé à l'effacement nommé du dossier. Sans cette garde, supprimer
--     une tête ressusciterait la ligne qu'elle remplaçait.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- `FOR KEY SHARE` sur la ligne du dossier d'abord (l'effacement nommé la
-- prend `FOR UPDATE` en premier : l'ordre « dossier, puis le reste » est le
-- même partout), puis un verrou consultatif (espace 343) : celui des
-- décisions de parcours du dossier. Deux actes du dossier se sérialisent, et
-- le second lit la tête laissée par le premier. REPEATABLE READ est refusé,
-- avec le motif de BP-09, BP-11 et BP-13 : son instantané masquerait l'acte
-- que le verrou vient de laisser commettre.
--
-- ── LE JOUR 0 ET LES EMPREINTES NE BOUGENT PAS ─────────────────────────────
--
-- Rien ici n'écrit dans `protocol_drafts`, `protocol_diffusion_approvals`,
-- `protocol_checkins` ni dans les ancres ([[D-343]] §9). Les deux clés vers
-- `protocol_drafts` sont en RESTRICT et ne touchent ni ses colonnes ni ses
-- triggers.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger (fonction de BP-13). DELETE ne
-- l'est qu'en fin de transaction, si le dossier survit (refus 5) :
-- l'effacement du dossier supprime NOMMÉMENT ces lignes avant les versions
-- du protocole qu'elles désignent, puis le dossier.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` et `ordre` tiré à
-- l'insertion, après le verrou : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "decisions_parcours" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "id_version" TEXT NOT NULL,
    "id_action" TEXT,
    "nature" TEXT,
    "issue" TEXT,
    "motif" TEXT,
    "note" TEXT,
    "evenement_le" DATE,
    "evenement_inconnu" BOOLEAN,
    "source" TEXT,
    "id_version_suivante" TEXT,
    "id_ligne_remplacee" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_parcours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decisions_parcours_ordre_key" ON "decisions_parcours"("ordre");

-- CreateIndex
-- Une ligne a au plus un successeur (remplacement ou retrait). Les NULL ne
-- se comparent pas : les poses sans prédécesseur coexistent.
CREATE UNIQUE INDEX "decisions_parcours_id_ligne_remplacee_key" ON "decisions_parcours"("id_ligne_remplacee");

-- CreateIndex
-- « Les lignes de ce dossier, dans l'ordre » (écrans) ; « les lignes de
-- cette version » (la tête de révision, que relit le trigger, et la clé
-- RESTRICT de `protocol_drafts`, relue à chaque suppression d'une version) ;
-- la version suivante, pour la même raison.
CREATE INDEX "decisions_parcours_patient_ordre_idx" ON "decisions_parcours"("id_patient", "ordre");
CREATE INDEX "decisions_parcours_id_version_idx" ON "decisions_parcours"("id_version");
CREATE INDEX "decisions_parcours_id_version_suivante_idx" ON "decisions_parcours"("id_version_suivante");

-- AddForeignKey
-- ON DELETE RESTRICT vers le dossier et vers les versions : l'effacement est
-- une suppression NOMMÉE. En CASCADE, ces lignes partiraient en silence.
ALTER TABLE "decisions_parcours" ADD CONSTRAINT "decisions_parcours_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decisions_parcours" ADD CONSTRAINT "decisions_parcours_id_version_fkey" FOREIGN KEY ("id_version") REFERENCES "protocol_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decisions_parcours" ADD CONSTRAINT "decisions_parcours_id_version_suivante_fkey" FOREIGN KEY ("id_version_suivante") REFERENCES "protocol_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION, comme pour les constats et les traitements : l'effacement
-- supprime les lignes du dossier en une instruction, et la clé se vérifie à
-- sa fin.
ALTER TABLE "decisions_parcours" ADD CONSTRAINT "decisions_parcours_id_ligne_remplacee_fkey" FOREIGN KEY ("id_ligne_remplacee") REFERENCES "decisions_parcours"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — la forme de chaque acte, les listes fermées ────────────────
--
-- `coalesce(… IN …, false)` : un CHECK qui vaut NULL passe, et une valeur
-- absente ferait d'un `IN` un NULL.

ALTER TABLE "decisions_parcours"
  ADD CONSTRAINT "decisions_parcours_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  -- Un retrait désigne la ligne qu'il retire, et ne dit rien d'autre.
  ADD CONSTRAINT "decisions_parcours_forme_retrait"
    CHECK ("acte" <> 'retrait' OR (
      "id_ligne_remplacee" IS NOT NULL
      AND "id_action" IS NULL AND "nature" IS NULL AND "issue" IS NULL
      AND "motif" IS NULL AND "note" IS NULL
      AND "evenement_le" IS NULL AND "evenement_inconnu" IS NULL
      AND "source" IS NULL AND "id_version_suivante" IS NULL
    )),
  ADD CONSTRAINT "decisions_parcours_forme_pose"
    CHECK ("acte" <> 'pose' OR "nature" IS NOT NULL),
  ADD CONSTRAINT "decisions_parcours_nature_check"
    CHECK ("nature" IN ('preference', 'refus', 'debut', 'interruption', 'reprise', 'arret', 'revision')),
  -- La révision vise la version entière ; elle seule porte une issue, et
  -- elle ne porte ni source ni date d'événement ([[D-343]] §2, §3, §5).
  ADD CONSTRAINT "decisions_parcours_forme_revision"
    CHECK (
      ("nature" IS DISTINCT FROM 'revision' OR (
        "id_action" IS NULL AND "source" IS NULL
        AND coalesce("issue" IN ('maintenir', 'ajuster', 'arreter'), false)
      ))
      AND ("nature" = 'revision' OR "issue" IS NULL)
    ),
  -- Choix et mise en œuvre disent leur source ; un retrait n'en porte pas
  -- (forme_retrait), une révision non plus (forme_revision).
  ADD CONSTRAINT "decisions_parcours_source_check"
    CHECK ("nature" IS NULL OR "nature" = 'revision'
           OR coalesce("source" IN ('rapporte_par_patient', 'constate_par_praticien'), false)),
  -- Le motif de SA liste ([[D-343]] §4) ; aucun motif d'efficacité. Début,
  -- reprise et maintien n'en portent pas.
  ADD CONSTRAINT "decisions_parcours_motif_selon_nature"
    CHECK (
      ("nature" NOT IN ('preference', 'refus') OR coalesce("motif" IN (
        'choix_du_patient', 'contrainte_pratique', 'avis_autre_soignant', 'autre'), false))
      AND ("nature" NOT IN ('interruption', 'arret') OR coalesce("motif" IN (
        'effet_indesirable_rapporte', 'contrainte_pratique', 'choix_du_patient',
        'avis_autre_soignant', 'evenement_intercurrent', 'autre'), false))
      AND ("nature" NOT IN ('debut', 'reprise') OR "motif" IS NULL)
      AND ("nature" IS DISTINCT FROM 'revision' OR "issue" IS DISTINCT FROM 'maintenir' OR "motif" IS NULL)
      AND ("nature" IS DISTINCT FROM 'revision' OR "issue" NOT IN ('ajuster', 'arreter') OR coalesce("motif" IN (
        'mise_en_oeuvre_incomplete', 'nouvelle_donnee_au_dossier', 'effet_indesirable_rapporte',
        'choix_du_patient', 'autre'), false))
    ),
  -- La note : jamais faite de blancs (`~ '\S'`, non `btrim/1`), 2000
  -- caractères au plus ; obligatoire avec `autre` et pour une préférence.
  ADD CONSTRAINT "decisions_parcours_note_forme"
    CHECK (
      ("note" IS NULL OR ("note" ~ '\S' AND char_length("note") <= 2000))
      AND ("motif" IS DISTINCT FROM 'autre' OR "note" IS NOT NULL)
      AND ("nature" IS DISTINCT FROM 'preference' OR "note" IS NOT NULL)
    ),
  -- La date de l'événement : une mise en œuvre porte une date au jour, ou
  -- « inconnue » écrit, l'un ou l'autre ([[D-343]] §4) ; choix et révision
  -- n'en portent pas.
  ADD CONSTRAINT "decisions_parcours_evenement_selon_nature"
    CHECK (
      ("nature" NOT IN ('debut', 'interruption', 'reprise', 'arret') OR (
        "evenement_inconnu" IS NOT NULL AND "evenement_inconnu" = ("evenement_le" IS NULL)
      ))
      AND ("nature" IN ('debut', 'interruption', 'reprise', 'arret') OR (
        "evenement_le" IS NULL AND "evenement_inconnu" IS NULL
      ))
    ),
  -- La version suivante : `ajuster` seule, autre que la version révisée
  -- ([[D-343]] §6).
  ADD CONSTRAINT "decisions_parcours_version_suivante_forme"
    CHECK ("id_version_suivante" IS NULL OR (
      "nature" = 'revision' AND "issue" = 'ajuster' AND "id_version_suivante" <> "id_version"
    )),
  ADD CONSTRAINT "decisions_parcours_action_forme"
    CHECK ("id_action" IS NULL OR ("id_action" ~ '\S' AND char_length("id_action") <= 200)),
  ADD CONSTRAINT "decisions_parcours_auteur_forme"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320),
  ADD CONSTRAINT "decisions_parcours_ne_se_remplace_pas"
    CHECK ("id_ligne_remplacee" IS DISTINCT FROM "id");

-- ── FIGÉE : NI UPDATE NI TRUNCATE (fonction de BP-13) ──────────────────────

CREATE TRIGGER decisions_parcours_no_update
  BEFORE UPDATE ON public.decisions_parcours
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_figee();

CREATE TRIGGER decisions_parcours_no_truncate
  BEFORE TRUNCATE ON public.decisions_parcours
  FOR EACH STATEMENT EXECUTE FUNCTION public.donnees_parcours_figee();

-- ── À L'INSERTION ──────────────────────────────────────────────────────────

-- La famille d'une nature ([[D-343]] §3) : un remplacement ne change pas de
-- famille. NULL pour un retrait.
CREATE OR REPLACE FUNCTION public.decisions_parcours_famille(nature text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN nature IN ('preference', 'refus') THEN 'choix'
    WHEN nature IN ('debut', 'interruption', 'reprise', 'arret') THEN 'mise_en_oeuvre'
    WHEN nature = 'revision' THEN 'revision'
  END;
$$;

CREATE OR REPLACE FUNCTION public.decisions_parcours_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  version_dossier text;
  tete text;
  cible_acte text;
  cible_version text;
  cible_action text;
  cible_nature text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'ligne refusée en REPEATABLE READ : la tête d''un fil exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous d'abord : le dossier, puis les décisions de parcours du
  -- dossier.
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;
  PERFORM pg_advisory_xact_lock(343, hashtext(NEW.id_patient || '|decision_parcours'));

  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'ligne refusée : seul le praticien du dossier pose ou retire une décision de parcours.';
  END IF;

  -- La version, et la version suivante, sont du même dossier.
  SELECT d.id_patient INTO version_dossier
  FROM public.protocol_drafts d WHERE d.id = NEW.id_version;
  IF version_dossier IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'ligne refusée : la version du protocole n''appartient pas à ce dossier.';
  END IF;
  IF NEW.id_version_suivante IS NOT NULL THEN
    SELECT d.id_patient INTO version_dossier
    FROM public.protocol_drafts d WHERE d.id = NEW.id_version_suivante;
    IF version_dossier IS DISTINCT FROM NEW.id_patient THEN
      RAISE EXCEPTION 'ligne refusée : la version suivante n''appartient pas à ce dossier.';
    END IF;
  END IF;

  -- Une révision : un fil par version. Sa tête est la révision posée de
  -- cette version que rien ne vise ; l'invariant en garde une au plus, et
  -- `ordre` départage si un état antérieur en laissait deux.
  IF NEW.acte = 'pose' AND NEW.nature = 'revision' THEN
    SELECT d.id INTO tete
    FROM public.decisions_parcours d
    WHERE d.id_version = NEW.id_version
      AND d.acte = 'pose'
      AND d.nature = 'revision'
      AND NOT EXISTS (
        SELECT 1 FROM public.decisions_parcours s
        WHERE s.id_ligne_remplacee = d.id
      )
    ORDER BY d.ordre DESC
    LIMIT 1;
    IF tete IS NULL AND NEW.id_ligne_remplacee IS NOT NULL THEN
      RAISE EXCEPTION 'révision refusée : aucune révision n''est en vigueur sur cette version ; une révision neuve ne remplace rien.';
    ELSIF tete IS NOT NULL AND NEW.id_ligne_remplacee IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'révision refusée : la version porte une révision en vigueur (%) ; une révision doit la remplacer, elle seule.', tete;
    END IF;
  END IF;

  -- Toute ligne qui en désigne une autre la désigne TÊTE : une pose de ce
  -- dossier, de cette version, que rien ne vise encore. Un remplacement
  -- garde l'action et la famille ([[D-343]] §3).
  IF NEW.id_ligne_remplacee IS NOT NULL THEN
    SELECT c.acte, c.id_version, c.id_action, c.nature
      INTO cible_acte, cible_version, cible_action, cible_nature
    FROM public.decisions_parcours c
    WHERE c.id = NEW.id_ligne_remplacee AND c.id_patient = NEW.id_patient;
    IF cible_acte IS DISTINCT FROM 'pose' OR EXISTS (
      SELECT 1 FROM public.decisions_parcours s
      WHERE s.id_ligne_remplacee = NEW.id_ligne_remplacee
    ) THEN
      RAISE EXCEPTION '% refusé : seule une ligne en vigueur de ce dossier se remplace ou se retire.',
        CASE WHEN NEW.acte = 'retrait' THEN 'retrait' ELSE 'remplacement' END;
    END IF;
    IF cible_version IS DISTINCT FROM NEW.id_version THEN
      RAISE EXCEPTION '% refusé : la ligne visée porte sur une autre version du protocole.',
        CASE WHEN NEW.acte = 'retrait' THEN 'retrait' ELSE 'remplacement' END;
    END IF;
    IF NEW.acte = 'pose' AND (
      cible_action IS DISTINCT FROM NEW.id_action
      OR public.decisions_parcours_famille(cible_nature)
         IS DISTINCT FROM public.decisions_parcours_famille(NEW.nature)
    ) THEN
      RAISE EXCEPTION 'remplacement refusé : un remplacement garde l''action et la famille de la ligne qu''il remplace.';
    END IF;
  END IF;
  -- Un retrait sans cible passe ici : le CHECK `forme_retrait` le refuse.
  -- Un acte ou une nature inconnus passent aussi : les CHECK les refusent.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.decisions_parcours', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER decisions_parcours_avant_insertion
  BEFORE INSERT ON public.decisions_parcours
  FOR EACH ROW EXECUTE FUNCTION public.decisions_parcours_avant_insertion();

-- ── EN FIN DE TRANSACTION : LA SUPPRESSION EST CELLE DU DOSSIER ────────────
-- (fonction de BP-13, `donnees_parcours_suppression_nommee`)

CREATE CONSTRAINT TRIGGER decisions_parcours_suppression_nommee
  AFTER DELETE ON public.decisions_parcours
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.donnees_parcours_suppression_nommee();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers. Celles de
-- BP-13, réutilisées, gardent leurs droits révoqués.
REVOKE EXECUTE ON FUNCTION public.decisions_parcours_famille(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decisions_parcours_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.decisions_parcours_famille(text) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.decisions_parcours_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."decisions_parcours" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans
-- l'effacement de ces lignes et sans le modèle `DecisionParcours` ; puis
-- DROP TABLE `decisions_parcours` et DROP FUNCTION des deux fonctions
-- ci-dessus (celles de BP-13 restent : ses tables les emploient). À
-- l'inverse, le retour arrière ÉCRIT dans la migration de BP-13 (« DROP
-- FUNCTION des quatre fonctions ») passe désormais APRÈS celui-ci : sans
-- CASCADE il échouerait sur les triggers de cette table, avec CASCADE il les
-- retirerait sans bruit (relecture `wn-reviewer`). Tant
-- qu'aucun code ne l'écrit, la table est vide ; après la première ligne, le
-- DROP efface des actes du praticien : le retour arrière devient une
-- décision.
