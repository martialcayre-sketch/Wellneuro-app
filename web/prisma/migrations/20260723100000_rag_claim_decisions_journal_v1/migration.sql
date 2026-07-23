-- WellNeuro — journal des décisions de revue des claims (Atelier v2, D-004).
-- Trace append-only de chaque acte praticien sur la couche claims : décisions
-- individuelles (motif obligatoire sur un REJET — dette v1), tirages d'échantillon,
-- signatures de lot et bascules en revue individuelle de la procédure
-- « validation à deux vitesses » actée le 2026-07-23
-- (docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md).
--
-- Le journal est une PREUVE d'audit, pas un état : l'état de vérité des
-- claims reste rag_corpus_claims (statut / validateur / valide_at). Aucune
-- FK vers les claims : le journal survit à tout le cycle de vie de ce qu'il
-- trace ; les identifiants sont consignés textuellement dans `claims`, et
-- leur cohérence est vérifiée AU MOMENT de l'acte (trigger d'insertion).
-- Corpus exclusivement documentaire : aucune donnée patient.
--
-- Dettes portées par la PR de la lib (revue adversariale du 2026-07-23) :
--  - COMPLÉTUDE : rien ici ne force une ligne de journal à chaque mutation de
--    rag_corpus_claims.statut. Tant que la lib de revue n'est pas livrée,
--    deciderClaim (Atelier v1) mute SANS journaliser — fenêtre assumée. La
--    lib devra faire UPDATE claims + INSERT journal dans UNE MÊME transaction
--    (test exigé).
--  - VOIE LENTE : « aucun claim prescriptif ou interprété signé par lot » est
--    vérifié ici à l'insertion d'une decision_lot (défense en profondeur),
--    mais la garde de première ligne reste valider_lot dans la lib (test
--    exigé).
--  - FORME DES ÉLÉMENTS de `claims` ({id, claimId, versionClaim,
--    statutAvant, statutApres}) : non contrainte pour les actes individuels —
--    test de contrat exigé côté lib (l'audit GIN @> serait aveugle à une
--    dérive de casing).

CREATE TABLE public.rag_corpus_claim_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Nature de l'acte. La modalité de la procédure s'y lit directement :
  -- decision_individuelle = voie lente ; tirage_echantillon, decision_lot et
  -- bascule_individuelle = voie rapide.
  type_acte text NOT NULL,
  -- Statut cible appliqué aux claims. NULL pour les actes qui ne décident
  -- rien (tirage, bascule) ; une signature de lot ne peut être que VALIDE —
  -- un défaut bascule la source en individuel, jamais de rejet en masse.
  decision text,
  -- Motif praticien. Obligatoire pour un rejet et pour une bascule.
  motif text,
  -- E-mail praticien en session — jamais d'acte anonyme.
  validateur text NOT NULL,
  -- Source concernée (obligatoire pour les actes de voie rapide).
  source_id text,
  -- Acte de voie rapide : référence du tirage d'échantillon dont il découle.
  -- Auto-référence interne au journal — compatible avec l'absence de FK vers
  -- les claims : le journal ne référence que lui-même.
  tirage_id bigint REFERENCES public.rag_corpus_claim_decisions (id),
  -- Claims couverts par l'acte :
  -- [{ id, claimId, versionClaim, statutAvant, statutApres }, …].
  claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Voie rapide — tirage serveur : { seed, taux, taille, tires: [ids…] },
  -- puis verdicts de confrontation au verbatim consignés à la décision.
  echantillon jsonb,
  -- Voie rapide — preuve de restitution :
  -- { questions: [{ question, reponse, claimsCites, verdict }, …] }.
  questionnaire jsonb,
  -- Posé par le trigger d'insertion (jamais par le client) : l'ordre d'audit
  -- authentique est porté par `id` ET par cette date non antidatable.
  cree_le timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rag_claim_decisions_type_acte CHECK (
    type_acte IN ('decision_individuelle', 'tirage_echantillon', 'decision_lot', 'bascule_individuelle')
  ),
  CONSTRAINT rag_claim_decisions_decision CHECK (
    decision IS NULL OR decision IN ('VALIDE', 'REJETE', 'EN_ATTENTE_VALIDATION')
  ),
  -- Décident : decision_individuelle et decision_lot. Les autres actes ne
  -- portent jamais de statut cible (équivalence, les deux sens fermés).
  CONSTRAINT rag_claim_decisions_decide CHECK (
    (type_acte IN ('decision_individuelle', 'decision_lot')) = (decision IS NOT NULL)
  ),
  -- Une signature de lot ne peut être que VALIDE.
  CONSTRAINT rag_claim_decisions_lot_valide CHECK (
    type_acte <> 'decision_lot' OR decision = 'VALIDE'
  ),
  CONSTRAINT rag_claim_decisions_source_format CHECK (
    source_id IS NULL OR source_id ~ '^WN-SRC-[0-9]{4}$'
  ),
  -- Jamais d'acte anonyme — et pas davantage sous chaîne vide.
  CONSTRAINT rag_claim_decisions_validateur_non_vide CHECK (validateur <> ''),
  -- Un rejet et une bascule portent leur motif.
  CONSTRAINT rag_claim_decisions_motif_requis CHECK (
    (decision IS DISTINCT FROM 'REJETE' AND type_acte <> 'bascule_individuelle')
    OR (motif IS NOT NULL AND motif <> '')
  ),
  -- Pièces exigées par type d'acte — présences ET absences.
  CONSTRAINT rag_claim_decisions_individuelle_sans_pieces CHECK (
    type_acte <> 'decision_individuelle'
    OR (echantillon IS NULL AND questionnaire IS NULL AND tirage_id IS NULL)
  ),
  CONSTRAINT rag_claim_decisions_tirage_complet CHECK (
    type_acte <> 'tirage_echantillon'
    OR (source_id IS NOT NULL AND echantillon IS NOT NULL
        AND questionnaire IS NULL AND tirage_id IS NULL)
  ),
  CONSTRAINT rag_claim_decisions_lot_complet CHECK (
    type_acte <> 'decision_lot'
    OR (source_id IS NOT NULL AND echantillon IS NOT NULL
        AND questionnaire IS NOT NULL AND tirage_id IS NOT NULL)
  ),
  CONSTRAINT rag_claim_decisions_bascule_complete CHECK (
    type_acte <> 'bascule_individuelle'
    OR (source_id IS NOT NULL AND echantillon IS NOT NULL AND tirage_id IS NOT NULL)
  ),
  -- Une décision couvre toujours au moins un claim ; un tirage et une bascule
  -- portent leurs identifiants dans `echantillon`.
  CONSTRAINT rag_claim_decisions_claims_liste CHECK (jsonb_typeof(claims) = 'array'),
  CONSTRAINT rag_claim_decisions_claims_non_vide CHECK (
    type_acte NOT IN ('decision_individuelle', 'decision_lot')
    OR jsonb_array_length(claims) > 0
  ),
  -- Les pièces jointes sont des objets, jamais des scalaires.
  CONSTRAINT rag_claim_decisions_echantillon_objet CHECK (
    echantillon IS NULL OR jsonb_typeof(echantillon) = 'object'
  ),
  CONSTRAINT rag_claim_decisions_questionnaire_objet CHECK (
    questionnaire IS NULL OR jsonb_typeof(questionnaire) = 'object'
  )
);

