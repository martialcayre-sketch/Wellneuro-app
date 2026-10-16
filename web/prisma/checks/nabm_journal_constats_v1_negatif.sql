-- Contrat de migration 20261016100000_nabm_journal_constats_v1 (M-3c, F54).
-- Exécuté après `prisma migrate deploy` ; tout est annulé (ROLLBACK).
-- Chaque garantie est éprouvée par l'écriture qui devrait la violer, et le
-- refus doit porter SON motif (`pg_temp.refuse`) : un refus pour une autre
-- raison fait échouer le contrat (ERRCODE sentinelle WN001, jamais
-- intercepté).
--
-- LES TRIGGERS DIFFÉRÉS. Ils se jugent au COMMIT, que ce contrat n'atteint
-- jamais : `pg_temp.refuse` et `pg_temp.accepte` jouent l'écriture, puis
-- `SET CONSTRAINTS ALL IMMEDIATE`, qui juge les événements en attente ; le
-- mode différé revient ensuite (l'annulation d'une sous-transaction le
-- restaure d'elle-même). L'écriture et son journal se jouent donc dans
-- l'ordre où l'application les jouera, l'un ou l'autre en premier.
--
-- UNE SEULE TRANSACTION. Toutes les lignes de journal ACCEPTÉES partagent le
-- même `transaction_id` : un cas refusé ne doit pas pouvoir se satisfaire
-- d'une ligne acceptée plus haut. L'ordre des cas y veille, et chaque cas
-- refusé est annulé avec sa sous-transaction.
--
-- Les niveaux d'isolation se jouent à part, chacun dans sa transaction, en
-- fin de fichier.
BEGIN;

-- ── Structurel : RLS sans policy, aucun grant Data API, triggers en place ──
DO $$
DECLARE
  t text;
  trig text;
BEGIN
  FOREACH t IN ARRAY ARRAY['biology_analyte_nabm_journal', 'biology_analyte_nabm_constats'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE oid = ('public.' || t)::regclass AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'M-3c: RLS non activée sur %', t USING ERRCODE = 'WN001';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t) THEN
      RAISE EXCEPTION 'M-3c: policy inattendue sur %', t USING ERRCODE = 'WN001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = t AND grantee IN ('anon', 'authenticated')
    ) THEN
      RAISE EXCEPTION 'M-3c: grant Data API inattendu sur %', t USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  FOREACH trig IN ARRAY ARRAY[
    'biology_analyte_nabm_journal_no_update',
    'biology_analyte_nabm_journal_no_delete',
    'biology_analyte_nabm_journal_no_truncate',
    'biology_analyte_nabm_journal_avant_insertion',
    'biology_analyte_nabm_journal_concorde',
    'biology_analyte_nabm_constats_no_update',
    'biology_analyte_nabm_constats_no_truncate',
    'biology_analyte_nabm_constats_avant_insertion',
    'biology_analyte_nabm_constats_exige_journal',
    'biology_analyte_nabm_avant_ecriture',
    'biology_analyte_nabm_exige_journal',
    'biology_analyte_nabm_no_truncate'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trig AND NOT tgisinternal) THEN
      RAISE EXCEPTION 'M-3c: trigger % absent', trig USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  -- Les trois gardes jugées au COMMIT sont différées.
  IF (
    SELECT count(*) FROM pg_trigger
    WHERE tgname IN ('biology_analyte_nabm_exige_journal', 'biology_analyte_nabm_constats_exige_journal',
                     'biology_analyte_nabm_journal_concorde')
      AND tgdeferrable AND tginitdeferred
  ) <> 3 THEN
    RAISE EXCEPTION 'M-3c: les gardes jugées au COMMIT ne sont pas DEFERRABLE INITIALLY DEFERRED'
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- ── Les deux aides ──────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.refuse(p_sql text, p_motif text) RETURNS void
LANGUAGE plpgsql AS $f$
BEGIN
  BEGIN
    EXECUTE p_sql;
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'WN001' THEN
      RAISE;
    END IF;
    IF position(p_motif IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'M-3c: refus attendu pour « % », obtenu : %', p_motif, SQLERRM USING ERRCODE = 'WN001';
    END IF;
    SET CONSTRAINTS ALL DEFERRED;
    RETURN;
  END;
  RAISE EXCEPTION 'M-3c: accepté alors qu''il devait être refusé (« % ») : %', p_motif, p_sql USING ERRCODE = 'WN001';
END;
$f$;

CREATE FUNCTION pg_temp.accepte(p_sql text) RETURNS void
LANGUAGE plpgsql AS $f$
BEGIN
  EXECUTE p_sql;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END;
$f$;

-- ── Fixtures : un millésime de contrat rendu courant, trois actes, cinq analytes ──
DELETE FROM biology_catalog_versions_courantes WHERE source_provenance = 'nabm_smt_ans';
INSERT INTO biology_catalog_versions_courantes (id, source_provenance, version_source, updated_at)
VALUES ('__m3c_pointeur__', 'nabm_smt_ans', 'M3C_V1', now());

INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, inactif, updated_at) VALUES
  ('__m3c_acte_1__', '0001', 'M3C_V1', 'Acte de contrat actif', false, now()),
  ('__m3c_acte_2__', '0002', 'M3C_V1', 'Acte de contrat inactif', true, now()),
  ('__m3c_acte_3__', '0003', 'M3C_V0', 'Acte de contrat d''un autre millésime', false, now());

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, actif, updated_at) VALUES
  ('__m3c_a__', 'BIO_M3C_A', 'Analyte de contrat A', 'sang', 'saisie_praticien', 'partielle', true, now()),
  ('__m3c_b__', 'BIO_M3C_B', 'Analyte de contrat B', 'sang', 'saisie_praticien', 'partielle', true, now()),
  ('__m3c_c__', 'BIO_M3C_C', 'Analyte de contrat C', 'sang', 'saisie_praticien', 'partielle', true, now()),
  ('__m3c_d__', 'BIO_M3C_D', 'Analyte de contrat D', 'sang', 'saisie_praticien', 'partielle', true, now()),
  ('__m3c_i__', 'BIO_M3C_INACTIF', 'Analyte de contrat inactif', 'sang', 'saisie_praticien', 'partielle', false, now());

