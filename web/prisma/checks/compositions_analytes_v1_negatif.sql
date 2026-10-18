-- Contrat de migration 20261018100000_compositions_analytes_v1 (F80, D-323 §1).
-- Exécuté après `prisma migrate deploy` ; tout est annulé (ROLLBACK).
-- Chaque garantie est éprouvée par l'écriture qui devrait la violer, et le
-- refus doit porter SON motif (`pg_temp.refuse`) : un refus pour une autre
-- raison fait échouer le contrat (ERRCODE sentinelle WN001, jamais
-- intercepté). Chaque refus a sa contre-épreuve : la même écriture, rendue
-- conforme, passe (`pg_temp.accepte`).
--
-- LA GARDE DIFFÉRÉE (« au moins un élément ») se juge au COMMIT, que ce
-- contrat n'atteint jamais : `SET CONSTRAINTS ALL IMMEDIATE` la juge dans la
-- sous-transaction de chaque cas.
--
-- « LES ÉLÉMENTS S'ÉCRIVENT AVEC LA SIGNATURE » compare la transaction de
-- l'en-tête à la transaction courante : le contrat, en une transaction, ne
-- peut pas la quitter. Le cas pose donc un en-tête d'une transaction
-- antérieure, trigger d'insertion suspendu le temps de l'écrire (annulé avec
-- le reste).
BEGIN;

-- ── Structurel : RLS sans policy, aucun grant Data API, triggers en place ──
DO $$
DECLARE
  t text;
  trig text;
BEGIN
  FOREACH t IN ARRAY ARRAY['biology_analyte_compositions', 'biology_analyte_composition_items'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE oid = ('public.' || t)::regclass AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'F80: RLS non activée sur %', t USING ERRCODE = 'WN001';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t) THEN
      RAISE EXCEPTION 'F80: policy inattendue sur %', t USING ERRCODE = 'WN001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = t AND grantee IN ('anon', 'authenticated')
    ) THEN
      RAISE EXCEPTION 'F80: grant Data API inattendu sur %', t USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  FOREACH trig IN ARRAY ARRAY[
    'biology_analyte_compositions_avant_insertion',
    'biology_analyte_compositions_avant_maj',
    'biology_analyte_compositions_no_delete',
    'biology_analyte_compositions_no_truncate',
    'biology_analyte_compositions_exige_items',
    'biology_analyte_composition_items_avant_insertion',
    'biology_analyte_composition_items_no_update',
    'biology_analyte_composition_items_no_delete',
    'biology_analyte_composition_items_no_truncate'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trig AND NOT tgisinternal) THEN
      RAISE EXCEPTION 'F80: trigger % absent', trig USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'biology_analyte_compositions_exige_items' AND tgdeferrable AND tginitdeferred
  ) THEN
    RAISE EXCEPTION 'F80: « au moins un élément » n''est pas DEFERRABLE INITIALLY DEFERRED' USING ERRCODE = 'WN001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'biology_analyte_compositions_une_active'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%retiree_le IS NULL%'
  ) THEN
    RAISE EXCEPTION 'F80: index partiel « une composition active » absent' USING ERRCODE = 'WN001';
  END IF;

  -- Aucune composition écrite par migration (D-323, « ne touche pas »).
  IF EXISTS (SELECT 1 FROM biology_analyte_compositions WHERE id NOT LIKE '\_\_f80%') THEN
    RAISE EXCEPTION 'F80: une composition existe sans signature du praticien' USING ERRCODE = 'WN001';
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
      RAISE EXCEPTION 'F80: refus attendu pour « % », obtenu : %', p_motif, SQLERRM USING ERRCODE = 'WN001';
    END IF;
    SET CONSTRAINTS ALL DEFERRED;
    RETURN;
  END;
  RAISE EXCEPTION 'F80: accepté alors qu''il devait être refusé (« % ») : %', p_motif, p_sql USING ERRCODE = 'WN001';
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

