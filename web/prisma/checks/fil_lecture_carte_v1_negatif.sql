-- Contrat de `fil_card_lectures` (SP-FIL — la lecture d'une carte du Fil).
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. une lecture est acceptée, et une SECONDE sur le même couple
--      (dossier, type) aussi — aucune unicité. Sans ce second cas positif,
--      une contrainte d'unicité passerait verte et « Remettre » deviendrait
--      impossible : une carte partie par mégarde ne reviendrait jamais ;
--   2. l'ANNULATION est acceptée telle qu'elle s'écrit — `lue = false`,
--      chaînée par `supersedes_lecture_id` sur la ligne qu'elle supplante ;
--   3. les CHECK mordent (23514) : type de carte vide, d'espaces, réduit à une
--      tabulation ; lecteur vide, réduit à une tabulation ;
--   4. `lue` vaut `true` PAR DÉFAUT — une lecture posée sans préciser le sens
--      est une lecture. Passé à `false`, le défaut ferait qu'aucune carte ne
--      partirait jamais, et l'écran serait muet sur la raison ;
--   5. la table porte EXACTEMENT ses colonnes, LISTE BLANCHE. Elle garde deux
--      absences : aucun champ de score, seuil, rang ni compteur
--      (`DC-19`/`DC-20` — ni « nombre de cartes lues », ni délai de lecture :
--      la vitesse à laquelle un praticien ouvre un dossier n'est pas une mesure
--      de lui), et AUCUNE `carte_cle`. Cette seconde absence est un arbitrage
--      du responsable (2026-09-12) : la lecture est ancrée sur (dossier, type)
--      parce qu'ouvrir la phase où ces gestes se lisent, c'est les voir tous.
--      Une colonne de clé ramènerait l'acquittement ligne à ligne, et la carte
--      orpheline avec lui ;
--   6. la FK vers `patients` est en ON DELETE RESTRICT — passée en CASCADE, la
--      suppression nommée de `patient/effacement.ts` deviendrait du code mort
--      en silence ;
--   7. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- `supersedes_lecture_id` N'A PAS DE FK, comme `supersedes_rejection_id` chez
-- sa sœur `fil_card_rejections` : le chaînage est une lecture, pas une
-- contrainte, et une FK y empêcherait l'effacement partiel d'un dossier.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  defaut text;
  reelles text[];

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE : la comparaison est un `IS DISTINCT FROM`
  -- entre ce tableau et un `array_agg(... ORDER BY column_name)`. Une colonne
  -- ajoutée à la fin de la liste rougit alors qu'elle est déclarée, et le
  -- message affiche deux ensembles identiques au tri près — illisible. Insérer
  -- chaque colonne neuve À SA PLACE (leçon du 2026-09-11).
  COLS_LECTURES CONSTANT text[] := ARRAY[
    'id', 'id_patient', 'lue', 'lue_le', 'lue_par', 'supersedes_lecture_id', 'type_carte'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes visent
  -- le patient de fixture (la FK existe) : le CHECK est alors le SEUL motif de
  -- rejet possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le
  -- cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['lecture — type de carte vide (la ligne acquitterait tout ou rien)',
     $q$INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
        VALUES ('l1', 'PAT_CONTRAT_FILLECT', '', 'praticien@wellneuro.fr')$q$],
    ['lecture — type de carte réduit à des espaces',
     $q$INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
        VALUES ('l2', 'PAT_CONTRAT_FILLECT', '   ', 'praticien@wellneuro.fr')$q$],
    ['lecture — type de carte réduit à une tabulation (btrim/1 ne l''aurait pas vu)',
     $q$INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
        VALUES ('l3', 'PAT_CONTRAT_FILLECT', E'\t', 'praticien@wellneuro.fr')$q$],
    ['lecture — lecteur vide (une lecture anonyme ne se conteste pas)',
     $q$INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
        VALUES ('l4', 'PAT_CONTRAT_FILLECT', 'geste_objectif', '')$q$],
    ['lecture — lecteur réduit à une tabulation',
     $q$INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
        VALUES ('l5', 'PAT_CONTRAT_FILLECT', 'geste_objectif', E'\t')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_fillect', 'PAT_CONTRAT_FILLECT', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  -- Les INSERT OMETTENT `lue_le` ET `lue` À DESSEIN : c'est ce qui prouve que
  -- les DEFAULT de la base les posent. Lister toutes les colonnes « par
  -- propreté » perdrait cette couverture sans que rien ne rougisse.
  BEGIN
    INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
    VALUES ('lect_contrat_1', 'PAT_CONTRAT_FILLECT', 'geste_objectif', 'praticien@wellneuro.fr');

    -- UNE SECONDE SUR LE MÊME COUPLE : aucune unicité. Le praticien rouvre la
    -- fiche le lendemain après un geste neuf du patient — une lecture de plus.
    INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue_par)
    VALUES ('lect_contrat_2', 'PAT_CONTRAT_FILLECT', 'geste_objectif', 'praticien@wellneuro.fr');

    -- L'ANNULATION, telle qu'elle s'écrit : `lue = false`, chaînée.
    INSERT INTO fil_card_lectures (id, id_patient, type_carte, lue, lue_par, supersedes_lecture_id)
    VALUES ('lect_contrat_3', 'PAT_CONTRAT_FILLECT', 'geste_objectif', false,
            'praticien@wellneuro.fr', 'lect_contrat_2');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'FIL LECTURE: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route du Fil échouerait.',
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
          'FIL LECTURE test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'FIL LECTURE test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. `lue` vaut `true` par DÉFAUT ──────────────────────────────────────
  -- Éprouvé deux fois, et exprès : par la valeur réellement écrite au point 1
  -- (le comportement) ET par le défaut déclaré (la promesse). Le seul
  -- comportement passerait vert si le défaut disparaissait au profit d'un
  -- NOT NULL sans valeur — l'INSERT échouerait alors, mais au point 1.
  SELECT count(*) INTO nb
  FROM fil_card_lectures WHERE id = 'lect_contrat_1' AND lue IS TRUE;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FIL LECTURE: une lecture posée sans préciser le sens ne vaut pas « lue ».';
  END IF;

  SELECT c.column_default INTO defaut
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fil_card_lectures' AND c.column_name = 'lue';
  IF defaut IS NULL OR defaut NOT LIKE 'true%' THEN
    RAISE EXCEPTION
      'FIL LECTURE: le DEFAULT de `lue` n''est plus `true` (trouvé %) — aucune carte ne partirait, et l''écran serait muet sur la raison.',
      coalesce(defaut, 'AUCUN');
  END IF;

  -- ── 4. Liste blanche de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fil_card_lectures';

  IF reelles IS DISTINCT FROM COLS_LECTURES THEN
    RAISE EXCEPTION
      'FIL LECTURE: colonnes inattendues (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil, rang ni compteur » (DC-19/DC-20) en dépend, et l''absence de `carte_cle` aussi (la lecture est ancrée sur le dossier et le type, arbitrage du 2026-09-12).',
      reelles, COLS_LECTURES;
  END IF;

  -- ── 5. Colonnes porteuses NOT NULL ───────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'fil_card_lectures'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id', 'id_patient', 'type_carte', 'lue', 'lue_par', 'lue_le');
  IF nb <> 6 THEN
    RAISE EXCEPTION 'FIL LECTURE: % colonne(s) porteuse(s) NOT NULL sur 6 attendues', nb;
  END IF;

  -- `supersedes_lecture_id` DOIT rester NULLABLE : la première lecture d'un
  -- dossier ne supplante rien.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'fil_card_lectures'
    AND c.column_name = 'supersedes_lecture_id'
    AND c.is_nullable = 'YES';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FIL LECTURE: `supersedes_lecture_id` n''est plus NULLABLE — la première lecture d''un dossier ne supplante rien.';
  END IF;

  -- ── 6. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  -- `confdeltype = 'r'`, invisible du drift check. En CASCADE, la suppression
  -- nommée de `patient/effacement.ts` deviendrait du code mort en silence.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'fil_card_lectures'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FIL LECTURE: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la retirer
  -- sans qu'un seul test ne parle.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'fil_card_lectures' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FIL LECTURE: RLS désactivée sur fil_card_lectures';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fil_card_lectures'
  ) THEN
    RAISE EXCEPTION 'FIL LECTURE: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'FIL LECTURE: 3 écritures valides acceptées (lecture, seconde lecture, annulation chaînée), % CHECK rejetants, DEFAULT lue=true, liste blanche exacte, 6 NOT NULL + 1 NULLABLE, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