-- ═══ Le journal : forme, millésime, concordance, champs posés, figé ═════════
DO $$
DECLARE
  cas text[][] := ARRAY[
    ['biology_analyte_nabm_journal_forme_signature',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, millesime, praticien_email)
        VALUES ('j1', 'BIO_M3C_A', 'signature', '0001', 'M3C_V1', 'contrat@wellneuro.fr')$q$],
    ['biology_analyte_nabm_journal_forme_signature',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email, efface_par, efface_le)
        VALUES ('j2', 'BIO_M3C_A', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$],
    ['biology_analyte_nabm_journal_forme_retrait_signature',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email)
        VALUES ('j3', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'contrat@wellneuro.fr')$q$],
    ['biology_analyte_nabm_journal_forme_retrait_signature',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email, efface_par, efface_le)
        VALUES ('j4', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$],
    ['biology_analyte_nabm_journal_forme_constat',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, millesime, praticien_email)
        VALUES ('j5', 'BIO_M3C_A', 'constat_aucun_acte', '0001', 'M3C_V1', 'contrat@wellneuro.fr')$q$],
    ['biology_analyte_nabm_journal_forme_retrait_constat',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, praticien_email, efface_par, efface_le)
        VALUES ('j6', 'BIO_M3C_A', 'retrait_constat', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$],
    ['biology_analyte_nabm_journal_acte_check',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, praticien_email)
        VALUES ('j7', 'BIO_M3C_A', 'correction', 'contrat@wellneuro.fr')$q$],
    ['biology_analyte_nabm_journal_praticien_non_vide',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
        VALUES ('j8', 'BIO_M3C_A', 'constat_aucun_acte', 'M3C_V1', E' \t')$q$],
    ['biology_analyte_nabm_journal_efface_par_non_vide',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
        VALUES ('j9', 'BIO_M3C_A', 'retrait_constat', 'M3C_V1', 'contrat@wellneuro.fr', ' ', now())$q$],
    ['biology_analyte_nabm_journal_code_acte_check',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
        VALUES ('j10', 'BIO_M3C_A', 'retrait_signature', 'ABCD', 'isole', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$],
    ['biology_analyte_nabm_journal_nature_check',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
        VALUES ('j11', 'BIO_M3C_A', 'retrait_signature', '0001', 'groupe', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$],
    -- Millésime et acte vérifiés par la base. L'acte 0001 est actif au
    -- millésime courant : seul le millésime fait refuser j12.
    ['n''est pas le millésime courant',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
        VALUES ('j12', 'BIO_M3C_A', 'signature', '0001', 'isole', 'M3C_V0', 'contrat@wellneuro.fr')$q$],
    ['ni présent ni actif',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
        VALUES ('j13', 'BIO_M3C_A', 'signature', '0002', 'isole', 'M3C_V1', 'contrat@wellneuro.fr')$q$],
    ['ni présent ni actif',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
        VALUES ('j14', 'BIO_M3C_A', 'signature', '0003', 'isole', 'M3C_V1', 'contrat@wellneuro.fr')$q$],
    ['n''est pas le millésime courant',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
        VALUES ('j15', 'BIO_M3C_A', 'constat_aucun_acte', 'M3C_V0', 'contrat@wellneuro.fr')$q$],
    -- Concordance : une ligne de journal sans le geste qu'elle dit.
    ['ne se retrouve pas dans la correspondance',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
        VALUES ('j16', 'BIO_M3C_A', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr')$q$],
    ['ne se retrouve pas à la fin',
     $q$INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
        VALUES ('j17', 'BIO_M3C_A', 'constat_aucun_acte', 'M3C_V1', 'contrat@wellneuro.fr')$q$]
  ];
  i int;
  ordre_stocke bigint;
  acte_le_stocke timestamp;
  transaction_stockee bigint;
  signe_le timestamp;
BEGIN
  FOR i IN 1 .. array_length(cas, 1) LOOP
    PERFORM pg_temp.refuse(cas[i][2], cas[i][1]);
  END LOOP;

  -- Cas nominal, écriture d'abord, journal ensuite. La date de signature
  -- envoyée est antidatée : la base pose la sienne.
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('__m3c_corr_a__', 'BIO_M3C_A', '0001', 'isole', 'contrat@wellneuro.fr', '2000-01-01');
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('__m3c_j_a1__', 'BIO_M3C_A', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr')$q$);
  SELECT verifie_le INTO signe_le FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__';
  IF signe_le < '2020-01-01' THEN
    RAISE EXCEPTION 'M-3c: date de signature antidatée par l''écrivain' USING ERRCODE = 'WN001';
  END IF;

  -- Journal d'abord, écriture ensuite ; ordre, date et transaction envoyés
  -- par l'écrivain : la base pose les siens.
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm_journal
      (id, ordre, analyte_code, acte, code_acte, nature, millesime, praticien_email, acte_le, transaction_id)
    VALUES ('__m3c_j_c__', -5, 'BIO_M3C_C', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr',
            '2000-01-01', 42);
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('__m3c_corr_c__', 'BIO_M3C_C', '0001', 'isole', 'contrat@wellneuro.fr', now())$q$);
  SELECT ordre, acte_le, transaction_id INTO ordre_stocke, acte_le_stocke, transaction_stockee
  FROM biology_analyte_nabm_journal WHERE id = '__m3c_j_c__';
  IF ordre_stocke <= 0 THEN
    RAISE EXCEPTION 'M-3c: ordre du journal forgé par l''écrivain' USING ERRCODE = 'WN001';
  END IF;
  IF acte_le_stocke < '2020-01-01' THEN
    RAISE EXCEPTION 'M-3c: date du journal antidatée par l''écrivain' USING ERRCODE = 'WN001';
  END IF;
  IF transaction_stockee IS DISTINCT FROM txid_current() THEN
    RAISE EXCEPTION 'M-3c: transaction du journal forgée par l''écrivain' USING ERRCODE = 'WN001';
  END IF;

  -- Limite écrite dans la migration : un retrait sur un couple jamais signé
  -- concorde avec l'état final, et passe. Il donne à D une ligne de journal.
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
    VALUES ('__m3c_j_d__', 'BIO_M3C_D', 'retrait_constat', 'M3C_V1', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$);

  -- Figé.
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm_journal SET praticien_email = 'autre@wellneuro.fr' WHERE id = '__m3c_j_c__'$q$,
                         'en ajout seul (UPDATE refusé)');
  PERFORM pg_temp.refuse($q$DELETE FROM biology_analyte_nabm_journal WHERE id = '__m3c_j_c__'$q$,
                         'en ajout seul (DELETE refusé)');
  PERFORM pg_temp.refuse($q$TRUNCATE biology_analyte_nabm_journal$q$, 'en ajout seul (TRUNCATE refusé)');

  -- Corollaire : le code d'un analyte journalisé ne se renomme pas, et
  -- l'analyte ne se supprime plus.
  PERFORM pg_temp.refuse($q$UPDATE biology_analytes SET code = 'BIO_M3C_Z' WHERE code = 'BIO_M3C_D'$q$,
                         'en ajout seul (UPDATE refusé)');
  PERFORM pg_temp.refuse($q$DELETE FROM biology_analytes WHERE code = 'BIO_M3C_D'$q$,
                         'biology_analyte_nabm_journal_analyte_code_fkey');
END $$;

-- ═══ Les correspondances ════════════════════════════════════════════════════
DO $$
DECLARE
  le_vu timestamp;
BEGIN
  -- Signature sans journal, journal d'un autre auteur, d'une autre nature.
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('c1', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now())$q$,
    'aucune ligne de journal « signature »');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('c2', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now());
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('c2j', 'BIO_M3C_B', 'signature', '0001', 'isole', 'M3C_V1', 'autre@wellneuro.fr')$q$,
    'aucune ligne de journal « signature »');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('c3', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now());
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('c3j', 'BIO_M3C_B', 'signature', '0001', 'groupe_ou', 'M3C_V1', 'contrat@wellneuro.fr')$q$,
    'aucune ligne de journal « signature »');
  -- Par la voie `ON CONFLICT DO UPDATE` aussi.
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('c4', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now())
    ON CONFLICT (analyte_code, code_acte) DO UPDATE SET verifie_par = EXCLUDED.verifie_par, verifie_le = EXCLUDED.verifie_le$q$,
    'aucune ligne de journal « signature »');

  -- Une signature ne se modifie pas en place, colonne par colonne.
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET nature = 'groupe_ou' WHERE id = '__m3c_corr_a__'$q$,
                         'ne se modifie pas en place');
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET verifie_par = 'autre@wellneuro.fr' WHERE id = '__m3c_corr_a__'$q$,
                         'ne se modifie pas en place');
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET verifie_le = verifie_le - interval '1 day' WHERE id = '__m3c_corr_a__'$q$,
                         'ne se modifie pas en place');
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET code_acte = '0002' WHERE id = '__m3c_corr_a__'$q$,
                         'ne se modifie pas en place');
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET analyte_code = 'BIO_M3C_B' WHERE id = '__m3c_corr_a__'$q$,
                         'ne se modifie pas en place');

  SELECT verifie_le INTO le_vu FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__';

  -- Retrait sans journal, ou dont le journal recopie une autre signature.
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm SET verifie_par = NULL, verifie_le = NULL WHERE id = '__m3c_corr_a__'$q$,
                         'aucune ligne de journal « retrait_signature »');
  PERFORM pg_temp.refuse(format($q$
    UPDATE biology_analyte_nabm SET verifie_par = NULL, verifie_le = NULL WHERE id = '__m3c_corr_a__';
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
    VALUES ('c5j', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'contrat@wellneuro.fr', 'autre@wellneuro.fr', %L)$q$, le_vu),
    'aucune ligne de journal « retrait_signature »');
  PERFORM pg_temp.refuse($q$DELETE FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__'$q$,
                         'aucune ligne de journal « retrait_signature »');
  -- La troncature, qu'aucun trigger de ligne ne voit.
  PERFORM pg_temp.refuse($q$TRUNCATE biology_analyte_nabm$q$, 'TRUNCATE refusé, des correspondances sont signées');
  -- Un retrait journalisé qui laisse la correspondance signée.
  PERFORM pg_temp.refuse(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
    VALUES ('c6j', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'contrat@wellneuro.fr', 'contrat@wellneuro.fr', %L)$q$, le_vu),
    'laisse la correspondance signée');

  -- Une PROPOSITION (non signée) passe sans journal, et se supprime sans journal.
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature) VALUES ('__m3c_prop_b__', 'BIO_M3C_B', '0001', 'isole');
    DELETE FROM biology_analyte_nabm WHERE id = '__m3c_prop_b__'$q$);
