-- Contrat du document pour le médecin : impressions figées et téléchargements
-- du patient ([[D-307]], F38).
--
-- Les deux tables promettent QUATORZE choses, et ce fichier les éprouve TOUTES :
--   1. une impression valide s'écrit et se relit, HTML et empreinte compris ;
--   2. l'instant et l'`ordre` sont posés par la BASE — l'instant en UTC, même
--      sous une session en Europe/Paris ; une date antidatée est ignorée ;
--      l'ordre croît d'une impression à la suivante ;
--   3. la synthèse d'un AUTRE dossier, ou une synthèse inexistante, est refusée ;
--   4. une synthèse NON VALIDÉE est refusée — `Brouillon_IA`,
--      `Brouillon_Praticien`, `Rejetee` — ; `Corrigee_Praticien` passe ;
--   5. seul le praticien DU DOSSIER imprime (la casse ne compte pas, ni côté
--      dossier ni côté appelant) ;
--   6. un HTML vide, ou une empreinte qui n'est pas la sienne, est refusé ;
--   7. le téléchargement de la DERNIÈRE impression passe ; instant et ordre
--      posés par la base ;
--   8. le téléchargement d'une impression d'un AUTRE dossier est refusé ;
--   9. le téléchargement d'une impression REMPLACÉE est refusé ;
--  10. UPDATE et TRUNCATE sont refusés sur les deux tables ;
--  11. l'effacement NOMMÉ passe en base (téléchargements, puis impressions), et
--      ni la synthèse ni l'impression ne s'effacent avant ce qui les désigne
--      (RESTRICT) ;
--  12. les FK ont la règle annoncée (RESTRICT), les CHECK, les index et les six
--      triggers sont présents, le refus de tout niveau autre que READ
--      COMMITTED précède les verrous, le dossier précède le verrou partagé,
--      l'ordre est tiré sous ce verrou, et les trois fonctions ont leur
--      `search_path` épinglé (présence relue : une session seule n'éprouve pas
--      la concurrence) ;
--  13. chaque table porte EXACTEMENT ses colonnes (liste blanche) ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des trois fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus du trigger est reconnu à son MESSAGE, pas
-- seulement à son code (P0001). Le CHECK `praticien_non_vide` ne s'isole pas
-- (le trigger refuse avant lui un e-mail blanc, qui n'est pas celui du
-- dossier) : le cas 12 relit sa clause.
--
-- Identités de fixture seulement. Tout se déroule dans une transaction annulée
-- à la fin.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

-- Un refus attendu : la requête doit échouer avec CE code et un message qui
-- contient CE motif. Un succès, ou un refus d'une autre nature, fait échouer
-- le contrat en nommant le cas.
CREATE FUNCTION pg_temp.refuse(cas text, requete text, code text, motif text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  recu_code text;
  recu_message text;
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS recu_code = RETURNED_SQLSTATE, recu_message = MESSAGE_TEXT;
    IF recu_code <> code OR position(motif IN recu_message) = 0 THEN
      RAISE EXCEPTION 'CONTRAT — % : refus inattendu (% / %), attendu (% / « % »)',
        cas, recu_code, recu_message, code, motif;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT — % : la requête est passée, elle devait être refusée.', cas;
END;
$$;

-- L'empreinte d'un HTML, comme la route la calculera.
CREATE FUNCTION pg_temp.sha(html text) RETURNS text LANGUAGE sql AS $$
  SELECT encode(sha256(convert_to(html, 'UTF8')), 'hex')
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien stocké `Praticien@WellNeuro.fr`, casse comprise) :
-- `syn_a_validee` (Validee_Praticien), `syn_a_corrigee` (Corrigee_Praticien),
-- `syn_a_brouillon` (Brouillon_IA), `syn_a_brouillon_p` (Brouillon_Praticien),
-- `syn_a_rejetee` (Rejetee).
-- Dossier B, d'un AUTRE praticien : `syn_b_validee`, et une impression `imp_b`.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_docm_a', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'Sophie', 'Nicola', 'Praticien@WellNeuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_docm_b', 'PAT_CONTRAT_DOCM_B', 'jennifer.martin+docm@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO syntheses_ia (id, id_synthese, id_patient, email_patient, modele, donnees_entree, synthese_json, statut, updated_at) VALUES
  ('s1', 'syn_a_validee', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'contrat', '{}', '{}', 'Validee_Praticien', CURRENT_TIMESTAMP),
  ('s2', 'syn_a_corrigee', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'contrat', '{}', '{}', 'Corrigee_Praticien', CURRENT_TIMESTAMP),
  ('s3', 'syn_a_brouillon', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'contrat', '{}', '{}', 'Brouillon_IA', CURRENT_TIMESTAMP),
  ('s5', 'syn_a_brouillon_p', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'contrat', '{}', '{}', 'Brouillon_Praticien', CURRENT_TIMESTAMP),
  ('s6', 'syn_a_rejetee', 'PAT_CONTRAT_DOCM_A', 'sophie.nicola+docm@example.test', 'contrat', '{}', '{}', 'Rejetee', CURRENT_TIMESTAMP),
  ('s4', 'syn_b_validee', 'PAT_CONTRAT_DOCM_B', 'jennifer.martin+docm@example.test', 'contrat', '{}', '{}', 'Validee_Praticien', CURRENT_TIMESTAMP);

INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
VALUES ('imp_b', 'PAT_CONTRAT_DOCM_B', 'syn_b_validee', 'autre.praticien@wellneuro.fr', '<p>B</p>', pg_temp.sha('<p>B</p>'));

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  def text;
BEGIN
  -- ── 1 et 2. Une impression valide, instant et ordre posés par la base ────
  INSERT INTO documents_medecin_imprimes (id, ordre, id_patient, id_synthese, praticien_email, html, html_sha256, imprime_le)
  VALUES ('imp_a1', 999999, 'PAT_CONTRAT_DOCM_A', 'syn_a_validee', 'praticien@wellneuro.fr',
          '<p>Document pour le médecin</p>', pg_temp.sha('<p>Document pour le médecin</p>'), TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM documents_medecin_imprimes WHERE id = 'imp_a1';
  IF ligne.html IS DISTINCT FROM '<p>Document pour le médecin</p>' OR ligne.id_synthese IS DISTINCT FROM 'syn_a_validee' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''impression relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.imprime_le;
  IF ligne.imprime_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;

  -- ── 3. La synthèse du dossier ────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 synthèse d''un autre dossier',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x3a', 'PAT_CONTRAT_DOCM_A', 'syn_b_validee', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('3 synthèse inexistante',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x3b', 'PAT_CONTRAT_DOCM_A', 'syn_inconnue', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'ne porte pas sur ce dossier');

  -- ── 4. Une synthèse validée ──────────────────────────────────────────────
  PERFORM pg_temp.refuse('4 synthèse en brouillon',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x4', 'PAT_CONTRAT_DOCM_A', 'syn_a_brouillon', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'n''est pas validée par le praticien');
  PERFORM pg_temp.refuse('4 synthèse vidée par le praticien',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x4b', 'PAT_CONTRAT_DOCM_A', 'syn_a_brouillon_p', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'n''est pas validée par le praticien');
  PERFORM pg_temp.refuse('4 synthèse rejetée',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x4c', 'PAT_CONTRAT_DOCM_A', 'syn_a_rejetee', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'n''est pas validée par le praticien');
  -- Corrigée passe, et l'ordre croît. Casse de l'e-mail indifférente (5).
  INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
  VALUES ('imp_a2', 'PAT_CONTRAT_DOCM_A', 'syn_a_corrigee', 'Praticien@WellNeuro.fr', '<p>Version 2</p>', pg_temp.sha('<p>Version 2</p>'));
  SELECT ordre INTO ligne FROM documents_medecin_imprimes WHERE id = 'imp_a2';
  IF ligne.ordre <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''une impression à la suivante.';
  END IF;

  -- ── 5. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('5 impression par un autre praticien',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x5', 'PAT_CONTRAT_DOCM_A', 'syn_a_validee', 'autre.praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>x</p>'))$q$,
    'P0001', 'seul le praticien du dossier');

  -- ── 6. Le HTML et son empreinte ──────────────────────────────────────────
  PERFORM pg_temp.refuse('6 HTML blanc',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x6a', 'PAT_CONTRAT_DOCM_A', 'syn_a_validee', 'praticien@wellneuro.fr', E' \t', pg_temp.sha(E' \t'))$q$,
    '23514', 'documents_medecin_imprimes_html_non_vide');
  PERFORM pg_temp.refuse('6 empreinte d''un autre texte',
    $q$INSERT INTO documents_medecin_imprimes (id, id_patient, id_synthese, praticien_email, html, html_sha256)
       VALUES ('x6b', 'PAT_CONTRAT_DOCM_A', 'syn_a_validee', 'praticien@wellneuro.fr', '<p>x</p>', pg_temp.sha('<p>y</p>'))$q$,
    '23514', 'documents_medecin_imprimes_html_sha256');

  -- ── 7. Le téléchargement de la dernière impression ───────────────────────
  INSERT INTO telechargements_documents_medecin (id, ordre, id_patient, id_impression, telecharge_le)
  VALUES ('tel_a1', 999999, 'PAT_CONTRAT_DOCM_A', 'imp_a2', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM telechargements_documents_medecin WHERE id = 'tel_a1';
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 7 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.telecharge_le;
  IF ligne.telecharge_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 7 : l''instant du téléchargement n''est pas posé par la base (écart %).', ecart;
  END IF;
  -- Deux téléchargements de la même impression : chacun est une ligne.
  INSERT INTO telechargements_documents_medecin (id, id_patient, id_impression)
  VALUES ('tel_a2', 'PAT_CONTRAT_DOCM_A', 'imp_a2');

  -- ── 8. L'impression du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('8 impression d''un autre dossier',
    $q$INSERT INTO telechargements_documents_medecin (id, id_patient, id_impression)
       VALUES ('x8', 'PAT_CONTRAT_DOCM_A', 'imp_b')$q$,
    'P0001', 'ne porte pas sur ce dossier');

  -- ── 9. Une impression remplacée ──────────────────────────────────────────
  PERFORM pg_temp.refuse('9 impression remplacée',
    $q$INSERT INTO telechargements_documents_medecin (id, id_patient, id_impression)
       VALUES ('x9', 'PAT_CONTRAT_DOCM_A', 'imp_a1')$q$,
    'P0001', 'a été remplacée par une impression plus récente');

  -- ── 10. Figées ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('10 UPDATE d''une impression',
    $q$UPDATE documents_medecin_imprimes SET html = '<p>autre</p>', html_sha256 = pg_temp.sha('<p>autre</p>') WHERE id = 'imp_a1'$q$,
    'P0001', 'est figée (UPDATE refusé)');
  PERFORM pg_temp.refuse('10 TRUNCATE des impressions',
    $q$TRUNCATE documents_medecin_imprimes CASCADE$q$,
    'P0001', 'documents_medecin_imprimes : une trace du document pour le médecin est figée (TRUNCATE refusé)');
  PERFORM pg_temp.refuse('10 UPDATE d''un téléchargement',
    $q$UPDATE telechargements_documents_medecin SET telecharge_le = now() WHERE id = 'tel_a1'$q$,
    'P0001', 'est figée (UPDATE refusé)');
  PERFORM pg_temp.refuse('10 TRUNCATE des téléchargements',
    $q$TRUNCATE telechargements_documents_medecin$q$,
    'P0001', 'telechargements_documents_medecin : une trace du document pour le médecin est figée (TRUNCATE refusé)');

  -- ── 11. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 synthèse effacée avant ses impressions',
    $q$DELETE FROM syntheses_ia WHERE id_patient = 'PAT_CONTRAT_DOCM_A'$q$,
    '23503', 'documents_medecin_imprimes_id_synthese_fkey');
  PERFORM pg_temp.refuse('11 impression effacée avant ses téléchargements',
    $q$DELETE FROM documents_medecin_imprimes WHERE id_patient = 'PAT_CONTRAT_DOCM_A'$q$,
    '23503', 'telechargements_documents_medecin_id_impression_fkey');
  DELETE FROM telechargements_documents_medecin WHERE id_patient = 'PAT_CONTRAT_DOCM_A';
  DELETE FROM documents_medecin_imprimes WHERE id_patient = 'PAT_CONTRAT_DOCM_A';
  SELECT count(*) INTO nb FROM documents_medecin_imprimes WHERE id_patient = 'PAT_CONTRAT_DOCM_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : l''effacement a laissé % impression(s).', nb;
  END IF;
  DELETE FROM syntheses_ia WHERE id_patient = 'PAT_CONTRAT_DOCM_A';

  -- ── 12. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f' AND confdeltype = 'r'
    AND conname IN ('documents_medecin_imprimes_id_patient_fkey',
                    'documents_medecin_imprimes_id_synthese_fkey',
                    'telechargements_documents_medecin_id_patient_fkey',
                    'telechargements_documents_medecin_id_impression_fkey');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clé(s) étrangère(s) sur 4 ont la règle RESTRICT.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.documents_medecin_imprimes'::regclass AND contype = 'c'
    AND conname IN ('documents_medecin_imprimes_html_non_vide',
                    'documents_medecin_imprimes_html_sha256',
                    'documents_medecin_imprimes_praticien_non_vide');
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK sur 3 sont présents.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.documents_medecin_imprimes'::regclass AND contype = 'c'
    AND conname = 'documents_medecin_imprimes_praticien_non_vide'
    AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
    AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : la clause de garde résiduelle du praticien est absente.';
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'documents_medecin_imprimes_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'documents_medecin_imprimes_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'documents_medecin_imprimes_synthese_idx' AND indexdef LIKE '%(id_synthese)')
      OR (indexname = 'telechargements_documents_medecin_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'telechargements_documents_medecin_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'telechargements_documents_medecin_impression_idx' AND indexdef LIKE '%(id_impression)'));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % index sur 6 sont présents, sans prédicat.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND ((t.tgrelid = 'public.documents_medecin_imprimes'::regclass
          AND ((t.tgname = 'documents_medecin_imprimes_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
            OR (t.tgname = 'documents_medecin_imprimes_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
            OR (t.tgname = 'documents_medecin_imprimes_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32)))
      OR (t.tgrelid = 'public.telechargements_documents_medecin'::regclass
          AND ((t.tgname = 'telechargements_documents_medecin_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
            OR (t.tgname = 'telechargements_documents_medecin_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
            OR (t.tgname = 'telechargements_documents_medecin_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32))));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % trigger(s) sur 6 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Le refus de tout niveau autre que READ COMMITTED, puis le dossier, puis
  -- le verrou partagé, puis l'ordre tiré sous lui (en-tête de la migration) : une session seule ne joue pas la
  -- concurrence, elle relit l'ordre.
  def := pg_get_functiondef('public.documents_medecin_imprimes_avant_insertion()'::regprocedure);
  IF def !~ '<> ''read committed''[^$]*FOR KEY SHARE[^$]*pg_advisory_xact_lock\(hashtext\(''documents_medecin:''[^$]*NEW\.ordre := nextval' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''ordre des verrous de l''impression n''est plus celui annoncé.';
  END IF;
  def := pg_get_functiondef('public.telechargements_documents_medecin_avant_insertion()'::regprocedure);
  IF def !~ '<> ''read committed''[^$]*FOR KEY SHARE[^$]*pg_advisory_xact_lock\(hashtext\(''documents_medecin:''[^$]*ORDER BY i\.ordre DESC[^$]*NEW\.ordre := nextval' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''ordre des verrous du téléchargement n''est plus celui annoncé.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.documents_medecin_figee()'::regprocedure,
                  'public.documents_medecin_imprimes_avant_insertion()'::regprocedure,
                  'public.telechargements_documents_medecin_avant_insertion()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % fonction(s) sur 3 ont le search_path épinglé.', nb;
  END IF;

  -- ── 13. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'documents_medecin_imprimes';
  IF colonnes <> ARRAY['html', 'html_sha256', 'id', 'id_patient', 'id_synthese', 'imprime_le',
                       'ordre', 'praticien_email'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues des impressions : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'telechargements_documents_medecin';
  IF colonnes <> ARRAY['id', 'id_impression', 'id_patient', 'ordre', 'telecharge_le'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues des téléchargements : %', colonnes;
  END IF;

  -- ── 14. RLS et fonctions ─────────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid IN ('public.documents_medecin_imprimes'::regclass, 'public.telechargements_documents_medecin'::regclass)
    AND relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS n''est active que sur % table(s) sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('documents_medecin_imprimes', 'telechargements_documents_medecin');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('documents_medecin_figee',
                      'documents_medecin_imprimes_avant_insertion',
                      'telechargements_documents_medecin_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat documents_medecin_imprimes_v1 : quatorze promesses tenues.';
END;
$$;

ROLLBACK;
