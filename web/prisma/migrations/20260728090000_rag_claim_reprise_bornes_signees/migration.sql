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
-- mécanisme est identique, et la surface qui les servira n'est pas encore
-- ouverte. C'est maintenant qu'il est le moins coûteux de les relire.
--
-- Décision praticien du 2026-07-27 : les repasser en attente, par migration
-- relue. Elle EFFACE une signature — c'est la transition d'annulation que la
-- lib autorise déjà (`VALIDE → EN_ATTENTE_VALIDATION`, revue.ts) —, elle ne
-- rejette ni ne supprime aucun claim. Chacun repart en revue individuelle.
--
-- ═══ Le critère est le GARDE, pas un jugement ═══════════════════════════════
--
-- La cible n'est pas une liste d'identifiants triée à la main : c'est le
-- prédicat `rag_claim_porte_seuil` lui-même, c'est-à-dire « ce que le garde
-- aurait écarté s'il avait existé ». Objectif, reproductible, et il ne peut pas
-- se périmer entre l'écriture et le déploiement. Le prix est connu et assumé :
-- le garde sur-capture d'un tiers, quelques-uns des 28 sont des moyennes
-- d'étude qui se revalideront d'un coup d'œil.
--
-- ═══ Pourquoi aucune liste figée, et aucune assertion d'égalité ═════════════
--
-- Le garde est en production DEPUIS le 2026-07-27 : aucun nouveau lot ne peut
-- plus embarquer un claim porteur d'une borne. L'ensemble visé ne peut donc que
-- DÉCROÎTRE d'ici au déploiement — si le praticien en a déjà repris un à la
-- main. Épingler « exactement 28 » ferait échouer le build de production parce
-- que le praticien aurait fait son travail dans l'intervalle. On borne donc par
-- le haut, ce qui attrape un prédicat devenu trop large sans punir la
-- décroissance légitime.
DO $$
DECLARE
  plafond constant int := 28;  -- mesuré en production le 2026-07-27
  vises int;
  repris int;
BEGIN
  CREATE TEMP TABLE reprise_bornes ON COMMIT DROP AS
  WITH lots AS (
    SELECT d.echantillon->'tires' AS tires, e.value->>'id' AS claim_pk
    FROM public.rag_corpus_claim_decisions d,
         LATERAL jsonb_array_elements(d.claims) e
    WHERE d.type_acte = 'decision_lot' AND d.decision = 'VALIDE'
  )
  SELECT c.id, c.claim_id, c.version_claim, c.source_id
  FROM lots
  JOIN public.rag_corpus_claims c ON c.id = lots.claim_pk
  WHERE NOT (lots.tires @> to_jsonb(lots.claim_pk))   -- jamais tiré, donc jamais lu
    AND c.statut = 'VALIDE'                           -- idempotent : un claim déjà repris est ignoré
    AND public.rag_claim_porte_seuil(c.texte_normalise);

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
