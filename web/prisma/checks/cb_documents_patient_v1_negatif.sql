-- Contrat du document patient biologie (décision F, CB-06, D-122).
--
-- La table promet six choses, et ce fichier les éprouve TOUTES :
--   1. un document valide est ACCEPTÉ (sans ce cas positif, un CHECK devenu
--      trop serré passerait vert et la route casserait en production) ;
--   2. les CHECK mordent (23514) : texte vide ou réduit à des blancs — y
--      compris tabulations, le trou btrim/1 est fermé ici —, ancre hors
--      format SHA-256 hexadécimal minuscule, version vide, auteur vide ou
--      trop long ;
--   3. la table porte EXACTEMENT huit colonnes, liste blanche — un motif
--      (`valeur|resultat|…`) ne verrait pas passer un `commentaire` ou un
--      `payload` jsonb, chemins les moins coûteux pour ranger un résultat
--      d'analyse : le verrou « sans valeurs » est une liste, pas un motif ;
--   4. les colonnes porteuses sont NOT NULL — un document sans texte, sans
--      ancre ou sans auteur n'est pas une pièce de dossier ;
--   5. la clé étrangère vers `patients` est en ON DELETE RESTRICT — passée
--      en CASCADE, la suppression nommée de `patient/effacement.ts`
--      deviendrait du code mort en silence ;
--   6. la RLS deny-all est active et sans policy (posture D-005) — la table
--      porte le TEXTE remis au patient, dérivé de son dossier.
--
-- Comme `panels_biologie_documentes`, la table est VOLONTAIREMENT hors de
-- `tables_cb` du contrat structurel catalogue : elle porte `id_patient` par
-- construction (pièce du dossier, effacée par la transaction IDP2), là où le
-- verrou HDS du catalogue interdit toute sémantique patient dans `biology_*`.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  colonnes text[];

  COLONNES_ATTENDUES CONSTANT text[] := ARRAY[
    'ancrage_sha256', 'ancrage_version', 'created_at', 'genere_le',
    'genere_par', 'id', 'id_patient', 'texte'
  ];

  SHA_VALIDE CONSTANT text := repeat('ab', 32);

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes
  -- visent le patient de fixture : le CHECK est alors le SEUL motif de rejet
  -- possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le cas
  -- le dit — au lieu d'être masqué par une violation de clé étrangère.
  cas CONSTANT text[][] := ARRAY[
    ['texte vide',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t1', 'PAT_CONTRAT_DOCPAT', '', repeat('ab', 32), 'indications-biologie-v1', 'praticien@wellneuro.fr')$q$],
    ['texte réduit à des blancs, tabulations comprises',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t2', 'PAT_CONTRAT_DOCPAT', E' \t\r\n', repeat('ab', 32), 'indications-biologie-v1', 'praticien@wellneuro.fr')$q$],
    ['ancre en majuscules (hors format hexadécimal minuscule)',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t3', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('AB', 32), 'indications-biologie-v1', 'praticien@wellneuro.fr')$q$],
    ['ancre de 63 caractères',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t4', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('a', 63), 'indications-biologie-v1', 'praticien@wellneuro.fr')$q$],
    ['version d''ancre vide',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t5', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('ab', 32), '  ', 'praticien@wellneuro.fr')$q$],
    ['auteur vide',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t6', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('ab', 32), 'indications-biologie-v1', '')$q$],
    ['auteur réduit à des espaces',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t7', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('ab', 32), 'indications-biologie-v1', '   ')$q$],
    ['auteur au-delà de 320 caractères',
     $q$INSERT INTO documents_patient_biologie (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
        VALUES ('t8', 'PAT_CONTRAT_DOCPAT', 'Texte de contrat.', repeat('ab', 32), 'indications-biologie-v1', repeat('x', 321))$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé ─────────────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_docpat', 'PAT_CONTRAT_DOCPAT', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIF : un document valide doit être ACCEPTÉ ────────────────
  BEGIN
    INSERT INTO documents_patient_biologie
      (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
    VALUES ('ok1', 'PAT_CONTRAT_DOCPAT', 'Proposition d''exploration remise au patient.',
            SHA_VALIDE, 'indications-biologie-v1', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'DOCUMENT PATIENT: un document VALIDE a été refusé (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  -- Append-only : une SECONDE génération pour le même patient est acceptée.
  BEGIN
    INSERT INTO documents_patient_biologie
      (id, id_patient, texte, ancrage_sha256, ancrage_version, genere_par)
    VALUES ('ok2', 'PAT_CONTRAT_DOCPAT', 'Seconde génération, ligne de plus.',
            SHA_VALIDE, 'indications-biologie-v1', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'DOCUMENT PATIENT: la SECONDE génération a été refusée (SQLSTATE %) — le régime est append-only, re-générer fait une ligne de plus.',
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
          'DOCUMENT PATIENT test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'DOCUMENT PATIENT test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Verrou « sans valeurs » : LISTE BLANCHE, pas un motif ─────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO colonnes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'documents_patient_biologie';

  IF colonnes IS DISTINCT FROM COLONNES_ATTENDUES THEN
    RAISE EXCEPTION
      'DOCUMENT PATIENT: colonnes inattendues (%). Attendu exactement % — une colonne neuve doit être arbitrée, le verrou HDS sans valeurs en dépend.',
      colonnes, COLONNES_ATTENDUES;
  END IF;

  -- ── 4. Les cinq colonnes porteuses sont NOT NULL ─────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'documents_patient_biologie'
    AND c.column_name IN ('id_patient', 'texte', 'ancrage_sha256', 'ancrage_version', 'genere_par')
    AND c.is_nullable = 'NO';
  IF nb <> 5 THEN
    RAISE EXCEPTION 'DOCUMENT PATIENT: % colonne(s) porteuse(s) NOT NULL sur 5 attendues', nb;
  END IF;

  -- ── 5. La clé étrangère vers patients est en ON DELETE RESTRICT ──────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'documents_patient_biologie'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'DOCUMENT PATIENT: clé étrangère vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  -- ── 6. Deny-all RLS (posture D-005) ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'documents_patient_biologie'
    AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'DOCUMENT PATIENT: RLS désactivée sur documents_patient_biologie';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents_patient_biologie'
  ) THEN
    RAISE EXCEPTION 'DOCUMENT PATIENT: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'DOCUMENT PATIENT: deux générations acceptées (append-only), % CHECK rejetants, 8 colonnes exactes, 5 NOT NULL, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