-- ── Fixtures : trois analytes de contrat ───────────────────────────────────
INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, actif, updated_at) VALUES
  ('__f80_g__', 'BIO_F80_GROUPE', 'Groupe de contrat', 'sang', 'saisie_praticien', 'lacunaire', true, now()),
  ('__f80_a__', 'BIO_F80_A', 'Constituant de contrat A', 'sang', 'saisie_praticien', 'partielle', true, now()),
  ('__f80_b__', 'BIO_F80_B', 'Constituant de contrat B', 'sang', 'saisie_praticien', 'partielle', true, now());

-- ═══ L'en-tête : forme ═════════════════════════════════════════════════════
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_t1', 'BIO_F80_GROUPE', 'formule', 'contrat@wellneuro.fr')$q$,
  'biology_analyte_compositions_type_check');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_t2', 'BIO_F80_GROUPE', 'groupe', E' \t')$q$,
  'biology_analyte_compositions_verifie_par_non_vide');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par, retiree_par, retiree_le) VALUES ('__f80_t3', 'BIO_F80_GROUPE', 'groupe', 'contrat@wellneuro.fr', 'x@wellneuro.fr', now())$q$,
  'ne naît pas retirée');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_t4', 'BIO_F80_INCONNU', 'groupe', 'contrat@wellneuro.fr')$q$,
  'biology_analyte_compositions_analyte_code_fkey');

-- ═══ Au moins un élément, jugé au COMMIT ══════════════════════════════════
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_vide', 'BIO_F80_GROUPE', 'groupe', 'contrat@wellneuro.fr')$q$,
  'n''a aucun élément');

-- ═══ Les éléments : forme ═════════════════════════════════════════════════
-- Contre-épreuve d'abord : la composition conforme passe, et reste pour la suite.
SELECT pg_temp.accepte($q$
  INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par, verifie_le)
    VALUES ('__f80_ok', 'BIO_F80_GROUPE', 'groupe', 'contrat@wellneuro.fr', '2000-01-01');
  INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES
    ('__f80_ok_1', '__f80_ok', 'BIO_F80_A', 0)
$q$);

DO $$
BEGIN
  -- La date de signature est celle de la base, pas celle du client.
  IF (SELECT verifie_le FROM biology_analyte_compositions WHERE id = '__f80_ok') < now() AT TIME ZONE 'UTC' - interval '1 hour' THEN
    RAISE EXCEPTION 'F80: verifie_le reçu du client au lieu d''être posé par la base' USING ERRCODE = 'WN001';
  END IF;
END $$;

SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_i1', '__f80_ok', 'BIO_F80_GROUPE', 1)$q$,
  'ne se compose pas de lui-même');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_i2', '__f80_ok', 'BIO_F80_A', 1)$q$,
  'biology_analyte_composition_items_composant_key');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_i3', '__f80_ok', 'BIO_F80_B', 0)$q$,
  'biology_analyte_composition_items_position_key');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_i4', '__f80_ok', 'BIO_F80_B', -1)$q$,
  'biology_analyte_composition_items_position_check');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_i5', '__f80_ok', 'BIO_F80_INCONNU', 1)$q$,
  'biology_analyte_composition_items_composant_code_fkey');
