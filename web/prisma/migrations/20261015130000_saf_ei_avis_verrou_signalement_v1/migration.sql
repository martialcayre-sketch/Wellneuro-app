-- SAF-EI-01 AMENDÉE — L'AVIS VERROUILLE LE SIGNALEMENT QU'IL LIT
-- ([[D-281]] §5 ; passe Codex de #1474, P1 confirmé par reproduction à deux
-- sessions ; migration corrective demandée par le responsable le 2026-10-15).
--
-- LA COURSE QU'ELLE FERME. Le trigger d'insertion d'un avis
-- (`trust_aev_avant_insertion`) lisait le signalement SANS VERROU, et la clé
-- étrangère `report_id` ne prend qu'un `FOR KEY SHARE`, qui ne gêne pas la
-- modification d'une colonne ordinaire. En READ COMMITTED, une transaction
-- qui supprime le programme (le signalement du formulaire d'avant est
-- délié) puis change le patient, et une autre qui pose un avis pour l'ancien
-- patient, passaient TOUTES DEUX : chacune lisait l'état validé d'avant
-- l'autre. Fin de course reproduite : signalement au patient B, avis au
-- patient A — la garde de `20261015090000_saf_ei_patient_fige_verdict_v1`
-- ne voit pas un avis encore en vol.
--
-- CE QUE LA BASE TIENT DE PLUS, EN READ COMMITTED (l'isolation de toute
-- l'application) : le trigger lit le signalement `FOR SHARE`. Ce verrou est
-- incompatible avec toute modification de la ligne (y compris l'`ON DELETE
-- SET NULL` d'un programme supprimé et l'`ON UPDATE CASCADE` d'un patient
-- renommé), compatible avec lui-même :
--   - modification d'abord : l'avis ATTEND sa validation, relit le
--     signalement à jour, et est refusé s'il n'est plus celui du patient ou
--     plus lié ;
--   - avis d'abord : la modification ATTEND sa validation, puis la garde du
--     patient (fonction volatile : instantané neuf) voit l'avis et refuse ;
--   - deux avis sur un même signalement ne s'attendent pas l'un l'autre par
--     ce verrou.
-- Sous REPEATABLE READ, la transaction qui modifie lit les avis avec son
-- instantané de départ : la course n'est fermée qu'en READ COMMITTED.
--
-- LE PATIENT D'ABORD, POUR NE PAS INTERBLOQUER L'EFFACEMENT. L'effacement
-- IDP2 (`effacerDossier`) verrouille le patient (`FOR UPDATE`) puis modifie
-- et supprime ses signalements. Un avis qui prendrait le verrou du
-- signalement AVANT d'attendre le patient (contrôle de sa clé étrangère)
-- l'interbloquerait. Le trigger prend donc d'abord le patient
-- (`FOR KEY SHARE`, le verrou même de la clé étrangère), puis le signalement :
-- même ordre que l'effacement, l'avis attend sans rien tenir, puis est
-- refusé sur un dossier effacé.
--
-- MIGRATION SEULE : aucune colonne, aucune table, aucun index — une fonction
-- de trigger remplacée, `schema.prisma` inchangé. Aucune donnée n'est
-- touchée. Aucun code ne change : la route du verdict écrit comme avant ; un
-- avis attend au plus la fin d'une transaction qui modifie son signalement
-- ou efface son dossier.
--
-- AUCUN SEUIL, AUCUNE BORNE CLINIQUE.

-- ── LE VERDICT : LE SIGNALEMENT LU SOUS VERROU ──────────────────────────────
-- Corps repris de la migration du formulaire d'avant ; s'ajoutent le verrou
-- du patient, puis `FOR SHARE` sur la lecture du signalement.
CREATE OR REPLACE FUNCTION public.trust_aev_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  signalement record;
BEGIN
  -- Le patient d'abord, dans l'ordre de l'effacement IDP2 (voir l'en-tête) :
  -- l'avis attend un effacement en vol sans tenir le verrou du signalement.
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

  IF NEW.supersedes_verdict_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM trust_adverse_effect_verdicts v
    WHERE v.id = NEW.supersedes_verdict_id AND v.report_id = NEW.report_id
  ) THEN
    RAISE EXCEPTION '% : un verdict ne corrige qu''un verdict du même signalement.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;
