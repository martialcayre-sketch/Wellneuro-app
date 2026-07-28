-- WellNeuro — reprise des claims signés par lot sans avoir été lus, et qui
-- portent une borne de décision.
--
-- Le garde de contenu (20260727140000) ferme la voie rapide EN AMONT ; il ne
-- revient pas sur une signature acquise. L'audit du 2026-07-27, étendu à tout
-- le corpus en préparant le lot du garde, a trouvé ce que la signature par lot
-- avait déjà laissé passer : sur 148 claims couverts par un `decision_lot`,
-- 95 ne figuraient dans aucun échantillon tiré — donc validés sans qu'aucun œil
-- ne les lise — et 28 d'entre eux portent une borne au sens du garde.
--
-- Ce ne sont pas des plages de laboratoire : ce sont des normes nutritionnelles
-- et des règles de cotation — apports EFSA et OMS, ANC lipides et fer, ratio
-- linoléique/alpha-linolénique, seuil « moins de 800 kcal », cotations
-- DietScore. L'enjeu clinique est moindre qu'une grille ferritine ; le
-- mécanisme est identique.
--
-- Décision praticien du 2026-07-27 : les repasser en attente, par migration
-- relue. Elle EFFACE une signature — c'est la transition d'annulation que la
-- lib autorise déjà (`VALIDE → EN_ATTENTE_VALIDATION`, revue.ts) —, elle ne
-- rejette ni ne supprime aucun claim. Chacun repart en revue individuelle.
--
-- ═══ Le critère est une FONCTION, pas un bloc anonyme ═══════════════════════
--
-- La cible n'est pas une liste d'identifiants triée à la main : c'est un
-- prédicat, et il est posé dans une fonction pour une raison précise — le
-- contrat `prisma/checks/rag_claim_reprise_bornes_v1.sql` l'éprouve sur des
-- fixtures que la production ne contient pas encore. Un bloc anonyme aurait été
-- invérifiable : la base du CI est vide, la migration y est un no-op, et le CI
-- n'aurait rien prouvé de ce qui suit.
--
-- Trois conditions, et chacune répare un défaut que la revue adversariale a
-- trouvé sur la première rédaction :
--
--   1. le claim porte une borne au sens du garde ;
--   2. sa signature COURANTE est celle d'un lot — `valide_at = cree_le` du lot,
--      égalité exacte car `deciderLot` fait l'UPDATE et l'INSERT du journal dans
--      la MÊME transaction, où `now()` est constant. Sans cette condition, un
--      claim repris puis REVALIDÉ INDIVIDUELLEMENT par le praticien — c'est-à-
--      dire faisant exactement ce que ce lot lui demande — rentrerait à nouveau
--      dans la cible à tout rejeu, et sa signature humaine serait effacée ;
--   3. il n'a été tiré dans AUCUN lot. La première rédaction testait le tirage
--      par couple (lot, claim) : un claim couvert par deux lots, tiré dans le
--      premier et pas dans le second, passait le test par la seconde ligne et
--      était repris alors qu'il avait été lu. L'anti-semi-jointure porte sur
--      l'ensemble des lots, et déduplique par construction.
--
-- Mesuré en production le 2026-07-28 : aucun claim n'est couvert par plus d'un
-- lot, aucune ligne `decision_lot` n'est sans `tires`, et les 28 visés ont tous
-- `valide_at` égal au `cree_le` de leur lot. Les trois corrections ne changent
-- donc RIEN à la cible d'aujourd'hui — elles la protègent d'une forme qui
-- n'existe pas encore.
CREATE OR REPLACE FUNCTION public.rag_claim_reprise_bornes_cible()
RETURNS TABLE (id text, claim_id text, version_claim text, source_id text)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH lots AS (
    SELECT d.cree_le, d.echantillon->'tires' AS tires, e.value->>'id' AS claim_pk
    FROM public.rag_corpus_claim_decisions d,
         LATERAL jsonb_array_elements(d.claims) e
    WHERE d.type_acte = 'decision_lot' AND d.decision = 'VALIDE'
  )
  SELECT c.id, c.claim_id, c.version_claim, c.source_id
  FROM public.rag_corpus_claims c
  WHERE c.statut = 'VALIDE'
    AND public.rag_claim_porte_seuil(c.texte_normalise)
    AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.claim_pk = c.id AND c.valide_at = l.cree_le
    )
    AND NOT EXISTS (
      SELECT 1 FROM lots l
      WHERE l.claim_pk = c.id
        -- `l.tires IS NULL` compte comme « peut-être tiré », donc épargne le
        -- claim. Sans cette branche, `NULL @> …` vaut NULL, l'EXISTS ne trouve
        -- rien, et un lot dont l'échantillon n'aurait pas de clé `tires` verrait
        -- TOUS ses claims repris comme jamais lus. Aucune ligne de ce genre en
        -- production au 2026-07-28 — mais c'est une mesure, pas une propriété du
        -- code, et une signature ne s'efface pas sur une donnée manquante.
        AND (l.tires IS NULL OR l.tires @> to_jsonb(c.id))
    );
