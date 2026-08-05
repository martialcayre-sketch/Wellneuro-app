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

-- 5. LE RATTACHEMENT ET LA GARDE, EXÉCUTÉS SUR DES DONNÉES.
--
--    Sans cette section, rien ne les exécute jamais : la migration s'applique
--    sur une base VIDE (les contrats et le seed viennent après `migrate
--    deploy`), donc ses trois UPDATE touchent zéro ligne et sa garde compte
--    zéro. C'est ce trou qui a laissé passer une garde comptant les CORRECTIONS
--    d'agenda comme des collisions — elle aurait fait échouer la migration en
--    production, où 4 couples (assignation, date) portent deux lignes.
--
--    La fixture reproduit donc exactement le cas de production : deux
--    assignations ouvertes du même couple, une nuit sur chacune à des dates
--    différentes, et une CORRECTION chaînée sur l'une d'elles.
--    L'index qu'on vient de vérifier interdit précisément la fixture dont on a
--    besoin ici (deux ouvertes du même couple). On le retire DANS la
--    transaction : PostgreSQL a le DDL transactionnel, le ROLLBACK final le
--    restaure intégralement. La section 4 ci-dessus, qui teste l'index, s'est
--    déjà exécutée — l'ordre des deux sections n'est pas indifférent.
DROP INDEX "assignations_unicite_ouverte_idx";

DO $$
DECLARE pat text := 'PAT_CONTRAT_RATTACH'; nuits_survivante integer; collisions integer;
BEGIN
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('chk_rat_pat', pat, 'contrat-rattach@test.invalid', 'Contrat', 'Rattachement',
    'contrat@test.invalid', now());

  -- L'ancienne (survivante attendue) et la récente (à annuler).
  INSERT INTO assignations (id, id_assignation, id_patient, email_patient,
    id_questionnaire, titre, statut, date_assignation, updated_at)
  VALUES
    ('chk_rat_a1', 'ASS_CHK_RAT_ANCIENNE', pat, 'c@test.invalid', 'Q_SOM_09', 'Agenda',
      'En attente', now() - interval '3 days', now()),
    ('chk_rat_a2', 'ASS_CHK_RAT_RECENTE',  pat, 'c@test.invalid', 'Q_SOM_09', 'Agenda',
      'En attente', now(), now());

  -- Une nuit sur chacune, dates différentes — le cas PAT017 de production.
  INSERT INTO agenda_sommeil_nuits (id, id_patient, id_assignation, date_nuit, reponses, canal, soumis_le)
  VALUES
    ('chk_rat_n1', pat, 'ASS_CHK_RAT_ANCIENNE', '2026-07-30', '{}'::jsonb, 'portail', now()),
    ('chk_rat_n2', pat, 'ASS_CHK_RAT_RECENTE',  '2026-07-29', '{}'::jsonb, 'portail', now());
  -- Puis une CORRECTION de la nuit du 29 : seconde ligne, MÊME date, chaînée.
  INSERT INTO agenda_sommeil_nuits (id, id_patient, id_assignation, date_nuit, reponses, canal, soumis_le, supersedes_nuit_id)
  VALUES ('chk_rat_n3', pat, 'ASS_CHK_RAT_RECENTE', '2026-07-29', '{}'::jsonb, 'portail', now(), 'chk_rat_n2');

  -- ---- Rejeu du rattachement de la migration (agendas sommeil) ----
  UPDATE "agenda_sommeil_nuits" n
  SET "id_assignation" = g."id_assignation"
  FROM "assignations" a, "assignations" g
  WHERE n."id_assignation" = a."id_assignation"
    AND a."statut" NOT IN ('Complété', 'Annulée')
    AND g."id_patient" = a."id_patient" AND g."id_questionnaire" = a."id_questionnaire"
    AND g."statut" NOT IN ('Complété', 'Annulée')
    AND (g."date_assignation" < a."date_assignation"
         OR (g."date_assignation" = a."date_assignation" AND g."id" < a."id"))
    AND NOT EXISTS (
      SELECT 1 FROM "assignations" x
      WHERE x."id_patient" = a."id_patient" AND x."id_questionnaire" = a."id_questionnaire"
        AND x."statut" NOT IN ('Complété', 'Annulée')
        AND (x."date_assignation" < g."date_assignation"
             OR (x."date_assignation" = g."date_assignation" AND x."id" < g."id"))
    );

  -- Les trois nuits ont rejoint la survivante : rien d'orphelin.
  SELECT count(*) INTO nuits_survivante FROM agenda_sommeil_nuits
  WHERE id_assignation = 'ASS_CHK_RAT_ANCIENNE';
  IF nuits_survivante <> 3 THEN
    RAISE EXCEPTION 'rattachement: % nuit(s) sur la survivante, 3 attendues — des saisies restent orphelines', nuits_survivante;
  END IF;

  -- La chaîne de correction survit au déplacement.
  IF NOT EXISTS (SELECT 1 FROM agenda_sommeil_nuits WHERE id = 'chk_rat_n3' AND supersedes_nuit_id = 'chk_rat_n2') THEN
    RAISE EXCEPTION 'rattachement: la chaîne supersedes a été rompue';
  END IF;

  -- ---- La garde ne doit PAS se déclencher : une correction n'est pas une collision ----
  WITH survivantes AS (
    SELECT g."id_assignation" FROM "assignations" g
    WHERE g."statut" NOT IN ('Complété', 'Annulée')
      AND EXISTS (SELECT 1 FROM "assignations" a
                  WHERE a."id_patient" = g."id_patient" AND a."id_questionnaire" = g."id_questionnaire"
                    AND a."id" <> g."id" AND a."statut" NOT IN ('Complété', 'Annulée'))
  )
  SELECT count(*) INTO collisions FROM (
    SELECT 1 FROM "agenda_sommeil_nuits" n
    WHERE n."id_assignation" IN (SELECT "id_assignation" FROM survivantes)
      AND NOT EXISTS (SELECT 1 FROM "agenda_sommeil_nuits" s WHERE s."supersedes_nuit_id" = n."id")
    GROUP BY n."id_assignation", n."date_nuit" HAVING count(*) > 1
  ) t;
  IF collisions <> 0 THEN
    RAISE EXCEPTION 'garde: % collision(s) comptée(s) sur une simple correction d''agenda — la migration échouerait à tort', collisions;
  END IF;
END $$;

-- Rien de ce qui précède n'est conservé.
ROLLBACK;
