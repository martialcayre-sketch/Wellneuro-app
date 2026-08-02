-- WellNeuro — marquage `metadata.usage = 'orientation'` des claims du périmètre
-- d'orientation adaptative (lot 8), rétroactivement.
--
-- POURQUOI UNE MIGRATION, et pas le pipeline. Le flag `--usage orientation` de
-- `tools/corpus/claims/draft.mjs` (#518) marque les claims À L'INGESTION. Or les
-- claims du périmètre étaient DÉJÀ ingérés — et pour l'essentiel déjà validés —
-- quand ce flag a été livré. Une ré-ingestion ne les rattraperait pas : le
-- contrôle d'immuabilité de `store.ts` ne compare pas `metadata`, si bien qu'un
-- ré-envoi de la même version d'un claim existant est un NO-OP SILENCIEUX. Sans
-- cette migration, `usage` resterait nul pour toujours sur ces lignes, et le
-- compilateur de règles du lot 9 ne verrait aucun claim d'orientation.
--
-- LE PÉRIMÈTRE EST UNE LISTE, pas un prédicat calculable en base. Il vient du
-- registre des sources (`docs/claude/corpus/source_registry.json`), qui n'est
-- pas répliqué en base : corpus NNPP2_Annee2, notebooks 02 à 07 et 11 (sommeil,
-- stress, humeur, cognition, douleurs, intestin-cerveau, cas complexes), moins
-- les deux exclusions du filtre livré en #518 —
--   * la QUARANTAINE sanitaire (`lifecycleStatus: quarantined`) : les sources
--     non prescriptives restent exclues ; 8 sources prescriptives du périmètre
--     sont réintégrées par la levée actée le 2026-08-02 ;
--   * la PERFUSION (WN-SRC-0244), seule exclusion A-009 restante après cet
--     amendement.
-- La liste est donc figée ici, à la date de la migration, et la fonction qui la
-- porte est éprouvée par `prisma/checks/rag_claim_usage_orientation_v1.sql` —
-- sur la base du CI, construite vide, cette migration est un no-op et ne
-- prouverait rien d'elle-même.
--
-- CE QU'ELLE NE FAIT PAS, et c'est délibéré :
--   * elle ne touche AUCUN statut de validation. `usage` dit à quoi un claim
--     sert, pas s'il est validé ; la barrière D-003 reste l'unique porte ;
--   * elle n'écrit PAS au journal des décisions. Ses cinq `type_acte` décrivent
--     tous une décision de validation, et `decision_individuelle` exige une
--     `decision` non nulle : y consigner ce marquage fabriquerait une signature
--     qui n'a pas eu lieu. La trace de cet acte est cette migration, en dépôt ;
--   * elle n'écrase RIEN. Aucune des 8 224 lignes ne porte de clé `usage` au
--     2026-08-01 (mesuré, MCP Supabase en lecture) ; par sécurité l'UPDATE ne
--     retient que les lignes où la clé est absente, et le garde ci-dessous
--     refuse d'avancer si une valeur `usage` DIFFÉRENTE apparaissait d'ici au
--     déploiement.
--
-- Mesuré en production le 2026-08-01 : 1 716 claims visés sur 85 sources
-- (709 VALIDE, 1 007 EN_ATTENTE_VALIDATION), 129 claims de sources en
-- quarantaine délibérément laissés sans marque.
CREATE OR REPLACE FUNCTION public.rag_claim_orientation_sources()
RETURNS TABLE (source_id text)
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  VALUES
    ('WN-SRC-0228'), ('WN-SRC-0229'), ('WN-SRC-0230'), ('WN-SRC-0231'), ('WN-SRC-0232'), ('WN-SRC-0233'),
    ('WN-SRC-0234'), ('WN-SRC-0235'), ('WN-SRC-0236'), ('WN-SRC-0237'), ('WN-SRC-0238'), ('WN-SRC-0243'),
    ('WN-SRC-0245'), ('WN-SRC-0250'), ('WN-SRC-0251'), ('WN-SRC-0252'), ('WN-SRC-0253'), ('WN-SRC-0254'),
    ('WN-SRC-0255'), ('WN-SRC-0256'), ('WN-SRC-0257'), ('WN-SRC-0258'), ('WN-SRC-0268'), ('WN-SRC-0270'),
    ('WN-SRC-0272'), ('WN-SRC-0274'), ('WN-SRC-0275'), ('WN-SRC-0276'), ('WN-SRC-0278'), ('WN-SRC-0279'),
    ('WN-SRC-0312'), ('WN-SRC-0313'), ('WN-SRC-0314'), ('WN-SRC-0315'), ('WN-SRC-0316'), ('WN-SRC-0317'),
    ('WN-SRC-0318'), ('WN-SRC-0319'), ('WN-SRC-0320'), ('WN-SRC-0321'), ('WN-SRC-0323'), ('WN-SRC-0324'),
    ('WN-SRC-0325'), ('WN-SRC-0326'), ('WN-SRC-0327'), ('WN-SRC-0328'), ('WN-SRC-0329'), ('WN-SRC-0330'),
    ('WN-SRC-0331'), ('WN-SRC-0332'), ('WN-SRC-0333'), ('WN-SRC-0334'), ('WN-SRC-0335'), ('WN-SRC-0336'),
    ('WN-SRC-0337'), ('WN-SRC-0338'), ('WN-SRC-0339'), ('WN-SRC-0340'), ('WN-SRC-0341'), ('WN-SRC-0342'),
    ('WN-SRC-0343'), ('WN-SRC-0344'), ('WN-SRC-0345'), ('WN-SRC-0346'), ('WN-SRC-0348'), ('WN-SRC-0349'),
    ('WN-SRC-0350'), ('WN-SRC-0351'), ('WN-SRC-0352'), ('WN-SRC-0353'), ('WN-SRC-0354'), ('WN-SRC-0355'),
    ('WN-SRC-0356'), ('WN-SRC-0357'), ('WN-SRC-0358'), ('WN-SRC-0359'), ('WN-SRC-0360'), ('WN-SRC-0361'),
    ('WN-SRC-0363'), ('WN-SRC-0364'), ('WN-SRC-0365'), ('WN-SRC-0366'), ('WN-SRC-0367'), ('WN-SRC-0368'),
    ('WN-SRC-0369'), ('WN-SRC-0370'), ('WN-SRC-0371'), ('WN-SRC-0372'), ('WN-SRC-0373'), ('WN-SRC-0374'),
    ('WN-SRC-0375'), ('WN-SRC-0376'), ('WN-SRC-0377'), ('WN-SRC-0378'), ('WN-SRC-0379'), ('WN-SRC-0380'),
    ('WN-SRC-0381'), ('WN-SRC-0382'), ('WN-SRC-0383'), ('WN-SRC-0384'), ('WN-SRC-0385'), ('WN-SRC-0386'),
    ('WN-SRC-0387'), ('WN-SRC-0388'),
    ('WN-SRC-0390'), ('WN-SRC-0391')
$$;

COMMENT ON FUNCTION public.rag_claim_orientation_sources() IS
  'Sources du périmètre d''orientation adaptative au 2026-08-02 : corpus NNPP2_Annee2, notebooks 02-07 et 11, réintégrant les sources prescriptives sorties de quarantaine, hors quarantaine sanitaire non prescriptive et hors perfusion (A-009 amendé, décision f). Conservée pour que le contrat rag_claim_usage_orientation_v1.sql puisse l''éprouver et qu''un rejeu reste vérifiable.';

-- Doctrine du dépôt (leçon du 2026-07-27) : révoquer PUBLIC ne suffit pas,
-- Supabase accorde EXECUTE nominativement à anon/authenticated/service_role via
-- ALTER DEFAULT PRIVILEGES. On révoque nommément, en conditionnant à l'existence
-- du rôle pour rester inerte sur la base éphémère du CI.
REVOKE EXECUTE ON FUNCTION public.rag_claim_orientation_sources() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_orientation_sources() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_orientation_sources() FROM authenticated;
  END IF;
END $$;

-- ═══ Le marquage ═══════════════════════════════════════════════════════════
--
-- Pas de plafond de comptage ici, contrairement à la reprise du 2026-07-28 : la
-- cible peut légitimement CROÎTRE d'ici au déploiement (une ingestion sur une
-- source du périmètre ajoute des claims à marquer, et c'est le comportement
-- voulu). Le garde porte donc sur ce qui serait un DÉFAUT, pas sur un volume :
-- une valeur `usage` déjà posée et différente, qu'on écraserait sans le voir.
DO $$
DECLARE
  conflits int;
  marques int;
  restants int;
