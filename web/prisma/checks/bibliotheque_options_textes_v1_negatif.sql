-- Contrat du texte d'accompagnement de la bibliothèque des options
-- ([[D-480]] §3, BP-17, migration seule).
--
-- Les deux tables promettent TREIZE choses, et ce fichier éprouve chacune.
-- Deux CHECK n'y rougissent pas seuls, masqués par le trigger qui refuse
-- avant eux : le format de l'empreinte d'un acte (une empreinte mal formée
-- n'est jamais celle d'un texte) et le numéro positif (le trigger exige le
-- numéro qui suit) ; ils restent en filet. Les treize promesses :
--   1. une version et ses actes valides s'écrivent ;
--   2. les instants sont posés par la BASE, en UTC — joué sous un fuseau de
--      session Europe/Paris — sur les deux tables ;
--   3. les formats sont fermés : identifiant d'option sans espace et borné,
--      empreinte de structure, auteur et validateur visibles et bornés ;
--      option, rubrique et numéro NULL, empreinte d'acte NULL, refusés ;
--   4. la rubrique est en liste FERMÉE, celle de D-480 §1 : la population
--      (BP-12a) et « explication patient » sont refusées ;
--   5. le texte est visible, et son empreinte est celle de son texte ;
--   6. le numéro SUIT le dernier du couple option × rubrique : un saut est
--      refusé, un doublon aussi ; deux rubriques, ou deux options, ont
--      chacune leur suite ;
--   7. VALIDER exige la relecture intégrale ; RETIRER exige un motif visible
--      et borné, NULL compris ; l'acte est en liste fermée ;
--   8. l'empreinte d'un acte est celle du texte visé ; un texte inconnu est
--      refusé sous son nom ;
--   9. seule la DERNIÈRE version d'un couple reçoit un acte, validation comme
--      retrait — et la règle se juge couple par couple : la v2 d'un couple ne
--      dépasse ni une autre rubrique de l'option, ni une autre option ;
--  10. `ordre` est posé par la base ;
--  11. UPDATE, DELETE et TRUNCATE sont refusés sur les deux tables, chacune
--      par son PROPRE trigger TRUNCATE ;
--  12. la FK des actes est en ON DELETE RESTRICT ; la RLS deny-all est
--      active et sans policy (posture `D-005`), AUCUNE colonne ne désigne
--      un patient, et PUBLIC n'exécute aucune fonction de trigger ;
--  13. READ COMMITTED SEUL : une version ou un acte en REPEATABLE READ, puis
--      en SERIALIZABLE, est refusé (une transaction par niveau, en fin de
--      fichier).
--
-- Hors de ce fichier : la concurrence réelle (deux sessions, verrou constaté
-- en attente), au banc sur base réelle de la PR 5.
--
-- Ce que la base ne vérifie pas — l'existence de l'option à la structure,
-- l'égalité de `structure_sha256` à l'empreinte signée — est à la route et
-- à la lecture (PR 5).
--
-- TEXTE SYNTHÉTIQUE SEULEMENT : aucune option, dose, durée, précaution ni
-- autre texte clinique n'entre dans le dépôt, qui est public ([[D-251]] §4).
--
-- Tout se déroule dans des transactions annulées.
BEGIN;

SET LOCAL TimeZone TO 'Europe/Paris';

