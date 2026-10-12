-- SAF-EI-01 AMENDÉE — LE RATTACHEMENT À UN ÉLÉMENT ET LE VERDICT DU PRATICIEN
-- ([[D-281]] §6, lot 2 : la migration).
--
-- CE QUE LA MIGRATION RÉPARE. La règle livrée par [[D-101]] rattache un
-- signalement au PROGRAMME ENTIER (`protocol_draft_id`) et se lève sur le
-- seul statut de traitement. `D-281` la remplace : le patient désigne UN
-- élément du programme diffusé — ou répond « Je ne sais pas » ou « un autre
-- produit », qui valent tous les compléments —, cet élément passe en pause, et
-- seul le VERDICT du praticien lève la pause : « impliqué » (avec
-- l'aménagement choisi : retirer, différer, réduire) ou « non impliqué ».
-- Aucune colonne existante ne portait ni l'élément, ni le mode de
-- rattachement, ni le verdict.
--
-- MIGRATION SEULE : aucun code ne lit ni n'écrit ces colonnes avant la
-- `release-db` et son constat. Aucune donnée n'est touchée — la production
-- compte zéro signalement (constat par conteneur du 2026-10-12), et rien
-- n'est rétro-posé : un rattachement que le patient n'a pas déclaré serait une
-- parole que personne n'a prononcée (`DC-01`, `DC-24`).
--
-- CE QUE LA BASE TIENT :
--   1. sur le signalement, le mode de rattachement dans sa liste fermée, et
--      l'élément présent si et seulement si le mode est `element` ;
--   2. à l'insertion d'un signalement rattaché : le programme visé est celui
--      du patient, il a été APPROUVÉ POUR DIFFUSION, et l'élément désigné y
--      figure — le défaut du banc de cas fictifs (« un oui rattache même quand
--      le produit nommé n'y figure pas ») devient irreprésentable ;
--   3. le rattachement est FIGÉ : c'est la parole du patient ;
--   4. le verdict est APPEND-ONLY CHAÎNÉ (arbitrage du responsable du
--      2026-10-12 : un verdict erroné se corrige par un nouveau verdict, l'ancien
--      reste lisible) — une racine par signalement, au plus un successeur par
--      ligne, ni UPDATE ni TRUNCATE ;
--   5. la cohérence du verdict avec le signalement : même patient, signalement
--      rattaché, élément du patient s'il en a désigné un, élément du programme
--      visé sinon ; « impliqué » exige élément et aménagement, « non
--      impliqué » n'en porte aucun ;
--   6. RLS deny-all sur la table neuve (posture D-005).
--
-- AUCUN SEUIL, AUCUNE BORNE CLINIQUE : les bornes de longueur ci-dessous sont
-- techniques (200 pour un identifiant d'action, 320 pour une adresse — RFC
-- 5321). Aucune durée prise→symptômes (`D-281` §2, `DC-19`).

-- ── LE SIGNALEMENT : RATTACHEMENT ───────────────────────────────────────────

-- AlterTable
ALTER TABLE "trust_adverse_effect_reports" ADD COLUMN     "element_action_id" TEXT,
ADD COLUMN     "rattachement" TEXT;

-- NULL partout pour les signalements existants et pour ceux déposés sans
-- programme diffusé : « rien n'est rattaché », jamais « aucun élément en
-- cause ». Aucun DEFAULT, pour la même raison qu'en [[D-101]].
ALTER TABLE "trust_adverse_effect_reports"
  ADD CONSTRAINT "trust_aer_rattachement_check"
    CHECK ("rattachement" IN ('element', 'ne_sait_pas', 'autre_produit')),
  ADD CONSTRAINT "trust_aer_element_action_id_check"
    CHECK ("element_action_id" ~ '\S' AND char_length("element_action_id") <= 200),
  -- En CASE, pas en disjonction : `"rattachement" = 'element'` vaut NULL
  -- quand le rattachement est NULL, et un CHECK qui s'évalue à NULL PASSE —
  -- un élément sans rattachement serait accepté (le contrat l'a attrapé).
  ADD CONSTRAINT "trust_aer_rattachement_coherence_check"
    CHECK (
      CASE
        WHEN "rattachement" = 'element' THEN "element_action_id" IS NOT NULL
        ELSE "element_action_id" IS NULL
      END
    );

-- POURQUOI UN TRIGGER ET NON UN CHECK pour « rattaché ⇒ programme présent ».
-- `protocol_draft_id` est en ON DELETE SET NULL ([[D-101]]), et l'effacement
-- IDP2 supprime les versions de protocole AVANT les signalements : un CHECK
-- ferait échouer cet effacement sur la mise à NULL. La garde vaut donc à
-- l'INSERTION, où elle a un sens — on ne rattache pas à un programme absent.
CREATE OR REPLACE FUNCTION public.trust_aer_rattachement_garde()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.rattachement IS DISTINCT FROM OLD.rattachement
       OR NEW.element_action_id IS DISTINCT FROM OLD.element_action_id THEN
      RAISE EXCEPTION '% : le rattachement d''un signalement est figé (parole du patient, D-281).', TG_TABLE_NAME;
    END IF;
    -- Le programme visé est figé avec le rattachement : re-pointé, il ferait
    -- désigner à l'élément du patient un programme où il ne figure pas. Seule
    -- la mise à NULL reste permise — c'est l'`ON DELETE SET NULL` que
    -- déclenche l'effacement IDP2.
    IF OLD.rattachement IS NOT NULL
       AND NEW.protocol_draft_id IS NOT NULL
       AND NEW.protocol_draft_id IS DISTINCT FROM OLD.protocol_draft_id THEN
      RAISE EXCEPTION '% : le programme visé par un signalement rattaché est figé (D-281).', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.rattachement IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.protocol_draft_id IS NULL THEN
    RAISE EXCEPTION '% : un signalement rattaché vise un programme (D-281 §2).', TG_TABLE_NAME;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM protocol_drafts d
    WHERE d.id = NEW.protocol_draft_id AND d.id_patient = NEW.id_patient
  ) THEN
    RAISE EXCEPTION '% : le programme visé n''est pas celui du patient.', TG_TABLE_NAME;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM protocol_diffusion_approvals a
    WHERE a.protocol_draft_id = NEW.protocol_draft_id AND a.id_patient = NEW.id_patient
  ) THEN
    RAISE EXCEPTION '% : le programme visé n''a jamais été approuvé pour diffusion (D-281 §2).', TG_TABLE_NAME;
  END IF;
  -- GARDE DE SECOND RANG, PLUS LARGE QUE « LE PROGRAMME DIFFUSÉ » : elle
  -- accepte un programme qu'une approbation a visé UN JOUR, même remplacé
  -- depuis. Le programme que le patient voit est celui que choisit
  -- `resolveProtocoleDiffuse` (lib/protocol/portailProtocol.ts) — approbation
  -- active, empreinte égale, version active —, et c'est par lui seul que le
  -- code du lot 3 doit désigner le programme rattaché.

  IF NEW.rattachement = 'element' AND NEW.element_action_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM protocol_drafts d,
      LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(d.payload -> 'actions') = 'array'
             THEN d.payload -> 'actions' ELSE '[]'::jsonb END
      ) AS action
    WHERE d.id = NEW.protocol_draft_id
      AND action ->> 'actionId' = NEW.element_action_id
  ) THEN
    RAISE EXCEPTION '% : l''élément désigné ne figure pas dans le programme visé.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trust_aer_rattachement_garde
  BEFORE INSERT OR UPDATE ON public.trust_adverse_effect_reports
  FOR EACH ROW EXECUTE FUNCTION public.trust_aer_rattachement_garde();

