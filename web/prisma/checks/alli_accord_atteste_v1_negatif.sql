-- Contrat de la table des accords attestés (Alliance 6.0-B, `D-161` §11).
-- Même architecture que les contrats de 6.0-A, du LOT-05 et de `fins_objectif`,
-- dont il est le pendant : ce qui a été prouvé là-bas ne se re-prouve pas ici,
-- ce qui est NEUF est prouvé ici.
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. une écriture valide est ACCEPTÉE. Sans ce cas positif, un CHECK devenu
--      trop serré passerait vert et la route casserait en production ;
--   2. les CHECK mordent (23514) — QUATRE cas pour DEUX contraintes : e-mail
--      vide, e-mail fait de blancs NON-ESPACE, version vide, version faite de
--      blancs. Le cas des blancs n'est pas du zèle : `btrim/1` ne retire QUE
--      l'espace ASCII ;
--   3. `convenu_le` EST OBLIGATOIRE, et c'est l'écart assumé de cette table.
--      Les autres dates d'événement de la campagne sont nullables ; ici la date
--      n'est pas un accessoire de la ligne, elle EN EST L'OBJET. Une attestation
--      sans date ne dirait rien de plus que sa propre écriture, et `cree_le`
--      affirmerait que l'accord a eu lieu au moment de la saisie — la date
--      inventée que `D-165` refuse. Éprouvé pour lui-même (23502, not_null) ;
--   4. `cree_le` reste posée par la BASE — l'INSERT valide l'omet à dessein,
--      c'est ce qui rend la ligne inantidatable ;
--   5. la table porte EXACTEMENT ses colonnes, LISTE BLANCHE. Deux absences
--      sont VOULUES et ce contrat les fige : ni `voix`, ni `consignee_par` —
--      cette table EST une attestation, les porter ajouterait des colonnes dont
--      la valeur ne varie jamais. Et aucun score, seuil, bande ni rang ;
--   6. la FK vers `patients` est en ON DELETE RESTRICT ;
--   7. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- AUCUNE UNICITÉ, et c'est délibéré : se raviser fait UNE LIGNE DE PLUS. Un
-- UNIQUE transformerait un second geste en erreur technique, ou pousserait à
-- l'upsert — c'est-à-dire à écraser une attestation antérieure.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT AU MODULE. Que le
-- TÉMOIGNAGE CÈDE À LA PREUVE est une règle de LECTURE : la base ne connaît pas
-- l'ordre des paroles. Que la version visée existe et appartienne au dossier
-- relève de la route — la référence est SOUPLE, sans FK.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  reelles text[];
  cible text;

  COLS_ACCORDS CONSTANT text[] := ARRAY[
    'convenu_le', 'cree_le', 'id', 'id_objectif', 'id_patient', 'praticien_email'
  ];

  cas CONSTANT text[][] := ARRAY[
    ['accord attesté — e-mail du praticien vide (une attestation sans attestant)',
     $q$INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
        VALUES ('a1', 'PAT_CONTRAT_ALLI_A', 'obj_contrat_a1', '   ', TIMESTAMP '2026-09-03 10:00:00')$q$],
    ['accord attesté — e-mail fait de blancs NON-ESPACE (tabulation, retour ligne)',
     $q$INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
        VALUES ('a2', 'PAT_CONTRAT_ALLI_A', 'obj_contrat_a1', E'\t\n\r ', TIMESTAMP '2026-09-03 10:00:00')$q$],
    ['accord attesté — version visée vide (un consentement sur des mots innommables)',
     $q$INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
        VALUES ('a3', 'PAT_CONTRAT_ALLI_A', '  ', 'praticien@wellneuro.fr', TIMESTAMP '2026-09-03 10:00:00')$q$],
    ['accord attesté — version visée faite de blancs NON-ESPACE',
     $q$INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
        VALUES ('a4', 'PAT_CONTRAT_ALLI_A', E'\t', 'praticien@wellneuro.fr', TIMESTAMP '2026-09-03 10:00:00')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli_a', 'PAT_CONTRAT_ALLI_A', 'sophie.nicola@example.test',
          'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_contrat_a1', 'PAT_CONTRAT_ALLI_A', 'praticien@wellneuro.fr',
          'Retrouver un confort digestif');

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- L'INSERT OMET `cree_le` À DESSEIN : c'est ce qui prouve que le DEFAULT de
    -- la base le pose, et donc que la ligne est inantidatable.
    INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
    VALUES ('acc_contrat_1', 'PAT_CONTRAT_ALLI_A', 'obj_contrat_a1',
            'praticien@wellneuro.fr', TIMESTAMP '2026-09-03 10:00:00');

    -- SE RAVISER EST UNE LIGNE DE PLUS, sur la MÊME version : c'est le cas qui
    -- prouve l'absence d'UNIQUE, et il est ici plutôt que dans un contrôle
    -- structurel parce qu'une unicité se manifeste par un rejet, pas par une
    -- absence lisible.
    INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email, convenu_le)
    VALUES ('acc_contrat_2', 'PAT_CONTRAT_ALLI_A', 'obj_contrat_a1',
            'praticien@wellneuro.fr', TIMESTAMP '2026-09-04 09:00:00');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'ACCORD ATTESTÉ: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, ou une UNIQUE interdit de se raviser.',
        SQLSTATE;
  END;

  -- ── 2. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'ACCORD ATTESTÉ test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'ACCORD ATTESTÉ test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. `convenu_le` EST OBLIGATOIRE — l'écart assumé de cette table ──────
  -- Les autres dates d'événement de la campagne sont NULLABLES ; celle-ci ne
  -- l'est pas, et c'est le fond : une attestation sans date ne dirait rien de
  -- plus que sa propre écriture.
  refuse := false;
  BEGIN
    INSERT INTO accords_attestes_objectif (id, id_patient, id_objectif, praticien_email)
    VALUES ('a5', 'PAT_CONTRAT_ALLI_A', 'obj_contrat_a1', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN not_null_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ACCORD ATTESTÉ: une attestation SANS DATE a été acceptée — `cree_le` affirmerait alors que l''accord a eu lieu au moment de la saisie (D-165).';
  END IF;

  -- ── 4. Liste blanche de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'accords_attestes_objectif';

  IF reelles IS DISTINCT FROM COLS_ACCORDS THEN
    RAISE EXCEPTION
      'ACCORD ATTESTÉ: colonnes inattendues (%). Attendu exactement % — DEUX absences sont VOULUES : ni `voix`, ni `consignee_par`, cette table ÉTANT une attestation (D-165 sur les colonnes qui ne varient jamais). Et aucun score, seuil, bande ni rang (DC-19/DC-20).',
      reelles, COLS_ACCORDS;
  END IF;

  -- ── 5. La FK vers patients est en ON DELETE RESTRICT ────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'accords_attestes_objectif'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'ACCORD ATTESTÉ: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s]).', nb;
  END IF;

  -- ── 5bis. Les DEUX CHECK existent, NOMMÉMENT ────────────────────────────
  FOREACH cible IN ARRAY ARRAY[
    'accords_attestes_objectif_praticien_email_check',
    'accords_attestes_objectif_id_objectif_check'
  ] LOOP
    SELECT count(*) INTO nb FROM pg_constraint con
    WHERE con.contype = 'c' AND con.conname = cible;
    IF nb <> 1 THEN
      RAISE EXCEPTION 'ACCORD ATTESTÉ: le CHECK % est absent (% trouvé[s]).', cible, nb;
    END IF;
  END LOOP;

  -- ── 5ter. AUCUNE contrainte d'unicité ───────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  WHERE enfant.relname = 'accords_attestes_objectif' AND con.contype IN ('u', 'x');
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'ACCORD ATTESTÉ: % contrainte(s) d''unicité — se raviser doit rester une ligne de plus, jamais un écrasement.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_index i JOIN pg_class enfant ON enfant.oid = i.indrelid
  WHERE enfant.relname = 'accords_attestes_objectif' AND i.indisunique AND NOT i.indisprimary;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'ACCORD ATTESTÉ: % index unique(s) hors clé primaire — même motif.', nb;
  END IF;

  -- ── 6. Deny-all RLS (posture D-005) ─────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'accords_attestes_objectif' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ACCORD ATTESTÉ: RLS désactivée sur accords_attestes_objectif';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'accords_attestes_objectif'
  ) THEN
    RAISE EXCEPTION 'ACCORD ATTESTÉ: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'ACCORD ATTESTÉ: 2 écritures valides acceptées (dont deux fois la même version), % cas négatifs rejetés sur 2 CHECK, `convenu_le` NOT NULL éprouvé pour lui-même, liste blanche exacte (ni voix ni consignee_par), aucune unicité, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
