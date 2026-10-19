-- Contrat de la collecte documentaire : documents déposés par le patient et
-- classements du praticien ([[D-328]], J3-collecte).
--
-- Les deux tables promettent QUATORZE choses, et ce fichier les éprouve TOUTES :
--   1. un dépôt valide s'écrit et se relit ; son instant est posé par la BASE,
--      en UTC même sous une session en Europe/Paris ; une date antidatée est
--      ignorée ;
--   2. les bornes : type hors liste, document vide, document de plus de
--      10 Mio, empreinte qui n'est pas la sienne — refusés ;
--   3. une catégorie hors liste est refusée, au dépôt comme au classement ;
--   4. un dépôt sans document, ou qui naît consulté, ou qui naît retiré, est
--      refusé ; un DOUBLON d'un document non retiré du dossier est refusé, un
--      document retiré se redépose ;
--   5. la première consultation par le praticien DU DOSSIER passe (casse
--      indifférente), instant posé par la base ; un autre praticien est
--      refusé ; une seconde consultation est refusée ;
--   6. le retrait par le praticien du dossier efface le contenu et garde la
--      ligne (empreinte, catégorie, dates) ; instant posé par la base ; un
--      autre praticien, un retrait sans motif, un motif hors liste, un retrait
--      qui réécrit la consultation — refusés ;
--   7. un document retiré ne change plus : ni consultation, ni second retrait ;
--   8. ce qui a été déposé ne se réécrit pas — catégorie proposée, type, date,
--      dossier, identifiant, et le document lui-même, avec sa propre empreinte
--      ou sous l'ancienne —, même couplé à une première consultation ; une
--      écriture qui consulte ET retire est refusée ; une écriture qui ne fait
--      ni l'un ni l'autre (instant de consultation seul, retrait sans effacer
--      le document) est refusée ;
--   9. un classement valide s'écrit, instant et `ordre` posés par la base,
--      l'ordre croît ; un document d'un AUTRE dossier, inexistant ou retiré,
--      et un autre praticien, sont refusés ;
--  10. TRUNCATE est refusé sur les deux tables, UPDATE sur les classements ;
--  11. l'effacement NOMMÉ passe en base (classements, puis documents), et un
--      document ne s'efface pas avant ses classements (RESTRICT) ;
--  12. les FK ont la règle annoncée (RESTRICT), les CHECK, les index et les
--      six triggers sont présents ; l'ordre des verrous est celui de l'en-tête
--      de la migration — dépôt : dossier puis verrou du dossier avant le
--      doublon ; classement : dossier puis document exclusif ; modification :
--      AUCUN verrou sur le dossier — ; les quatre fonctions ont leur
--      `search_path` épinglé ;
--  13. chaque table porte EXACTEMENT ses colonnes (liste blanche) ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`), et aucune
--      des quatre fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve. Chaque refus est reconnu à son MESSAGE (ou au nom de sa
-- contrainte), pas seulement à son code. Les CHECK d'auteur non vide
-- (`consulte_par`, `retire_par`, `classe_par`) ne s'isolent pas — le trigger
-- refuse avant eux un e-mail blanc, qui n'est pas celui du dossier — : le cas
-- 12 relit leur clause. Le CHECK `retrait` ne s'isole pas non plus derrière le
-- trigger, qui pose ou refuse chacun de ses termes : le cas 12 le relit.
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

-- Un document de fixture, et son empreinte, comme la route les calculera.
CREATE FUNCTION pg_temp.doc(texte text) RETURNS bytea LANGUAGE sql AS $$
  SELECT convert_to(texte, 'UTF8')
$$;
CREATE FUNCTION pg_temp.sha(texte text) RETURNS text LANGUAGE sql AS $$
  SELECT encode(sha256(convert_to(texte, 'UTF8')), 'hex')
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien stocké `Praticien@WellNeuro.fr`, casse comprise).
-- Dossier B, d'un AUTRE praticien, avec un document `dep_b`.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_dep_a', 'PAT_CONTRAT_DEP_A', 'sophie.nicola+dep@example.test', 'Sophie', 'Nicola', 'Praticien@WellNeuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_dep_b', 'PAT_CONTRAT_DEP_B', 'michel.dogne+dep@example.test', 'Michel', 'Dogné', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
VALUES ('dep_b', 'PAT_CONTRAT_DEP_B', pg_temp.doc('%PDF B'), 'application/pdf', pg_temp.sha('%PDF B'), 'courrier');

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  def text;
BEGIN
  -- ── 1. Un dépôt valide, instant posé par la base ─────────────────────────
  INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee, depose_le)
  VALUES ('dep_a1', 'PAT_CONTRAT_DEP_A', pg_temp.doc('%PDF courrier'), 'application/pdf', pg_temp.sha('%PDF courrier'),
          'courrier', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM documents_deposes_patient WHERE id = 'dep_a1';
  IF ligne.contenu IS DISTINCT FROM pg_temp.doc('%PDF courrier') OR ligne.categorie_proposee IS DISTINCT FROM 'courrier' THEN
    RAISE EXCEPTION 'CONTRAT — 1 : le dépôt relu n''est pas celui écrit.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.depose_le;
  IF ligne.depose_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''instant du dépôt n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  -- Les quatre types et les quatre catégories passent.
  INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee) VALUES
    ('dep_a2', 'PAT_CONTRAT_DEP_A', pg_temp.doc('jpeg a2'), 'image/jpeg', pg_temp.sha('jpeg a2'), 'compte_rendu_consultation'),
    ('dep_a3', 'PAT_CONTRAT_DEP_A', pg_temp.doc('png a3'), 'image/png', pg_temp.sha('png a3'), 'traitements_complements'),
    ('dep_a4', 'PAT_CONTRAT_DEP_A', pg_temp.doc('webp a4'), 'image/webp', pg_temp.sha('webp a4'), 'autre');

  -- ── 2. Les bornes ────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('2 type hors liste',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x2a', 'PAT_CONTRAT_DEP_A', pg_temp.doc('x'), 'image/gif', pg_temp.sha('x'), 'autre')$q$,
    '23514', 'documents_deposes_patient_type_mime_check');
  PERFORM pg_temp.refuse('2 document vide',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x2b', 'PAT_CONTRAT_DEP_A', ''::bytea, 'application/pdf', encode(sha256(''::bytea), 'hex'), 'autre')$q$,
    '23514', 'documents_deposes_patient_taille_check');
  PERFORM pg_temp.refuse('2 document de plus de 10 Mio',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       SELECT 'x2c', 'PAT_CONTRAT_DEP_A', d, 'application/pdf', encode(sha256(d), 'hex'), 'autre'
       FROM (SELECT decode(repeat('25', 10485761), 'hex') AS d) s$q$,
    '23514', 'documents_deposes_patient_taille_check');
  PERFORM pg_temp.refuse('2 empreinte d''un autre document',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x2d', 'PAT_CONTRAT_DEP_A', pg_temp.doc('x'), 'application/pdf', pg_temp.sha('y'), 'autre')$q$,
    '23514', 'documents_deposes_patient_empreinte_check');
  -- Une empreinte mal formée ne peut égaler la sienne, et le trigger fige
  -- l'empreinte d'un document retiré : le CHECK de forme ne s'isole pas, le
  -- cas 12 relit sa clause.

  -- ── 3. La catégorie, au dépôt ────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 catégorie hors liste au dépôt',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x3', 'PAT_CONTRAT_DEP_A', pg_temp.doc('x'), 'application/pdf', pg_temp.sha('x'), 'ordonnance')$q$,
    '23514', 'documents_deposes_patient_categorie_check');

  -- ── 4. Un dépôt porte son document, ne naît ni consulté ni retiré ────────
  PERFORM pg_temp.refuse('4 dépôt sans document',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x4a', 'PAT_CONTRAT_DEP_A', NULL, 'application/pdf', pg_temp.sha('x'), 'autre')$q$,
    'P0001', 'un dépôt porte son document');
  PERFORM pg_temp.refuse('4 dépôt qui naît consulté',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee, consulte_le, consulte_par)
       VALUES ('x4b', 'PAT_CONTRAT_DEP_A', pg_temp.doc('x'), 'application/pdf', pg_temp.sha('x'), 'autre', now(), 'praticien@wellneuro.fr')$q$,
    'P0001', 'un dépôt ne naît pas consulté');
  PERFORM pg_temp.refuse('4 dépôt qui naît retiré',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee, motif_retrait)
       VALUES ('x4c', 'PAT_CONTRAT_DEP_A', pg_temp.doc('x'), 'application/pdf', pg_temp.sha('x'), 'autre', 'depot_par_erreur')$q$,
    'P0001', 'un dépôt ne naît pas retiré');
  PERFORM pg_temp.refuse('4 doublon d''un document non retiré',
    $q$INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
       VALUES ('x4d', 'PAT_CONTRAT_DEP_A', pg_temp.doc('jpeg a2'), 'image/jpeg', pg_temp.sha('jpeg a2'), 'autre')$q$,
    'P0001', 'déjà déposé dans ce dossier');
  -- Le même fichier dans un AUTRE dossier n'est pas un doublon.
  INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
  VALUES ('dep_b2', 'PAT_CONTRAT_DEP_B', pg_temp.doc('jpeg a2'), 'image/jpeg', pg_temp.sha('jpeg a2'), 'autre');

  -- ── 5. La première consultation ──────────────────────────────────────────
  PERFORM pg_temp.refuse('5 consultation par un autre praticien',
    $q$UPDATE documents_deposes_patient SET consulte_par = 'autre.praticien@wellneuro.fr' WHERE id = 'dep_a1'$q$,
    'P0001', 'seul le praticien du dossier consulte');
  UPDATE documents_deposes_patient
  SET consulte_par = 'praticien@wellneuro.fr', consulte_le = TIMESTAMP '2000-01-01 00:00:00'
  WHERE id = 'dep_a1';
  SELECT * INTO ligne FROM documents_deposes_patient WHERE id = 'dep_a1';
  ecart := (now() AT TIME ZONE 'UTC') - ligne.consulte_le;
  IF ligne.consulte_le IS NULL OR ligne.consulte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 5 : l''instant de la consultation n''est pas posé par la base (écart %).', ecart;
  END IF;
  PERFORM pg_temp.refuse('5 seconde consultation',
    $q$UPDATE documents_deposes_patient SET consulte_par = 'Praticien@WellNeuro.fr', consulte_le = now() WHERE id = 'dep_a1'$q$,
    'P0001', 'seules la première consultation et le retrait');

  -- ── 6. Le retrait ────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('6 retrait par un autre praticien',
    $q$UPDATE documents_deposes_patient SET contenu = NULL, retire_par = 'autre.praticien@wellneuro.fr', motif_retrait = 'demande_droit' WHERE id = 'dep_a2'$q$,
    'P0001', 'seul le praticien du dossier retire');
  PERFORM pg_temp.refuse('6 retrait sans motif',
    $q$UPDATE documents_deposes_patient SET contenu = NULL, retire_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a2'$q$,
    'P0001', 'un retrait porte son motif');
  PERFORM pg_temp.refuse('6 motif hors liste',
    $q$UPDATE documents_deposes_patient SET contenu = NULL, retire_par = 'praticien@wellneuro.fr', motif_retrait = 'autre' WHERE id = 'dep_a2'$q$,
    '23514', 'documents_deposes_patient_motif_retrait_check');
  PERFORM pg_temp.refuse('6 retrait qui réécrit la consultation',
    $q$UPDATE documents_deposes_patient SET contenu = NULL, retire_par = 'praticien@wellneuro.fr', motif_retrait = 'depot_par_erreur',
              consulte_le = TIMESTAMP '2000-01-01 00:00:00' WHERE id = 'dep_a1'$q$,
    'P0001', 'un retrait ne réécrit pas la consultation');
  UPDATE documents_deposes_patient
  SET contenu = NULL, retire_par = 'PRATICIEN@wellneuro.fr', motif_retrait = 'depot_par_erreur', retire_le = TIMESTAMP '2000-01-01 00:00:00'
  WHERE id = 'dep_a1';
  SELECT * INTO ligne FROM documents_deposes_patient WHERE id = 'dep_a1';
  IF ligne.contenu IS NOT NULL OR ligne.empreinte_sha256 IS DISTINCT FROM pg_temp.sha('%PDF courrier')
     OR ligne.categorie_proposee IS DISTINCT FROM 'courrier' OR ligne.consulte_le IS NULL THEN
    RAISE EXCEPTION 'CONTRAT — 6 : le retrait n''a pas effacé le seul contenu.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.retire_le;
  IF ligne.retire_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 6 : l''instant du retrait n''est pas posé par la base (écart %).', ecart;
  END IF;
  -- Un document jamais consulté se retire aussi.
  UPDATE documents_deposes_patient
  SET contenu = NULL, retire_par = 'praticien@wellneuro.fr', motif_retrait = 'demande_droit'
  WHERE id = 'dep_a4';
  -- Un document retiré se redépose (4).
  INSERT INTO documents_deposes_patient (id, id_patient, contenu, type_mime, empreinte_sha256, categorie_proposee)
  VALUES ('dep_a5', 'PAT_CONTRAT_DEP_A', pg_temp.doc('%PDF courrier'), 'application/pdf', pg_temp.sha('%PDF courrier'), 'courrier');

  -- ── 7. Un document retiré ne change plus ─────────────────────────────────
  PERFORM pg_temp.refuse('7 consultation d''un document retiré',
    $q$UPDATE documents_deposes_patient SET consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a4'$q$,
    'P0001', 'document figé : il est retiré');
  PERFORM pg_temp.refuse('7 second retrait',
    $q$UPDATE documents_deposes_patient SET motif_retrait = 'demande_droit' WHERE id = 'dep_a1'$q$,
    'P0001', 'document figé : il est retiré');

  -- ── 8. Ce qui a été déposé ne se réécrit pas ─────────────────────────────
  PERFORM pg_temp.refuse('8 catégorie proposée réécrite',
    $q$UPDATE documents_deposes_patient SET categorie_proposee = 'autre' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 type réécrit',
    $q$UPDATE documents_deposes_patient SET type_mime = 'image/jpeg' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 date de dépôt réécrite',
    $q$UPDATE documents_deposes_patient SET depose_le = TIMESTAMP '2000-01-01 00:00:00' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 document remplacé, avec sa propre empreinte, à la consultation',
    $q$UPDATE documents_deposes_patient SET contenu = pg_temp.doc('png autre'), empreinte_sha256 = pg_temp.sha('png autre'),
              consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 document remplacé sous l''ancienne empreinte, à la consultation',
    $q$UPDATE documents_deposes_patient SET contenu = pg_temp.doc('png autre'),
              consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a3'$q$,
    '23514', 'documents_deposes_patient_empreinte_check');
  PERFORM pg_temp.refuse('8 dossier réécrit, à la consultation',
    $q$UPDATE documents_deposes_patient SET id_patient = 'PAT_CONTRAT_DEP_B',
              consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 identifiant réécrit, à la consultation',
    $q$UPDATE documents_deposes_patient SET id = 'dep_a3_bis',
              consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a3'$q$,
    'P0001', 'ce qui a été déposé ne se réécrit pas');
  PERFORM pg_temp.refuse('8 instant de consultation seul',
    $q$UPDATE documents_deposes_patient SET consulte_le = now() WHERE id = 'dep_a3'$q$,
    'P0001', 'seules la première consultation et le retrait');
  UPDATE documents_deposes_patient SET consulte_par = 'praticien@wellneuro.fr' WHERE id = 'dep_a2';
  PERFORM pg_temp.refuse('8 retrait sans effacer le document',
    $q$UPDATE documents_deposes_patient SET retire_par = 'praticien@wellneuro.fr', motif_retrait = 'depot_par_erreur'
       WHERE id = 'dep_a2'$q$,
    'P0001', 'seules la première consultation et le retrait');
  PERFORM pg_temp.refuse('8 consulter et retirer à la fois',
    $q$UPDATE documents_deposes_patient SET consulte_par = 'praticien@wellneuro.fr', contenu = NULL,
              retire_par = 'praticien@wellneuro.fr', motif_retrait = 'depot_par_erreur' WHERE id = 'dep_a3'$q$,
    'P0001', 'une écriture consulte OU retire');
  PERFORM pg_temp.refuse('8 écriture sans transition',
    $q$UPDATE documents_deposes_patient SET id_patient = id_patient WHERE id = 'dep_a3'$q$,
    'P0001', 'seules la première consultation et le retrait');

  -- ── 9. Les classements ───────────────────────────────────────────────────
  INSERT INTO classements_documents_deposes (id, ordre, id_patient, id_document, categorie, classe_par, classe_le)
  VALUES ('cls_a1', 999999, 'PAT_CONTRAT_DEP_A', 'dep_a3', 'compte_rendu_consultation', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM classements_documents_deposes WHERE id = 'cls_a1';
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 9 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.classe_le;
  IF ligne.classe_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 9 : l''instant du classement n''est pas posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;
  INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
  VALUES ('cls_a2', 'PAT_CONTRAT_DEP_A', 'dep_a3', 'traitements_complements', 'Praticien@WellNeuro.fr');
  SELECT ordre INTO ligne FROM classements_documents_deposes WHERE id = 'cls_a2';
  IF ligne.ordre <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 9 : l''ordre ne croît pas d''un classement au suivant.';
  END IF;
  PERFORM pg_temp.refuse('3 catégorie hors liste au classement',
    $q$INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
       VALUES ('x3c', 'PAT_CONTRAT_DEP_A', 'dep_a3', 'ordonnance', 'praticien@wellneuro.fr')$q$,
    '23514', 'classements_documents_deposes_categorie_check');
  PERFORM pg_temp.refuse('9 document d''un autre dossier',
    $q$INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
       VALUES ('x9a', 'PAT_CONTRAT_DEP_A', 'dep_b', 'autre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('9 document inexistant',
    $q$INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
       VALUES ('x9b', 'PAT_CONTRAT_DEP_A', 'dep_inconnu', 'autre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('9 document retiré',
    $q$INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
       VALUES ('x9c', 'PAT_CONTRAT_DEP_A', 'dep_a1', 'autre', 'praticien@wellneuro.fr')$q$,
    'P0001', 'est retiré');
  PERFORM pg_temp.refuse('9 classement par un autre praticien',
    $q$INSERT INTO classements_documents_deposes (id, id_patient, id_document, categorie, classe_par)
       VALUES ('x9d', 'PAT_CONTRAT_DEP_A', 'dep_a3', 'autre', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier classe');

  -- ── 10. TRUNCATE, et un classement ne se réécrit pas ─────────────────────
  PERFORM pg_temp.refuse('10 UPDATE d''un classement',
    $q$UPDATE classements_documents_deposes SET categorie = 'autre' WHERE id = 'cls_a1'$q$,
    'P0001', 'classements_documents_deposes : la collecte documentaire est figée (UPDATE refusé)');
  PERFORM pg_temp.refuse('10 TRUNCATE des classements',
    $q$TRUNCATE classements_documents_deposes$q$,
    'P0001', 'classements_documents_deposes : la collecte documentaire est figée (TRUNCATE refusé)');
  PERFORM pg_temp.refuse('10 TRUNCATE des documents',
    $q$TRUNCATE documents_deposes_patient CASCADE$q$,
    'P0001', 'documents_deposes_patient : la collecte documentaire est figée (TRUNCATE refusé)');

  -- ── 11. L'effacement nommé ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 document effacé avant ses classements',
    $q$DELETE FROM documents_deposes_patient WHERE id_patient = 'PAT_CONTRAT_DEP_A'$q$,
    '23503', 'classements_documents_deposes_id_document_fkey');
  PERFORM pg_temp.refuse('11 dossier effacé avant ses documents',
    $q$DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_DEP_B'$q$,
    '23503', 'documents_deposes_patient_id_patient_fkey');
  DELETE FROM classements_documents_deposes WHERE id_patient = 'PAT_CONTRAT_DEP_A';
  DELETE FROM documents_deposes_patient WHERE id_patient = 'PAT_CONTRAT_DEP_A';
  SELECT count(*) INTO nb FROM documents_deposes_patient WHERE id_patient = 'PAT_CONTRAT_DEP_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : l''effacement a laissé % document(s).', nb;
  END IF;

  -- ── 12. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f' AND confdeltype = 'r'
    AND conname IN ('documents_deposes_patient_id_patient_fkey',
                    'classements_documents_deposes_id_patient_fkey',
                    'classements_documents_deposes_id_document_fkey');
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clé(s) étrangère(s) sur 3 ont la règle RESTRICT.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conrelid = 'public.documents_deposes_patient'::regclass
          AND conname IN ('documents_deposes_patient_type_mime_check',
                          'documents_deposes_patient_taille_check',
                          'documents_deposes_patient_empreinte_check',
                          'documents_deposes_patient_empreinte_forme_check',
                          'documents_deposes_patient_categorie_check',
                          'documents_deposes_patient_consulte_par_check',
                          'documents_deposes_patient_retire_par_check',
                          'documents_deposes_patient_motif_retrait_check',
                          'documents_deposes_patient_consultation_check',
                          'documents_deposes_patient_retrait_check'))
      OR (conrelid = 'public.classements_documents_deposes'::regclass
          AND conname IN ('classements_documents_deposes_categorie_check',
                          'classements_documents_deposes_classe_par_check')));
  IF nb <> 12 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK sur 12 sont présents.', nb;
  END IF;
  -- Les clauses qui ne s'isolent pas derrière un trigger.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conname = 'documents_deposes_patient_consulte_par_check'
          AND position('consulte_par ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(consulte_par) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'documents_deposes_patient_retire_par_check'
          AND position('retire_par ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(retire_par) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'classements_documents_deposes_classe_par_check'
          AND position('classe_par ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(classe_par) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'documents_deposes_patient_retrait_check'
          AND position('(contenu IS NULL) = (retire_le IS NOT NULL)' IN pg_get_constraintdef(oid)) > 0
          AND position('(retire_le IS NULL) = (retire_par IS NULL)' IN pg_get_constraintdef(oid)) > 0
          AND position('(retire_le IS NULL) = (motif_retrait IS NULL)' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'documents_deposes_patient_empreinte_forme_check'
          AND position('^[0-9a-f]{64}$' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clause(s) résiduelle(s) sur 5 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'documents_deposes_patient_patient_depose_idx' AND indexdef LIKE '%(id_patient, depose_le)')
      OR (indexname = 'classements_documents_deposes_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'classements_documents_deposes_document_ordre_idx' AND indexdef LIKE '%(id_document, ordre)')
      OR (indexname = 'classements_documents_deposes_patient_idx' AND indexdef LIKE '%(id_patient)'));
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % index sur 4 sont présents, sans prédicat.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND ((t.tgrelid = 'public.documents_deposes_patient'::regclass
          AND ((t.tgname = 'documents_deposes_patient_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
            OR (t.tgname = 'documents_deposes_patient_avant_modification' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
            OR (t.tgname = 'documents_deposes_patient_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32)))
      OR (t.tgrelid = 'public.classements_documents_deposes'::regclass
          AND ((t.tgname = 'classements_documents_deposes_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
            OR (t.tgname = 'classements_documents_deposes_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
            OR (t.tgname = 'classements_documents_deposes_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32))));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % trigger(s) sur 6 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Le dossier, puis le document (en-tête de la migration) : une session
  -- seule ne joue pas la concurrence, elle relit l'ordre.
  def := pg_get_functiondef('public.documents_deposes_avant_insertion()'::regprocedure);
  IF def !~ 'FROM public\.patients p[^$]*FOR KEY SHARE[^$]*pg_advisory_xact_lock\(hashtext\(''documents_deposes:''[^$]*déjà déposé' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''ordre des verrous du dépôt n''est plus celui annoncé.';
  END IF;
  def := pg_get_functiondef('public.classements_documents_deposes_avant_insertion()'::regprocedure);
  IF def !~ 'FROM public\.patients p[^$]*FOR KEY SHARE[^$]*FROM public\.documents_deposes_patient d[^$]*FOR NO KEY UPDATE[^$]*NEW\.ordre := nextval' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''ordre des verrous du classement n''est plus celui annoncé.';
  END IF;
  -- La modification ne verrouille PAS le dossier : la ligne du document l'est
  -- déjà, et prendre le dossier ensuite inverserait l'ordre de l'effacement.
  def := pg_get_functiondef('public.documents_deposes_avant_modification()'::regprocedure);
  IF def ~ 'FOR (KEY )?SHARE|FOR (NO KEY )?UPDATE' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : la modification d''un document verrouille le dossier (interblocage avec l''effacement).';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.documents_deposes_avant_insertion()'::regprocedure,
                  'public.documents_deposes_avant_modification()'::regprocedure,
                  'public.classements_documents_deposes_avant_insertion()'::regprocedure,
                  'public.documents_deposes_figee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % fonction(s) sur 4 ont le search_path épinglé.', nb;
  END IF;

  -- ── 13. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'documents_deposes_patient';
  IF colonnes <> ARRAY['categorie_proposee', 'consulte_le', 'consulte_par', 'contenu', 'depose_le',
                       'empreinte_sha256', 'id', 'id_patient', 'motif_retrait', 'retire_le',
                       'retire_par', 'type_mime'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues des documents : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'classements_documents_deposes';
  IF colonnes <> ARRAY['categorie', 'classe_le', 'classe_par', 'id', 'id_document', 'id_patient', 'ordre'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues des classements : %', colonnes;
  END IF;

  -- ── 14. RLS et fonctions ─────────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid IN ('public.documents_deposes_patient'::regclass, 'public.classements_documents_deposes'::regclass)
    AND relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS n''est active que sur % table(s) sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('documents_deposes_patient', 'classements_documents_deposes');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('documents_deposes_avant_insertion',
                      'documents_deposes_avant_modification',
                      'classements_documents_deposes_avant_insertion',
                      'documents_deposes_figee')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat documents_deposes_patient_v1 : quatorze promesses tenues.';
END;
$$;

ROLLBACK;