-- ── LE VERDICT DU PRATICIEN ─────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "trust_adverse_effect_verdicts" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "element_action_id" TEXT,
    "amenagement" TEXT,
    "rendu_par" TEXT NOT NULL,
    "rendu_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedes_verdict_id" TEXT,

    CONSTRAINT "trust_adverse_effect_verdicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — index de LECTURE : le fil entier d'un signalement.
CREATE INDEX "trust_aev_report_idx" ON "trust_adverse_effect_verdicts"("report_id", "rendu_le");

-- CreateIndex — AU PLUS UN SUCCESSEUR PAR LIGNE (patron
-- `c1_selection_priorite_supersedes_unique`). Avec la racine unique
-- ci-dessous, le fil d'un signalement est STRICTEMENT LINÉAIRE : deux
-- corrections concurrentes seraient deux praticiens croyant chacun avoir
-- tranché, et la base refuse plutôt que d'élire.
CREATE UNIQUE INDEX "trust_aev_supersedes_unique" ON "trust_adverse_effect_verdicts"("supersedes_verdict_id");

-- UNE SEULE RACINE PAR SIGNALEMENT. Unicité PARTIELLE, portée par le SQL
-- seul : NE PAS la redéclarer en `@@unique([reportId])` au schéma, ce qui
-- recréerait un index TOTAL et interdirait toute correction.
CREATE UNIQUE INDEX "trust_aev_racine_unique"
  ON "trust_adverse_effect_verdicts"("report_id")
  WHERE "supersedes_verdict_id" IS NULL;

