-- Contrat de la migration 20260728090000_rag_claim_reprise_bornes_signees.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
--
-- Ce banc existe parce que le CI, seul, ne prouvait RIEN de cette migration :
-- sa base est construite par `migrate deploy` sur une base vide, la reprise y
-- est un no-op, et deux défauts de la première rédaction — trouvés par revue
-- adversariale, pas par le CI — y seraient passés verts.
--
-- Il éprouve la FONCTION que la migration appelle, pas une copie de son
-- prédicat : c'est pour cela que la migration en pose une.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

-- Cinq claims d'une même source, tous VALIDE au départ.
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at,
   embedding_model, embedding_dimensions, embedding)
VALUES
  -- Le cas nominal : borne, jamais tiré, signature du lot → REPRIS.
  ('__rb_cible__', 'WN-CL-7777-001', 'WN-SRC-7777', 'v1.0',
   'Les valeurs normales d''homocystéine sont inférieures à 5 à 8 μmol/l.',
   repeat('a', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  -- Pas de borne → épargné, quoi qu'il arrive.
  ('__rb_sans_borne__', 'WN-CL-7777-002', 'WN-SRC-7777', 'v1.0',
   'claim de contrat, non prescriptif',
   repeat('b', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  -- Borne, mais TIRÉ dans son lot → lu par un humain, signature respectée.
  ('__rb_tire__', 'WN-CL-7777-003', 'WN-SRC-7777', 'v1.0',
   'Le statut en ferritine : carence profonde < 10 ng/ml, zone élevée > 80 ng/ml.',
   repeat('c', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  -- Borne, couvert par DEUX lots, tiré dans le premier seulement.
  -- La première rédaction le reprenait par la ligne du second lot.
  ('__rb_deux_lots__', 'WN-CL-7777-004', 'WN-SRC-7777', 'v1.0',
   'Les valeurs de référence du zinc plasmatique sont de 88 à 146 μg/dL.',
   repeat('d', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  -- Borne, jamais tiré, mais REVALIDÉ INDIVIDUELLEMENT après le lot : son
  -- valide_at ne peut plus être celui du lot. C'est le praticien faisant ce que
  -- la reprise lui demande ; l'effacer serait défaire son travail.
  ('__rb_revalide__', 'WN-CL-7777-005', 'WN-SRC-7777', 'v1.0',
   'Une méthylation insuffisante correspond à une homocystéine supérieure à 8 à 10 μmol/l.',
   repeat('e', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  -- Borne, couvert par un lot dont l'échantillon ne porte AUCUNE clé `tires` :
  -- on ne peut pas savoir s'il a été lu. Une signature ne s'efface pas sur une
  -- donnée manquante — il doit être épargné.
  ('__rb_sans_tires__', 'WN-CL-7777-006', 'WN-SRC-7777', 'v1.0',
   'Les valeurs de référence du GABA sont de 0.40-0.85 µmol/L.',
   repeat('f', 64), 'déclaré', false, 'VALIDE', 'p@wellneuro.fr', now(), 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector);

DO $$
DECLARE
  tirage_a bigint;
  tirage_b bigint;
  tirage_c bigint;
  cible text[];
BEGIN
  -- Premier lot : tire __rb_tire__ et __rb_deux_lots__, couvre les cinq.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'p@wellneuro.fr', 'WN-SRC-7777',
          '{"seed":1,"tires":["__rb_tire__","__rb_deux_lots__"],"eligibles":[]}')
  RETURNING id INTO tirage_a;

  -- Le trigger refuserait ces claims (ils portent une borne) : on journalise
  -- l'acte tel qu'il existait AVANT le garde, en désarmant le trigger le temps
  -- de poser la fixture. C'est la seule façon de reproduire l'histoire — et
  -- c'est bien la preuve que le garde fait son travail au présent.
  ALTER TABLE public.rag_corpus_claim_decisions DISABLE TRIGGER rag_claim_decisions_avant_insertion;

  -- L'echantillon de la LIGNE DE LOT porte les tirés — c'est la forme réelle
  -- (revue.ts:909 y recopie `tires`), et non celle du tirage seul. Une première
  -- rédaction de cette fixture l'avait omis : le contrat a alors échoué en
  -- désignant trois claims au lieu d'un, ce qui était le bon verdict sur une
  -- fixture fausse.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims, cree_le)
  SELECT 'decision_lot', 'VALIDE', 'p@wellneuro.fr', 'WN-SRC-7777', tirage_a,
         '{"seed":1,"tires":["__rb_tire__","__rb_deux_lots__"]}', '{"questions":[]}',
         '[{"id":"__rb_cible__"},{"id":"__rb_sans_borne__"},{"id":"__rb_tire__"},{"id":"__rb_deux_lots__"},{"id":"__rb_revalide__"}]',
         c.valide_at
  FROM public.rag_corpus_claims c WHERE c.id = '__rb_cible__';

  -- Second lot : ne tire personne, couvre __rb_deux_lots__ une seconde fois.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'p@wellneuro.fr', 'WN-SRC-7777',
          '{"seed":2,"tires":[],"eligibles":[]}')
  RETURNING id INTO tirage_b;

  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims, cree_le)
  SELECT 'decision_lot', 'VALIDE', 'p@wellneuro.fr', 'WN-SRC-7777', tirage_b,
         '{"seed":2,"tires":[]}', '{"questions":[]}',
         '[{"id":"__rb_deux_lots__"}]', c.valide_at
  FROM public.rag_corpus_claims c WHERE c.id = '__rb_deux_lots__';

  -- Troisième lot : échantillon SANS clé `tires`. Aucune ligne de ce genre en
  -- production, mais rien dans le schéma ne l'interdit.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'p@wellneuro.fr', 'WN-SRC-7777', '{"seed":3}')
  RETURNING id INTO tirage_c;

  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims, cree_le)
  SELECT 'decision_lot', 'VALIDE', 'p@wellneuro.fr', 'WN-SRC-7777', tirage_c,
         '{"seed":3}', '{"questions":[]}',
         '[{"id":"__rb_sans_tires__"}]', c.valide_at
  FROM public.rag_corpus_claims c WHERE c.id = '__rb_sans_tires__';

  ALTER TABLE public.rag_corpus_claim_decisions ENABLE TRIGGER rag_claim_decisions_avant_insertion;

  -- La revalidation individuelle postérieure : le claim reste VALIDE, mais sa
  -- signature n'est plus celle du lot.
  UPDATE public.rag_corpus_claims
  SET valide_at = now() + interval '1 hour'
  WHERE id = '__rb_revalide__';

  SELECT coalesce(array_agg(id ORDER BY id), ARRAY[]::text[])
  INTO cible
  FROM public.rag_claim_reprise_bornes_cible()
  WHERE source_id = 'WN-SRC-7777';

  IF cible <> ARRAY['__rb_cible__'] THEN
    RAISE EXCEPTION
      'reprise bornes: la cible devrait être {__rb_cible__} et vaut % — un claim lu, revalidé ou sans borne y est entré, ou le cas nominal en est sorti.',
      cible
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- Droits : la fonction de cible ne s'expose pas plus que le garde.
DO $$
DECLARE
  role_supabase text;
BEGIN
  FOREACH role_supabase IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_supabase)
       AND has_function_privilege(role_supabase, 'public.rag_claim_reprise_bornes_cible()', 'EXECUTE')
    THEN
      RAISE EXCEPTION 'reprise bornes: le rôle % peut exécuter la fonction de cible', role_supabase
        USING ERRCODE = 'WN001';
    END IF;
  END LOOP;
END $$;

ROLLBACK;
