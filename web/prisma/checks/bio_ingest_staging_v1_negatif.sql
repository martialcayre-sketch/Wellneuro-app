-- Contrat du staging d'import biologique ([[D-256]] A2/A5, BIO-INGEST LOT-02,
-- migration `20261001210000_bio_ingest_staging_v1`, amendée par
-- `20261002200000_bio_ingest_purge_compte_rendu_v1` — la purge et l'heure lue
-- ont leur propre contrat, `bio_ingest_purge_v1_negatif.sql`).
--
-- Le staging promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. un compte rendu valide s'écrit, à l'instant posé par la BASE ; 10 Mo
--      exactement passent ;
--   2. le document est ce qu'il dit être : type hors liste, document vide ou
--      de plus de 10 Mo, empreinte qui n'est pas la sienne, déposant vide ou
--      trop long — refusés chacun par SON CHECK ;
--   3. un même document une fois par dossier ; le même document dans un AUTRE
--      dossier passe ;
--   4. le compte rendu est figé : tout UPDATE autre que la purge de son
--      document ([[D-258]]) est refusé ;
--   5. un import naît EN COURS, à l'instant posé par la base, avec modèle et
--      version du procédé non vides et bornés (promesse de `usage_ia` v4),
--      sans laboratoire ; il ne désigne qu'un compte rendu de SON dossier ;
--   6. un import se termine UNE fois (`extrait` ou `echec`), à l'instant posé
--      par la base, avec le laboratoire lu, sans rien réécrire d'autre ; un
--      échec porte un motif fermé, et ne laisse aucune ligne ;
--   7. une ligne naît PROPOSÉE, dans une extraction EN COURS, dans le dossier
--      de cette extraction ; ses CHECK (rang, page, textes lus et leurs
--      bornes, cohérence du mapping, décision absente) mordent chacun ;
--   8. une extraction terminée ne reçoit plus de ligne ;
--   9. seule une ligne d'une extraction TERMINÉE se décide ;
--  10. une ligne se décide UNE fois, sans réécrire ce qui a été lu (chaque
--      colonne lue éprouvée) ; la décision est posée par la base à son
--      instant ; validée ⇔ résultat, écartée ⇔ motif fermé, dans les deux sens ;
--  11. une ligne ne désigne qu'un résultat de SON dossier, saisi APRÈS la fin
--      de son extraction — jamais une saisie manuelle antérieure (arbitrage du
--      2026-10-01) ; un résultat est désigné par au plus une ligne ;
--  12. l'effacement NOMMÉ passe en base, dans l'ordre d'`effacement.ts` :
--      lignes, imports, comptes rendus, résultats, patient — et le résultat
--      validé ne part pas avant sa ligne (RESTRICT) ;
--  13. sept FK en ON DELETE RESTRICT, nommées une à une ; trois triggers
--      anti-TRUNCATE (dont un éprouvé) ; deux CHECK de statut présents ; le
--      document stocké EXTERNAL ; aucune fonction exécutable par PUBLIC ;
--  14. chaque table porte EXACTEMENT ses colonnes (liste blanche) — aucun nom
--      de fichier, aucun masquage — et ses index nommés, uniques où il faut ;
--  15. la RLS deny-all est active et sans policy sur les trois (posture
--      `D-005`).
--
-- CHAQUE REFUS EST ISOLÉ ET RECONNU : `pg_temp.refus` exige le SQLSTATE
-- attendu ET la contrainte (ou le message du trigger) visée. Un refus venu
-- d'une autre règle fait rougir le contrat au lieu de le laisser vert.
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR : la sérialisation par `FOR SHARE`
-- (une seule session ne rejoue pas une course).
--
-- Identités de fixture seulement ; documents SYNTHÉTIQUES (quelques octets,
-- aucun compte rendu réel). Tout se déroule dans une transaction annulée à la
-- fin.
BEGIN;

-- Le fuseau du Mac, pas celui du CI : les instants posés par la base doivent
-- être de l'UTC quel que soit le fuseau de la session (point 4 de la
-- migration). En UTC, un `now()` nu passerait inaperçu.
SET LOCAL TimeZone TO 'Europe/Paris';

CREATE FUNCTION pg_temp.refus(cas text, requete text, etat text, indice text)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  -- Le verdict sort du bloc : un RAISE dans le corps serait rattrapé par sa
  -- propre clause EXCEPTION et accuserait le mauvais coupable.
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
        RAISE EXCEPTION 'STAGING BIO: « % » refusé pour le MAUVAIS motif (% / % / %), attendu % / %.',
          cas, e_etat, e_contrainte, e_message, etat, indice;
      END IF;
  END;
  IF accepte THEN
    RAISE EXCEPTION 'STAGING BIO: « % » a été ACCEPTÉ — la règle qui devait le refuser (%) ne mord plus.', cas, indice;
  END IF;
END;
$f$;

