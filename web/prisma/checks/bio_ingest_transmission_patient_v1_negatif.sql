-- Contrat de la transmission du compte rendu par le patient ([[D-269]],
-- BIO-INGEST LOT-04, migration `20261007100000_bio_ingest_transmission_patient_v1`).
-- Le staging est tenu par `bio_ingest_staging_v1_negatif.sql`, la purge par
-- `bio_ingest_purge_v1_negatif.sql`.
--
-- La migration promet DIX choses, et ce fichier les éprouve TOUTES :
--   1. l'origine est `praticien` par défaut, et rien d'autre que `praticien`
--      ou `patient` ;
--   2. praticien ⇔ auteur nommé : un dépôt praticien sans auteur, un dépôt
--      patient avec auteur — refusés ; un dépôt patient sans auteur — admis ;
--   3. un dépôt ne naît pas écarté (date, auteur ou motif fournis) ;
--   4. seul un document d'origine `patient` s'écarte ;
--   5. l'écart porte son auteur et son motif ; motif hors liste, auteur réduit
--      à des blancs — refusés ;
--   6. jamais d'écart si une ligne d'une de ses extractions est validée — même
--      d'une extraction plus ancienne que la courante —, ni pendant une
--      extraction en cours ; des lignes proposées ou écartées ne le retiennent
--      pas ; RÉCIPROQUEMENT, après l'écart, une ligne proposée ne se valide
--      plus (elle s'écarte encore) ;
--   7. un autre motif de purge ne pose aucun écart ; la purge ne réécrit pas
--      l'origine, éprouvée SEULE (l'auteur inchangé) ;
--   8. l'écart réussi : contenu NULL, motif `ecarte`, écart et purge datés par
--      la BASE, en UTC, à son instant — une date fournie par le client est
--      écrasée ; empreinte conservée ; document figé ;
--      le même document ne se redépose pas ;
--   9. un document patient se purge encore par `lignes_decidees` ; l'effacement
--      nommé passe sur un document écarté ;
--  10. structure : colonnes, défaut, nullabilité, sept CHECK, l'index.
--
-- CHAQUE REFUS EST ISOLÉ ET RECONNU : `pg_temp.refus` exige le SQLSTATE
-- attendu ET la contrainte (ou le message du trigger) visée.
--
-- Identités de fixture seulement ; documents SYNTHÉTIQUES. Tout se déroule
-- dans une transaction annulée à la fin.
BEGIN;

-- Le fuseau du Mac, pas celui du CI : les instants posés par la base doivent
-- être de l'UTC quel que soit le fuseau de la session.
SET LOCAL TimeZone TO 'Europe/Paris';

CREATE FUNCTION pg_temp.refus(cas text, requete text, etat text, indice text)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  accepte boolean := false;
  e_etat text;
  e_message text;
  e_contrainte text;
BEGIN
  BEGIN
    EXECUTE requete;
    accepte := true;
  EXCEPTION
    WHEN others THEN
      GET STACKED DIAGNOSTICS e_etat = RETURNED_SQLSTATE,
                              e_message = MESSAGE_TEXT,
                              e_contrainte = CONSTRAINT_NAME;
      IF e_etat <> etat
         OR position(indice IN coalesce(e_contrainte, '') || ' ' || e_message) = 0 THEN
        RAISE EXCEPTION 'TRANSMISSION BIO: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

-- Un compte rendu synthétique transmis par le patient : sans auteur.
CREATE FUNCTION pg_temp.transmettre(id_cr text, graine text)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine)
  VALUES (id_cr, 'PAT_CONTRAT_TRP1', convert_to(graine, 'UTF8'), 'application/pdf',
          encode(sha256(convert_to(graine, 'UTF8')), 'hex'), 'patient');
$f$;