END $$;

-- ═══ Les constats ═══════════════════════════════════════════════════════════
DO $$
DECLARE
  constat_le timestamp;
BEGIN
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
    VALUES ('k1j', 'BIO_M3C_A', 'constat_aucun_acte', 'M3C_V1', 'contrat@wellneuro.fr');
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k1', 'BIO_M3C_A', 'M3C_V1', 'contrat@wellneuro.fr')$q$,
    'porte une correspondance signée');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k2', 'BIO_M3C_INACTIF', 'M3C_V1', 'contrat@wellneuro.fr')$q$,
    'est inactif au catalogue');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k3', 'BIO_M3C_B', 'M3C_V0', 'contrat@wellneuro.fr')$q$,
    'n''est pas le millésime courant');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k4', 'BIO_M3C_B', 'M3C_V1', 'contrat@wellneuro.fr')$q$,
    'aucune ligne de journal « constat_aucun_acte »');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k5', 'BIO_M3C_B', 'M3C_V1', ' ')$q$,
    'biology_analyte_nabm_constats_verifie_par_non_vide');

  -- Constat conforme ; la date envoyée est antidatée, la base pose la sienne.
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par, verifie_le)
    VALUES ('__m3c_k_b__', 'BIO_M3C_B', 'M3C_V1', 'contrat@wellneuro.fr', '2000-01-01');
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
    VALUES ('__m3c_j_b1__', 'BIO_M3C_B', 'constat_aucun_acte', 'M3C_V1', 'contrat@wellneuro.fr')$q$);
  SELECT verifie_le INTO constat_le FROM biology_analyte_nabm_constats WHERE id = '__m3c_k_b__';
  IF constat_le < '2020-01-01' THEN
    RAISE EXCEPTION 'M-3c: date du constat antidatée par l''écrivain' USING ERRCODE = 'WN001';
  END IF;

  -- Au plus un constat par analyte.
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
    VALUES ('k6j', 'BIO_M3C_B', 'constat_aucun_acte', 'M3C_V1', 'contrat@wellneuro.fr');
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('k6', 'BIO_M3C_B', 'M3C_V1', 'contrat@wellneuro.fr')$q$,
    'biology_analyte_nabm_constats_analyte_key');

  -- Signature sur un analyte à constat : à la naissance, sur une proposition,
  -- par `ON CONFLICT DO UPDATE`.
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('k7j', 'BIO_M3C_B', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr');
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('k7', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now())$q$,
    'porte un constat « aucun acte »');
  PERFORM pg_temp.accepte($q$
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature) VALUES ('__m3c_prop_b2__', 'BIO_M3C_B', '0001', 'isole')$q$);
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('k8j', 'BIO_M3C_B', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr');
    UPDATE biology_analyte_nabm SET verifie_par = 'contrat@wellneuro.fr', verifie_le = now() WHERE id = '__m3c_prop_b2__'$q$,
    'porte un constat « aucun acte »');
  PERFORM pg_temp.refuse($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('k9j', 'BIO_M3C_B', 'signature', '0001', 'isole', 'M3C_V1', 'contrat@wellneuro.fr');
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('k9', 'BIO_M3C_B', '0001', 'isole', 'contrat@wellneuro.fr', now())
    ON CONFLICT (analyte_code, code_acte) DO UPDATE SET verifie_par = EXCLUDED.verifie_par, verifie_le = EXCLUDED.verifie_le$q$,
    'porte un constat « aucun acte »');

  -- Un constat ne se modifie pas, ne se tronque pas.
  PERFORM pg_temp.refuse($q$UPDATE biology_analyte_nabm_constats SET verifie_par = 'autre@wellneuro.fr' WHERE id = '__m3c_k_b__'$q$,
                         'ne se modifie pas (UPDATE refusé)');
  PERFORM pg_temp.refuse($q$TRUNCATE biology_analyte_nabm_constats$q$, 'ne se modifie pas (TRUNCATE refusé)');

  -- Un retrait de constat journalisé qui laisse le constat ; un retrait sans
  -- journal ; un journal qui recopie une autre date, un autre signataire.
  PERFORM pg_temp.refuse(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
    VALUES ('k10j', 'BIO_M3C_B', 'retrait_constat', 'M3C_V1', 'contrat@wellneuro.fr', 'contrat@wellneuro.fr', %L)$q$, constat_le),
    'laisse un constat');
  PERFORM pg_temp.refuse($q$DELETE FROM biology_analyte_nabm_constats WHERE id = '__m3c_k_b__'$q$,
                         'aucune ligne de journal « retrait_constat »');
  PERFORM pg_temp.refuse($q$
    DELETE FROM biology_analyte_nabm_constats WHERE id = '__m3c_k_b__';
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
    VALUES ('k11j', 'BIO_M3C_B', 'retrait_constat', 'M3C_V1', 'contrat@wellneuro.fr', 'contrat@wellneuro.fr', '2000-01-01')$q$,
    'aucune ligne de journal « retrait_constat »');
  PERFORM pg_temp.refuse(format($q$
    DELETE FROM biology_analyte_nabm_constats WHERE id = '__m3c_k_b__';
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
    VALUES ('k12j', 'BIO_M3C_B', 'retrait_constat', 'M3C_V1', 'contrat@wellneuro.fr', 'autre@wellneuro.fr', %L)$q$, constat_le),
    'aucune ligne de journal « retrait_constat »');

  -- Retrait du constat conforme : le journal recopie ce qu'il efface.
  PERFORM pg_temp.accepte(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
    VALUES ('__m3c_j_b2__', 'BIO_M3C_B', 'retrait_constat', 'M3C_V1', 'retrait@wellneuro.fr', 'contrat@wellneuro.fr', %L);
    DELETE FROM biology_analyte_nabm_constats WHERE id = '__m3c_k_b__'$q$, constat_le));