BEGIN
  SELECT count(*) INTO conflits
  FROM public.rag_corpus_claims c
  JOIN public.rag_claim_orientation_sources() s ON s.source_id = c.source_id
  WHERE c.metadata ? 'usage'
    AND c.metadata->>'usage' IS DISTINCT FROM 'orientation';

  IF conflits > 0 THEN
    RAISE EXCEPTION
      'marquage usage=orientation : % claim(s) du périmètre portent déjà un usage DIFFÉRENT. Aucune ligne n''a été touchée — relire avant d''écraser.',
      conflits;
  END IF;

  -- `updated_at` N'EST PAS TOUCHÉ, et c'est le point le plus important de ce
  -- bloc. Cette colonne DATE L'ACTE PRATICIEN sur un claim : `deciderClaim` la
  -- pose avec la signature (`revue.ts` — « un rejet n'est pas une validation ;
  -- updated_at date l'acte »). L'estamper ici rendrait `updated_at > valide_at`
  -- vrai sur 709 claims signés — la signature exacte d'une modification
  -- post-signature — sans aucune ligne de journal en face, et sans retour
  -- possible : un audit ultérieur ne pourrait plus les distinguer d'une
  -- altération réelle. La migration affirme plus haut que ce marquage n'est PAS
  -- une décision praticien ; elle ne peut pas, dans le même geste, estamper la
  -- colonne qui date les décisions praticien. Sa trace est ce fichier.
  UPDATE public.rag_corpus_claims c
  SET metadata = c.metadata || jsonb_build_object('usage', 'orientation')
  FROM public.rag_claim_orientation_sources() s
  WHERE s.source_id = c.source_id
    AND NOT (c.metadata ? 'usage');

  GET DIAGNOSTICS marques = ROW_COUNT;
  RAISE NOTICE 'marquage usage=orientation : % claim(s) marqués (0 attendu au rejeu, l''opération est idempotente).', marques;

  -- POST-CONDITION — sans elle, un no-op total passerait pour un succès.
  -- Le seul retour de ce bloc est un NOTICE, noyé dans le log de build Vercel.
  -- Si l'UPDATE ne touchait aucune ligne en production (table renommée par une
  -- migration concurrente, identifiants normalisés autrement, rejeu après un
  -- `migrate resolve`), `migrate deploy` sortirait en succès, la migration
  -- serait marquée appliquée, le build serait vert — et le lot 9 ne verrait
  -- aucun claim d'orientation, c'est-à-dire exactement ce que ce fichier existe
  -- pour empêcher. L'assertion porte donc sur l'ÉTAT FINAL, pas sur un volume :
  -- elle est vraie à vide (base du CI), vraie au rejeu, et fausse sur le no-op
  -- silencieux.
  SELECT count(*) INTO restants
  FROM public.rag_corpus_claims c
  JOIN public.rag_claim_orientation_sources() s ON s.source_id = c.source_id
  WHERE c.metadata->>'usage' IS DISTINCT FROM 'orientation';

  IF restants > 0 THEN
    RAISE EXCEPTION
      'marquage usage=orientation : % claim(s) du périmètre ne portent PAS la marque après l''UPDATE. La migration n''a pas fait son travail — ne pas la marquer appliquée.',
      restants;
  END IF;
END $$;