COMMENT ON TABLE public.rag_corpus_claim_decisions IS
  'Journal append-only des actes praticien de revue des claims (Atelier corpus). Preuve d''audit — l''état de vérité reste rag_corpus_claims. Aucune donnée patient.';

-- Append-only face à l'ACCIDENT : UPDATE, DELETE et TRUNCATE sont refusés par
-- trigger. Limite assumée : le rôle de connexion Prisma, propriétaire de la
-- table, peut désactiver le trigger (ALTER TABLE … DISABLE TRIGGER) — la
-- preuve forte contre un adversaire porteur de ce rôle reste les sauvegardes
-- et le PITR Supabase, pas ce garde-fou.
CREATE OR REPLACE FUNCTION public.rag_claim_decisions_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'rag_corpus_claim_decisions est un journal append-only (% refusé).', TG_OP;
END;
$$;

CREATE TRIGGER rag_claim_decisions_no_dml
  BEFORE UPDATE OR DELETE ON public.rag_corpus_claim_decisions
  FOR EACH ROW EXECUTE FUNCTION public.rag_claim_decisions_append_only();

CREATE TRIGGER rag_claim_decisions_no_truncate
  BEFORE TRUNCATE ON public.rag_corpus_claim_decisions
  FOR EACH STATEMENT EXECUTE FUNCTION public.rag_claim_decisions_append_only();

-- Cohérence AU MOMENT de l'acte (les CHECK ne peuvent pas lire d'autres
-- lignes ni d'autres tables) :
--  1. cree_le est posé par la base — un journal antidatable n'est pas une
--     preuve ;
--  2. un acte de voie rapide référence un vrai tirage_echantillon de la MÊME
--     source ;
--  3. une decision_lot ne couvre que des claims existants, ni prescriptifs ni
--     interprétés (la voie lente ne se signe jamais par lot) — un élément
--     sans clé `id` conforme est refusé par la même passe.
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
       OR c.typologie_lecture = 'interprété'
       OR c.source_id IS DISTINCT FROM NEW.source_id;
    IF claims_invalides > 0 THEN
      RAISE EXCEPTION
        'decision_lot refusée : % claim(s) inexistants, hors source, prescriptifs ou interprétés — la voie lente ne se signe jamais par lot.',
        claims_invalides;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rag_claim_decisions_avant_insertion
  BEFORE INSERT ON public.rag_corpus_claim_decisions
  FOR EACH ROW EXECUTE FUNCTION public.rag_claim_decisions_avant_insertion();

-- Hygiène d'exécution (leçon de 20260721230000) : ces fonctions ne servent
-- qu'aux triggers, personne n'a à les appeler.
REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_append_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_append_only() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_append_only() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.rag_claim_decisions_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- RLS activée sans policy (deny-all pour tout rôle non propriétaire),
-- cohérent avec rag_corpus_chunks / rag_corpus_claims.
ALTER TABLE public.rag_corpus_claim_decisions ENABLE ROW LEVEL SECURITY;

-- Accès d'audit : par source (file de revue), par claim (GIN @> sur les
-- identifiants consignés), par tirage (actes découlant d'un tirage donné).
-- L'ordre chronologique global est porté par le PK.
CREATE INDEX rag_claim_decisions_source_idx
  ON public.rag_corpus_claim_decisions (source_id, cree_le DESC);

CREATE INDEX rag_claim_decisions_claims_gin
  ON public.rag_corpus_claim_decisions USING gin (claims jsonb_path_ops);

CREATE INDEX rag_claim_decisions_tirage_idx
  ON public.rag_corpus_claim_decisions (tirage_id)
  WHERE tirage_id IS NOT NULL;