-- Une extraction de `nb_lignes` lignes proposées, laissée `en_cours` ou
-- terminée `extrait`. Un court sommeil sépare les lancements.
CREATE FUNCTION pg_temp.extraire(id_imp text, id_cr text, nb_lignes integer, issue text)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM pg_sleep(0.01);
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES (id_imp, 'PAT_CONTRAT_TRP1', id_cr, 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr');
  FOR r IN 1..nb_lignes LOOP
    INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
    VALUES (id_imp || '_l' || r, 'PAT_CONTRAT_TRP1', id_imp, r, 1, 'Libellé', '1', 'inconnu');
  END LOOP;
  IF issue = 'extrait' THEN
    UPDATE imports_biologiques SET statut = 'extrait' WHERE id = id_imp;
  END IF;
END;
$f$;

-- L'écart tel que le code l'écrira : une seule écriture.
CREATE FUNCTION pg_temp.ecarter_document(id_cr text, motif text)
RETURNS void
LANGUAGE sql
AS $f$
  UPDATE comptes_rendus_biologiques
  SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = motif
  WHERE id = id_cr;
$f$;

DO $$
DECLARE
  nb integer;
  avant timestamp;
  r record;
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_trp1', 'PAT_CONTRAT_TRP1', 'jennifer.martin+transmission@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);
  INSERT INTO biology_analytes (id, code, libelle, type_prelevement,
                                source_provenance, niveau_completude, updated_at)
  VALUES ('bio_contrat_trp', 'BIO_CONTRAT_TRP', 'Analyte de contrat',
          'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

  -- ── 1. L'origine : `praticien` par défaut, liste fermée ──────────────────
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
  VALUES ('cr_prat', 'PAT_CONTRAT_TRP1', convert_to('%PDF-prat', 'UTF8'), 'application/pdf',
          encode(sha256(convert_to('%PDF-prat', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM comptes_rendus_biologiques WHERE id = 'cr_prat' AND origine = 'praticien';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: un dépôt sans origine déclarée ne vaut pas « praticien ».';
  END IF;
  -- Sans auteur : seul le CHECK d'origine peut alors refuser (l'équivalence
  -- praticien ⇔ auteur est satisfaite par une origine qui n'est pas `praticien`).
  PERFORM pg_temp.refus('origine hors liste',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine)
       VALUES ('cr_t1', 'PAT_CONTRAT_TRP1', convert_to('t1', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t1', 'UTF8')), 'hex'), 'laboratoire')$q$,
    '23514', 'comptes_rendus_biologiques_origine_check');

  -- ── 2. Praticien ⇔ auteur nommé ──────────────────────────────────────────
  PERFORM pg_temp.refus('dépôt praticien sans auteur',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256)
       VALUES ('cr_t2', 'PAT_CONTRAT_TRP1', convert_to('t2', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t2', 'UTF8')), 'hex'))$q$,
    '23514', 'comptes_rendus_biologiques_origine_auteur_check');
  PERFORM pg_temp.refus('dépôt patient qui porte un auteur praticien',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, origine)
       VALUES ('cr_t3', 'PAT_CONTRAT_TRP1', convert_to('t3', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t3', 'UTF8')), 'hex'), 'praticien@wellneuro.fr', 'patient')$q$,
    '23514', 'comptes_rendus_biologiques_origine_auteur_check');
  BEGIN
    PERFORM pg_temp.transmettre('cr_pat1', '%PDF-pat1');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'TRANSMISSION BIO: un dépôt patient sans auteur est refusé (%)', SQLERRM;
  END;

  -- ── 3. Un dépôt ne naît pas écarté ───────────────────────────────────────
  PERFORM pg_temp.refus('dépôt né avec une date d''écart',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine, ecarte_le)
       VALUES ('cr_t4', 'PAT_CONTRAT_TRP1', convert_to('t4', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t4', 'UTF8')), 'hex'), 'patient', CURRENT_TIMESTAMP)$q$,
    'P0001', 'un dépôt ne naît pas écarté');
  PERFORM pg_temp.refus('dépôt né avec un auteur d''écart',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine, ecarte_par)
       VALUES ('cr_t5', 'PAT_CONTRAT_TRP1', convert_to('t5', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t5', 'UTF8')), 'hex'), 'patient', 'praticien@wellneuro.fr')$q$,
    'P0001', 'un dépôt ne naît pas écarté');
  PERFORM pg_temp.refus('dépôt né avec un motif d''écart',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine, motif_ecart)
       VALUES ('cr_t6', 'PAT_CONTRAT_TRP1', convert_to('t6', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t6', 'UTF8')), 'hex'), 'patient', 'illisible')$q$,
    'P0001', 'un dépôt ne naît pas écarté');

  -- ── 4. Seul un document d'origine `patient` s'écarte ─────────────────────
  PERFORM pg_temp.refus('écart d''un dépôt du praticien',
    $q$SELECT pg_temp.ecarter_document('cr_prat', 'illisible')$q$,
    'P0001', 'seul un document transmis par le patient s''écarte');

  -- ── 5. L'écart porte son auteur et son motif ─────────────────────────────
  PERFORM pg_temp.refus('écart sans auteur',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'ecarte', motif_ecart = 'illisible'
       WHERE id = 'cr_pat1'$q$,
    'P0001', 'l''écart porte son auteur et son motif');
  PERFORM pg_temp.refus('écart sans motif',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr'
       WHERE id = 'cr_pat1'$q$,
    'P0001', 'l''écart porte son auteur et son motif');
  PERFORM pg_temp.refus('écart pour un motif hors liste',
    $q$SELECT pg_temp.ecarter_document('cr_pat1', 'doublon')$q$,
    '23514', 'comptes_rendus_biologiques_motif_ecart_check');
  PERFORM pg_temp.refus('écart par un auteur réduit à des blancs, tabulations comprises',
    $q$UPDATE comptes_rendus_biologiques
       SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = E' \t\r\n', motif_ecart = 'illisible'
       WHERE id = 'cr_pat1'$q$,
    '23514', 'comptes_rendus_biologiques_ecarte_par_check');

  -- ── 6. Jamais pendant une extraction, jamais sur une ligne validée ───────
  PERFORM pg_temp.extraire('imp_p1a', 'cr_pat1', 2, 'en_cours');
  PERFORM pg_temp.refus('écart pendant une extraction en cours',
    $q$SELECT pg_temp.ecarter_document('cr_pat1', 'illisible')$q$,
    'P0001', 'une extraction de ce compte rendu est en cours');
  UPDATE imports_biologiques SET statut = 'extrait' WHERE id = 'imp_p1a';
  -- Une ligne écartée et une proposée ne retiennent pas l'écart : éprouvé au §8.
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id = 'imp_p1a_l1';

  PERFORM pg_temp.transmettre('cr_pat2', '%PDF-pat2');
  PERFORM pg_temp.extraire('imp_p2a', 'cr_pat2', 1, 'extrait');
  PERFORM pg_sleep(0.01);
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
  VALUES ('res_trp1', 'PAT_CONTRAT_TRP1', 'BIO_CONTRAT_TRP', 4.2, 'mg/L', TIMESTAMP '2026-09-01 08:00:00',
          'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC');
  UPDATE lignes_biologiques_candidates
  SET statut = 'validee', id_resultat = 'res_trp1', traite_par = 'praticien@wellneuro.fr'
  WHERE id = 'imp_p2a_l1';
  PERFORM pg_temp.refus('écart d''un document dont une ligne est validée',
    $q$SELECT pg_temp.ecarter_document('cr_pat2', 'document_non_conforme')$q$,
    'P0001', 'une ligne de ce compte rendu est validée');
  -- La ligne validée sur une extraction ANCIENNE retient l'écart, même quand
  -- la courante n'en porte aucune.
  PERFORM pg_temp.extraire('imp_p2b', 'cr_pat2', 1, 'extrait');
  PERFORM pg_temp.refus('écart d''un document dont une ligne validée vient d''une extraction antérieure',
    $q$SELECT pg_temp.ecarter_document('cr_pat2', 'document_non_conforme')$q$,
    'P0001', 'une ligne de ce compte rendu est validée');

  -- Réciproque : après l'écart, une ligne proposée ne se valide plus, mais
  -- s'écarte encore.
  PERFORM pg_temp.transmettre('cr_pat4', '%PDF-pat4');
  PERFORM pg_temp.extraire('imp_p4a', 'cr_pat4', 2, 'extrait');
  PERFORM pg_sleep(0.01);
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
  VALUES ('res_trp2', 'PAT_CONTRAT_TRP1', 'BIO_CONTRAT_TRP', 5.1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00',
          'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC');
  PERFORM pg_temp.ecarter_document('cr_pat4', 'document_non_conforme');
  PERFORM pg_temp.refus('ligne validée après l''écart de son document',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_trp2', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'imp_p4a_l1'$q$,
    'P0001', 'le compte rendu dont elle est tirée a été écarté');
  BEGIN
    UPDATE lignes_biologiques_candidates
    SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
    WHERE id = 'imp_p4a_l2';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'TRANSMISSION BIO: une ligne d''un document écarté ne s''écarte plus (%)', SQLERRM;
  END;

  -- ── 7. Un autre motif ne pose aucun écart ; l'origine ne se réécrit pas ──
  PERFORM pg_temp.refus('purge à l''échéance qui pose un écart',
    $q$UPDATE comptes_rendus_biologiques
       SET contenu = NULL, motif_purge = 'echeance', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = 'illisible'
       WHERE id = 'cr_pat1'$q$,
    'P0001', 'seul le motif « ecarte » pose un écart');
  -- L'origine SEULE : l'auteur reste NULL, et c'est le trigger, avant tout
  -- CHECK, qui doit refuser.
  PERFORM pg_temp.refus('écart qui réécrit l''origine',
    $q$UPDATE comptes_rendus_biologiques
       SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = 'illisible',
           origine = 'praticien'
       WHERE id = 'cr_pat1'$q$,
    'P0001', 'la purge n''efface que le document');

  -- ── 8. L'écart réussi ────────────────────────────────────────────────────
  -- Arrondies au millième comme la colonne, les deux bornes s'ordonnent avec elle.
  avant := (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
  BEGIN
    -- Des dates fournies par le client : la base doit les écraser.
    UPDATE comptes_rendus_biologiques
    SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = 'illisible',
        ecarte_le = TIMESTAMP '2000-01-01 00:00:00', purge_le = TIMESTAMP '2000-01-01 00:00:00'
    WHERE id = 'cr_pat1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'TRANSMISSION BIO: l''écart d''un document transmis, sans ligne validée, est refusé (%)', SQLERRM;
  END;
  SELECT * INTO r FROM comptes_rendus_biologiques WHERE id = 'cr_pat1';
  IF r.contenu IS NOT NULL OR r.motif_purge IS DISTINCT FROM 'ecarte' OR r.motif_ecart IS DISTINCT FROM 'illisible'
     OR r.ecarte_par IS DISTINCT FROM 'praticien@wellneuro.fr' OR r.origine IS DISTINCT FROM 'patient' THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: l''écart n''a pas laissé ce qu''il promet (contenu NULL, motif, auteur, origine).';
  END IF;
  IF r.empreinte_sha256 IS DISTINCT FROM encode(sha256(convert_to('%PDF-pat1', 'UTF8')), 'hex') THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: l''empreinte du document écarté n''est pas conservée.';
  END IF;
  IF r.ecarte_le IS NULL OR r.purge_le IS NULL
     OR r.ecarte_le < avant OR r.ecarte_le > (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3)
     OR r.purge_le < avant OR r.purge_le > (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3) THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: écart et purge ne sont pas datés par la base, en UTC, à leur instant (%, %).',
      r.ecarte_le, r.purge_le;
  END IF;
  PERFORM pg_temp.refus('document écarté qui change encore',
    $q$UPDATE comptes_rendus_biologiques SET motif_ecart = 'document_non_conforme' WHERE id = 'cr_pat1'$q$,
    'P0001', 'son document est déjà purgé');
  PERFORM pg_temp.refus('document écarté redéposé à l''identique',
    $q$SELECT pg_temp.transmettre('cr_t7', '%PDF-pat1')$q$,
    '23505', 'comptes_rendus_biologiques_patient_empreinte_key');
  PERFORM pg_temp.refus('import ouvert sur un document écarté',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t8', 'PAT_CONTRAT_TRP1', 'cr_pat1', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr')$q$,
    'P0001', 'le document de ce compte rendu est purgé');

  -- ── 9. La purge `lignes_decidees` vaut aussi pour un document patient ────
  PERFORM pg_temp.transmettre('cr_pat3', '%PDF-pat3');
  PERFORM pg_temp.extraire('imp_p3a', 'cr_pat3', 1, 'extrait');
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id = 'imp_p3a_l1';
  BEGIN
    UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_pat3';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'TRANSMISSION BIO: la purge à la dernière décision d''un document patient est refusée (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM comptes_rendus_biologiques
  WHERE id = 'cr_pat3' AND contenu IS NULL AND ecarte_le IS NULL AND motif_ecart IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: une purge à la dernière décision a posé un écart.';
  END IF;

  BEGIN
    DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_TRP1';
    DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_TRP1';
    DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_TRP1';
    DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_TRP1';
    DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_TRP1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'TRANSMISSION BIO: l''effacement d''un dossier aux documents transmis et écartés a échoué (%)', SQLERRM;
  END;

  -- ── 10. Structure ────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'comptes_rendus_biologiques'
    AND ((c.column_name = 'origine' AND c.is_nullable = 'NO' AND c.column_default LIKE '''praticien''%')
      OR (c.column_name IN ('depose_par', 'ecarte_le', 'ecarte_par', 'motif_ecart') AND c.is_nullable = 'YES'));
  IF nb <> 5 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: % colonne(s) conforme(s) sur 5 (origine NOT NULL DEFAULT praticien ; depose_par et écart nullables).', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('comptes_rendus_biologiques_origine_check',
                        'comptes_rendus_biologiques_origine_auteur_check',
                        'comptes_rendus_biologiques_motif_ecart_check',
                        'comptes_rendus_biologiques_ecarte_par_check',
                        'comptes_rendus_biologiques_ecart_entier_check',
                        'comptes_rendus_biologiques_ecart_origine_check',
                        'comptes_rendus_biologiques_ecart_purge_check');
  IF nb <> 7 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: % CHECK d''origine et d''écart présent(s) sur 7.', nb;
  END IF;
  -- Le trigger refuse avant eux : leur DÉFINITION s'éprouve.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.conname = 'comptes_rendus_biologiques_motif_purge_check'
    AND pg_get_constraintdef(con.oid) LIKE '%ecarte%'
    AND pg_get_constraintdef(con.oid) LIKE '%lignes_decidees%'
    AND pg_get_constraintdef(con.oid) LIKE '%echeance%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: le CHECK du motif de purge n''admet pas « ecarte » à côté des deux motifs existants.';
  END IF;
  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.conname = 'comptes_rendus_biologiques_ecart_purge_check'
    AND pg_get_constraintdef(con.oid) ILIKE '%coalesce%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: l''équivalence écart ⇔ motif « ecarte » ne neutralise plus le motif NULL.';
  END IF;

  SELECT count(*) INTO nb
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'comptes_rendus_biologiques'
    AND indexname = 'comptes_rendus_biologiques_patient_origine_idx'
    AND indexdef LIKE '%(id_patient, origine, depose_le)%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'TRANSMISSION BIO: l''index (dossier, origine, date de dépôt) manque.';
  END IF;

  RAISE NOTICE 'TRANSMISSION BIO: origine praticien par défaut, liste fermée ; praticien ⇔ auteur nommé ; dépôt jamais né écarté (3 colonnes) ; seul un document patient s''écarte ; auteur et motif exigés, motif et auteur bornés ; ni pendant une extraction ni sur ligne validée (même ancienne), et plus de validation après l''écart ; aucun écart hors motif « ecarte », origine figée seule ; écart réussi daté par la base en UTC (dates du client écrasées), empreinte conservée, document figé, redépôt et import refusés ; purge à la dernière décision intacte pour le patient, effacement passant ; 5 colonnes, 7 CHECK, motif de purge étendu, index présents.';
END $$;

ROLLBACK;
