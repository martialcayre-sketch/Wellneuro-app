-- Contrat de l'ancrage de provenance des correspondances médecin ([[D-073]]).
--
-- La colonne n'a de valeur que si elle est GARDÉE : une ancre qu'on peut
-- écrire à moitié, ou remplir avec n'importe quoi, ne prouve rien. Ce fichier
-- éprouve que les deux CHECK MORDENT — chaque insertion ci-dessous doit être
-- rejetée en 23514, jamais acceptée, jamais rejetée pour un autre motif — et
-- qu'une ancre complète, elle, passe.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  colonnes text[];
  SHA_VALIDE CONSTANT text := repeat('a', 64);

  cas CONSTANT text[][] := ARRAY[
    ['SHA sans version — ne se rattache à aucune table',
     $q$INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256)
        VALUES ('t1', 'PAT_ANCRAGE', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', repeat('a', 64))$q$],
    ['version sans SHA — n’atteste aucun contenu',
     $q$INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_version)
        VALUES ('t2', 'PAT_ANCRAGE', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', 'indications-biologie-v1')$q$],
    ['SHA de longueur invalide — ce n’est pas un SHA-256',
     $q$INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version)
        VALUES ('t3', 'PAT_ANCRAGE', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', 'trop-court', 'indications-biologie-v1')$q$]
  ];
BEGIN
  -- Fixture : patient fictif autorisé.
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_ancrage', 'PAT_ANCRAGE', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Les deux CHECK mordent ────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'ANCRAGE test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION 'ANCRAGE test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 2. Cas POSITIFS : une ancre complète passe, une absence d'ancre aussi ─
  -- Sans eux, un CHECK devenu trop serré passerait vert et la consignation
  -- casserait en production.
  BEGIN
    INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version)
    VALUES ('ok1', 'PAT_ANCRAGE', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'texte', SHA_VALIDE, 'indications-biologie-v1');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'ANCRAGE: une ancre COMPLÈTE a été refusée (SQLSTATE %) — contrainte trop serrée.', SQLSTATE;
  END;

  BEGIN
    -- Une correspondance saisie à la main n'est dérivée d'aucune table : elle
    -- doit rester consignable sans ancre, sinon on forcerait à en inventer une.
    INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte)
    VALUES ('ok2', 'PAT_ANCRAGE', 'praticien@wellneuro.fr', 'entrant', 'Dr Test', 'texte');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'ANCRAGE: une correspondance SANS ancre a été refusée (SQLSTATE %) — la saisie manuelle deviendrait impossible.', SQLSTATE;
  END;

  -- ── 3. Les deux colonnes existent, et rien d'autre n'a été ajouté ────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO colonnes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'correspondances_medecin'
    AND c.column_name LIKE 'ancrage%';
  IF colonnes IS DISTINCT FROM ARRAY['ancrage_sha256', 'ancrage_version'] THEN
    RAISE EXCEPTION 'ANCRAGE: colonnes d’ancrage inattendues (%)', colonnes;
  END IF;

  RAISE NOTICE 'ANCRAGE: % invariants rejetants, ancre complète acceptée, absence d’ancre acceptée.',
    array_length(cas, 1);
END $$;

ROLLBACK;
