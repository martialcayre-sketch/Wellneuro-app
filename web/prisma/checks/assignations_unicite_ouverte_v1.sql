-- Contrat de migration : unicité d'une assignation OUVERTE par couple
-- (patient, questionnaire). Exécuté après `prisma migrate deploy`.
--
-- Vérifie ce que le drift check ne couvre PAS : Prisma ne sait pas déclarer
-- d'index partiel, celui-ci vit en SQL brut. Sans ce contrat, sa disparition —
-- un `DROP INDEX` d'exploitation, une migration qui recrée la table — ne serait
-- signalée nulle part, et le filet aurait cessé d'exister sans que rien ne
-- rougisse.
--
-- Le cas négatif compte autant que le positif : un index présent mais dont le
-- prédicat aurait glissé laisserait passer exactement ce qu'il doit refuser.
BEGIN;

DO $$
DECLARE predicat text;
BEGIN
  -- 1. L'index existe, et il est UNIQUE.
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'assignations_unicite_ouverte_idx' AND i.indisunique
  ) THEN
    RAISE EXCEPTION 'assignations: index unique partiel absent ou non unique';
  END IF;

  -- 2. Il porte bien sur (id_patient, id_questionnaire), dans cet ordre.
  IF (
    SELECT pg_get_indexdef(i.indexrelid)
    FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = 'assignations_unicite_ouverte_idx'
  ) NOT LIKE '%(id_patient, id_questionnaire)%' THEN
    RAISE EXCEPTION 'assignations: colonnes de l''index inattendues';
  END IF;

  -- 3. Le prédicat est celui du code (`STATUTS_ASSIGNATION_TERMINAL`). Un
  --    prédicat plus large refuserait des repassations légitimes ; plus étroit,
  --    il laisserait passer des doublons.
  SELECT pg_get_expr(i.indpred, i.indrelid) INTO predicat
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
  WHERE c.relname = 'assignations_unicite_ouverte_idx';

  IF predicat IS NULL THEN
    RAISE EXCEPTION 'assignations: l''index n''est pas partiel — il interdirait toute repassation';
  END IF;
  IF predicat NOT LIKE '%Complété%' OR predicat NOT LIKE '%Annulée%' THEN
    RAISE EXCEPTION 'assignations: prédicat inattendu (%)', predicat;
  END IF;
END $$;

-- 4. Cas NÉGATIF et cas POSITIF, joués pour de vrai. Un contrat qui ne
--    vérifie que la présence de l'objet ne dit rien de son effet.
--
--    LE PATIENT EST CRÉÉ ICI, il n'est pas cherché. Une première rédaction
--    faisait `SELECT ... FROM patients LIMIT 1` et sortait en `RETURN` si la
--    table était vide. Or les contrats tournent AVANT le seed dans le palier
--    (`wn-test-worktree.sh`) : la table est vide à ce moment-là, les deux cas
--    ci-dessous ne s'exécutaient jamais, et le contrat était vert sans avoir
--    rien vérifié. La ligne créée disparaît au ROLLBACK final.
DO $$
DECLARE patient_test text := 'PAT_CONTRAT_UNICITE'; refuse boolean := false;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('chk_unicite_pat', patient_test, 'contrat-unicite@test.invalid',
    'Contrat', 'Unicité', 'contrat@test.invalid', now());

  INSERT INTO assignations (id, id_assignation, id_patient, email_patient,
    id_questionnaire, titre, statut, updated_at)
  VALUES ('chk_unicite_1', 'ASS_CHK_UNICITE_1', patient_test, 'contrat@test.invalid',
    'Q_CHK_UNICITE', 'Contrat', 'En attente', now());

  -- Deuxième ouverte sur le même couple : doit être REFUSÉE.
  BEGIN
    INSERT INTO assignations (id, id_assignation, id_patient, email_patient,
      id_questionnaire, titre, statut, updated_at)
    VALUES ('chk_unicite_2', 'ASS_CHK_UNICITE_2', patient_test, 'contrat@test.invalid',
      'Q_CHK_UNICITE', 'Contrat', 'En attente', now());
  EXCEPTION WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'assignations: un doublon ouvert a été ACCEPTÉ — le filet ne filtre rien';
  END IF;

  -- Une ligne terminale sur le même couple : doit être ACCEPTÉE (repassation).
  INSERT INTO assignations (id, id_assignation, id_patient, email_patient,
    id_questionnaire, titre, statut, updated_at)
  VALUES ('chk_unicite_3', 'ASS_CHK_UNICITE_3', patient_test, 'contrat@test.invalid',
    'Q_CHK_UNICITE', 'Contrat', 'Complété', now());
END $$;

-- Rien de ce qui précède n'est conservé.
ROLLBACK;
