-- Contrat des actes de lecture d'un import biologique validé ([[D-268]],
-- BIO-PARCOURS BP-10).
--
-- La table promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. une lecture valide s'écrit et se relit ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ;
--   3. l'import d'un AUTRE dossier, ou un import inexistant, est refusé ;
--   4. seul le praticien DU DOSSIER pose un acte (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) — lecture comme
--      révocation ;
--   5. une lecture exige un import VALIDÉ et ENTIÈREMENT DÉCIDÉ : ni un
--      import dont les lignes sont toutes écartées, ni un import dont les
--      lignes sont encore proposées, ni un import validé qui garde une ligne
--      proposée ;
--   6. au plus UNE lecture active par import : une seconde est refusée ;
--   7. une révocation valide s'écrit, et une nouvelle lecture est alors
--      admise — puis une troisième redevient refusée ;
--   8. une révocation vise une LECTURE de CET import : ni une révocation, ni
--      la lecture d'un autre import, ni une cible inexistante ; et une
--      lecture ne se révoque qu'UNE fois ;
--   9. le code de révocation est pris dans la liste FERMÉE — ses trois codes
--      passent, un autre est refusé ;
--  10. chaque acte a sa forme : une lecture ne porte ni code ni cible, une
--      révocation porte son code ; un acte inconnu est refusé ;
--  11. UPDATE et TRUNCATE sont refusés — l'acte est figé ;
--  12. l'effacement NOMMÉ passe en base, en une instruction (lectures et
--      révocations ensemble), et l'import ne s'efface pas avant ses actes
--      (RESTRICT) ;
--  13. les FK ont la règle annoncée (RESTRICT vers patient et import, NO
--      ACTION sur la clé interne), les CHECK, l'index unique partiel et les
--      index ordinaires sont présents, comme le verrou de l'import et le
--      `search_path` épinglé des deux fonctions (présence relue : une session
--      seule n'éprouve pas la concurrence) ;
--  14. la table porte EXACTEMENT ses neuf colonnes (liste blanche) : aucune
--      valeur, aucun libellé, aucun marquage, aucun texte libre — toute
--      colonne neuve s'arbitre ;
--  15. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des deux fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus du trigger est reconnu à son MESSAGE, pas
-- seulement à son code (P0001). Deux CHECK ne s'isolent pas, parce que le
-- trigger refuse avant eux : `praticien_non_vide` (un e-mail blanc n'est pas
-- celui du dossier) et la cible de `forme_revocation` (une révocation sans
-- cible ne vise aucune lecture). Ils restent la garde si le trigger tombait,
-- et le cas 13 prouve leur présence.
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

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr) : cinq imports — deux validés
-- (`imp_a1`, `imp_a2`), un dont la seule ligne est écartée (`imp_a_ecarte`),
-- un dont la seule ligne reste proposée (`imp_a_propose`), un qui a une ligne
-- validée et une ligne encore proposée (`imp_a_partiel`). Dossier B, d'un
-- AUTRE praticien : un import validé (`imp_b`).

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_lib_a', 'PAT_CONTRAT_LIB_A', 'sophie.nicola+lecture@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_lib_b', 'PAT_CONTRAT_LIB_B', 'jennifer.martin+lecture@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_lib', 'BIO_CONTRAT_LIB', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par) VALUES
  ('cr_lib_a', 'PAT_CONTRAT_LIB_A', convert_to('lecture a', 'UTF8'), 'application/pdf',
   encode(sha256(convert_to('lecture a', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
  ('cr_lib_b', 'PAT_CONTRAT_LIB_B', convert_to('lecture b', 'UTF8'), 'application/pdf',
   encode(sha256(convert_to('lecture b', 'UTF8')), 'hex'), 'autre.praticien@wellneuro.fr');

INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par) VALUES
  ('imp_a1', 'PAT_CONTRAT_LIB_A', 'cr_lib_a', 'modele-contrat', 'bio-extraction-v3', 'praticien@wellneuro.fr'),
  ('imp_a2', 'PAT_CONTRAT_LIB_A', 'cr_lib_a', 'modele-contrat', 'bio-extraction-v3', 'praticien@wellneuro.fr'),
  ('imp_a_ecarte', 'PAT_CONTRAT_LIB_A', 'cr_lib_a', 'modele-contrat', 'bio-extraction-v3', 'praticien@wellneuro.fr'),
  ('imp_a_propose', 'PAT_CONTRAT_LIB_A', 'cr_lib_a', 'modele-contrat', 'bio-extraction-v3', 'praticien@wellneuro.fr'),
  ('imp_a_partiel', 'PAT_CONTRAT_LIB_A', 'cr_lib_a', 'modele-contrat', 'bio-extraction-v3', 'praticien@wellneuro.fr'),
  ('imp_b', 'PAT_CONTRAT_LIB_B', 'cr_lib_b', 'modele-contrat', 'bio-extraction-v3', 'autre.praticien@wellneuro.fr');

INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping) VALUES
  ('lig_a1', 'PAT_CONTRAT_LIB_A', 'imp_a1', 1, 1, 'Libellé', '1', 'inconnu'),
  ('lig_a2', 'PAT_CONTRAT_LIB_A', 'imp_a2', 1, 1, 'Libellé', '1', 'inconnu'),
  ('lig_a_ecarte', 'PAT_CONTRAT_LIB_A', 'imp_a_ecarte', 1, 1, 'Libellé', '1', 'inconnu'),
  ('lig_a_propose', 'PAT_CONTRAT_LIB_A', 'imp_a_propose', 1, 1, 'Libellé', '1', 'inconnu'),
  ('lig_a_partiel_1', 'PAT_CONTRAT_LIB_A', 'imp_a_partiel', 1, 1, 'Libellé', '1', 'inconnu'),
  ('lig_a_partiel_2', 'PAT_CONTRAT_LIB_A', 'imp_a_partiel', 2, 1, 'Libellé', '1', 'inconnu'),
  ('lig_b', 'PAT_CONTRAT_LIB_B', 'imp_b', 1, 1, 'Libellé', '1', 'inconnu');

UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP
WHERE id IN ('imp_a1', 'imp_a2', 'imp_a_ecarte', 'imp_a_propose', 'imp_a_partiel', 'imp_b');

-- Les résultats sont saisis APRÈS la fin des extractions (la décision d'une
-- ligne le vérifie) : instant posé à la main, après une courte attente.
SELECT pg_sleep(0.01);
INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le) VALUES
  ('res_lib_a1', 'PAT_CONTRAT_LIB_A', 'BIO_CONTRAT_LIB', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC'),
  ('res_lib_a2', 'PAT_CONTRAT_LIB_A', 'BIO_CONTRAT_LIB', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC'),
  ('res_lib_a_partiel', 'PAT_CONTRAT_LIB_A', 'BIO_CONTRAT_LIB', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC'),
  ('res_lib_b', 'PAT_CONTRAT_LIB_B', 'BIO_CONTRAT_LIB', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC');

UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = 'res_lib_a1', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_a1';
UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = 'res_lib_a2', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_a2';
UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = 'res_lib_b', traite_par = 'autre.praticien@wellneuro.fr' WHERE id = 'lig_b';
UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = 'res_lib_a_partiel', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_a_partiel_1';
UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_a_ecarte';

DO $$
DECLARE
  ligne record;
  nb integer;
  ecart interval;
  colonnes text[];
BEGIN
  -- ── 1 et 2. Une lecture valide, instant et ordre posés par la base ───────
  INSERT INTO lectures_imports_biologiques (id, ordre, id_patient, id_import, acte, praticien_email, acte_le)
  VALUES ('lec_a1', 999999, 'PAT_CONTRAT_LIB_A', 'imp_a1', 'lecture', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM lectures_imports_biologiques WHERE id = 'lec_a1';
  IF ligne.id_import IS DISTINCT FROM 'imp_a1' OR ligne.acte IS DISTINCT FROM 'lecture' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la lecture relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;

  -- ── 3. L'import du dossier ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 import d''un autre dossier',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x3a', 'PAT_CONTRAT_LIB_A', 'imp_b', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un import de ce dossier');
  PERFORM pg_temp.refuse('3 import inexistant',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x3b', 'PAT_CONTRAT_LIB_A', 'imp_absent', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un import de ce dossier');

  -- ── 4. Le praticien du dossier ───────────────────────────────────────────
  -- `imp_a2` est validé et sans lecture : seul le praticien peut faire refuser.
  PERFORM pg_temp.refuse('4 lecture par un autre praticien',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x4a', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'lecture', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('4 révocation par un autre praticien',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x4b', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_a1', 'acte_pose_par_erreur', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  -- La casse ne compte pas, comme dans `filtrePatientsDuPraticien`.
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
  VALUES ('lec_a2', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'lecture', 'Praticien@Wellneuro.FR');
  -- Le praticien de B lit l'import de B : la règle suit le dossier, pas un
  -- e-mail fixe.
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
  VALUES ('lec_b', 'PAT_CONTRAT_LIB_B', 'imp_b', 'lecture', 'autre.praticien@wellneuro.fr');

  -- ── 5. Un import validé ──────────────────────────────────────────────────
  PERFORM pg_temp.refuse('5 import aux lignes toutes écartées',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x5a', 'PAT_CONTRAT_LIB_A', 'imp_a_ecarte', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''a aucune ligne validée');
  PERFORM pg_temp.refuse('5 import aux lignes encore proposées',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x5b', 'PAT_CONTRAT_LIB_A', 'imp_a_propose', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''a aucune ligne validée');
  PERFORM pg_temp.refuse('5 import validé qui garde une ligne proposée',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x5c', 'PAT_CONTRAT_LIB_A', 'imp_a_partiel', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'a encore des lignes à décider');
  -- Sa dernière ligne décidée (écartée), l'import se lit.
  UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_a_partiel_2';
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
  VALUES ('lec_a_partiel', 'PAT_CONTRAT_LIB_A', 'imp_a_partiel', 'lecture', 'praticien@wellneuro.fr');

  -- ── 6. Une lecture active par import ─────────────────────────────────────
  PERFORM pg_temp.refuse('6 seconde lecture active',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x6', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'porte déjà une lecture active');

  -- ── 7. Révocation, puis nouvelle lecture ─────────────────────────────────
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
  VALUES ('rev_a1', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_a1', 'lecture_a_refaire', 'praticien@wellneuro.fr');
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
  VALUES ('lec_a1_bis', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'lecture', 'praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM lectures_imports_biologiques
  WHERE id_import = 'imp_a1' AND ordre > (SELECT ordre FROM lectures_imports_biologiques WHERE id = 'rev_a1');
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 7 : la nouvelle lecture ne suit pas la révocation dans l''ordre.';
  END IF;
  PERFORM pg_temp.refuse('7 troisième lecture, la deuxième active',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x7', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'lecture', 'praticien@wellneuro.fr')$q$,
    'P0001', 'porte déjà une lecture active');

  -- ── 8. La cible d'une révocation ─────────────────────────────────────────
  PERFORM pg_temp.refuse('8 révocation d''une révocation',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x8a', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'rev_a1', 'acte_pose_par_erreur', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lecture de cet import');
  PERFORM pg_temp.refuse('8 révocation de la lecture d''un autre import',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x8b', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_a2', 'mauvais_import', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lecture de cet import');
  PERFORM pg_temp.refuse('8 révocation d''une cible inexistante',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x8c', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_absente', 'mauvais_import', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas une lecture de cet import');
  PERFORM pg_temp.refuse('8 seconde révocation de la même lecture',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x8d', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_a1', 'acte_pose_par_erreur', 'praticien@wellneuro.fr')$q$,
    '23505', 'lectures_imports_biologiques_une_revocation_par_lecture');

  -- ── 9. La liste fermée des codes ─────────────────────────────────────────
  PERFORM pg_temp.refuse('9 code hors liste',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
       VALUES ('x9', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'revocation', 'lec_a2', 'resultat_preoccupant', 'praticien@wellneuro.fr')$q$,
    '23514', 'lectures_imports_biologiques_code_revocation_check');
  -- `lecture_a_refaire` est passé au cas 7 ; les deux autres passent ici.
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
  VALUES ('rev_a2', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'revocation', 'lec_a2', 'mauvais_import', 'praticien@wellneuro.fr');
  INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, code_revocation, praticien_email)
  VALUES ('rev_a1_bis', 'PAT_CONTRAT_LIB_A', 'imp_a1', 'revocation', 'lec_a1_bis', 'acte_pose_par_erreur', 'praticien@wellneuro.fr');

  -- ── 10. La forme de chaque acte ──────────────────────────────────────────
  -- `imp_a2` n'a plus de lecture active : le trigger laisse passer, le CHECK
  -- de forme refuse.
  PERFORM pg_temp.refuse('10 lecture qui porte un code',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, code_revocation, praticien_email)
       VALUES ('x10a', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'lecture', 'mauvais_import', 'praticien@wellneuro.fr')$q$,
    '23514', 'lectures_imports_biologiques_forme_lecture');
  PERFORM pg_temp.refuse('10 lecture qui porte une cible',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, praticien_email)
       VALUES ('x10b', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'lecture', 'lec_a2', 'praticien@wellneuro.fr')$q$,
    '23514', 'lectures_imports_biologiques_forme_lecture');
  PERFORM pg_temp.refuse('10 révocation sans code',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, id_lecture_revoquee, praticien_email)
       VALUES ('x10c', 'PAT_CONTRAT_LIB_B', 'imp_b', 'revocation', 'lec_b', 'autre.praticien@wellneuro.fr')$q$,
    '23514', 'lectures_imports_biologiques_forme_revocation');
  PERFORM pg_temp.refuse('10 acte inconnu',
    $q$INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
       VALUES ('x10d', 'PAT_CONTRAT_LIB_A', 'imp_a2', 'acquittement', 'praticien@wellneuro.fr')$q$,
    '23514', 'lectures_imports_biologiques_acte_check');

  -- ── 11. Figée ────────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 UPDATE',
    $q$UPDATE lectures_imports_biologiques SET praticien_email = 'praticien@wellneuro.fr' WHERE id = 'lec_a1'$q$,
    'P0001', 'un acte de lecture est figé');
  PERFORM pg_temp.refuse('11 TRUNCATE',
    $q$TRUNCATE lectures_imports_biologiques$q$,
    'P0001', 'un acte de lecture est figé');

  -- ── 12. L'effacement nommé ───────────────────────────────────────────────
  -- Les lignes candidates partent d'abord (comme dans l'effacement) : seule la
  -- clé des actes de lecture retient alors l'import.
  DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_LIB_A';
  PERFORM pg_temp.refuse('12 import effacé avant ses actes de lecture',
    $q$DELETE FROM imports_biologiques WHERE id = 'imp_a1'$q$,
    '23503', 'lectures_imports_biologiques_id_import_id_patient_fkey');
  DELETE FROM lectures_imports_biologiques WHERE id_patient = 'PAT_CONTRAT_LIB_A';
  SELECT count(*) INTO nb FROM lectures_imports_biologiques WHERE id_patient = 'PAT_CONTRAT_LIB_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''effacement en une instruction a laissé % ligne(s).', nb;
  END IF;
  DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_LIB_A';

  -- ── 13. Clés, CHECK et index ─────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.lectures_imports_biologiques'::regclass AND contype = 'f'
    AND ((conname IN ('lectures_imports_biologiques_id_patient_fkey',
                      'lectures_imports_biologiques_id_import_id_patient_fkey') AND confdeltype = 'r')
      OR (conname = 'lectures_imports_biologiques_id_lecture_revoquee_fkey' AND confdeltype = 'a'));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clé(s) étrangère(s) sur 3 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.lectures_imports_biologiques'::regclass AND contype = 'c'
    AND conname IN ('lectures_imports_biologiques_acte_check', 'lectures_imports_biologiques_forme_lecture',
                    'lectures_imports_biologiques_forme_revocation', 'lectures_imports_biologiques_code_revocation_check',
                    'lectures_imports_biologiques_praticien_non_vide');
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % CHECK sur 5 sont présents.', nb;
  END IF;
  -- Les deux CHECK que le trigger devance (voir l'en-tête) : leur clause est
  -- relue, faute de pouvoir l'éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.lectures_imports_biologiques'::regclass AND contype = 'c'
    AND ((conname = 'lectures_imports_biologiques_praticien_non_vide'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'lectures_imports_biologiques_forme_revocation'
          AND position('id_lecture_revoquee IS NOT NULL' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clause(s) de garde résiduelle sur 2 sont présentes.', nb;
  END IF;
  -- Le verrou qui sérialise les actes sur un import, et le `search_path`
  -- épinglé des deux fonctions (revue wn-reviewer du lot) : une session seule
  -- n'éprouve pas la concurrence, elle relit au moins leur présence.
  IF position('FOR NO KEY UPDATE' IN pg_get_functiondef('public.lectures_imports_biologiques_avant_insertion()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : le trigger d''insertion ne verrouille plus l''import.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.lectures_imports_biologiques_avant_insertion()'::regprocedure,
                  'public.lectures_imports_biologiques_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % fonction(s) sur 2 ont le search_path épinglé.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'lectures_imports_biologiques'
    AND indexname = 'lectures_imports_biologiques_une_revocation_par_lecture'
    AND indexdef LIKE 'CREATE UNIQUE INDEX%WHERE%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : l''index unique partiel est absent.';
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'lectures_imports_biologiques'
    AND indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'lectures_imports_biologiques_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'lectures_imports_biologiques_import_ordre_idx' AND indexdef LIKE '%(id_import, ordre)')
      OR (indexname = 'lectures_imports_biologiques_lecture_revoquee_idx' AND indexdef LIKE '%(id_lecture_revoquee)'));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % index ordinaire(s) sur 3 sont présents, sans prédicat.', nb;
  END IF;

  -- ── 14. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'lectures_imports_biologiques';
  IF colonnes <> ARRAY['acte', 'acte_le', 'code_revocation', 'id', 'id_import', 'id_lecture_revoquee',
                       'id_patient', 'ordre', 'praticien_email'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 15. RLS et fonctions ─────────────────────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.lectures_imports_biologiques'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'lectures_imports_biologiques';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('lectures_imports_biologiques_figee', 'lectures_imports_biologiques_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat lectures_imports_biologiques_v1 : quinze promesses tenues.';
END;
$$;

ROLLBACK;
