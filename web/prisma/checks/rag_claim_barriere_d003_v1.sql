-- Contrat de la barrière D-003 : aucun claim non signé ne sort du corpus RAG.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
--
-- La barrière est la fonction public.match_wellneuro_rag_claims (migration
-- 20260722150000_rag_corpus_claims_v1, l111-137 signature, l155-170 corps) :
-- c'est la SEULE voie de récupération autorisée sur rag_corpus_claims, et elle
-- n'expose une ligne que si CINQ conditions tiennent simultanément —
--   c.active = true, c.statut = 'VALIDE', c.patient_identifiable = false,
--   c.compartment = 'ACTIF', EXISTS (... rag_corpus_claim_sources ...)
-- La base du CI est construite VIDE par `migrate deploy` seul : un contrat
-- purement observateur y passerait par vacuité. D'où les fixtures A-E et le
-- ROLLBACK final.
--
-- Deux des cinq conditions ne sont PAS falsifiables par fixture : la table
-- les interdit par CHECK avant même l'assertion —
--   rag_corpus_claims_not_patient  (patient_identifiable = false)
--   rag_corpus_claims_compartment  (compartment = 'ACTIF')
-- Un INSERT qui tenterait patient_identifiable = true ou compartment <>
-- 'ACTIF' échouerait à l'INSERT, pas à une assertion sur le résultat de la
-- fonction — un tel test ne dirait rien de la fonction elle-même. On assère
-- donc STRUCTURELLEMENT que ces deux CHECK existent toujours sur la table ;
-- s'ils disparaissaient, ces deux barrières deviendraient falsifiables et
-- silencieuses.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

-- 0. Structurel : les deux CHECK non falsifiables par fixture sont en place.
DO $$
DECLARE
  n int;
BEGIN
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
END $$;

-- 1. Fixtures. Un chunk de fixture partagé (la jonction claim_sources a une FK
--    RESTRICT vers rag_corpus_chunks), puis cinq claims sur WN-SRC-9999, tous
--    au MÊME embedding non nul que le vecteur de requête (similarité = 1) —
--    un vecteur nul rend `1 - (embedding <=> query)` = NaN, et le contrôle
--    positif A ne remonterait jamais : le contrat serait vert quoi qu'il
--    arrive, ce qui est précisément ce que ce banc doit exclure.
INSERT INTO public.rag_corpus_chunks
  (id, batch_id, source_id, chunk_id, version_source, version_chunk,
   notebook, section, content, content_sha256,
   embedding_model, embedding_dimensions, embedding, indexation_autorisee)
VALUES
  ('__d003_chunk__', 'LOT_999_2026-08-03', 'WN-SRC-9999', 'WN-CH-9999-001',
   'v1.0', 'v1.0', '99', 'fixture', 'Verbatim de fixture — contrat barrière D-003.',
   repeat('0', 64), 'contrat', 1536,
   ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true);

INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at,
   embedding_model, embedding_dimensions, embedding, active)
