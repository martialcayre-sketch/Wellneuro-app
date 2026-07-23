-- WellNeuro — suivi de 20260723100000 (journal des décisions de revue des
-- claims), deux constats de la revue adversariale de la PR lib (Atelier v2) :
--
-- 1. « Un tirage a UNE issue » ne tenait que par une vérification applicative
--    hors transaction : deux POST concurrents (valider ∥ basculer) passaient
--    tous deux le comptage à zéro et journalisaient DEUX issues — dont le
--    pire cas, une source signée par lot avec un défaut journalisé sur le
--    même tirage. L'unicité appartient à la base : index unique partiel sur
--    tirage_id pour les actes d'issue.
--
-- 2. La voie rapide est une ALLOWLIST — « claims déclarés/observés non
--    prescriptifs » (procédure actée du 2026-07-23) : le trigger excluait
--    seulement 'interprété', laissant entrer 'vécu' par défaut de prédicat.
--    Aligné sur l'allowlist, comme la lib.

CREATE UNIQUE INDEX rag_claim_decisions_issue_unique
  ON public.rag_corpus_claim_decisions (tirage_id)
  WHERE type_acte IN ('decision_lot', 'bascule_individuelle');

CREATE OR REPLACE FUNCTION public.rag_claim_decisions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  tirage_ok boolean;
  claims_invalides bigint;
BEGIN
  NEW.cree_le := now();

  IF NEW.tirage_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.rag_corpus_claim_decisions d
      WHERE d.id = NEW.tirage_id
        AND d.type_acte = 'tirage_echantillon'
        AND d.source_id = NEW.source_id
    ) INTO tirage_ok;
    IF NOT tirage_ok THEN
      RAISE EXCEPTION 'tirage_id % n''est pas un tirage_echantillon de la source %.',
        NEW.tirage_id, NEW.source_id;
    END IF;
  END IF;

  IF NEW.type_acte = 'decision_lot' THEN
    SELECT count(*) INTO claims_invalides
    FROM jsonb_array_elements(NEW.claims) AS e
    LEFT JOIN public.rag_corpus_claims c ON c.id = e.value ->> 'id'
    WHERE c.id IS NULL
       OR c.prescriptif
       OR c.typologie_lecture NOT IN ('déclaré', 'observé')
       OR c.source_id IS DISTINCT FROM NEW.source_id;
    IF claims_invalides > 0 THEN
      RAISE EXCEPTION
        'decision_lot refusée : % claim(s) inexistants, hors source, prescriptifs ou hors voie rapide (déclaré/observé seuls) — la voie lente ne se signe jamais par lot.',
        claims_invalides;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