$$;

COMMENT ON FUNCTION public.rag_claim_reprise_bornes_cible() IS
  'Claims encore signés par un lot, jamais tirés, et porteurs d''une borne de décision. Cible de la reprise du 2026-07-28 (migration 20260728090000) ; conservée pour que son contrat puisse l''éprouver et qu''un rejeu reste vérifiable.';

-- Doctrine du dépôt, et la leçon du 2026-07-27 : révoquer PUBLIC ne suffit pas,
-- Supabase accorde EXECUTE nominativement à anon/authenticated/service_role via
-- ALTER DEFAULT PRIVILEGES. On révoque donc nommément, en conditionnant à
-- l'existence du rôle pour rester inerte sur la base éphémère du CI.
REVOKE EXECUTE ON FUNCTION public.rag_claim_reprise_bornes_cible() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_reprise_bornes_cible() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_reprise_bornes_cible() FROM authenticated;
  END IF;
END $$;

-- ═══ La reprise ════════════════════════════════════════════════════════════
--
-- Aucune assertion d'égalité, une borne haute. Le garde est en production
-- DEPUIS le 2026-07-27 : aucun nouveau lot ne peut plus embarquer un claim
-- porteur d'une borne. L'ensemble visé ne peut donc que DÉCROÎTRE d'ici au
-- déploiement — si le praticien en a déjà repris un à la main. Épingler
-- « exactement 28 » ferait échouer le build de production parce que le
-- praticien aurait fait son travail dans l'intervalle. On borne par le haut, ce
-- qui attrape un prédicat devenu trop large sans punir la décroissance.
DO $$
DECLARE
  plafond constant int := 28;  -- mesuré en production le 2026-07-27 et le 2026-07-28
  vises int;
  repris int;
BEGIN
  CREATE TEMP TABLE reprise_bornes ON COMMIT DROP AS
    SELECT * FROM public.rag_claim_reprise_bornes_cible();

  SELECT count(*) INTO vises FROM reprise_bornes;

  IF vises > plafond THEN
    RAISE EXCEPTION
      'reprise des bornes signées : % claims visés pour un plafond de % — le garde est en production, cet ensemble ne peut pas croître. Le prédicat a changé de portée : relire avant d''écrire.',
      vises, plafond;
  END IF;

  -- L'état de vérité (rag_corpus_claims) et sa preuve d'audit (le journal)
  -- bougent dans la MÊME transaction — c'est la dette v1 nommée en tête de
  -- 20260723100000, et il n'y a aucune raison de la creuser ici.
  WITH annule AS (
    UPDATE public.rag_corpus_claims c
    SET statut = 'EN_ATTENTE_VALIDATION',
        validateur = NULL,
        valide_at = NULL,
        updated_at = now()
    FROM reprise_bornes r
    WHERE c.id = r.id AND c.statut = 'VALIDE'
    RETURNING c.id, c.claim_id, c.version_claim, c.source_id
  )
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, motif, validateur, source_id, claims)
  SELECT
    'decision_individuelle',
    'EN_ATTENTE_VALIDATION',
    'Reprise automatique : claim signé par lot sans figurer dans l''échantillon tiré, et porteur d''une borne de décision au sens de rag_claim_porte_seuil (garde du 2026-07-27). Signature annulée, relecture individuelle requise.',
    -- Jamais d'acte anonyme (contrainte du journal) — et jamais non plus une
    -- adresse de praticien, qui ferait passer une écriture automatique pour un
    -- geste humain. L'acte se nomme.
    'migration:20260728090000_rag_claim_reprise_bornes_signees',
    a.source_id,
    jsonb_build_array(jsonb_build_object(
      'id', a.id,
      'claimId', a.claim_id,
      'versionClaim', a.version_claim,
      'statutAvant', 'VALIDE',
      'statutApres', 'EN_ATTENTE_VALIDATION'
    ))
  FROM annule a;

  GET DIAGNOSTICS repris = ROW_COUNT;

  IF repris <> vises THEN
    RAISE EXCEPTION
      'reprise des bornes signées : % claims visés mais % lignes journalisées — annulation.',
      vises, repris;
  END IF;

  RAISE NOTICE 'reprise des bornes signées : % claim(s) repassés en attente et journalisés.', repris;
END $$;
