-- Contrat de la barrière D-003 : aucun claim non signé ne sort du corpus RAG.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
--
-- La barrière est la fonction public.match_wellneuro_rag_claims (migration
-- 20260722150000_rag_corpus_claims_v1, l111-137 signature, l155-170 corps) :
-- c'est la SEULE voie de RESTITUTION autorisée sur rag_corpus_claims, et elle
-- n'expose une ligne que si CINQ conditions tiennent simultanément —
--   c.active = true, c.statut = 'VALIDE', c.patient_identifiable = false,
--   c.compartment = 'ACTIF', EXISTS (... rag_corpus_claim_sources ...)
-- Elle porte en outre deux prédicats de périmètre — filter_source_ids et le
-- seuil de similarité — qui ne relèvent pas de D-003 mais dont la disparition
-- ferait fuiter des claims d'un autre notebook dans une fiche (rayonCorpus.ts,
-- décision 7 des arbitrages du 2026-07-27). Ils sont éprouvés ici aussi.
--
-- « Voie de restitution » et non « toute lecture » : quatre modules lisent les
-- claims sans filtrer statut (rag/claims/{revue,recherche,questionnaire,
-- evaluation}.ts). Ce sont l'établi de validation, jamais une surface de
-- consultation — voir docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md.
--
-- La base du CI est construite VIDE par `migrate deploy` seul : un contrat
-- purement observateur y passerait par vacuité. D'où les fixtures et le
-- ROLLBACK final.
--
-- Deux des cinq conditions ne sont pas falsifiables PAR FIXTURE : la table les
-- tient par CHECK (rag_corpus_claims_not_patient, rag_corpus_claims_compartment)
-- et l'INSERT échouerait avant l'assertion. Ce n'est pas une impossibilité —
-- le DDL est transactionnel, on POURRAIT lever le CHECK dans la transaction —
-- c'est un choix : tant que le CHECK tient, le prédicat de la fonction est
-- redondant, et la disparition du CHECK est attrapée structurellement plus bas.
-- Une des deux couches tient donc toujours.
--
-- Plage de sentinelles WN-*-9998 : rag_claim_decisions_journal_v1.sql occupe
-- déjà WN-CL-9999-001..004 / WN-SRC-9999, et rag_corpus_claims porte
-- UNIQUE (claim_id, version_claim). Les deux contrats tournent aujourd'hui dans
-- des transactions séparées, mais un rejeu dans une transaction commune
-- (mode d'emploi de cb_biologie_structure_v1.sql) les ferait entrer en collision.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

-- 0. Structurel : ce que les fixtures ne peuvent pas éprouver.
DO $$
DECLARE
  n int;
  role_supabase text;
BEGIN
  -- 0a. Les deux CHECK qui rendent redondants deux prédicats de la fonction.
  SELECT count(*) INTO n
  FROM pg_constraint
  WHERE conrelid = 'public.rag_corpus_claims'::regclass
    AND conname = 'rag_corpus_claims_not_patient';
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : CHECK rag_corpus_claims_not_patient absent — patient_identifiable=false n''est plus garanti au niveau table.';
  END IF;

  SELECT count(*) INTO n
  FROM pg_constraint
  WHERE conrelid = 'public.rag_corpus_claims'::regclass
    AND conname = 'rag_corpus_claims_compartment';
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : CHECK rag_corpus_claims_compartment absent — compartment=''ACTIF'' n''est plus garanti au niveau table.';
  END IF;

  -- 0b. Ce qui empêche de CONTOURNER la fonction. Sans ces deux assertions, le
  -- contrat prouverait que la porte ferme bien pendant qu'on entre par la
  -- fenêtre : un DROP+CREATE de la fonction (le CREATE OR REPLACE, lui,
  -- conserve les grants) ou un DISABLE ROW LEVEL SECURITY rendrait les claims
  -- EN_ATTENTE lisibles par PostgREST sans jamais appeler la barrière.
  FOREACH role_supabase IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    -- Conditionné à l'existence du rôle : la base éphémère du CI n'a ni l'un ni
    -- l'autre, l'assertion y est vide et ne mord qu'en production. C'est là
    -- qu'elle sert : « REVOKE ... FROM PUBLIC » ne retire rien quand Supabase a
    -- posé des grants nominatifs (piège corrigé par 20260727200000).
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_supabase)
       AND has_function_privilege(
             role_supabase,
             'public.match_wellneuro_rag_claims(extensions.vector,integer,double precision,text[],text)',
             'EXECUTE')
    THEN
      RAISE EXCEPTION USING ERRCODE = 'WN001',
        MESSAGE = format('barrière D-003 : le rôle %s peut exécuter match_wellneuro_rag_claims — la barrière est appelable hors du runtime applicatif.', role_supabase);
    END IF;
  END LOOP;

  SELECT count(*) INTO n
  FROM pg_class
  WHERE oid IN ('public.rag_corpus_claims'::regclass, 'public.rag_corpus_claim_sources'::regclass)
    AND relrowsecurity;
  IF n <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('barrière D-003 : %s table(s) sur 2 en RLS — sans RLS, un claim non signé est lisible en direct, la fonction n''y peut rien.', n);
  END IF;
