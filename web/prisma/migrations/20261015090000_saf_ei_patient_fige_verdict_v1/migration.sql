-- SAF-EI-01 AMENDÉE — LE PATIENT D'UN SIGNALEMENT FIGÉ DÈS QU'UN AVIS EXISTE
-- ([[D-281]] §5 ; revue CodeRabbit de #1464, arbitrage du responsable du
-- 2026-10-15 : « appliquer, petite migration séparée avant la signature »).
--
-- LE TROU QU'ELLE FERME. La migration
-- `20261014230000_saf_ei_verdict_formulaire_avant_v1` fige le patient d'un
-- signalement rattaché OU lié à un programme. Mais supprimer le programme
-- remet `protocol_draft_id` à NULL (`ON DELETE SET NULL`) : un signalement du
-- formulaire d'avant (sans rattachement) n'est alors plus « lié », et son
-- patient redevient modifiable — alors même qu'il porte des avis. Changé, il
-- laisserait ces avis (`trust_adverse_effect_verdicts`) porter un autre
-- patient que le signalement qu'ils jugent.
--
-- DÉFENSE EN PROFONDEUR, PAS UN TROU OUVERT. Aujourd'hui, seul l'effacement
-- IDP2 (`effacerDossier`, `lib/patient/effacement.ts`) supprime un programme,
-- et il supprime dans la même transaction verdicts et signalements : l'état
-- délié n'existe qu'en son sein. La garde fixe l'invariant en base contre une
-- suppression de programme hors de l'effacement complet (SQL manuel, code
-- futur).
--
-- CE QUE LA BASE TIENT DE PLUS : le patient d'un signalement qui porte au
-- moins un avis est figé, quel que soit son lien au programme. Les gardes
-- existantes restent intactes, message compris ; la nouvelle ne mord que là
-- où elles ne mordent plus.
--
-- MIGRATION SEULE : aucune colonne, aucune table, aucun index — une fonction
-- de trigger remplacée, `schema.prisma` inchangé. Aucune donnée n'est
-- touchée. Aucun code ne s'en sert : aucun écrivain ne change le patient d'un
-- signalement. Un renommage de `patients.id_patient` (`ON UPDATE CASCADE`)
-- était déjà refusé pour tout patient qui porte un avis : la cascade sur
-- `trust_adverse_effect_verdicts.id_patient` heurte le trigger qui fige les
-- verdicts — aucune nouvelle classe de refus.
--
-- AUCUN SEUIL, AUCUNE BORNE CLINIQUE.

-- ── LE SIGNALEMENT : PATIENT FIGÉ DÈS QU'UN AVIS EXISTE ─────────────────────
-- Corps repris de la migration du formulaire d'avant ; seule s'ajoute la
-- garde du patient d'un signalement qui porte un avis.
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
    -- Le patient d'un signalement qui porte un avis, même délié de son
    -- programme par l'effacement IDP2 (revue CodeRabbit de #1464) : changé,
    -- il laisserait ses avis porter un autre patient que lui.
    IF NEW.id_patient IS DISTINCT FROM OLD.id_patient AND EXISTS (
      SELECT 1 FROM trust_adverse_effect_verdicts v WHERE v.report_id = OLD.id
    ) THEN
      RAISE EXCEPTION '% : le patient d''un signalement qui porte un avis est figé (D-281).', TG_TABLE_NAME;
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