-- Une requête qui DOIT être refusée, avec l'un des états attendus : P0001
-- (trigger), 23514 (CHECK), 23503 (FK), 23505 (unicité). Le refus d'un autre
-- état fait échouer le contrat : un refus pour une mauvaise raison ne
-- prouve rien. `motif`, s'il est donné, est un fragment du message attendu.
CREATE FUNCTION pg_temp.doit_refuser(libelle text, requete text, etats text[], motif text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION
    WHEN others THEN
      IF NOT (SQLSTATE = ANY (etats)) THEN
        RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      IF motif IS NOT NULL AND strpos(SQLERRM, motif) = 0 THEN
        RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » refusé, mais pas sous son motif (« % » attendu, reçu : %).', libelle, motif, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » a été accepté.', libelle;
END;
$$;

DO $$
DECLARE
  nb integer;
  instant timestamp;
  o1 bigint;
  o2 bigint;
  S CONSTANT text := repeat('a', 64);
  T1 CONSTANT text := 'Texte synthétique.';
  T2 CONSTANT text := 'Texte synthétique révisé.';
  H1 CONSTANT text := encode(sha256(convert_to('Texte synthétique.', 'UTF8')), 'hex');
  H2 CONSTANT text := encode(sha256(convert_to('Texte synthétique révisé.', 'UTF8')), 'hex');
  V CONSTANT text := 'INSERT INTO bibliotheque_options_textes (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur) VALUES ';
  A CONSTANT text := 'INSERT INTO bibliotheque_options_textes_actes (id, id_texte, acte, empreinte, validateur, relecture_integrale, motif) VALUES ';
BEGIN
  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- Instant fourni par l'appelant : la base doit l'écraser.
    INSERT INTO bibliotheque_options_textes
      (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur, cree_le)
    VALUES ('bot_1', 'OPT_CONTRAT_1', 'precautions', 1, T1, H1, S, 'praticien@wellneuro.fr',
            TIMESTAMP '2000-01-01 00:00:00');
    -- Ordre et instant fournis : la base doit les écraser.
    INSERT INTO bibliotheque_options_textes_actes
      (id, ordre, id_texte, acte, empreinte, validateur, relecture_integrale, le)
    VALUES ('boa_1', 999999, 'bot_1', 'validee', H1, 'praticien@wellneuro.fr', true,
            TIMESTAMP '2000-01-01 00:00:00');
    -- Chaque rubrique de la liste fermée s'écrit.
    INSERT INTO bibliotheque_options_textes
      (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur)
    SELECT 'bot_r_' || r, 'OPT_CONTRAT_2', r, 1, T1, H1, S, 'p'
    FROM unnest(ARRAY[
      'produit_statut_reglementaire', 'dose', 'duree', 'precautions',
      'contre_indications', 'interactions', 'surveillance', 'critere_arret',
      'role_praticien'
    ]) AS r;
    -- Un retrait motivé, sans relecture déclarée, sur la dernière version.
    INSERT INTO bibliotheque_options_textes_actes
      (id, id_texte, acte, empreinte, validateur, relecture_integrale, motif)
    VALUES ('boa_r', 'bot_r_dose', 'retiree', H1, 'p', false, 'Motif synthétique.');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: un cas valide a été refusé (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM bibliotheque_options_textes WHERE option_id = 'OPT_CONTRAT_2';
  IF nb <> 9 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: % rubrique(s) écrite(s) sur 9.', nb;
  END IF;

  -- ── 2. Les instants sont posés par la base, en UTC ───────────────────────
  SELECT cree_le INTO instant FROM bibliotheque_options_textes WHERE id = 'bot_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: l''instant d''une version (%) n''est pas posé par la base en UTC.', instant;
  END IF;
  SELECT le INTO instant FROM bibliotheque_options_textes_actes WHERE id = 'boa_1';
  IF abs(extract(epoch FROM (instant - (clock_timestamp() AT TIME ZONE 'UTC')))) > 300 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: l''instant d''un acte (%) n''est pas posé par la base en UTC.', instant;
  END IF;

  -- ── 3. Formats fermés ────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('identifiant d''option vide',
    V || '(''x1'', '''', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('identifiant d''option avec espace',
    V || '(''x2'', ''OPT X'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('identifiant d''option avec tabulation',
    V || '(''x3'', E''OPT\tX'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('identifiant d''option trop long',
    V || '(''x4'', repeat(''O'', 129), ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('empreinte de structure mal formée',
    V || '(''x5'', ''OPT_X'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(upper(S)) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('auteur blanc',
    V || '(''x6'', ''OPT_X'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', E''\t'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('auteur trop long',
    V || '(''x7'', ''OPT_X'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', repeat(''p'', 321))', ARRAY['23514']);
  -- NULL : le verrou (`hashtext` NULL) ne se prend pas, le trigger laisse
  -- passer, et le NOT NULL refuse (revue `wn-reviewer`, N5).
  PERFORM pg_temp.doit_refuser('identifiant d''option NULL',
    V || '(''x1n'', NULL, ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23502']);
  PERFORM pg_temp.doit_refuser('rubrique NULL',
    V || '(''x1r'', ''OPT_X'', NULL, 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23502']);
  PERFORM pg_temp.doit_refuser('numéro NULL',
    V || '(''x1u'', ''OPT_X'', ''dose'', NULL, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['P0001'], 'le numéro attendu est 1');
  PERFORM pg_temp.doit_refuser('acte à l''empreinte NULL',
    A || '(''z0n'', ''bot_1'', ''validee'', NULL, ''p'', true, NULL)', ARRAY['P0001'], 'ne correspond pas au texte bot_1');
  PERFORM pg_temp.doit_refuser('validateur blanc',
    A || '(''z1'', ''bot_1'', ''validee'', ' || quote_literal(H1) || ', E''\n'', true, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('validateur trop long',
    A || '(''z2'', ''bot_1'', ''validee'', ' || quote_literal(H1) || ', repeat(''p'', 321), true, NULL)', ARRAY['23514']);

  -- ── 4. Rubrique en liste fermée ──────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('rubrique population (BP-12a)',
    V || '(''x8'', ''OPT_X'', ''population'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('rubrique explication patient',
    V || '(''x9'', ''OPT_X'', ''explication_patient'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('rubrique produit seule (une rubrique avec le statut)',
    V || '(''x10'', ''OPT_X'', ''produit'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);

  -- ── 5. Texte visible, empreinte du texte ─────────────────────────────────
  PERFORM pg_temp.doit_refuser('texte blanc (tabulations)',
    V || '(''x11'', ''OPT_X'', ''dose'', 1, E''\t\t'', encode(sha256(convert_to(E''\t\t'', ''UTF8'')), ''hex''), ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('empreinte qui n''est pas celle du texte',
    V || '(''x12'', ''OPT_X'', ''dose'', 1, ' || quote_literal(T1) || ', ' || quote_literal(H2) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['23514']);

  -- ── 6. Le numéro suit le dernier du couple ───────────────────────────────
  PERFORM pg_temp.doit_refuser('numéro sauté',
    V || '(''x13'', ''OPT_CONTRAT_1'', ''precautions'', 3, ' || quote_literal(T2) || ', ' || quote_literal(H2) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['P0001'], 'le numéro attendu est 2');
  PERFORM pg_temp.doit_refuser('numéro en doublon',
    V || '(''x14'', ''OPT_CONTRAT_1'', ''precautions'', 1, ' || quote_literal(T2) || ', ' || quote_literal(H2) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['P0001'], 'le numéro attendu est 2');
  PERFORM pg_temp.doit_refuser('première version numérotée 0',
    V || '(''x15'', ''OPT_NEUVE'', ''dose'', 0, ' || quote_literal(T1) || ', ' || quote_literal(H1) || ', ' || quote_literal(S) || ', ''p'')', ARRAY['P0001'], 'le numéro attendu est 1');
  -- Une autre rubrique de la même option, et la même rubrique d'une autre
  -- option, commencent chacune à 1 (bot_1 est `OPT_CONTRAT_1` × precautions).
  BEGIN
    INSERT INTO bibliotheque_options_textes
      (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur)
    VALUES ('bot_autre_rub', 'OPT_CONTRAT_1', 'dose', 1, T1, H1, S, 'p'),
           ('bot_autre_opt', 'OPT_CONTRAT_3', 'precautions', 1, T1, H1, S, 'p');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: une suite propre à son couple a été refusée (%)', SQLERRM;
  END;

  -- ── 7. Relecture pour valider, motif pour retirer, acte fermé ────────────
  PERFORM pg_temp.doit_refuser('validation sans relecture intégrale',
    A || '(''z3'', ''bot_1'', ''validee'', ' || quote_literal(H1) || ', ''p'', false, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait sans motif (NULL)',
    A || '(''z4'', ''bot_1'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, NULL)', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait au motif blanc',
    A || '(''z5'', ''bot_1'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, E'' \t'')', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('retrait au motif trop long',
    A || '(''z6'', ''bot_1'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, repeat(''m'', 4001))', ARRAY['23514']);
  PERFORM pg_temp.doit_refuser('acte hors liste',
    A || '(''z7'', ''bot_1'', ''signee'', ' || quote_literal(H1) || ', ''p'', true, NULL)', ARRAY['23514']);

  -- ── 8. Empreinte du texte visé ; cible inconnue sous son nom ─────────────
  PERFORM pg_temp.doit_refuser('acte à l''empreinte d''un autre texte',
    A || '(''z8'', ''bot_1'', ''validee'', ' || quote_literal(H2) || ', ''p'', true, NULL)', ARRAY['P0001'], 'ne correspond pas au texte bot_1');
  PERFORM pg_temp.doit_refuser('acte sur un texte inconnu',
    A || '(''z9'', ''bot_inconnu'', ''validee'', ' || quote_literal(H1) || ', ''p'', true, NULL)', ARRAY['P0001'], 'texte de bibliothèque bot_inconnu inconnu');

  -- ── 9. Seule la dernière version reçoit un acte ──────────────────────────
  INSERT INTO bibliotheque_options_textes
    (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur)
  VALUES ('bot_2', 'OPT_CONTRAT_1', 'precautions', 2, T2, H2, S, 'p');
  PERFORM pg_temp.doit_refuser('validation d''une version dépassée',
    A || '(''z10'', ''bot_1'', ''validee'', ' || quote_literal(H1) || ', ''p'', true, NULL)', ARRAY['P0001'], 'n''est plus la dernière version');
  PERFORM pg_temp.doit_refuser('retrait d''une version dépassée',
    A || '(''z11'', ''bot_1'', ''retiree'', ' || quote_literal(H1) || ', ''p'', false, ''Motif.'')', ARRAY['P0001'], 'n''est plus la dernière version');
  BEGIN
    INSERT INTO bibliotheque_options_textes_actes
      (id, id_texte, acte, empreinte, validateur, relecture_integrale)
    VALUES ('boa_2', 'bot_2', 'validee', H2, 'p', true);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: la validation de la dernière version a été refusée (%)', SQLERRM;
  END;
  -- La règle se juge COUPLE PAR COUPLE (revue `wn-reviewer`, C1) : une v2
  -- de `OPT_CONTRAT_1` × precautions ne rend dépassée ni une autre rubrique
  -- de la même option, ni la même rubrique d'une autre option.
  BEGIN
    INSERT INTO bibliotheque_options_textes_actes
      (id, id_texte, acte, empreinte, validateur, relecture_integrale)
    VALUES ('boa_autre_rub', 'bot_autre_rub', 'validee', H1, 'p', true),
           ('boa_autre_opt', 'bot_autre_opt', 'validee', H1, 'p', true);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: un acte a été refusé à cause d''un AUTRE couple (%)', SQLERRM;
  END;

  -- ── 10. `ordre` posé par la base ─────────────────────────────────────────
  SELECT ordre INTO o1 FROM bibliotheque_options_textes_actes WHERE id = 'boa_1';
  SELECT ordre INTO o2 FROM bibliotheque_options_textes_actes WHERE id = 'boa_2';
  IF o1 = 999999 OR o2 <= o1 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: l''ordre des actes n''est pas posé par la base (% puis %).', o1, o2;
  END IF;

  -- ── 11. Append-only ──────────────────────────────────────────────────────
  PERFORM pg_temp.doit_refuser('UPDATE d''une version',
    'UPDATE bibliotheque_options_textes SET auteur = ''q'' WHERE id = ''bot_autre_opt''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('DELETE d''une version sans acte',
    'DELETE FROM bibliotheque_options_textes WHERE id = ''bot_r_duree''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('UPDATE d''un acte',
    'UPDATE bibliotheque_options_textes_actes SET motif = ''q'' WHERE id = ''boa_1''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('DELETE d''un acte',
    'DELETE FROM bibliotheque_options_textes_actes WHERE id = ''boa_1''', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('TRUNCATE des versions',
    'TRUNCATE bibliotheque_options_textes CASCADE', ARRAY['P0001']);
  PERFORM pg_temp.doit_refuser('TRUNCATE des actes',
    'TRUNCATE bibliotheque_options_textes_actes', ARRAY['P0001']);
  -- Les TABLES distinctes qui portent un trigger TRUNCATE ACTIF (`O` ou
  -- `A`) : la cascade ci-dessus peut se faire refuser par la table voisine,
  -- si bien que le sondage seul ne prouve rien pour les versions.
  SELECT count(DISTINCT c.relname) INTO nb
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname IN ('bibliotheque_options_textes', 'bibliotheque_options_textes_actes')
    AND (t.tgtype & 32) <> 0 AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: % trigger(s) TRUNCATE sur 2 — chaque table porte le sien.', nb;
  END IF;

  -- ── 12. FK RESTRICT, RLS deny-all, aucune colonne patient ────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint k
  JOIN pg_class enfant ON enfant.oid = k.conrelid
  JOIN pg_class ref ON ref.oid = k.confrelid
  WHERE k.contype = 'f' AND k.confdeltype = 'r'
    AND ref.relname = 'bibliotheque_options_textes'
    AND enfant.relname = 'bibliotheque_options_textes_actes';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: FK des actes absente ou hors ON DELETE RESTRICT.';
  END IF;
  SELECT count(*) INTO nb
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('bibliotheque_options_textes', 'bibliotheque_options_textes_actes')
    AND c.relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: RLS inactive sur % table(s) sur 2.', 2 - nb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('bibliotheque_options_textes', 'bibliotheque_options_textes_actes')
  ) THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: policy inattendue (deny-all attendu).';
  END IF;
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('bibliotheque_options_textes', 'bibliotheque_options_textes_actes')
    AND (c.column_name LIKE '%patient%' OR c.column_name LIKE '%assignation%'
         OR c.column_name LIKE '%consultation%' OR c.column_name LIKE '%dossier%');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: % colonne(s) désignent un patient — ces tables ne portent AUCUNE donnée patient.', nb;
  END IF;
  -- Les fonctions des triggers ne s'exécutent pas hors des triggers
  -- (revue `wn-reviewer`, N2).
  SELECT count(*) INTO nb
  FROM unnest(ARRAY[
    'public.bibliotheque_options_append_only()',
    'public.bibliotheque_options_textes_avant_insertion()',
    'public.bibliotheque_options_textes_actes_avant_insertion()'
  ]) AS f
  WHERE has_function_privilege('public', f, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: % fonction(s) de trigger exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'BIBLIOTHEQUE OPTIONS: versions et actes valides acceptés, neuf rubriques ; instants en UTC sous Europe/Paris ; formats fermés ; rubrique fermée (population et explication patient refusées) ; texte visible et son empreinte ; numéro qui suit, par couple ; relecture et motif exigés, acte fermé ; empreinte du texte visé, cible inconnue nommée ; dernière version seule ; ordre posé par la base ; UPDATE/DELETE/TRUNCATE refusés, trigger TRUNCATE propre ; FK RESTRICT ; RLS deny-all ; aucune colonne patient.';
END $$;

ROLLBACK;

-- ── 13. READ COMMITTED seul ────────────────────────────────────────────────
-- Une transaction à part : l'isolation se fixe avant la première requête.
-- Le refus d'isolation passe avant toute lecture : la cible inconnue de
-- l'acte ne masque pas le motif attendu.
BEGIN ISOLATION LEVEL REPEATABLE READ;

CREATE FUNCTION pg_temp.doit_refuser_isolation(libelle text, requete text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION
    WHEN others THEN
      IF SQLSTATE <> 'P0001' OR strpos(SQLERRM, 'exige READ COMMITTED') = 0 THEN
        RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » a été accepté.', libelle;
END;
$$;

DO $$
BEGIN
  PERFORM pg_temp.doit_refuser_isolation('version en REPEATABLE READ',
    'INSERT INTO bibliotheque_options_textes (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur) VALUES (''rr_1'', ''OPT_RR'', ''dose'', 1, ''Texte.'', encode(sha256(convert_to(''Texte.'', ''UTF8'')), ''hex''), repeat(''a'', 64), ''p'')');
  PERFORM pg_temp.doit_refuser_isolation('acte en REPEATABLE READ',
    'INSERT INTO bibliotheque_options_textes_actes (id, id_texte, acte, empreinte, validateur, relecture_integrale) VALUES (''rr_a'', ''bot_inconnu'', ''validee'', repeat(''a'', 64), ''p'', true)');
  RAISE NOTICE 'BIBLIOTHEQUE OPTIONS: version et acte refusés en REPEATABLE READ.';
END $$;

ROLLBACK;

-- Puis SERIALIZABLE, chaque niveau sa transaction (revue `wn-reviewer`, C2).
BEGIN ISOLATION LEVEL SERIALIZABLE;

CREATE FUNCTION pg_temp.doit_refuser_isolation(libelle text, requete text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION
    WHEN others THEN
      IF SQLSTATE <> 'P0001' OR strpos(SQLERRM, 'exige READ COMMITTED') = 0 THEN
        RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » refusé pour une autre raison (% : %).', libelle, SQLSTATE, SQLERRM;
      END IF;
      RETURN;
  END;
  RAISE EXCEPTION 'BIBLIOTHEQUE OPTIONS: « % » a été accepté.', libelle;
END;
$$;

DO $$
BEGIN
  PERFORM pg_temp.doit_refuser_isolation('version en SERIALIZABLE',
    'INSERT INTO bibliotheque_options_textes (id, option_id, rubrique, numero, texte, texte_sha256, structure_sha256, auteur) VALUES (''sr_1'', ''OPT_SR'', ''dose'', 1, ''Texte.'', encode(sha256(convert_to(''Texte.'', ''UTF8'')), ''hex''), repeat(''a'', 64), ''p'')');
  PERFORM pg_temp.doit_refuser_isolation('acte en SERIALIZABLE',
    'INSERT INTO bibliotheque_options_textes_actes (id, id_texte, acte, empreinte, validateur, relecture_integrale) VALUES (''sr_a'', ''bot_inconnu'', ''validee'', repeat(''a'', 64), ''p'', true)');
  RAISE NOTICE 'BIBLIOTHEQUE OPTIONS: version et acte refusés en SERIALIZABLE.';
END $$;

ROLLBACK;