END $$;

-- 1. Fixtures. Un chunk partagé (la jonction a une FK RESTRICT vers
--    rag_corpus_chunks), puis les claims. TOUS au même embedding non nul que le
--    vecteur de requête (similarité = 1), SAUF G qui est orthogonal.
--
--    Un vecteur NUL rendrait `1 - (embedding <=> query)` = NaN : le seuil serait
--    faux, le contrôle positif ne remonterait jamais, et le contrat serait vert
--    quoi qu'il arrive — précisément ce que ce banc doit exclure.
INSERT INTO public.rag_corpus_chunks
  (id, batch_id, source_id, chunk_id, version_source, version_chunk,
   notebook, section, content, content_sha256,
   embedding_model, embedding_dimensions, embedding, indexation_autorisee)
VALUES
  ('__d003_chunk__', 'LOT_998_2026-08-03', 'WN-SRC-9998', 'WN-CH-9998-001',
   'v1.0', 'v1.0', '99', 'fixture', 'Verbatim de fixture — contrat barrière D-003.',
   repeat('0', 64), 'contrat', 1536,
   ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true);

INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at,
   embedding_model, embedding_dimensions, embedding, active)
VALUES
  -- A — VALIDE, active, rattachée. LE CONTRÔLE POSITIF.
  ('__d003_a__', 'WN-CL-9998-001', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture A — signé, actif, rattaché. Doit remonter.',
   repeat('1', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- B — EN_ATTENTE_VALIDATION, sinon identique à A.
  ('__d003_b__', 'WN-CL-9998-002', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture B — en attente de validation. Ne doit pas remonter.',
   repeat('2', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', NULL, NULL,
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- C — REJETE, sinon identique à A.
  ('__d003_c__', 'WN-CL-9998-003', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture C — rejeté. Ne doit pas remonter.',
   repeat('3', 64), 'déclaré', false, 'REJETE', NULL, NULL,
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- D — VALIDE mais active=false.
  ('__d003_d__', 'WN-CL-9998-004', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture D — signé mais désactivé. Ne doit pas remonter.',
   repeat('4', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, false),
  -- E — VALIDE, active, SANS ligne de jonction.
  ('__d003_e__', 'WN-CL-9998-005', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture E — signé, actif, orphelin de source. Ne doit pas remonter.',
   repeat('5', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- F — conforme en tout point, mais HORS du périmètre interrogé. Éprouve
  -- filter_source_ids : sa disparition ferait fuiter les claims d'un autre
  -- notebook dans une fiche, silencieusement.
  ('__d003_f__', 'WN-CL-9997-001', 'WN-SRC-9997', 'v1.0',
   'Claim de fixture F — conforme mais hors périmètre. Ne doit pas remonter.',
   repeat('6', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- G — conforme et dans le périmètre, mais vecteur ORTHOGONAL (similarité 0).
  -- Éprouve le seuil de similarité, dernier prédicat sans témoin.
  ('__d003_g__', 'WN-CL-9998-006', 'WN-SRC-9998', 'v1.0',
   'Claim de fixture G — conforme mais hors seuil de similarité. Ne doit pas remonter.',
   repeat('7', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[0,1,' || repeat('0,', 1533) || '0]')::extensions.vector, true);

-- Jonction vers le chunk de fixture pour A, B, C, D, F, G — PAS pour E.
INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk)
VALUES
  ('__d003_a__', 'WN-CH-9998-001', 'v1.0'),
  ('__d003_b__', 'WN-CH-9998-001', 'v1.0'),
  ('__d003_c__', 'WN-CH-9998-001', 'v1.0'),
  ('__d003_d__', 'WN-CH-9998-001', 'v1.0'),
  ('__d003_f__', 'WN-CH-9998-001', 'v1.0'),
  ('__d003_g__', 'WN-CH-9998-001', 'v1.0');

-- 2. Comportemental : la fonction est la barrière, éprouvée cas par cas.
DO $$
DECLARE
  n int;
  vecteur extensions.vector(1536) := ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector;
BEGIN
  -- ORDRE DÉLIBÉRÉ, et il a coûté deux corrections. Une assertion de COMPTE
  -- placée avant les assertions nommées les rend toutes INATTEIGNABLES : un
  -- compte de 1 valant la fixture A implique l'absence de toutes les autres,
  -- donc plus aucun `EXISTS` ne peut être vrai. Mesuré en falsifiant B —
  -- l'échec rendait une disjonction au lieu de nommer le coupable.
  -- Le contrôle positif est soumis à la même règle, et pour la même raison :
  -- il passe AVANT le compte, sinon c'est lui qui devient muet.

  -- 2a. CONTRÔLE POSITIF — la pièce maîtresse. Sans lui, un contrat qui ne rend
  -- jamais rien passerait pour un garde alors qu'il ne prouverait que sa propre
  -- stérilité : une fonction cassée rendant zéro ligne serait déclarée conforme.
  IF NOT EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-001'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : CONTRÔLE POSITIF en échec — A (VALIDE, active, rattachée à un verbatim) ne remonte PAS. La fonction ne sert plus rien, et les assertions négatives ci-dessous ne prouveraient alors aucune fermeture.';
  END IF;

  -- 2b. Les quatre conditions de D-003 falsifiables par fixture.
  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-002'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : B (EN_ATTENTE_VALIDATION) remonte — statut <> VALIDE n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-003'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : C (REJETE) remonte — un claim rejeté n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-004'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : D (VALIDE, active=false) remonte — active=false n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-005'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : E (VALIDE, active=true, sans jonction) remonte — un claim orphelin de source verbatim n''est plus filtré.';
  END IF;

  -- 2c. Les deux prédicats de périmètre. Pas D-003 au sens strict, mais leur
  -- disparition mélange les notebooks dans une fiche sans rien signaler.
  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9997-001'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : F (source WN-SRC-9997, hors du filtre demandé) remonte — filter_source_ids n''enferme plus un rayon dans son périmètre.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL)
    WHERE claim_id = 'WN-CL-9998-006'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : G (vecteur orthogonal, similarité 0) remonte — le seuil min_similarity n''est plus appliqué.';
  END IF;

  -- 2d. Filet : une fuite qu'aucun cas nommé n'a prévue (fixture ajoutée
  -- demain, condition nouvelle de la fonction).
  SELECT count(*) INTO n
  FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9998'], NULL);
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('barrière D-003 : %s ligne(s) remontée(s) au lieu d''une seule, sans qu''aucun cas nommé ne l''explique — une condition de la barrière a changé.', n);
  END IF;
END $$;

ROLLBACK;
