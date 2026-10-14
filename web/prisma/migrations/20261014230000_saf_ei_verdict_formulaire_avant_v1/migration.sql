-- SAF-EI-01 AMENDÉE — L'AVIS DU PRATICIEN OUVERT AU FORMULAIRE D'AVANT
-- ([[D-281]] §5, arbitrage du responsable du 2026-10-14).
--
-- CE QUE LA MIGRATION RÉPARE. Le formulaire d'avant — dossier mineur ou sans
-- date de naissance, ou adulte resté sur l'ancien formulaire — enregistre un
-- « oui, lié au programme » par le seul `protocol_draft_id` (le programme
-- diffusé, résolu par `resolveProtocoleDiffuse`), sans `rattachement`. Le
-- responsable a tranché : ce signalement attend l'avis du praticien comme les
-- autres, et bloque la diffusion jusque-là. Or le trigger d'insertion des
-- verdicts (migration `20261012230000_saf_ei_rattachement_verdict_v1`) refuse
-- tout verdict sur un signalement sans rattachement : bloquer sans avis
-- possible enfermerait le dossier. Cette migration ouvre l'avis à ces
-- signalements.
--
-- MIGRATION SEULE : aucune colonne, aucune table, aucun index — deux
-- fonctions de trigger remplacées, `schema.prisma` inchangé. Aucune donnée
-- n'est touchée. Aucun code ne s'en sert avant la `release-db` et son
-- constat : la route du verdict refuse encore ces signalements, et la garde
-- de diffusion ne les compte pas (seconde PR du lot).
--
-- CE QUE LA BASE TIENT DE PLUS :
--   1. un verdict se pose sur un signalement RATTACHÉ, ou sur un signalement
--      LIÉ À UN PROGRAMME (`protocol_draft_id` renseigné) sans rattachement —
--      le formulaire d'avant. Un signalement libre (ni l'un ni l'autre) n'en
--      reçoit toujours aucun ;
--   2. pour le formulaire d'avant, le programme visé est celui du patient —
--      à l'insertion du signalement (le trigger ne le vérifiait que pour un
--      rattaché) comme à celle du verdict, pour les lignes antérieures ;
--      « impliqué » désigne un élément de ce programme, comme pour « Je ne
--      sais pas » — le praticien désigne l'élément en cause, ou aucun ;
--   3. le programme visé ne se POSE ni ne se RE-POINTE après coup, quel que
--      soit le signalement, et ne se met à NULL que s'il a disparu (l'`ON
--      DELETE SET NULL` de l'effacement IDP2). Posé après coup, il ferait dire
--      « oui, lié » à un patient qui ne l'a pas dit (`DC-01`, `DC-24`) ;
--      re-pointé, il ferait porter le verdict sur un programme que le patient
--      n'a pas visé ; mis à NULL, il lèverait l'attente sans avis ;
--   4. le patient d'un signalement lié à un programme est figé, comme celui
--      d'un rattaché (revue Copilot #1408) : changé, il laisserait ses
--      verdicts porter un autre patient que lui.
--
-- AUCUN SEUIL, AUCUNE BORNE CLINIQUE. Aucune durée prise→symptômes (`D-281`
-- §2, `DC-19`).

-- ── LE SIGNALEMENT : PROGRAMME ET PATIENT FIGÉS ─────────────────────────────
-- Corps repris de la migration du lot 2 ; seules les deux dernières gardes de
-- l'UPDATE s'élargissent (3 et 4 ci-dessus), et la branche INSERT d'un
-- signalement non rattaché vérifie le programme (2).
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
    -- Le programme visé ne se pose ni ne se re-pointe, pour TOUT signalement
    -- depuis que le formulaire d'avant reçoit un verdict (D-281 §5). Seule la
    -- mise à NULL reste permise, et seulement quand le programme a disparu —
    -- c'est l'`ON DELETE SET NULL` que déclenche l'effacement IDP2, joué
    -- après la suppression de la ligne référencée. Une mise à NULL directe
    -- ferait d'un signalement en attente d'avis un signalement libre : la
    -- diffusion se débloquerait sans avis.
    IF NEW.protocol_draft_id IS DISTINCT FROM OLD.protocol_draft_id AND (
         NEW.protocol_draft_id IS NOT NULL
         OR EXISTS (SELECT 1 FROM protocol_drafts d WHERE d.id = OLD.protocol_draft_id)
       ) THEN
      RAISE EXCEPTION '% : le programme visé par un signalement est figé (D-281).', TG_TABLE_NAME;
    END IF;
    -- Le patient aussi (revue Copilot #1408), dès que le signalement est
    -- rattaché OU lié à un programme : changé, il laisserait le signalement
    -- pointer le programme de l'ancien dossier, et ses verdicts porter un
    -- autre patient que lui — chaque clé resterait valide seule.
    IF (OLD.rattachement IS NOT NULL OR OLD.protocol_draft_id IS NOT NULL)
       AND NEW.id_patient IS DISTINCT FROM OLD.id_patient THEN
      RAISE EXCEPTION '% : le patient d''un signalement lié à un programme est figé (D-281).', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.rattachement IS NULL THEN
    -- Le formulaire d'avant : le programme qu'il vise est celui du patient.
    -- Sinon il attendrait un avis que le trigger du verdict refuse — un
    -- dossier enfermé, ce que D-281 §5 écarte. L'écrivain
    -- (`resolveProtocoleDiffuse(patient.idPatient)`) ne peut pas le produire :
    -- la garde ne refuse que l'impossible.
    IF NEW.protocol_draft_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM protocol_drafts d
      WHERE d.id = NEW.protocol_draft_id AND d.id_patient = NEW.id_patient
    ) THEN
      RAISE EXCEPTION '% : le programme visé n''est pas celui du patient.', TG_TABLE_NAME;
    END IF;
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

-- ── LE VERDICT : OUVERT AU FORMULAIRE D'AVANT ───────────────────────────────
-- Corps repris de la migration du lot 2 ; seule la garde « signalement
-- rattaché » change (1 et 2 ci-dessus).
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
    -- Le formulaire d'avant : « oui, lié au programme », sans élément.
    IF signalement.protocol_draft_id IS NULL THEN
      RAISE EXCEPTION '% : seul un signalement rattaché ou lié à un programme reçoit un verdict (D-281 §5).', TG_TABLE_NAME;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM protocol_drafts d
      WHERE d.id = signalement.protocol_draft_id AND d.id_patient = NEW.id_patient
    ) THEN
      RAISE EXCEPTION '% : le programme visé n''est pas celui du patient.', TG_TABLE_NAME;
    END IF;
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
