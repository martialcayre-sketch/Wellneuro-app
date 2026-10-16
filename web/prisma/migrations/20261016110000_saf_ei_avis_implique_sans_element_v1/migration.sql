-- SAF-EI-01 AMENDÉE — L'AVIS « IMPLIQUÉ, ÉLÉMENT NON IDENTIFIABLE »
-- ([[D-281]] §5 ; arbitrages du responsable du 2026-10-16, plan §8, file A,
-- fiche t25 ; migration accordée le même jour).
--
-- LE CAS. Quand le programme visé par un signalement sans élément désigné
-- (« Je ne sais pas », « un autre produit », formulaire d'avant, repli d'une
-- désignation illisible) ne passe pas le contrôle d'intégrité, le praticien
-- ne peut désigner aucun élément : il ne pouvait rendre que « non impliqué »,
-- c'est-à-dire déclarer une non-implication qu'il ne pense peut-être pas pour
-- lever la garde de diffusion. Il peut désormais rendre « impliqué » SANS
-- élément, avec un aménagement OBLIGATOIRE (même liste fermée).
--
-- CE QUE LA BASE TIENT :
--   - `trust_aev_coherence_check` : « impliqué » porte un aménagement,
--     l'élément devient facultatif ; « non impliqué » ne porte toujours ni
--     élément ni aménagement ;
--   - `trust_aev_avant_insertion` : « impliqué » sans élément est refusé
--     quand le patient a désigné un élément (l'élément impliqué est le sien),
--     et quand le signalement ne vise aucun programme.
-- CE QU'ELLE NE TIENT PAS, ET POURQUOI : « seulement si le programme visé est
-- illisible ». L'intégrité se juge par une empreinte que seul le code
-- recalcule ; la route du verdict le vérifiera (PR suivante, code
-- consommateur). D'ici là, aucun écrivain ne produit cette forme : la route
-- actuelle exige un élément pour « impliqué ».
--
-- EFFET : aucun élément n'est mis en pause au portail par un tel avis (il n'y
-- a rien à désigner, et un programme illisible ne s'y affiche pas) ; la
-- garde de diffusion le compte comme un avis rendu. Tout reste non armé
-- jusqu'à la signature (D-281 §6).
--
-- MIGRATION SEULE : une contrainte remplacée par une plus large (les lignes
-- existantes la satisfont toutes) et une fonction de trigger remplacée ;
-- aucune colonne, table ni index ; `schema.prisma` inchangé (Prisma ne
-- modélise pas les CHECK). Aucune donnée n'est touchée.
--
-- AUCUN SEUIL, AUCUNE BORNE CLINIQUE.

-- ── LA CONTRAINTE : « IMPLIQUÉ » PORTE UN AMÉNAGEMENT, L'ÉLÉMENT EST FACULTATIF ──
ALTER TABLE "trust_adverse_effect_verdicts"
  DROP CONSTRAINT "trust_aev_coherence_check",
  -- En CASE, comme avant : un CHECK qui s'évalue à NULL passe.
  ADD CONSTRAINT "trust_aev_coherence_check"
    CHECK (
      CASE
        WHEN "verdict" = 'implique' THEN "amenagement" IS NOT NULL
        ELSE "element_action_id" IS NULL AND "amenagement" IS NULL
      END
    );

-- ── LE VERDICT : « IMPLIQUÉ » SANS ÉLÉMENT, OÙ IL PEUT L'ÊTRE ────────────────
-- Corps repris de `20261015130000_saf_ei_avis_verrou_signalement_v1` (verrous
-- compris, inchangés) ; seul s'ajoute le bloc « impliqué sans élément ».
CREATE OR REPLACE FUNCTION public.trust_aev_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  signalement record;
BEGIN
  -- Le patient d'abord, dans l'ordre de l'effacement IDP2 : l'avis attend un
  -- effacement en vol sans tenir le verrou du signalement.
  PERFORM 1 FROM patients p WHERE p.id_patient = NEW.id_patient FOR KEY SHARE;

  SELECT r.id_patient, r.rattachement, r.element_action_id, r.protocol_draft_id
    INTO signalement
    FROM trust_adverse_effect_reports r
   WHERE r.id = NEW.report_id
     -- Verrou partagé : sérialise l'avis avec toute modification du
     -- signalement (passe Codex de #1474).
     FOR SHARE;

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

  -- « Impliqué, élément non identifiable » (arbitrage du 2026-10-16) : jamais
  -- quand le patient a désigné l'élément — c'est lui qui est impliqué —, et
  -- seulement sur un signalement qui vise un programme.
  IF NEW.verdict = 'implique' AND NEW.element_action_id IS NULL THEN
    IF signalement.rattachement = 'element' THEN
      RAISE EXCEPTION '% : l''élément impliqué est celui que le patient a désigné.', TG_TABLE_NAME;
    END IF;
    IF signalement.protocol_draft_id IS NULL THEN
      RAISE EXCEPTION '% : un avis « impliqué » sans élément vise un programme.', TG_TABLE_NAME;
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