END $$;

-- ═══ Une ligne de journal par geste, et l'ordre ═════════════════════════════
DO $$
DECLARE
  le_vu timestamp;
BEGIN
  SELECT verifie_le INTO le_vu FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__';

  -- Retrait journalisé puis NOUVELLE signature sans sa propre ligne : la
  -- ligne `signature` du cas nominal (même transaction) ne la couvre pas,
  -- le dernier geste journalisé est le retrait (P2-1 de la revue).
  PERFORM pg_temp.refuse(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
    VALUES ('r1j', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'retrait@wellneuro.fr', 'contrat@wellneuro.fr', %L);
    UPDATE biology_analyte_nabm SET verifie_par = NULL, verifie_le = NULL WHERE id = '__m3c_corr_a__';
    UPDATE biology_analyte_nabm SET verifie_par = 'contrat@wellneuro.fr', verifie_le = now() WHERE id = '__m3c_corr_a__'$q$, le_vu),
    'laisse la correspondance signée');

  -- Retrait conforme puis nouvelle signature : deux lignes.
  PERFORM pg_temp.accepte(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
    VALUES ('__m3c_j_a2__', 'BIO_M3C_A', 'retrait_signature', '0001', 'isole', 'retrait@wellneuro.fr', 'contrat@wellneuro.fr', %L);
    UPDATE biology_analyte_nabm SET verifie_par = NULL, verifie_le = NULL WHERE id = '__m3c_corr_a__';
    UPDATE biology_analyte_nabm SET nature = 'groupe_ou', verifie_par = 'contrat@wellneuro.fr', verifie_le = now() WHERE id = '__m3c_corr_a__';
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
    VALUES ('__m3c_j_a3__', 'BIO_M3C_A', 'signature', '0001', 'groupe_ou', 'M3C_V1', 'contrat@wellneuro.fr')$q$, le_vu));

  -- Suppression conforme d'une ligne signée.
  SELECT verifie_le INTO le_vu FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__';
  PERFORM pg_temp.accepte(format($q$
    INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
    VALUES ('__m3c_j_a4__', 'BIO_M3C_A', 'retrait_signature', '0001', 'groupe_ou', 'retrait@wellneuro.fr', 'contrat@wellneuro.fr', %L);
    DELETE FROM biology_analyte_nabm WHERE id = '__m3c_corr_a__'$q$, le_vu));

  IF (
    SELECT string_agg(acte, ',' ORDER BY ordre)
    FROM biology_analyte_nabm_journal
    WHERE id IN ('__m3c_j_a1__', '__m3c_j_a2__', '__m3c_j_a3__', '__m3c_j_a4__', '__m3c_j_b1__', '__m3c_j_b2__')
  ) IS DISTINCT FROM 'signature,constat_aucun_acte,retrait_constat,retrait_signature,signature,retrait_signature' THEN
    RAISE EXCEPTION 'M-3c: journal incomplet ou désordonné' USING ERRCODE = 'WN001';
  END IF;

  RAISE NOTICE 'M-3c: journal et constats NABM — chaque garde éprouvée par l''écriture qui la viole, pour son motif.';