DO $$
DECLARE
  nb integer;
  instant timestamp;
  reelles text[];
  doc_max bytea := convert_to(repeat('x', 10485760), 'UTF8');

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparé à un `array_agg(... ORDER BY)`).
  COLS_CR CONSTANT text[] := ARRAY[
    'contenu', 'depose_le', 'depose_par', 'empreinte_sha256', 'id', 'id_patient', 'motif_purge', 'purge_le',
    'type_mime'
  ];
  COLS_IMPORT CONSTANT text[] := ARRAY[
    'id', 'id_compte_rendu', 'id_patient', 'laboratoire_lu', 'lance_le', 'lance_par', 'modele', 'motif_echec',
    'statut', 'termine_le', 'version_prompt'
  ];
  -- `intervalle_lu` et `marquage_lu` : les faits du laboratoire ([[D-267]]),
  -- tenus par `bio_ingest_faits_laboratoire_v1_negatif.sql`.
  COLS_LIGNE CONSTANT text[] := ARRAY[
    'analyte_propose', 'heure_lue', 'id', 'id_import', 'id_patient', 'id_resultat', 'intervalle_lu',
    'libelle_lu', 'marquage_lu', 'motif_ecart',
    'page', 'preleve_le_lu', 'rang', 'statut', 'statut_mapping', 'traite_le', 'traite_par',
    'unite_lue', 'valeur_lue'
  ];
  -- Nom d'index → unique ?
  INDEX_ATTENDUS CONSTANT text[] := ARRAY[
    'comptes_rendus_biologiques_id_patient_key:t',
    'comptes_rendus_biologiques_patient_depose_idx:f',
    'comptes_rendus_biologiques_patient_empreinte_key:t',
    'comptes_rendus_biologiques_pkey:t',
    'imports_biologiques_compte_rendu_idx:f',
    'imports_biologiques_id_patient_key:t',
    'imports_biologiques_patient_idx:f',
    'imports_biologiques_pkey:t',
    'lignes_biologiques_candidates_id_resultat_key:t',
    'lignes_biologiques_candidates_import_rang_key:t',
    'lignes_biologiques_candidates_patient_idx:f',
    'lignes_biologiques_candidates_pkey:t'
  ];