-- Contre-épreuve : un second élément conforme, dans la transaction de la signature, passe.
SELECT pg_temp.accepte(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_ok_2', '__f80_ok', 'BIO_F80_B', 1)$q$);

-- ═══ Une seule composition active par analyte ═════════════════════════════
SELECT pg_temp.refuse($q$
  INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_bis', 'BIO_F80_GROUPE', 'groupe', 'contrat@wellneuro.fr');
  INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_bis_1', '__f80_bis', 'BIO_F80_A', 0)
$q$, 'biology_analyte_compositions_une_active');

-- ═══ Figée : ni modification, ni suppression ═══════════════════════════════
SELECT pg_temp.refuse($q$UPDATE biology_analyte_compositions SET type = 'calcul' WHERE id = '__f80_ok'$q$, 'ne se modifie pas');
SELECT pg_temp.refuse($q$UPDATE biology_analyte_compositions SET verifie_par = 'autre@wellneuro.fr' WHERE id = '__f80_ok'$q$, 'ne se modifie pas');
SELECT pg_temp.refuse($q$UPDATE biology_analyte_compositions SET retiree_le = now() WHERE id = '__f80_ok'$q$, 'seul le retrait, signé');
SELECT pg_temp.refuse($q$DELETE FROM biology_analyte_compositions WHERE id = '__f80_ok'$q$, 'en ajout seul (DELETE refusé)');
SELECT pg_temp.refuse($q$TRUNCATE biology_analyte_compositions CASCADE$q$, 'en ajout seul (TRUNCATE refusé)');
SELECT pg_temp.refuse($q$UPDATE biology_analyte_composition_items SET position = 5 WHERE id = '__f80_ok_1'$q$, 'en ajout seul (UPDATE refusé)');
SELECT pg_temp.refuse($q$DELETE FROM biology_analyte_composition_items WHERE id = '__f80_ok_1'$q$, 'en ajout seul (DELETE refusé)');
SELECT pg_temp.refuse($q$TRUNCATE biology_analyte_composition_items$q$, 'en ajout seul (TRUNCATE refusé)');

-- ═══ Les éléments s'écrivent avec la signature, jamais après ══════════════
-- La garde différée est suspendue aussi : sans élément, l'en-tête d'hier
-- ferait échouer le prochain `SET CONSTRAINTS ALL IMMEDIATE`.
INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, actif, updated_at) VALUES
  ('__f80_h__', 'BIO_F80_HIER', 'Composé de contrat signé hier', 'sang', 'saisie_praticien', 'lacunaire', true, now());
ALTER TABLE biology_analyte_compositions DISABLE TRIGGER biology_analyte_compositions_avant_insertion;
ALTER TABLE biology_analyte_compositions DISABLE TRIGGER biology_analyte_compositions_exige_items;
INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par, transaction_id)
  VALUES ('__f80_hier', 'BIO_F80_HIER', 'groupe', 'contrat@wellneuro.fr', 1);
ALTER TABLE biology_analyte_compositions ENABLE TRIGGER biology_analyte_compositions_exige_items;
ALTER TABLE biology_analyte_compositions ENABLE TRIGGER biology_analyte_compositions_avant_insertion;
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_tard', '__f80_hier', 'BIO_F80_A', 0)$q$,
  'avec la signature, jamais après');

-- ═══ Le retrait : une fois, signé, daté par la base ════════════════════════
SELECT pg_temp.accepte($q$UPDATE biology_analyte_compositions SET retiree_par = 'contrat@wellneuro.fr', retiree_le = '2000-01-01' WHERE id = '__f80_ok'$q$);
DO $$
BEGIN
  IF (SELECT retiree_le FROM biology_analyte_compositions WHERE id = '__f80_ok') < now() AT TIME ZONE 'UTC' - interval '1 hour' THEN
    RAISE EXCEPTION 'F80: retiree_le reçu du client au lieu d''être posé par la base' USING ERRCODE = 'WN001';
  END IF;
END $$;
SELECT pg_temp.refuse($q$UPDATE biology_analyte_compositions SET retiree_par = 'autre@wellneuro.fr' WHERE id = '__f80_ok'$q$, 'retirée est figée');
SELECT pg_temp.refuse(
  $q$INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_apres', '__f80_ok', 'BIO_F80_B', 7)$q$,
  'composition retirée');
-- Contre-épreuve : après retrait, une nouvelle signature passe (l'historique reste).
SELECT pg_temp.accepte($q$
  INSERT INTO biology_analyte_compositions (id, analyte_code, type, verifie_par) VALUES ('__f80_neuve', 'BIO_F80_GROUPE', 'groupe', 'contrat@wellneuro.fr');
  INSERT INTO biology_analyte_composition_items (id, composition_id, composant_code, position) VALUES ('__f80_neuve_1', '__f80_neuve', 'BIO_F80_B', 0)
$q$);
DO $$
BEGIN
  IF (SELECT count(*) FROM biology_analyte_compositions WHERE analyte_code = 'BIO_F80_GROUPE') <> 2 THEN
    RAISE EXCEPTION 'F80: l''historique des compositions n''est pas gardé' USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