END $$;

ROLLBACK;

-- ═══ Niveaux d'isolation : seul READ COMMITTED écrit ═════════════════════════
-- Le verrou de l'analyte est la première instruction des deux triggers qui
-- le prennent : le refus précède toute lecture, aucune fixture n'est utile.
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $$
BEGIN
  BEGIN
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('iso1', 'BIO_M3C_ISO', 'M3C_V1', 'contrat@wellneuro.fr');
    RAISE EXCEPTION 'M-3c: constat écrit en REPEATABLE READ' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN
    IF position('exige READ COMMITTED' IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'M-3c: refus attendu en REPEATABLE READ, obtenu : %', SQLERRM USING ERRCODE = 'WN001';
    END IF;
  END;
  BEGIN
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('iso2', 'BIO_M3C_ISO', '0001', 'isole', 'contrat@wellneuro.fr', now());
    RAISE EXCEPTION 'M-3c: signature écrite en REPEATABLE READ' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN
    IF position('exige READ COMMITTED' IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'M-3c: refus attendu en REPEATABLE READ, obtenu : %', SQLERRM USING ERRCODE = 'WN001';
    END IF;
  END;
END $$;
ROLLBACK;

BEGIN ISOLATION LEVEL SERIALIZABLE;
DO $$
BEGIN
  BEGIN
    INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
    VALUES ('iso3', 'BIO_M3C_ISO', 'M3C_V1', 'contrat@wellneuro.fr');
    RAISE EXCEPTION 'M-3c: constat écrit en SERIALIZABLE' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN
    IF position('exige READ COMMITTED' IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'M-3c: refus attendu en SERIALIZABLE, obtenu : %', SQLERRM USING ERRCODE = 'WN001';
    END IF;
  END;
  BEGIN
    INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ('iso4', 'BIO_M3C_ISO', '0001', 'isole', 'contrat@wellneuro.fr', now());
    RAISE EXCEPTION 'M-3c: signature écrite en SERIALIZABLE' USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN
    IF position('exige READ COMMITTED' IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'M-3c: refus attendu en SERIALIZABLE, obtenu : %', SQLERRM USING ERRCODE = 'WN001';
    END IF;
  END;
END $$;
ROLLBACK;
