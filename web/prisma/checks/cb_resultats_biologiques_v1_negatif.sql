-- Contrat des résultats biologiques (étage 2 du rayon, CB-09, D-122 §2).
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. un résultat valide est ACCEPTÉ, et un SECOND résultat du même analyte
--      pour le même patient aussi (la lecture est une SÉRIE — estimé↔mesuré) ;
--   2. les CHECK mordent (23514) : source hors des deux origines de la
--      décision, auteur vide ou réduit à des blancs — tabulations comprises,
--      le trou btrim/1 est fermé ici — ou trop long, unité hors du
--      vocabulaire partagé (chaîne blanche comprise) ;
--   3. la table porte EXACTEMENT dix colonnes, liste blanche — un
--      `commentaire` ou un `interpretation` text serait un champ clinique
--      libre arrivé sans arbitrage ;
--   4. les colonnes porteuses sont NOT NULL — un résultat sans patient, sans
--      analyte, sans valeur, sans date de prélèvement, sans source ou sans
--      auteur n'est pas une donnée de dossier ;
--   5. les DEUX clés étrangères sont en ON DELETE RESTRICT — patients (la
--      suppression nommée de `patient/effacement.ts` resterait code mort en
--      cascade silencieuse) et biology_analytes (un analyte porteur de
--      résultats ne se supprime pas) ;
--   6. le vocabulaire d'unités est IDENTIQUE à celui du catalogue (« défini
--      une fois, appliqué quatre fois » — même mécanisme que
--      `cb_catalogue_niveau_1_donnees.sql` : la LISTE `ARRAY[...]` extraite
--      des définitions, le motif IN n'existant pas dans pg_get_constraintdef) ;
--   7. la RLS deny-all est active et sans policy (posture D-005) — la table
--      porte des DONNÉES DE SANTÉ nominatives.
--
-- Comme les autres tables patient du rayon, la table est VOLONTAIREMENT hors
-- de `tables_cb` du contrat structurel catalogue : elle porte `id_patient`
-- par construction (pièce du dossier, effacée par la transaction IDP2), là où
-- le verrou HDS du catalogue interdit toute sémantique patient dans
-- `biology_*`.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  colonnes text[];
  cible text;
  def_analytes text;
  def_resultats text;

  COLONNES_ATTENDUES CONSTANT text[] := ARRAY[
    'analyte_code', 'created_at', 'id', 'id_patient', 'preleve_le',
    'saisi_le', 'saisi_par', 'source', 'unite', 'valeur'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes
  -- visent le patient et l'analyte de fixture : le CHECK est alors le SEUL
  -- motif de rejet possible. Si le CHECK visé disparaît, l'insertion est
  -- ACCEPTÉE et le cas le dit — au lieu d'être masqué par une violation de
  -- clé étrangère.
  cas CONSTANT text[][] := ARRAY[
    ['source hors des deux origines de la décision',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t1', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'copie_papier', 'praticien@wellneuro.fr')$q$],
    ['auteur vide',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t2', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', '')$q$],
    ['auteur réduit à des blancs, tabulations comprises',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t3', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', E' \t\r\n')$q$],
    ['auteur au-delà de 320 caractères',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t4', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', repeat('x', 321))$q$],
    ['unité hors du vocabulaire partagé',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t5', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'grammes', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr')$q$],
    ['unité en chaîne blanche (une unité absente est NULL)',
     $q$INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
        VALUES ('t6', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, '  ', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr')$q$]
  ];
BEGIN
  -- ── 0. Fixtures — patient fictif autorisé et analyte de contrat ──────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_resbio', 'PAT_CONTRAT_RESBIO', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO biology_analytes (id, code, libelle, type_prelevement,
                                source_provenance, niveau_completude, updated_at)
  VALUES ('bio_contrat_resbio', 'BIO_CONTRAT_RESBIO', 'Analyte de contrat',
          'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS : un résultat valide, puis un second (série) ─────────
  BEGIN
    INSERT INTO resultats_biologiques
      (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
    VALUES ('ok1', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 42.5, 'mg/L',
            TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'RESULTATS BIO: un résultat VALIDE a été refusé (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  -- Un résultat SANS unité (analyte sans unité au catalogue) est légitime,
  -- et une SECONDE mesure du même analyte aussi : la lecture est une série.
  BEGIN
    INSERT INTO resultats_biologiques
      (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
    VALUES ('ok2', 'PAT_CONTRAT_RESBIO', 'BIO_CONTRAT_RESBIO', 44.0, NULL,
            TIMESTAMP '2026-09-02 08:00:00', 'import_labo', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'RESULTATS BIO: la SECONDE mesure (sans unité, import_labo) a été refusée (SQLSTATE %) — la série et la nullité d''unité sont le régime nominal.',
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
          'RESULTATS BIO test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'RESULTATS BIO test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. LISTE BLANCHE de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO colonnes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'resultats_biologiques';

  IF colonnes IS DISTINCT FROM COLONNES_ATTENDUES THEN
    RAISE EXCEPTION
      'RESULTATS BIO: colonnes inattendues (%). Attendu exactement % — une colonne neuve doit être arbitrée.',
      colonnes, COLONNES_ATTENDUES;
  END IF;

  -- ── 4. Les six colonnes porteuses sont NOT NULL ──────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'resultats_biologiques'
    AND c.column_name IN ('id_patient', 'analyte_code', 'valeur', 'preleve_le', 'source', 'saisi_par')
    AND c.is_nullable = 'NO';
  IF nb <> 6 THEN
    RAISE EXCEPTION 'RESULTATS BIO: % colonne(s) porteuse(s) NOT NULL sur 6 attendues', nb;
  END IF;

  -- ── 5. Les DEUX clés étrangères sont en ON DELETE RESTRICT ───────────────
  -- PAR TABLE, jamais en agrégé (forme du gabarit panels) : un compte global
  -- de 2 serait satisfait par deux FK RESTRICT vers la même table pendant que
  -- l'autre passe en CASCADE.
  FOREACH cible IN ARRAY ARRAY['patients', 'biology_analytes'] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    JOIN pg_class enfant ON enfant.oid = con.conrelid
    JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE con.contype = 'f'
      AND enfant.relname = 'resultats_biologiques'
      AND ref.relname = cible
      AND con.confdeltype = 'r';
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'RESULTATS BIO: clé étrangère vers % absente ou hors ON DELETE RESTRICT (% trouvée[s])', cible, nb;
    END IF;
  END LOOP;

  -- ── 6. Le vocabulaire d'unités est CELUI du catalogue ────────────────────
  -- Même mécanisme que cb_catalogue_niveau_1_donnees.sql (BL-5) : PostgreSQL
  -- normalise `IN (liste)` en `= ANY (ARRAY[...])`, la comparaison porte sur
  -- la LISTE extraite. Deux listes qui divergent = une unité acceptée au
  -- catalogue et refusée sur les résultats (ou l'inverse), sans signal.
  SELECT substring(pg_get_constraintdef(oid) from 'ARRAY\[.*\]') INTO def_analytes
  FROM pg_constraint WHERE conname = 'biology_analytes_unite_check';
  SELECT substring(pg_get_constraintdef(oid) from 'ARRAY\[.*\]') INTO def_resultats
  FROM pg_constraint WHERE conname = 'resultats_biologiques_unite_check';

  IF def_analytes IS NULL OR def_resultats IS NULL
     OR def_analytes <> def_resultats THEN
    RAISE EXCEPTION
      'D-122: le vocabulaire d''unités des résultats diverge de celui du catalogue — « défini une fois, appliqué quatre fois »';
  END IF;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'resultats_biologiques'
    AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'RESULTATS BIO: RLS désactivée sur resultats_biologiques';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resultats_biologiques'
  ) THEN
    RAISE EXCEPTION 'RESULTATS BIO: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'RESULTATS BIO: série de deux mesures acceptée, % CHECK rejetants, 10 colonnes exactes, 6 NOT NULL, 2 FK RESTRICT, vocabulaire d''unités aligné sur le catalogue, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