-- AddForeignKey — RESTRICT : la suppression nommée reste celle de la
-- transaction d'effacement IDP2 (`lib/patient/effacement.ts`), qui efface les
-- verdicts AVANT les signalements.
ALTER TABLE "trust_adverse_effect_verdicts" ADD CONSTRAINT "trust_adverse_effect_verdicts_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_adverse_effect_verdicts" ADD CONSTRAINT "trust_adverse_effect_verdicts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "trust_adverse_effect_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
-- « Jamais à l'identique ni augmenté » ([[D-281]] §5, `DC-42`) : la liste
-- fermée des aménagements ne contient ni « reconduire » ni « augmenter ».
ALTER TABLE "trust_adverse_effect_verdicts"
  ADD CONSTRAINT "trust_aev_verdict_check"
    CHECK ("verdict" IN ('implique', 'non_implique')),
  ADD CONSTRAINT "trust_aev_amenagement_check"
    CHECK ("amenagement" IN ('retirer', 'differer', 'reduire')),
  ADD CONSTRAINT "trust_aev_element_action_id_check"
    CHECK ("element_action_id" ~ '\S' AND char_length("element_action_id") <= 200),
  -- En CASE, comme `trust_aer_rattachement_coherence_check` : chaque
  -- contrainte porte UN motif — la liste fermée des verdicts reste à
  -- `trust_aev_verdict_check`.
  ADD CONSTRAINT "trust_aev_coherence_check"
    CHECK (
      CASE
        WHEN "verdict" = 'implique' THEN "element_action_id" IS NOT NULL AND "amenagement" IS NOT NULL
        ELSE "element_action_id" IS NULL AND "amenagement" IS NULL
      END
    ),
  ADD CONSTRAINT "trust_aev_rendu_par_check"
    CHECK ("rendu_par" ~ '\S' AND char_length("rendu_par") <= 320);
-- Pas de CHECK « ne se supplante pas lui-même » : le trigger d'insertion exige
-- que le verdict supplanté EXISTE déjà, ce qu'une auto-référence ne peut pas
-- être, et l'UPDATE est refusé. Le CHECK serait inatteignable.

-- ── AU MOMENT DE L'INSERTION : COHÉRENCE AVEC LE SIGNALEMENT ────────────────
CREATE OR REPLACE FUNCTION public.trust_aev_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  signalement record;
BEGIN
  SELECT r.id_patient, r.rattachement, r.element_action_id, r.protocol_draft_id
    INTO signalement
    FROM trust_adverse_effect_reports r
   WHERE r.id = NEW.report_id;

  IF NOT FOUND OR signalement.id_patient <> NEW.id_patient THEN
    RAISE EXCEPTION '% : le signalement n''est pas celui du patient.', TG_TABLE_NAME;
  END IF;

  IF signalement.rattachement IS NULL THEN
    RAISE EXCEPTION '% : seul un signalement rattaché reçoit un verdict (D-281 §5).', TG_TABLE_NAME;
  END IF;

  IF NEW.verdict = 'implique' AND NEW.element_action_id IS NOT NULL THEN
    IF signalement.rattachement = 'element' THEN
      IF NEW.element_action_id IS DISTINCT FROM signalement.element_action_id THEN
        RAISE EXCEPTION '% : l''élément impliqué est celui que le patient a désigné.', TG_TABLE_NAME;
      END IF;
    ELSIF signalement.protocol_draft_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM protocol_drafts d,
        LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(d.payload -> 'actions') = 'array'
               THEN d.payload -> 'actions' ELSE '[]'::jsonb END
        ) AS action
      WHERE d.id = signalement.protocol_draft_id
        AND action ->> 'actionId' = NEW.element_action_id
    ) THEN
      RAISE EXCEPTION '% : l''élément désigné ne figure pas dans le programme visé.', TG_TABLE_NAME;
    END IF;
  END IF;

  IF NEW.supersedes_verdict_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM trust_adverse_effect_verdicts v
    WHERE v.id = NEW.supersedes_verdict_id AND v.report_id = NEW.report_id
  ) THEN
    RAISE EXCEPTION '% : un verdict ne corrige qu''un verdict du même signalement.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trust_aev_avant_insertion
  BEFORE INSERT ON public.trust_adverse_effect_verdicts
  FOR EACH ROW EXECUTE FUNCTION public.trust_aev_avant_insertion();

-- ── FIGÉ : NI UPDATE NI TRUNCATE ────────────────────────────────────────────
-- Corriger = insérer un verdict qui supplante. Seul l'effacement du dossier
-- supprime (DELETE).
CREATE OR REPLACE FUNCTION public.trust_aev_fige()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un verdict est figé (% refusé) ; il se corrige par un nouveau verdict.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER trust_aev_no_update
  BEFORE UPDATE ON public.trust_adverse_effect_verdicts
  FOR EACH ROW EXECUTE FUNCTION public.trust_aev_fige();

CREATE TRIGGER trust_aev_no_truncate
  BEFORE TRUNCATE ON public.trust_adverse_effect_verdicts
  FOR EACH STATEMENT EXECUTE FUNCTION public.trust_aev_fige();

-- Sécurité : deny-all RLS par défaut (posture D-005). « Pour ce patient, le
-- praticien juge cet élément impliqué dans un effet indésirable » est une
-- donnée de santé nominative. Accès applicatif en connexion directe Prisma.
ALTER TABLE "public"."trust_adverse_effect_verdicts" ENABLE ROW LEVEL SECURITY;