VALUES
  -- A — VALIDE, active, rattaché au chunk. LE CONTRÔLE POSITIF : sans lui, un
  -- contrat qui ne rend jamais rien passerait pour un garde alors qu'il ne
  -- prouve que sa propre stérilité.
  ('__d003_a__', 'WN-CL-9999-001', 'WN-SRC-9999', 'v1.0',
   'Claim de fixture A — signé, actif, rattaché. Doit remonter.',
   repeat('1', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- B — EN_ATTENTE_VALIDATION, sinon identique à A.
  ('__d003_b__', 'WN-CL-9999-002', 'WN-SRC-9999', 'v1.0',
   'Claim de fixture B — en attente de validation. Ne doit pas remonter.',
   repeat('2', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', NULL, NULL,
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- C — REJETE, sinon identique à A.
  ('__d003_c__', 'WN-CL-9999-003', 'WN-SRC-9999', 'v1.0',
   'Claim de fixture C — rejeté. Ne doit pas remonter.',
   repeat('3', 64), 'déclaré', false, 'REJETE', NULL, NULL,
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true),
  -- D — VALIDE mais active=false.
  ('__d003_d__', 'WN-CL-9999-004', 'WN-SRC-9999', 'v1.0',
   'Claim de fixture D — signé mais désactivé. Ne doit pas remonter.',
   repeat('4', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, false),
  -- E — VALIDE, active=true, SANS ligne de jonction (pas de claim_sources).
  ('__d003_e__', 'WN-CL-9999-005', 'WN-SRC-9999', 'v1.0',
   'Claim de fixture E — signé, actif, orphelin de source. Ne doit pas remonter.',
   repeat('5', 64), 'déclaré', false, 'VALIDE', 'contrat@wellneuro.fr', now(),
   'contrat', 1536, ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector, true);

-- Jonction vers le chunk de fixture pour A, B, C, D — PAS pour E.
INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk)
VALUES
  ('__d003_a__', 'WN-CH-9999-001', 'v1.0'),
  ('__d003_b__', 'WN-CH-9999-001', 'v1.0'),
  ('__d003_c__', 'WN-CH-9999-001', 'v1.0'),
  ('__d003_d__', 'WN-CH-9999-001', 'v1.0');

-- 2. Comportemental : la fonction est la barrière, éprouvée sur chaque cas.
DO $$
DECLARE
  n int;
  seul_id text;
  vecteur extensions.vector(1536) := ('[1,' || repeat('0,', 1534) || '0]')::extensions.vector;
BEGIN
  -- ORDRE DÉLIBÉRÉ — les cas D'ABORD, le compte ENSUITE.
  --
  -- L'inverse a été écrit puis corrigé après épreuve. Si l'assertion de compte
  -- passe en premier, elle s'abat sur tout écart et les quatre blocs par cas
  -- deviennent INATTEIGNABLES : un compte de 1 valant la fixture A implique que
  -- B, C, D et E sont absents, donc leurs `EXISTS` ne peuvent plus jamais être
  -- vrais. Mesuré en falsifiant B : l'échec rendait « 2 ligne(s) remontée(s)
  -- […] non signé, désactivé ou orphelin » — une disjonction, là où le banc
  -- doit nommer le garde qui a lâché.
  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL)
    WHERE claim_id = 'WN-CL-9999-002'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : B (EN_ATTENTE_VALIDATION) remonte — statut <> VALIDE n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL)
    WHERE claim_id = 'WN-CL-9999-003'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : C (REJETE) remonte — un claim rejeté n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL)
    WHERE claim_id = 'WN-CL-9999-004'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : D (VALIDE, active=false) remonte — active=false n''est plus filtré.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.match_wellneuro_rag_claims(vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL)
    WHERE claim_id = 'WN-CL-9999-005'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = 'barrière D-003 : E (VALIDE, active=true, sans jonction) remonte — un claim orphelin de source verbatim n''est plus filtré.';
  END IF;

  -- Filet : un cas de fuite qu'aucun bloc ci-dessus n'a prévu (une sixième
  -- fixture ajoutée demain, une condition nouvelle de la fonction).
  SELECT count(*) INTO n
  FROM public.match_wellneuro_rag_claims(
    vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL
  );
  IF n <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('barrière D-003 : %s ligne(s) remontée(s) au lieu d''une seule pour WN-SRC-9999, sans qu''aucun cas nommé ne l''explique — une condition de la barrière a changé.', n);
  END IF;

  -- CONTRÔLE POSITIF, et c'est la pièce maîtresse : la ligne unique EST la
  -- fixture A. Sans lui, un contrat qui ne rend jamais rien passerait pour un
  -- garde alors qu'il ne prouverait que sa propre stérilité — une fonction
  -- cassée rendant zéro ligne serait déclarée conforme.
  SELECT claim_id INTO seul_id
  FROM public.match_wellneuro_rag_claims(
    vecteur, 50, 0.1, ARRAY['WN-SRC-9999'], NULL
  );
  IF seul_id IS DISTINCT FROM 'WN-CL-9999-001' THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format('barrière D-003 : la ligne remontée porte claim_id=%s au lieu de WN-CL-9999-001 (fixture A) — CONTRÔLE POSITIF en échec : un claim conforme ne remonte plus.', seul_id);
  END IF;
END $$;

ROLLBACK;
