-- Contrat de l'identité masquée avant l'envoi ([[D-284]] §5, lot (j) ;
-- migration `20261013233000_bio_ingest_masquage_identite_v1`).
--
-- Ce fichier éprouve TOUTES les promesses de la migration :
--   1. le valide est ACCEPTÉ : un masquage à zones, une déclaration « aucune
--      identité », horodatés par la base ; une page à sa borne exacte ; le
--      parcours « lecture refusée `masquage_absent`, masquage, redemande » ;
--      un masquage qui repasse une fois la lecture ouverte finie ;
--   2. chaque CHECK mord (23514) sous son PROPRE nom : déclaration (case ET
--      zones, ni l'une ni les autres), nombre de pages, zones, auteur, pages
--      en nombre différent de celui déclaré, aucune page ;
--   3. le trigger d'insertion refuse (P0001, chaque refus sous son MESSAGE) :
--      aucune page, page non JPEG, page vide, page
--      trop lourde, page absente, liste à deux dimensions, total trop lourd,
--      masquage né purgé, document purgé, lecture demandée, import en cours ;
--   4. figé : modification hors purge refusée, purge refusée tant que le
--      document ne l'est pas, TRUNCATE refusé ;
--   5. la purge du DOCUMENT purge ses masquages, dans la même instruction, et
--      seulement les siens ; un masquage purgé est figé ;
--   6. les clés : compte rendu d'un autre patient (23503) ; compte rendu NON
--      supprimable sous un masquage (RESTRICT, par un vrai DELETE) ;
--   7. la table porte EXACTEMENT dix colonnes, ses deux index existent, et la
--      RLS deny-all est active et sans policy.
--
-- Tout se déroule dans une transaction annulée : rien ne survit au fichier.
BEGIN;

-- Rejoue `sql` et exige un refus de code `etat` — et, si nommée, de la
-- contrainte attendue : deux CHECK de la même table rendent le même code.
-- Pour un refus du trigger (P0001), `contrainte` porte un fragment du MESSAGE
-- attendu, exigé : le code seul passerait pour une mauvaise raison (revue du
-- lot 1).
CREATE FUNCTION pg_temp.refuse(cas text, etat text, sql text, contrainte text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  nom text;
BEGIN
  BEGIN
    EXECUTE sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS nom = CONSTRAINT_NAME;
    IF SQLSTATE <> etat THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé pour une autre raison (% : %), % attendu', cas, SQLSTATE, SQLERRM, etat;
    END IF;
    IF etat = 'P0001' THEN
      IF contrainte IS NULL OR position(contrainte IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'CONTRAT « % » : refusé par « % », « % » attendu', cas, SQLERRM, contrainte;
      END IF;
      RETURN;
    END IF;
    IF contrainte IS NOT NULL AND nom IS DISTINCT FROM contrainte THEN
      RAISE EXCEPTION 'CONTRAT « % » : refusé par %, % attendue', cas, nom, contrainte;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT « % » : accepté alors qu''il devait être refusé', cas;
END;
$$;

-- Une page JPEG minimale : la signature, puis `n` octets.
CREATE FUNCTION pg_temp.jpeg(n int DEFAULT 4) RETURNS bytea
LANGUAGE sql AS $$ SELECT '\xffd8ff'::bytea || decode(repeat('00', n), 'hex') $$;

-- Insère un masquage sur `cr` (dossier A) : le SQL rejoué par `refuse`.
-- `pages` est une expression SQL de type bytea[].
CREATE FUNCTION pg_temp.masquage(cr text, pages text, nombre int, zones int, aucune boolean,
                                 auteur text DEFAULT 'p@w.fr', purge boolean DEFAULT false) RETURNS text
LANGUAGE sql AS $$
  SELECT format(
    'INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par, purge_le) '
    'VALUES (''x'', ''PAT_CONTRAT_MQA'', %L, %s, %s, %s, %L, %L, %s)',
    cr, pages, nombre, zones, aucune, auteur, CASE WHEN purge THEN 'now()' ELSE 'NULL' END);
$$;

DO $$
DECLARE
  decl CONSTANT text := 'masquages_comptes_rendus_declaration_check';
  une CONSTANT text := 'ARRAY[pg_temp.jpeg()]';
  colonnes text[];
  nb integer;
  pose timestamp;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_contrat_mqa', 'PAT_CONTRAT_MQA', 'sophie.nicola+mq@example.test',
     'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
    ('pat_contrat_mqb', 'PAT_CONTRAT_MQB', 'michel.dogne+mq@example.test',
     'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par) VALUES
    ('cr_mq_a', 'PAT_CONTRAT_MQA', convert_to('%PDF-mq-a', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-a', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
    ('cr_mq_l', 'PAT_CONTRAT_MQA', convert_to('%PDF-mq-l', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-l', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
    ('cr_mq_i', 'PAT_CONTRAT_MQA', convert_to('%PDF-mq-i', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-i', 'UTF8')), 'hex'), 'praticien@wellneuro.fr'),
    ('cr_mq_b', 'PAT_CONTRAT_MQB', convert_to('%PDF-mq-b', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-b', 'UTF8')), 'hex'), 'praticien@wellneuro.fr');
  -- Transmis par le patient : l'écart les purge sans délai.
  INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine) VALUES
    ('cr_mq_p', 'PAT_CONTRAT_MQA', convert_to('%PDF-mq-p', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-p', 'UTF8')), 'hex'), 'patient'),
    ('cr_mq_x', 'PAT_CONTRAT_MQA', convert_to('%PDF-mq-x', 'UTF8'), 'application/pdf',
     encode(sha256(convert_to('%PDF-mq-x', 'UTF8')), 'hex'), 'patient');
  -- `cr_mq_x` : purgé d'emblée, pour l'insertion sur un document purgé.
  UPDATE comptes_rendus_biologiques
     SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = 'illisible'
   WHERE id = 'cr_mq_x';

  -- ── 1. LE VALIDE ─────────────────────────────────────────────────────────
  -- Une date fournie est écrasée : la base pose `pose_le`.
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par, pose_le)
  VALUES ('mq_a1', 'PAT_CONTRAT_MQA', 'cr_mq_a', ARRAY[pg_temp.jpeg(), pg_temp.jpeg(10)], 2, 3, false,
          'praticien@wellneuro.fr', '2000-01-01');
  SELECT pose_le INTO pose FROM masquages_comptes_rendus WHERE id = 'mq_a1';
  IF pose < (clock_timestamp() AT TIME ZONE 'UTC') - interval '1 minute' THEN
    RAISE EXCEPTION 'CONTRAT : pose_le doit être posé par la base (%)', pose;
  END IF;
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
  VALUES ('mq_a2', 'PAT_CONTRAT_MQA', 'cr_mq_a', ARRAY[pg_temp.jpeg()], 1, 0, true, 'praticien@wellneuro.fr');
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
  VALUES ('mq_p1', 'PAT_CONTRAT_MQA', 'cr_mq_p', ARRAY[pg_temp.jpeg()], 1, 1, false, 'praticien@wellneuro.fr');
  -- Une page à sa borne exacte (3,75 Mio) passe.
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
  VALUES ('mq_a3', 'PAT_CONTRAT_MQA', 'cr_mq_a', ARRAY[pg_temp.jpeg(3932157)], 1, 1, false, 'praticien@wellneuro.fr');
  -- Le parcours normal : la file refuse une lecture sans masquage
  -- (`masquage_absent`), le praticien masque, puis redemande.
  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par, statut, motif_echec, termine_le)
  VALUES ('tr_mq_echec', 'PAT_CONTRAT_MQB', 'cr_mq_b', 'praticien@wellneuro.fr', 'echec', 'masquage_absent', now());
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
  VALUES ('mq_b1', 'PAT_CONTRAT_MQB', 'cr_mq_b', ARRAY[pg_temp.jpeg()], 1, 2, false, 'praticien@wellneuro.fr');
  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par)
  VALUES ('tr_mq_b2', 'PAT_CONTRAT_MQB', 'cr_mq_b', 'praticien@wellneuro.fr');
  -- Retiré : la clé « autre patient » (§6) se juge sur `cr_mq_b` sans lecture ouverte.
  DELETE FROM travaux_extraction_biologique WHERE id = 'tr_mq_b2';

  -- ── 2. LES CHECK, CHACUN SOUS SON NOM ────────────────────────────────────
  PERFORM pg_temp.refuse('case et zones', '23514', pg_temp.masquage('cr_mq_a', une, 1, 2, true), decl);
  PERFORM pg_temp.refuse('ni case ni zone', '23514', pg_temp.masquage('cr_mq_a', une, 1, 0, false), decl);
  PERFORM pg_temp.refuse('21 pages', '23514',
    pg_temp.masquage('cr_mq_a', 'array_fill(pg_temp.jpeg(), ARRAY[21])', 21, 1, false),
    'masquages_comptes_rendus_nombre_pages_check');
  -- Des zones négatives tombent d'abord sous la déclaration (ni case ni zone) :
  -- la borne basse de `zones_check` n'est pas isolable, la haute l'est.
  PERFORM pg_temp.refuse('zones au-delà de la borne', '23514', pg_temp.masquage('cr_mq_a', une, 1, 1001, false),
    'masquages_comptes_rendus_zones_check');
  PERFORM pg_temp.refuse('auteur vide', '23514', pg_temp.masquage('cr_mq_a', une, 1, 1, false, '   '),
    'masquages_comptes_rendus_pose_par_check');
  PERFORM pg_temp.refuse('pages en nombre différent', '23514', pg_temp.masquage('cr_mq_a', une, 2, 1, false),
    'masquages_comptes_rendus_pages_check');

  -- ── 3. LE TRIGGER D'INSERTION ────────────────────────────────────────────
  PERFORM pg_temp.refuse('aucune page', 'P0001',
    pg_temp.masquage('cr_mq_a', '''{}''::bytea[]', 1, 1, false), 'liste simple');
  PERFORM pg_temp.refuse('page non JPEG', 'P0001',
    pg_temp.masquage('cr_mq_a', 'ARRAY[convert_to(''%PDF-1.7 page'', ''UTF8'')]', 1, 1, false), 'pas une image JPEG');
  PERFORM pg_temp.refuse('page vide', 'P0001',
    pg_temp.masquage('cr_mq_a', 'ARRAY[''\xffd8ff''::bytea]', 1, 1, false), 'vide ou dépasse');
  PERFORM pg_temp.refuse('page trop lourde', 'P0001',
    pg_temp.masquage('cr_mq_a', 'ARRAY[pg_temp.jpeg(3932158)]', 1, 1, false), 'vide ou dépasse');
  PERFORM pg_temp.refuse('page absente', 'P0001',
    pg_temp.masquage('cr_mq_a', 'ARRAY[pg_temp.jpeg(), NULL]', 2, 1, false), 'page est absente');
  PERFORM pg_temp.refuse('liste à deux dimensions', 'P0001',
    pg_temp.masquage('cr_mq_a', 'ARRAY[ARRAY[pg_temp.jpeg()], ARRAY[pg_temp.jpeg()]]', 2, 1, false), 'liste simple');
  PERFORM pg_temp.refuse('total trop lourd', 'P0001',
    pg_temp.masquage('cr_mq_a', 'array_fill(pg_temp.jpeg(3700000), ARRAY[6])', 6, 1, false), '20 Mio au total');
  PERFORM pg_temp.refuse('né purgé', 'P0001', pg_temp.masquage('cr_mq_a', une, 1, 1, false, 'p@w.fr', true), 'jamais purgé');
  PERFORM pg_temp.refuse('document purgé', 'P0001', pg_temp.masquage('cr_mq_x', une, 1, 1, false), 'document de ce compte rendu est purgé');

  INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par)
  VALUES ('tr_mq_l', 'PAT_CONTRAT_MQA', 'cr_mq_l', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('lecture demandée', 'P0001', pg_temp.masquage('cr_mq_l', une, 1, 1, false), 'demandée ou en cours');
  INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
  VALUES ('imp_mq_i', 'PAT_CONTRAT_MQA', 'cr_mq_i', 'modele-contrat', 'releve-v1', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('import en cours', 'P0001', pg_temp.masquage('cr_mq_i', une, 1, 1, false), 'demandée ou en cours');
  -- Le travail fini, le masquage repasse : le refus visait la lecture ouverte,
  -- pas le compte rendu.
  UPDATE travaux_extraction_biologique
     SET statut = 'echec', motif_echec = 'masquage_absent', termine_le = now()
   WHERE id = 'tr_mq_l';
  INSERT INTO masquages_comptes_rendus (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
  VALUES ('mq_l1', 'PAT_CONTRAT_MQA', 'cr_mq_l', ARRAY[pg_temp.jpeg()], 1, 1, false, 'praticien@wellneuro.fr');

  -- ── 4. FIGÉ, SAUF LA PURGE ───────────────────────────────────────────────
  PERFORM pg_temp.refuse('zones modifiées', 'P0001',
    'UPDATE masquages_comptes_rendus SET zones_masquees = 9 WHERE id = ''mq_a1''', 'seule la purge de ses pages');
  PERFORM pg_temp.refuse('pages remplacées', 'P0001',
    'UPDATE masquages_comptes_rendus SET pages = ARRAY[pg_temp.jpeg(20), pg_temp.jpeg(20)] WHERE id = ''mq_a1''', 'seule la purge de ses pages');
  PERFORM pg_temp.refuse('purge avec un autre changement', 'P0001',
    'UPDATE masquages_comptes_rendus SET pages = ''{}'', pose_par = ''autre@w.fr'' WHERE id = ''mq_a1''', 'n''efface que les pages');
  PERFORM pg_temp.refuse('purge avant celle du document', 'P0001',
    'UPDATE masquages_comptes_rendus SET pages = ''{}'' WHERE id = ''mq_a1''', 'n''est pas purgé');
  PERFORM pg_temp.refuse('TRUNCATE', 'P0001', 'TRUNCATE masquages_comptes_rendus', 'ligne figée');

  -- ── 5. LA PURGE DU DOCUMENT EMPORTE SES MASQUAGES ────────────────────────
  UPDATE comptes_rendus_biologiques
     SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = 'praticien@wellneuro.fr', motif_ecart = 'illisible'
   WHERE id = 'cr_mq_p';
  IF NOT EXISTS (
    SELECT 1 FROM masquages_comptes_rendus
     WHERE id = 'mq_p1' AND cardinality(pages) = 0 AND purge_le IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'CONTRAT : la purge du document devait purger ses masquages';
  END IF;
  IF EXISTS (SELECT 1 FROM masquages_comptes_rendus WHERE id_compte_rendu = 'cr_mq_a' AND purge_le IS NOT NULL) THEN
    RAISE EXCEPTION 'CONTRAT : la purge d''un document ne touche pas les masquages d''un autre';
  END IF;
  PERFORM pg_temp.refuse('masquage purgé figé', 'P0001',
    'UPDATE masquages_comptes_rendus SET pages = ''{}'' WHERE id = ''mq_p1''', 'déjà purgées');

  -- ── 6. LES CLÉS ──────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('compte rendu d''un autre patient', '23503', pg_temp.masquage('cr_mq_b', une, 1, 1, false));
  PERFORM pg_temp.refuse('compte rendu sous un masquage', '23503',
    'DELETE FROM comptes_rendus_biologiques WHERE id = ''cr_mq_a''');
  -- La suppression nommée (effacement, retrait) passe, masquages d'abord.
  DELETE FROM masquages_comptes_rendus WHERE id_compte_rendu = 'cr_mq_a';

  -- ── 7. COLONNES, INDEX, RLS ──────────────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'masquages_comptes_rendus';
  IF colonnes IS DISTINCT FROM ARRAY[
    'aucune_identite', 'id', 'id_compte_rendu', 'id_patient', 'nombre_pages',
    'pages', 'pose_le', 'pose_par', 'purge_le', 'zones_masquees'
  ] THEN
    RAISE EXCEPTION 'CONTRAT : colonnes inattendues sur masquages_comptes_rendus : %', colonnes;
  END IF;

  SELECT count(*) INTO nb FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'masquages_comptes_rendus'
     AND indexname IN ('masquages_comptes_rendus_patient_idx', 'masquages_comptes_rendus_compte_rendu_idx');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT : % index sur 2 attendus sur masquages_comptes_rendus', nb;
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.masquages_comptes_rendus'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT : RLS inactive sur masquages_comptes_rendus';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'masquages_comptes_rendus';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT : % policy(s) sur masquages_comptes_rendus, deny-all attendu', nb;
  END IF;

  RAISE NOTICE 'CONTRAT bio_ingest_masquage_identite_v1 : toutes les promesses tiennent.';
END;
$$;

ROLLBACK;
