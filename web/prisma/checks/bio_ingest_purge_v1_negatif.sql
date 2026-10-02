-- Contrat de la purge du compte rendu déposé et de l'heure lue ([[D-257]],
-- BIO-INGEST LOT-02, migration `20261002200000_bio_ingest_purge_compte_rendu_v1`).
-- Le reste du staging est tenu par `bio_ingest_staging_v1_negatif.sql`.
--
-- La purge promet DOUZE choses, et ce fichier les éprouve TOUTES :
--   1. un dépôt porte son document et ne naît pas purgé : contenu NULL, date
--      ou motif de purge fournis à l'insertion — refusés ;
--   2. la seule modification admise est la purge : un UPDATE qui garde le
--      document est refusé ;
--   3. la purge n'efface QUE le document : chaque colonne figée (identité,
--      dossier, type, empreinte, déposant, date de dépôt) éprouvée une à une ;
--   4. le motif est vérifié, pas déclaré : motif absent ou hors liste refusé ;
--   5. `lignes_decidees` exige une extraction terminée — aucune extraction,
--      ou seulement des échecs : refusé ;
--   6. `lignes_decidees` juge l'extraction COURANTE (la plus récente non
--      échouée) : une ligne proposée sur elle refuse la purge ; une ligne
--      proposée sur une extraction plus ancienne ne la retient pas ; un échec
--      plus récent ne la masque pas ;
--   7. jamais pendant une extraction en cours, quel que soit le motif ;
--   8. `echeance` exige 30 jours révolus : 29 jours 23 heures refusés, 30 jours
--      1 heure admis, lignes proposées ou non ;
--   9. la purge est datée par la BASE, en UTC, à son instant ; le motif est
--      conservé, l'empreinte aussi ; un document purgé ne change plus ;
--  10. un import ne s'ouvre plus sur un document purgé ; les lignes restent
--      décidables ; l'effacement nommé passe sur un document purgé ;
--  11. `heure_lue` : `false` par défaut, jamais vraie sans date lue, figée à la
--      décision ;
--  12. structure : l'ancien trigger de gel retiré, le nouveau branché sur sa
--      fonction, les deux CHECK de purge présents (le trigger refuse avant
--      eux : leur présence s'éprouve), `heure_lue` NOT NULL DEFAULT false.
--
-- CHAQUE REFUS EST ISOLÉ ET RECONNU : `pg_temp.refus` exige le SQLSTATE
-- attendu ET la contrainte (ou le message du trigger) visée.
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR : la sérialisation par verrou de ligne
-- entre une purge et l'ouverture d'un import (une seule session ne rejoue pas
-- une course).
--
-- Pour dater un dépôt dans le passé, le trigger d'insertion du compte rendu est
-- désactivé le temps de DEUX insertions de fixture, puis réactivé — et sa
-- réactivation est vérifiée. Identités de fixture seulement ; documents
-- SYNTHÉTIQUES. Tout se déroule dans une transaction annulée à la fin.
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
        RAISE EXCEPTION 'PURGE BIO: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'PURGE BIO: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

-- Un compte rendu synthétique : contenu, empreinte assortie.
CREATE FUNCTION pg_temp.deposer(id_cr text, graine text)
RETURNS void
LANGUAGE sql
AS $f$
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
  VALUES (id_cr, 'PAT_CONTRAT_PRG1', convert_to(graine, 'UTF8'), 'application/pdf',
          encode(sha256(convert_to(graine, 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
$f$;

-- Une extraction : ouverte, `nb_lignes` lignes proposées, puis terminée
-- `extrait` (ou `echec`, sans ligne). Un court sommeil sépare les lancements :
-- `lance_le` est au millième, et c'est lui qui désigne l'extraction courante.
CREATE FUNCTION pg_temp.extraire(id_imp text, id_cr text, nb_lignes integer, issue text)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  PERFORM pg_sleep(0.01);
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES (id_imp, 'PAT_CONTRAT_PRG1', id_cr, 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr');
  FOR r IN 1..nb_lignes LOOP
    INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
    VALUES (id_imp || '_l' || r, 'PAT_CONTRAT_PRG1', id_imp, r, 1, 'Libellé', '1', 'inconnu');
  END LOOP;
  IF issue = 'echec' THEN
    UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'reponse_invalide' WHERE id = id_imp;
  ELSIF issue = 'extrait' THEN
    UPDATE imports_biologiques SET statut = 'extrait' WHERE id = id_imp;
  END IF;
END;
$f$;

CREATE FUNCTION pg_temp.ecarter(id_ligne text)
RETURNS void
LANGUAGE sql
AS $f$
  UPDATE lignes_biologiques_candidates
  SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr'
  WHERE id = id_ligne;
$f$;

DO $$
DECLARE
  nb integer;
  instant timestamp;
  empreinte text;
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_prg1', 'PAT_CONTRAT_PRG1', 'michel.dogne+purge@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Un dépôt porte son document, et ne naît pas purgé ─────────────────
  PERFORM pg_temp.refus('dépôt sans document',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t1', 'PAT_CONTRAT_PRG1', NULL, 'application/pdf', repeat('a', 64), 'praticien@wellneuro.fr')$q$,
    'P0001', 'un dépôt porte son document');
  PERFORM pg_temp.refus('dépôt né avec une date de purge',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, purge_le)
       VALUES ('cr_t2', 'PAT_CONTRAT_PRG1', convert_to('t2', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t2', 'UTF8')), 'hex'), 'praticien@wellneuro.fr', CURRENT_TIMESTAMP)$q$,
    'P0001', 'un dépôt ne naît pas purgé');
  PERFORM pg_temp.refus('dépôt né avec un motif de purge',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, motif_purge)
       VALUES ('cr_t3', 'PAT_CONTRAT_PRG1', convert_to('t3', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t3', 'UTF8')), 'hex'), 'praticien@wellneuro.fr', 'echeance')$q$,
    'P0001', 'un dépôt ne naît pas purgé');

  PERFORM pg_temp.deposer('cr_vide', '%PDF-purge-vide');
  PERFORM pg_temp.deposer('cr_echecs', '%PDF-purge-echecs');
  PERFORM pg_temp.deposer('cr_1', '%PDF-purge-un');
  PERFORM pg_temp.deposer('cr_2', '%PDF-purge-deux');
  PERFORM pg_temp.deposer('cr_cours', '%PDF-purge-en-cours');

  -- ── 2. Seule la purge modifie un compte rendu ────────────────────────────
  PERFORM pg_temp.refus('UPDATE qui garde le document',
    $q$UPDATE comptes_rendus_biologiques SET purge_le = CURRENT_TIMESTAMP, motif_purge = 'echeance' WHERE id = 'cr_1'$q$,
    'P0001', 'seule la purge de son document le modifie');

  -- ── 5. Une extraction terminée est exigée ────────────────────────────────
  PERFORM pg_temp.refus('purge « lignes décidées » sans aucune extraction',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_vide'$q$,
    'P0001', 'aucune extraction terminée');
  PERFORM pg_temp.extraire('imp_e1', 'cr_echecs', 0, 'echec');
  PERFORM pg_temp.extraire('imp_e2', 'cr_echecs', 0, 'echec');
  PERFORM pg_temp.refus('purge « lignes décidées » quand toutes les extractions ont échoué',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_echecs'$q$,
    'P0001', 'aucune extraction terminée');

  -- ── 6. L'extraction COURANTE est jugée ───────────────────────────────────
  -- cr_1 : une extraction ancienne dont une ligne reste proposée, puis une
  -- extraction courante à deux lignes.
  PERFORM pg_temp.extraire('imp_1a', 'cr_1', 1, 'extrait');
  PERFORM pg_temp.extraire('imp_1b', 'cr_1', 2, 'extrait');
  PERFORM pg_temp.ecarter('imp_1b_l1');
  PERFORM pg_temp.refus('purge « lignes décidées » avec une ligne proposée sur l''extraction courante',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_1'$q$,
    'P0001', 'restent à décider');
  PERFORM pg_temp.refus('purge « échéance » d''un dépôt du jour',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'echeance' WHERE id = 'cr_1'$q$,
    'P0001', 'moins de 30 jours');
  PERFORM pg_temp.ecarter('imp_1b_l2');

  -- ── 4. Le motif est vérifié ──────────────────────────────────────────────
  PERFORM pg_temp.refus('purge sans motif',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL WHERE id = 'cr_1'$q$,
    'P0001', 'inconnu');
  PERFORM pg_temp.refus('purge au motif hors liste',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'demande_praticien' WHERE id = 'cr_1'$q$,
    'P0001', 'inconnu');

  -- ── 3. La purge n'efface que le document ─────────────────────────────────
  PERFORM pg_temp.refus('purge qui réécrit l''identifiant',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', id = 'cr_autre' WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');
  PERFORM pg_temp.refus('purge qui change de dossier',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', id_patient = 'PAT_AUTRE' WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');
  PERFORM pg_temp.refus('purge qui réécrit le type',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', type_mime = 'image/png' WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');
  PERFORM pg_temp.refus('purge qui réécrit l''empreinte',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', empreinte_sha256 = repeat('b', 64) WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');
  PERFORM pg_temp.refus('purge qui réécrit le déposant',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', depose_par = 'autre@wellneuro.fr' WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');
  PERFORM pg_temp.refus('purge qui réécrit la date de dépôt',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees', depose_le = TIMESTAMP '2000-01-01 00:00:00' WHERE id = 'cr_1'$q$,
    'P0001', 'la purge n''efface que le document');

  -- ── 6 (suite), 9. La purge admise, datée par la base ─────────────────────
  SELECT empreinte_sha256 INTO empreinte FROM comptes_rendus_biologiques WHERE id = 'cr_1';
  BEGIN
    UPDATE comptes_rendus_biologiques
    SET contenu = NULL, motif_purge = 'lignes_decidees', purge_le = TIMESTAMP '2000-01-01 00:00:00'
    WHERE id = 'cr_1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: une purge « lignes décidées » valide a été refusée — une ligne proposée sur une extraction ANCIENNE la retient-elle ? (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb
  FROM comptes_rendus_biologiques
  WHERE id = 'cr_1'
    AND contenu IS NULL
    AND motif_purge = 'lignes_decidees'
    AND empreinte_sha256 = empreinte
    AND purge_le >= (now() AT TIME ZONE 'UTC')::timestamp(3)
    AND purge_le <= (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3)
    AND purge_le >= depose_le;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PURGE BIO: la purge n''a pas effacé le seul document, ou sa date n''est pas posée par la base en UTC.';
  END IF;

  PERFORM pg_temp.refus('double purge',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'echeance' WHERE id = 'cr_1'$q$,
    'P0001', 'déjà purgé');
  PERFORM pg_temp.refus('document purgé qui change de motif',
    $q$UPDATE comptes_rendus_biologiques SET motif_purge = 'echeance' WHERE id = 'cr_1'$q$,
    'P0001', 'déjà purgé');

  -- cr_2 : extraction décidée, puis un ÉCHEC plus récent — il ne la masque pas.
  PERFORM pg_temp.extraire('imp_2a', 'cr_2', 1, 'extrait');
  PERFORM pg_temp.ecarter('imp_2a_l1');
  PERFORM pg_temp.extraire('imp_2b', 'cr_2', 0, 'echec');
  BEGIN
    UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_2';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: un échec plus récent a masqué l''extraction courante décidée (%)', SQLERRM;
  END;

  -- ── 7. Jamais pendant une extraction ─────────────────────────────────────
  PERFORM pg_temp.extraire('imp_ca', 'cr_cours', 1, 'extrait');
  PERFORM pg_temp.ecarter('imp_ca_l1');
  PERFORM pg_temp.extraire('imp_cb', 'cr_cours', 0, 'en_cours');
  PERFORM pg_temp.refus('purge « lignes décidées » pendant une ré-extraction',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_cours'$q$,
    'P0001', 'est en cours');

  -- ── 8. L'échéance de 30 jours ────────────────────────────────────────────
  ALTER TABLE comptes_rendus_biologiques DISABLE TRIGGER comptes_rendus_biologiques_avant_insertion;
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, depose_le)
  VALUES
    ('cr_vieux', 'PAT_CONTRAT_PRG1', convert_to('%PDF-purge-vieux', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-purge-vieux', 'UTF8')), 'hex'), 'praticien@wellneuro.fr',
     (clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days 1 hour'),
    ('cr_presque', 'PAT_CONTRAT_PRG1', convert_to('%PDF-purge-presque', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-purge-presque', 'UTF8')), 'hex'), 'praticien@wellneuro.fr',
     (clock_timestamp() AT TIME ZONE 'UTC') - interval '29 days 23 hours');
  ALTER TABLE comptes_rendus_biologiques ENABLE TRIGGER comptes_rendus_biologiques_avant_insertion;
  SELECT count(*) INTO nb
  FROM pg_trigger
  WHERE tgname = 'comptes_rendus_biologiques_avant_insertion' AND tgenabled = 'O';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PURGE BIO: le trigger d''insertion du compte rendu n''a pas été réactivé.';
  END IF;

  PERFORM pg_temp.refus('purge « échéance » à 29 jours 23 heures',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'echeance' WHERE id = 'cr_presque'$q$,
    'P0001', 'moins de 30 jours');
  PERFORM pg_temp.extraire('imp_va', 'cr_vieux', 1, 'en_cours');
  PERFORM pg_temp.refus('purge « échéance » pendant une extraction',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'echeance' WHERE id = 'cr_vieux'$q$,
    'P0001', 'est en cours');
  UPDATE imports_biologiques SET statut = 'extrait' WHERE id = 'imp_va';
  PERFORM pg_temp.refus('purge « lignes décidées » d''un vieux dépôt dont une ligne reste proposée',
    $q$UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = 'cr_vieux'$q$,
    'P0001', 'restent à décider');
  BEGIN
    UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'echeance' WHERE id = 'cr_vieux';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: une purge à l''échéance (30 jours 1 heure, ligne proposée) a été refusée (%)', SQLERRM;
  END;

  -- ── 10. Après la purge ───────────────────────────────────────────────────
  PERFORM pg_temp.refus('import ouvert sur un document purgé',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t1', 'PAT_CONTRAT_PRG1', 'cr_vieux', 'm', 'v', 'praticien@wellneuro.fr')$q$,
    'P0001', 'le document de ce compte rendu est purgé');
  BEGIN
    PERFORM pg_temp.ecarter('imp_va_l1');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: une ligne d''un document purgé n''est plus décidable (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates WHERE id = 'imp_va_l1' AND statut = 'ecartee';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PURGE BIO: la décision d''une ligne d''un document purgé n''a pas été enregistrée.';
  END IF;

  -- ── 11. L'heure lue ──────────────────────────────────────────────────────
  PERFORM pg_sleep(0.01);
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_h', 'PAT_CONTRAT_PRG1', 'cr_presque', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr');
  BEGIN
    INSERT INTO lignes_biologiques_candidates
      (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, preleve_le_lu, heure_lue, statut_mapping)
    VALUES
      ('lig_h1', 'PAT_CONTRAT_PRG1', 'imp_h', 1, 1, 'Libellé', '1', TIMESTAMP '2026-09-01 22:00:00', true, 'inconnu');
    INSERT INTO lignes_biologiques_candidates
      (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, preleve_le_lu, statut_mapping)
    VALUES
      ('lig_h2', 'PAT_CONTRAT_PRG1', 'imp_h', 2, 1, 'Libellé', '1', TIMESTAMP '2026-09-01 22:00:00', 'inconnu');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: une ligne valide avec ou sans heure lue a été refusée (%)', SQLERRM;
  END;
  SELECT count(*) INTO nb FROM lignes_biologiques_candidates
  WHERE (id = 'lig_h1' AND heure_lue) OR (id = 'lig_h2' AND NOT heure_lue);
  IF nb <> 2 THEN
    RAISE EXCEPTION 'PURGE BIO: heure_lue n''est pas conservée, ou ne vaut pas false par défaut.';
  END IF;
  PERFORM pg_temp.refus('heure lue sans date lue',
    $q$INSERT INTO lignes_biologiques_candidates
         (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, preleve_le_lu, heure_lue, statut_mapping)
       VALUES ('lig_t1', 'PAT_CONTRAT_PRG1', 'imp_h', 9, 1, 'l', '1', NULL, true, 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_heure_lue_check');
  UPDATE imports_biologiques SET statut = 'extrait' WHERE id = 'imp_h';
  PERFORM pg_temp.refus('décision qui réécrit l''heure lue',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', heure_lue = true
       WHERE id = 'lig_h2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');

  -- ── 10 (suite). L'effacement nommé passe sur des documents purgés ────────
  BEGIN
    DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_PRG1';
    DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_PRG1';
    DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_PRG1';
    DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_PRG1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'PURGE BIO: l''effacement d''un dossier aux documents purgés a échoué (%)', SQLERRM;
  END;

  -- ── 12. Structure ────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'comptes_rendus_biologiques' AND NOT t.tgisinternal
    AND t.tgname = 'comptes_rendus_biologiques_no_update';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'PURGE BIO: l''ancien trigger de gel est encore branché — la purge serait refusée.';
  END IF;
  SELECT count(*) INTO nb
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'comptes_rendus_biologiques' AND NOT t.tgisinternal
    AND t.tgname = 'comptes_rendus_biologiques_avant_purge'
    AND t.tgfoid = 'public.bio_ingest_compte_rendu_avant_purge()'::regprocedure;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PURGE BIO: le trigger de purge n''est pas branché sur sa fonction.';
  END IF;

  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('comptes_rendus_biologiques_motif_purge_check', 'comptes_rendus_biologiques_purge_check');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'PURGE BIO: % CHECK de purge présent(s) sur 2 (motif, cohérence).', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'lignes_biologiques_candidates'
    AND c.column_name = 'heure_lue' AND c.is_nullable = 'NO' AND c.column_default = 'false';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PURGE BIO: heure_lue n''est pas NOT NULL DEFAULT false.';
  END IF;

  RAISE NOTICE 'PURGE BIO: dépôt sans document ou né purgé refusé ; seule la purge modifie un compte rendu, sans rien réécrire d''autre (6 colonnes éprouvées) ; motif absent ou hors liste refusé ; « lignes décidées » exige une extraction terminée, juge la courante, ignore une ancienne et un échec récent ; jamais pendant une extraction ; échéance à 30 jours révolus ; purge datée par la base en UTC, motif et empreinte conservés, document purgé figé ; import refusé après purge, lignes encore décidables, effacement passant ; heure lue false par défaut, jamais sans date, figée ; ancien gel retiré, nouveau trigger branché, 2 CHECK présents.';
END $$;

ROLLBACK;