BEGIN
  -- ── 0. Fixtures ──────────────────────────────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_stg1', 'PAT_CONTRAT_STG1', 'sophie.nicola+staging@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_stg2', 'PAT_CONTRAT_STG2', 'jennifer.martin+staging@example.test',
     'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO biology_analytes (id, code, libelle, type_prelevement,
                                source_provenance, niveau_completude, updated_at)
  VALUES ('bio_contrat_stg', 'BIO_CONTRAT_STG', 'Analyte de contrat',
          'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
  VALUES
    ('res_stg2', 'PAT_CONTRAT_STG2', 'BIO_CONTRAT_STG', 4.2, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr');
  -- Une saisie manuelle ANTÉRIEURE à toute extraction (même dossier, autre
  -- date de prélèvement) : aucune ligne ne doit pouvoir s'y rattacher.
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
  VALUES ('res_stg1_ancien', 'PAT_CONTRAT_STG1', 'BIO_CONTRAT_STG', 3.9, 'mg/L', TIMESTAMP '2026-08-01 08:00:00',
          'saisie_praticien', 'praticien@wellneuro.fr', TIMESTAMP '2026-08-02 10:00:00');

  -- ── 1. Compte rendu valide, instant posé par la base ; 10 Mo passent ─────
  BEGIN
    INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, depose_le)
    VALUES ('cr_1', 'PAT_CONTRAT_STG1', convert_to('%PDF-contrat-un', 'UTF8'), 'application/pdf',
            encode(sha256(convert_to('%PDF-contrat-un', 'UTF8')), 'hex'), 'praticien@wellneuro.fr',
            TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
    VALUES ('cr_max', 'PAT_CONTRAT_STG1', doc_max, 'image/png', encode(sha256(doc_max), 'hex'), 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: un compte rendu valide a été refusé (%)', SQLERRM;
  END;
  SELECT depose_le INTO instant FROM comptes_rendus_biologiques WHERE id = 'cr_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'STAGING BIO: un dépôt antidaté a gardé sa date (%) — le trigger ne pose plus l''instant.', instant;
  END IF;

  -- ── 2. Le document est ce qu'il dit être ─────────────────────────────────
  PERFORM pg_temp.refus('type MIME hors liste',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t1', 'PAT_CONTRAT_STG1', convert_to('t1', 'UTF8'), 'text/plain',
               encode(sha256(convert_to('t1', 'UTF8')), 'hex'), 'praticien@wellneuro.fr')$q$,
    '23514', 'comptes_rendus_biologiques_type_mime_check');
  PERFORM pg_temp.refus('document vide',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t2', 'PAT_CONTRAT_STG1', ''::bytea, 'application/pdf',
               encode(sha256(''::bytea), 'hex'), 'praticien@wellneuro.fr')$q$,
    '23514', 'comptes_rendus_biologiques_taille_check');
  PERFORM pg_temp.refus('document de 10 Mo plus un octet',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t3', 'PAT_CONTRAT_STG1', convert_to(repeat('y', 10485761), 'UTF8'), 'application/pdf',
               encode(sha256(convert_to(repeat('y', 10485761), 'UTF8')), 'hex'), 'praticien@wellneuro.fr')$q$,
    '23514', 'comptes_rendus_biologiques_taille_check');
  PERFORM pg_temp.refus('empreinte qui n''est pas celle du document',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t4', 'PAT_CONTRAT_STG1', convert_to('t4', 'UTF8'), 'application/pdf',
               repeat('a', 64), 'praticien@wellneuro.fr')$q$,
    '23514', 'comptes_rendus_biologiques_empreinte_check');
  PERFORM pg_temp.refus('déposant réduit à des blancs, tabulations comprises',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t5', 'PAT_CONTRAT_STG1', convert_to('t5', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t5', 'UTF8')), 'hex'), E' \t\r\n')$q$,
    '23514', 'comptes_rendus_biologiques_depose_par_check');
  PERFORM pg_temp.refus('déposant au-delà de 320 caractères',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t6', 'PAT_CONTRAT_STG1', convert_to('t6', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('t6', 'UTF8')), 'hex'), repeat('x', 321))$q$,
    '23514', 'comptes_rendus_biologiques_depose_par_check');

  -- ── 3. Un même document une fois par dossier ─────────────────────────────
  PERFORM pg_temp.refus('le même document déposé deux fois dans un dossier',
    $q$INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
       VALUES ('cr_t7', 'PAT_CONTRAT_STG1', convert_to('%PDF-contrat-un', 'UTF8'), 'application/pdf',
               encode(sha256(convert_to('%PDF-contrat-un', 'UTF8')), 'hex'), 'praticien@wellneuro.fr')$q$,
    '23505', 'comptes_rendus_biologiques_patient_empreinte_key');
  BEGIN
    INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
    VALUES ('cr_2', 'PAT_CONTRAT_STG2', convert_to('%PDF-contrat-un', 'UTF8'), 'application/pdf',
            encode(sha256(convert_to('%PDF-contrat-un', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: le même document dans un AUTRE dossier a été refusé (%)', SQLERRM;
  END;

  -- ── 4. Le compte rendu est figé ──────────────────────────────────────────
  PERFORM pg_temp.refus('UPDATE d''un compte rendu',
    $q$UPDATE comptes_rendus_biologiques SET type_mime = 'image/jpeg' WHERE id = 'cr_1'$q$,
    'P0001', 'seule la purge de son document le modifie');

  -- ── 5. L'import naît en cours, dans son dossier ──────────────────────────
  BEGIN
    INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, lance_le)
    VALUES ('imp_1', 'PAT_CONTRAT_STG1', 'cr_1', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr',
            TIMESTAMP '2000-01-01 00:00:00'),
           ('imp_2', 'PAT_CONTRAT_STG1', 'cr_1', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr', DEFAULT),
           ('imp_3', 'PAT_CONTRAT_STG1', 'cr_1', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr', DEFAULT);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: un import valide a été refusé (%)', SQLERRM;
  END;
  SELECT lance_le INTO instant FROM imports_biologiques WHERE id = 'imp_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'STAGING BIO: un lancement antidaté a gardé sa date (%).', instant;
  END IF;

  PERFORM pg_temp.refus('import né déjà extrait',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, statut, termine_le)
       VALUES ('imp_t1', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', 'praticien@wellneuro.fr', 'extrait', CURRENT_TIMESTAMP)$q$,
    'P0001', 'une extraction naît en cours');
  PERFORM pg_temp.refus('import sur le compte rendu d''un AUTRE dossier',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t2', 'PAT_CONTRAT_STG2', 'cr_1', 'm', 'v', 'praticien@wellneuro.fr')$q$,
    '23503', 'imports_biologiques_id_compte_rendu_id_patient_fkey');
  PERFORM pg_temp.refus('modèle vide',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t3', 'PAT_CONTRAT_STG1', 'cr_1', E' \t', 'v', 'praticien@wellneuro.fr')$q$,
    '23514', 'imports_biologiques_modele_check');
  PERFORM pg_temp.refus('version du procédé vide',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t4', 'PAT_CONTRAT_STG1', 'cr_1', 'm', '', 'praticien@wellneuro.fr')$q$,
    '23514', 'imports_biologiques_version_prompt_check');
  PERFORM pg_temp.refus('lanceur vide',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t5', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', ' ')$q$,
    '23514', 'imports_biologiques_lance_par_check');
  PERFORM pg_temp.refus('import en cours qui porte un motif d''échec',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, motif_echec)
       VALUES ('imp_t6', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', 'praticien@wellneuro.fr', 'delai_depasse')$q$,
    '23514', 'imports_biologiques_echec_motive_check');
  PERFORM pg_temp.refus('import en cours qui porte une fin',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, termine_le)
       VALUES ('imp_t7', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP)$q$,
    '23514', 'imports_biologiques_termine_check');
  PERFORM pg_temp.refus('import qui porte un laboratoire avant toute lecture',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par, laboratoire_lu)
       VALUES ('imp_t8', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', 'praticien@wellneuro.fr', 'Laboratoire')$q$,
    'P0001', 'le laboratoire est lu par l''extraction');
  PERFORM pg_temp.refus('modèle au-delà de 100 caractères',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t9', 'PAT_CONTRAT_STG1', 'cr_1', repeat('m', 101), 'v', 'praticien@wellneuro.fr')$q$,
    '23514', 'imports_biologiques_modele_check');
  PERFORM pg_temp.refus('version du procédé au-delà de 50 caractères',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t10', 'PAT_CONTRAT_STG1', 'cr_1', 'm', repeat('v', 51), 'praticien@wellneuro.fr')$q$,
    '23514', 'imports_biologiques_version_prompt_check');
  PERFORM pg_temp.refus('lanceur au-delà de 320 caractères',
    $q$INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ('imp_t11', 'PAT_CONTRAT_STG1', 'cr_1', 'm', 'v', repeat('x', 321))$q$,
    '23514', 'imports_biologiques_lance_par_check');

  -- ── 7. Les lignes naissent proposées, dans une extraction en cours ───────
  BEGIN
    INSERT INTO lignes_biologiques_candidates
      (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, unite_lue, preleve_le_lu, analyte_propose, statut_mapping)
    VALUES
      ('lig_1', 'PAT_CONTRAT_STG1', 'imp_1', 1, 1, 'Analyte de contrat', '4,2', 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'BIO_CONTRAT_STG', 'resolu'),
      ('lig_2', 'PAT_CONTRAT_STG1', 'imp_1', 2, 1, 'Libellé inconnu', 'positif', NULL, NULL, NULL, 'inconnu'),
      ('lig_3', 'PAT_CONTRAT_STG1', 'imp_1', 3, 2, 'Libellé ambigu', '<0,5', 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'BIO_CONTRAT_STG', 'ambigu'),
      ('lig_4', 'PAT_CONTRAT_STG1', 'imp_1', 4, 2, 'Libellé ambigu sans candidat', '12', 'mg/L', NULL, NULL, 'ambigu'),
      ('lig_e', 'PAT_CONTRAT_STG1', 'imp_2', 1, 1, 'Ligne d''une extraction qui échouera', '1', NULL, NULL, NULL, 'inconnu');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: une ligne candidate valide a été refusée (%)', SQLERRM;
  END;

  PERFORM pg_temp.refus('ligne née déjà validée',
    $q$INSERT INTO lignes_biologiques_candidates
         (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping, statut, id_resultat, traite_par, traite_le)
       VALUES ('lig_t1', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'inconnu', 'validee', 'res_stg1', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP)$q$,
    'P0001', 'une ligne lue naît proposée');
  PERFORM pg_temp.refus('ligne d''un AUTRE dossier sur cette extraction',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t2', 'PAT_CONTRAT_STG2', 'imp_1', 9, 1, 'l', '1', 'inconnu')$q$,
    '23503', 'lignes_biologiques_candidates_id_import_id_patient_fkey');
  PERFORM pg_temp.refus('rang nul',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t3', 'PAT_CONTRAT_STG1', 'imp_1', 0, 1, 'l', '1', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_rang_check');
  PERFORM pg_temp.refus('page nulle',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t4', 'PAT_CONTRAT_STG1', 'imp_1', 9, 0, 'l', '1', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_page_check');
  PERFORM pg_temp.refus('libellé lu vide',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t5', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, E'\t', '1', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_libelle_lu_check');
  PERFORM pg_temp.refus('valeur lue vide',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t6', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_valeur_lue_check');
  PERFORM pg_temp.refus('unité lue en chaîne blanche (une unité absente est NULL)',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, unite_lue, statut_mapping)
       VALUES ('lig_t7', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', '  ', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_unite_lue_check');
  PERFORM pg_temp.refus('statut de mapping hors liste',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t8', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'choisi_par_le_modele')$q$,
    '23514', 'lignes_biologiques_candidates_statut_mapping_check');
  PERFORM pg_temp.refus('mapping « résolu » sans analyte',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t9', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'resolu')$q$,
    '23514', 'lignes_biologiques_candidates_mapping_coherent_check');
  PERFORM pg_temp.refus('mapping « inconnu » qui désigne un analyte',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, analyte_propose, statut_mapping)
       VALUES ('lig_t10', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'BIO_CONTRAT_STG', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_mapping_coherent_check');
  PERFORM pg_temp.refus('ligne proposée qui porte un auteur de décision',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping, traite_par)
       VALUES ('lig_t11', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'inconnu', 'praticien@wellneuro.fr')$q$,
    '23514', 'lignes_biologiques_candidates_traitee_check');
  PERFORM pg_temp.refus('ligne proposée qui porte un instant de décision',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping, traite_le)
       VALUES ('lig_t14', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'inconnu', CURRENT_TIMESTAMP)$q$,
    '23514', 'lignes_biologiques_candidates_traitee_check');
  PERFORM pg_temp.refus('libellé lu au-delà de 300 caractères',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t15', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, repeat('l', 301), '1', 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_libelle_lu_check');
  PERFORM pg_temp.refus('valeur lue au-delà de 100 caractères',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t16', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', repeat('1', 101), 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_valeur_lue_check');
  PERFORM pg_temp.refus('unité lue au-delà de 50 caractères',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, unite_lue, statut_mapping)
       VALUES ('lig_t17', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', repeat('u', 51), 'inconnu')$q$,
    '23514', 'lignes_biologiques_candidates_unite_lue_check');
  PERFORM pg_temp.refus('deux lignes au même rang d''une extraction',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t12', 'PAT_CONTRAT_STG1', 'imp_1', 1, 1, 'l', '1', 'inconnu')$q$,
    '23505', 'lignes_biologiques_candidates_import_rang_key');

  -- ── 9. Rien ne se décide tant que l'extraction court ─────────────────────
  PERFORM pg_temp.refus('ligne validée pendant son extraction',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_1'$q$,
    'P0001', 'seule une extraction terminée se valide');

  -- ── 6. L'import se termine une fois ──────────────────────────────────────
  PERFORM pg_temp.refus('extraction qui échoue en laissant des lignes',
    $q$UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'reponse_invalide' WHERE id = 'imp_2'$q$,
    'P0001', 'une extraction en échec ne laisse aucune ligne candidate');
  PERFORM pg_temp.refus('échec sans motif',
    $q$UPDATE imports_biologiques SET statut = 'echec' WHERE id = 'imp_3'$q$,
    '23514', 'imports_biologiques_echec_motive_check');
  PERFORM pg_temp.refus('motif d''échec hors liste (aucun texte libre)',
    $q$UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'Taux de ferritine illisible' WHERE id = 'imp_3'$q$,
    '23514', 'imports_biologiques_motif_echec_check');
  PERFORM pg_temp.refus('laboratoire lu réduit à des blancs',
    $q$UPDATE imports_biologiques SET statut = 'extrait', laboratoire_lu = E' \t' WHERE id = 'imp_3'$q$,
    '23514', 'imports_biologiques_laboratoire_lu_check');
  PERFORM pg_temp.refus('laboratoire lu au-delà de 200 caractères',
    $q$UPDATE imports_biologiques SET statut = 'extrait', laboratoire_lu = repeat('l', 201) WHERE id = 'imp_3'$q$,
    '23514', 'imports_biologiques_laboratoire_lu_check');
  PERFORM pg_temp.refus('terminaison qui réécrit le modèle',
    $q$UPDATE imports_biologiques SET statut = 'extrait', modele = 'autre-modele' WHERE id = 'imp_3'$q$,
    'P0001', 'seuls le statut, le motif d''échec, le laboratoire lu et la fin changent');
  PERFORM pg_temp.refus('import qui reste en cours en changeant',
    $q$UPDATE imports_biologiques SET version_prompt = 'releve-v2' WHERE id = 'imp_3'$q$,
    'P0001', 'une extraction en cours ne peut que se terminer');

  -- Un résultat créé dans CETTE transaction, avant la terminaison : il précède
  -- la fin réelle de l'extraction, et aucune ligne ne doit s'y rattacher.
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
  VALUES ('res_stg1_avant', 'PAT_CONTRAT_STG1', 'BIO_CONTRAT_STG', 4.0, 'mg/L', TIMESTAMP '2026-07-01 08:00:00',
          'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC');
  PERFORM pg_sleep(0.01);

  BEGIN
    UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'delai_depasse' WHERE id = 'imp_3';
    UPDATE imports_biologiques
    SET statut = 'extrait', laboratoire_lu = 'Laboratoire de contrat', termine_le = TIMESTAMP '2000-01-01 00:00:00'
    WHERE id = 'imp_1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: une terminaison valide a été refusée (%)', SQLERRM;
  END;
  SELECT termine_le INTO instant FROM imports_biologiques WHERE id = 'imp_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'STAGING BIO: une fin antidatée a gardé sa date (%).', instant;
  END IF;
  SELECT count(*) INTO nb FROM imports_biologiques WHERE id = 'imp_1' AND laboratoire_lu = 'Laboratoire de contrat';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: le laboratoire lu à la terminaison n''a pas été conservé.';
  END IF;

  -- Les instants posés par la base sont de l'UTC, fuseau de session ignoré,
  -- et ceux de leurs TRANSITIONS, dans l'ordre où elles ont eu lieu — pas le
  -- début de la transaction.
  SELECT count(*) INTO nb
  FROM comptes_rendus_biologiques cr, imports_biologiques i
  WHERE cr.id = 'cr_1' AND i.id = 'imp_1'
    AND cr.depose_le >= (now() AT TIME ZONE 'UTC')::timestamp(3)
    AND i.termine_le <= (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3)
    AND cr.depose_le <= i.lance_le
    AND i.lance_le <= i.termine_le;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: un instant posé par la base n''est pas en UTC, ou pas dans l''ordre des transitions.';
  END IF;
  SELECT count(*) INTO nb
  FROM imports_biologiques i, resultats_biologiques r
  WHERE i.id = 'imp_1' AND r.id = 'res_stg1_avant' AND i.termine_le > r.saisi_le;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: la fin d''extraction n''est pas datée APRÈS un résultat créé avant elle dans la même transaction — elle prend le début de la transaction.';
  END IF;

  -- Le résultat que la validation créera : saisi APRÈS la fin de l'extraction,
  -- strictement, et en UTC comme Prisma l'écrit.
  PERFORM pg_sleep(0.01);
  INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
  VALUES ('res_stg1', 'PAT_CONTRAT_STG1', 'BIO_CONTRAT_STG', 4.2, 'mg/L', TIMESTAMP '2026-09-01 08:00:00',
          'saisie_praticien', 'praticien@wellneuro.fr', clock_timestamp() AT TIME ZONE 'UTC');
  SELECT count(*) INTO nb FROM imports_biologiques WHERE id = 'imp_3' AND modele = 'modele-contrat' AND version_prompt = 'releve-v1';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: une extraction en échec ne porte plus son modèle et sa version du procédé.';
  END IF;

  PERFORM pg_temp.refus('extraction terminée qui se termine à nouveau',
    $q$UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'delai_depasse' WHERE id = 'imp_1'$q$,
    'P0001', 'import figé');

  -- ── 8. Une extraction terminée ne reçoit plus de ligne ───────────────────
  PERFORM pg_temp.refus('ligne ajoutée à une extraction terminée',
    $q$INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ('lig_t13', 'PAT_CONTRAT_STG1', 'imp_1', 9, 1, 'l', '1', 'inconnu')$q$,
    'P0001', 'son extraction n''est plus en cours');

  -- ── 10 et 11. La décision, une fois, dans son dossier ────────────────────
  PERFORM pg_temp.refus('ligne validée vers le résultat d''un AUTRE dossier',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg2', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_1'$q$,
    'P0001', 'n''appartient pas à ce dossier');
  PERFORM pg_temp.refus('ligne validée vers un résultat créé avant la fin de l''extraction, dans la même transaction',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1_avant', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_1'$q$,
    'P0001', 'saisi avant la fin de l''extraction');
  PERFORM pg_temp.refus('ligne validée vers une saisie manuelle ANTÉRIEURE à l''extraction',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1_ancien', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_1'$q$,
    'P0001', 'saisi avant la fin de l''extraction');
  PERFORM pg_temp.refus('ligne qui reste proposée en changeant',
    $q$UPDATE lignes_biologiques_candidates SET libelle_lu = 'réécrit' WHERE id = 'lig_2'$q$,
    'P0001', 'ne change que par la décision du praticien');
  PERFORM pg_temp.refus('décision qui réécrit la valeur lue',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', valeur_lue = '5'
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit la date relevée',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr',
           preleve_le_lu = TIMESTAMP '2026-01-01 00:00:00'
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit le libellé lu',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', libelle_lu = 'autre'
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit l''unité lue',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', unite_lue = 'g/L'
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit la page',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', page = 7
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit le rang',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = 'praticien@wellneuro.fr', rang = 8
       WHERE id = 'lig_2'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit l''analyte proposé par le resolver',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1', traite_par = 'praticien@wellneuro.fr', analyte_propose = NULL
       WHERE id = 'lig_3'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('décision qui réécrit le statut de mapping',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1', traite_par = 'praticien@wellneuro.fr', statut_mapping = 'resolu'
       WHERE id = 'lig_3'$q$,
    'P0001', 'ce qui a été lu ne se réécrit pas');
  PERFORM pg_temp.refus('ligne validée qui porte un motif d''écart',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1', motif_ecart = 'non_quantitative', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_ecartee_check');
  PERFORM pg_temp.refus('ligne écartée qui désigne un résultat',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', id_resultat = 'res_stg1', motif_ecart = 'non_quantitative', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_validee_check');
  PERFORM pg_temp.refus('auteur de décision au-delà de 320 caractères',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'non_quantitative', traite_par = repeat('x', 321) WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_traite_par_check');
  PERFORM pg_temp.refus('ligne écartée sans motif',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'ecartee', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_ecartee_check');
  PERFORM pg_temp.refus('motif d''écart hors liste',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'ecartee', motif_ecart = 'valeur anormale', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_motif_ecart_check');
  PERFORM pg_temp.refus('ligne validée sans résultat',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'validee', traite_par = 'praticien@wellneuro.fr' WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_validee_check');
  PERFORM pg_temp.refus('décision sans auteur',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'non_quantitative' WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_traitee_check');
  PERFORM pg_temp.refus('auteur de décision réduit à des blancs',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'non_quantitative', traite_par = E' \t' WHERE id = 'lig_2'$q$,
    '23514', 'lignes_biologiques_candidates_traite_par_check');

  BEGIN
    UPDATE lignes_biologiques_candidates
    SET statut = 'validee', id_resultat = 'res_stg1', traite_par = 'praticien@wellneuro.fr',
        traite_le = TIMESTAMP '2000-01-01 00:00:00'
    WHERE id = 'lig_1';
    UPDATE lignes_biologiques_candidates
    SET statut = 'ecartee', motif_ecart = 'non_quantitative', traite_par = 'praticien@wellneuro.fr'
    WHERE id = 'lig_2';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: une décision valide a été refusée (%)', SQLERRM;
  END;
  -- La décision est datée de son instant, donc APRÈS le résultat qu'elle
  -- désigne — pas du début de la transaction, ni en heure de session.
  SELECT count(*) INTO nb
  FROM lignes_biologiques_candidates l
  JOIN resultats_biologiques r ON r.id = l.id_resultat
  WHERE l.id = 'lig_1'
    AND l.traite_le >= r.saisi_le
    AND l.traite_le <= (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: la décision est datée avant le résultat qu''elle désigne, ou hors UTC.';
  END IF;

  PERFORM pg_temp.refus('ligne décidée qui change de décision',
    $q$UPDATE lignes_biologiques_candidates SET statut = 'ecartee', id_resultat = NULL, motif_ecart = 'ecartee_par_praticien' WHERE id = 'lig_1'$q$,
    'P0001', 'une ligne décidée');
  PERFORM pg_temp.refus('un même résultat validé depuis deux lignes',
    $q$UPDATE lignes_biologiques_candidates
       SET statut = 'validee', id_resultat = 'res_stg1', traite_par = 'praticien@wellneuro.fr'
       WHERE id = 'lig_3'$q$,
    '23505', 'lignes_biologiques_candidates_id_resultat_key');

  -- ── 13 (TRUNCATE, éprouvé sur la feuille de la chaîne) ───────────────────
  -- Les deux autres tables sont référencées : PostgreSQL refuse leur TRUNCATE
  -- seul avant tout trigger. Leurs triggers s'éprouvent par présence (13).
  PERFORM pg_temp.refus('TRUNCATE des lignes candidates',
    $q$TRUNCATE lignes_biologiques_candidates$q$,
    'P0001', 'lignes_biologiques_candidates : ligne figée');

  -- ── 12. L'effacement nommé, en base ──────────────────────────────────────
  PERFORM pg_temp.refus('résultat validé effacé avant sa ligne',
    $q$DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_STG1'$q$,
    '23503', 'lignes_biologiques_candidates_id_resultat_fkey');
  PERFORM pg_temp.refus('compte rendu effacé avant ses imports',
    $q$DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_STG1'$q$,
    '23503', 'imports_biologiques_id_compte_rendu_id_patient_fkey');

  BEGIN
    DELETE FROM lignes_biologiques_candidates WHERE id_patient = 'PAT_CONTRAT_STG1';
    GET DIAGNOSTICS nb = ROW_COUNT;
    IF nb <> 5 THEN
      RAISE EXCEPTION 'STAGING BIO: 5 lignes attendues pour le premier dossier, % supprimée(s).', nb;
    END IF;
    DELETE FROM imports_biologiques WHERE id_patient = 'PAT_CONTRAT_STG1';
    DELETE FROM comptes_rendus_biologiques WHERE id_patient = 'PAT_CONTRAT_STG1';
    DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_STG1';
    DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_STG1';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'STAGING BIO: l''effacement d''un dossier qui a déposé un compte rendu a échoué (%)', SQLERRM;
  END;

  -- ── 13. FK RESTRICT, triggers anti-TRUNCATE, stockage ────────────────────
  -- Une à une, par leur nom : un compte agrégé laisserait une FK en CASCADE
  -- compensée par une FK de trop.
  SELECT array_agg(con.conname::text || ':' || con.confdeltype::text ORDER BY con.conname) INTO reelles
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  WHERE con.contype = 'f'
    AND enfant.relname IN ('comptes_rendus_biologiques', 'imports_biologiques', 'lignes_biologiques_candidates');
  IF reelles IS DISTINCT FROM ARRAY[
    'comptes_rendus_biologiques_id_patient_fkey:r',
    'imports_biologiques_id_compte_rendu_id_patient_fkey:r',
    'imports_biologiques_id_patient_fkey:r',
    'lignes_biologiques_candidates_analyte_propose_fkey:r',
    'lignes_biologiques_candidates_id_import_id_patient_fkey:r',
    'lignes_biologiques_candidates_id_patient_fkey:r',
    'lignes_biologiques_candidates_id_resultat_fkey:r'
  ] THEN
    RAISE EXCEPTION 'STAGING BIO: FK inattendues (%). Attendu sept FK nommées, toutes en ON DELETE RESTRICT.', reelles;
  END IF;

  -- Hygiène d'exécution : aucune des sept fonctions n'est exécutable par
  -- PUBLIC (une ACL NULL vaut le défaut, qui l'est).
  SELECT count(*) INTO nb
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'bio\_ingest\_%'
    AND (p.proacl IS NULL OR EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ));
  IF nb <> 0 THEN
    RAISE EXCEPTION 'STAGING BIO: % fonction(s) bio_ingest_* exécutable(s) par PUBLIC.', nb;
  END IF;
  SELECT count(*) INTO nb
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'bio\_ingest\_%';
  IF nb <> 7 THEN
    RAISE EXCEPTION 'STAGING BIO: 7 fonctions bio_ingest_* attendues, % trouvée(s).', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE NOT t.tgisinternal
    AND t.tgname IN ('comptes_rendus_biologiques_no_truncate', 'imports_biologiques_no_truncate',
                     'lignes_biologiques_candidates_no_truncate')
    AND t.tgfoid = 'public.bio_ingest_figee()'::regprocedure;
  IF nb <> 3 THEN
    RAISE EXCEPTION 'STAGING BIO: 3 triggers anti-TRUNCATE attendus, % trouvé(s).', nb;
  END IF;

  -- Les triggers refusent un statut hors liste AVANT ces deux CHECK : ils ne
  -- se voient donc pas au comportement. Ils restent la garde si un trigger
  -- tombait, et c'est leur présence qui s'éprouve.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conname IN ('imports_biologiques_statut_check', 'lignes_biologiques_candidates_statut_check');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'STAGING BIO: % CHECK de statut présent(s) sur 2 (import, ligne).', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.relname = 'comptes_rendus_biologiques' AND a.attname = 'contenu' AND a.attstorage = 'e';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'STAGING BIO: le document n''est plus stocké EXTERNAL.';
  END IF;

  -- ── 14. Listes blanches de colonnes, forme des index ─────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'comptes_rendus_biologiques';
  IF reelles IS DISTINCT FROM COLS_CR THEN
    RAISE EXCEPTION 'STAGING BIO: colonnes du compte rendu inattendues (%). Attendu exactement % — toute colonne neuve s''arbitre (aucun nom de fichier, aucun masquage).', reelles, COLS_CR;
  END IF;
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'imports_biologiques';
  IF reelles IS DISTINCT FROM COLS_IMPORT THEN
    RAISE EXCEPTION 'STAGING BIO: colonnes de l''import inattendues (%). Attendu exactement %.', reelles, COLS_IMPORT;
  END IF;
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'lignes_biologiques_candidates';
  IF reelles IS DISTINCT FROM COLS_LIGNE THEN
    RAISE EXCEPTION 'STAGING BIO: colonnes de la ligne inattendues (%). Attendu exactement %.', reelles, COLS_LIGNE;
  END IF;

  SELECT array_agg(i.relname || ':' || CASE WHEN x.indisunique THEN 't' ELSE 'f' END ORDER BY i.relname) INTO reelles
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class t ON t.oid = x.indrelid
  WHERE t.relname IN ('comptes_rendus_biologiques', 'imports_biologiques', 'lignes_biologiques_candidates');
  IF reelles IS DISTINCT FROM INDEX_ATTENDUS THEN
    RAISE EXCEPTION 'STAGING BIO: index inattendus (%). Attendu exactement %.', reelles, INDEX_ATTENDUS;
  END IF;

  -- ── 15. RLS deny-all ─────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('comptes_rendus_biologiques', 'imports_biologiques', 'lignes_biologiques_candidates')
    AND c.relrowsecurity;
  IF nb <> 3 THEN
    RAISE EXCEPTION 'STAGING BIO: RLS active sur % table(s) du staging sur 3.', nb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('comptes_rendus_biologiques', 'imports_biologiques', 'lignes_biologiques_candidates')
  ) THEN
    RAISE EXCEPTION 'STAGING BIO: policy inattendue sur le staging (deny-all attendu).';
  END IF;

  RAISE NOTICE 'STAGING BIO: dépôt valide horodaté par la base et 10 Mo admis ; type, taille, empreinte, déposant refusés chacun par son CHECK ; doublon refusé dans un dossier, admis dans un autre ; compte rendu figé hors purge ; import né en cours, horodaté, sans laboratoire, dans son dossier, modèle et version non vides et bornés ; terminaison unique, motivée, sans ligne en échec, sans réécriture ; lignes nées proposées dans une extraction en cours, CHECK mordant chacun ; rien ne se décide avant la fin ni ne s''ajoute après ; décision unique, horodatée, sans réécrire le lu, dans son dossier, jamais vers une saisie antérieure à l''extraction, un résultat par ligne ; effacement nommé passant et RESTRICT tenu ; 7 FK RESTRICT nommées, 3 triggers anti-TRUNCATE, 2 CHECK de statut, document EXTERNAL, aucune fonction ouverte à PUBLIC ; colonnes et index exacts ; RLS deny-all sur les trois.';
END $$;

ROLLBACK;
