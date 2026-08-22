-- Contrat des cinq tables du dossier à deux voix (Alliance 6.0-A, LOT-01).
--
-- Les tables promettent six choses, et ce fichier les éprouve TOUTES :
--   1. une écriture valide est ACCEPTÉE sur chacune des cinq (sans ce cas
--      positif, un CHECK devenu trop serré passerait vert et les routes des
--      lots 02/03/04/06 casseraient en production) ;
--   2. les CHECK mordent (23514) : auteur praticien vide/espaces/trop long,
--      textes porteurs vides, `sens` hors taxonomie ;
--   3. chaque table porte EXACTEMENT ses colonnes, LISTE BLANCHE — c'est
--      l'arme de l'interdit « aucun champ de score, seuil ou bande »
--      (DC-19/DC-20 — aucun seuil inventé, et la liste de DC-19 nomme
--      explicitement les objectifs) : un motif (`score|seuil|bande`) ne verrait pas
--      passer un `payload` jsonb ou un `niveau`, chemins les moins coûteux
--      pour ranger un classement. Toute colonne future doit modifier CE
--      contrat — l'arbitrage devient visible en revue ;
--   4. les colonnes porteuses sont NOT NULL ;
--   5. les cinq FK vers `patients` sont en ON DELETE RESTRICT — passées en
--      CASCADE, la suppression nommée de `patient/effacement.ts` (garde de
--      complétude d'effacement.test.ts) deviendrait du code mort en silence ;
--   6. la RLS deny-all est active et sans policy sur les cinq (posture
--      D-005) — ces tables portent la parole du patient et la compréhension
--      du praticien, le contenu le plus nominatif du dossier.
--
-- Les dates d'ÉVÉNEMENT sont nullables PAR CONSTRUCTION (deux dates, patron
-- relecture_notes) : ce contrat ne les exige pas — `cree_le` NOT NULL avec
-- DEFAULT est, lui, tenu par la liste NOT NULL.
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

  COLS_OBJECTIFS CONSTANT text[] := ARRAY[
    'cree_le', 'enonce_patient', 'id', 'id_patient', 'negocie_le',
    'non_traite_depuis_le', 'non_traite_motif', 'praticien_email',
    'priorite', 'reformulation_praticien', 'supersedes_objectif_id'
  ];
  COLS_CE_QUI_COMPTE CONSTANT text[] := ARRAY[
    'cree_le', 'id', 'id_patient', 'saisi_le', 'texte'
  ];
  COLS_SYNTHESES CONSTANT text[] := ARRAY[
    'cree_le', 'id', 'id_patient', 'praticien_email', 'publiee_le',
    'redigee_le', 'supersedes_synthese_id', 'texte'
  ];
  COLS_DESACCORDS CONSTANT text[] := ARRAY[
    'cree_le', 'exprime_le', 'id', 'id_patient', 'id_synthese', 'texte'
  ];
  COLS_RATIFICATIONS CONSTANT text[] := ARRAY[
    'cree_le', 'geste_le', 'id', 'id_objectif', 'id_patient', 'sens'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes
  -- visent le patient de fixture (la FK existe) : le CHECK est alors le SEUL
  -- motif de rejet possible. Si le CHECK visé disparaît, l'insertion est
  -- ACCEPTÉE et le cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['objectif — praticien vide',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
        VALUES ('t1', 'PAT_CONTRAT_ALLI', '', 'Dormir mieux')$q$],
    ['objectif — praticien réduit à des espaces',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
        VALUES ('t2', 'PAT_CONTRAT_ALLI', '   ', 'Dormir mieux')$q$],
    ['objectif — praticien au-delà de 320 caractères',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
        VALUES ('t3', 'PAT_CONTRAT_ALLI', repeat('x', 321), 'Dormir mieux')$q$],
    ['objectif — énoncé patient vide',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
        VALUES ('t4', 'PAT_CONTRAT_ALLI', 'praticien@wellneuro.fr', '  ')$q$],
    ['ce qui compte — texte vide (un dépôt vide est un silence, il ne s''enregistre pas)',
     $q$INSERT INTO ce_qui_compte_entrees (id, id_patient, texte)
        VALUES ('t5', 'PAT_CONTRAT_ALLI', '')$q$],
    ['synthèse — praticien vide',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte)
        VALUES ('t6', 'PAT_CONTRAT_ALLI', '', 'Ce que j''ai compris')$q$],
    ['synthèse — texte vide',
     $q$INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte)
        VALUES ('t7', 'PAT_CONTRAT_ALLI', 'praticien@wellneuro.fr', '   ')$q$],
    ['ratification — sens hors taxonomie',
     $q$INSERT INTO ratifications_objectif (id, id_patient, id_objectif, sens)
        VALUES ('t8', 'PAT_CONTRAT_ALLI', 'obj_contrat_1', 'peut_etre')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli', 'PAT_CONTRAT_ALLI', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS : une écriture valide par table ──────────────────────
  -- Les INSERT OMETTENT `cree_le` À DESSEIN : c'est ce qui prouve que le
  -- DEFAULT de la base le pose. Lister toutes les colonnes « par propreté »
  -- perdrait cette couverture sans que rien ne rougisse.
  BEGIN
    INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient,
                                    reformulation_praticien, priorite, negocie_le)
    VALUES ('obj_contrat_1', 'PAT_CONTRAT_ALLI', 'praticien@wellneuro.fr',
            'Retrouver un sommeil qui repose',
            'Vous cherchez d''abord à récupérer la nuit', 'premier temps',
            TIMESTAMP '2026-08-20 10:00:00');

    INSERT INTO ce_qui_compte_entrees (id, id_patient, texte, saisi_le)
    VALUES ('cqc_contrat_1', 'PAT_CONTRAT_ALLI',
            'Tenir le coup au travail cette semaine', TIMESTAMP '2026-08-21 08:00:00');

    INSERT INTO syntheses_comprehension (id, id_patient, praticien_email, texte, publiee_le)
    VALUES ('syn_contrat_1', 'PAT_CONTRAT_ALLI', 'praticien@wellneuro.fr',
            'Ce que j''ai compris de votre situation', TIMESTAMP '2026-08-21 09:00:00');

    INSERT INTO desaccords_comprehension (id, id_patient, id_synthese, texte)
    VALUES ('des_contrat_1', 'PAT_CONTRAT_ALLI', 'syn_contrat_1',
            'Ce n''est pas exactement ça');

    -- Le désaccord SANS texte vaut aussi : le geste suffit.
    INSERT INTO desaccords_comprehension (id, id_patient, id_synthese)
    VALUES ('des_contrat_2', 'PAT_CONTRAT_ALLI', 'syn_contrat_1');

    INSERT INTO ratifications_objectif (id, id_patient, id_objectif, sens)
    VALUES ('rat_contrat_1', 'PAT_CONTRAT_ALLI', 'obj_contrat_1', 'ratifie');

    -- Le changement d'avis est une NOUVELLE ligne — les deux coexistent.
    INSERT INTO ratifications_objectif (id, id_patient, id_objectif, sens)
    VALUES ('rat_contrat_2', 'PAT_CONTRAT_ALLI', 'obj_contrat_1', 'conteste');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'DOSSIER À DEUX VOIX: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, une route des lots 02/03/04/06 échouerait.',
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
          'DOSSIER À DEUX VOIX test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'DOSSIER À DEUX VOIX test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Listes blanches de colonnes — l'interdit score/seuil opposable ────
  FOR cible, colonnes IN
    SELECT t.nom, t.attendu FROM (VALUES
      ('objectifs_negocies', COLS_OBJECTIFS),
      ('ce_qui_compte_entrees', COLS_CE_QUI_COMPTE),
      ('syntheses_comprehension', COLS_SYNTHESES),
      ('desaccords_comprehension', COLS_DESACCORDS),
      ('ratifications_objectif', COLS_RATIFICATIONS)
    ) AS t(nom, attendu)
  LOOP
    DECLARE
      reelles text[];
    BEGIN
      SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = cible;

      IF reelles IS DISTINCT FROM colonnes THEN
        RAISE EXCEPTION
          'DOSSIER À DEUX VOIX: colonnes inattendues sur % (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil ou bande » (DC-19/DC-20) en dépend.',
          cible, reelles, colonnes;
      END IF;
    END;
  END LOOP;

  -- ── 4. Colonnes porteuses NOT NULL ───────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.is_nullable = 'NO'
    AND (
      (c.table_name = 'objectifs_negocies' AND c.column_name IN ('id_patient', 'praticien_email', 'enonce_patient', 'cree_le'))
      OR (c.table_name = 'ce_qui_compte_entrees' AND c.column_name IN ('id_patient', 'texte', 'cree_le'))
      OR (c.table_name = 'syntheses_comprehension' AND c.column_name IN ('id_patient', 'praticien_email', 'texte', 'cree_le'))
      OR (c.table_name = 'desaccords_comprehension' AND c.column_name IN ('id_patient', 'id_synthese', 'cree_le'))
      OR (c.table_name = 'ratifications_objectif' AND c.column_name IN ('id_patient', 'id_objectif', 'sens', 'cree_le'))
    );
  IF nb <> 18 THEN
    RAISE EXCEPTION 'DOSSIER À DEUX VOIX: % colonne(s) porteuse(s) NOT NULL sur 18 attendues', nb;
  END IF;

  -- ── 5. Les cinq FK vers patients sont en ON DELETE RESTRICT ──────────────
  -- `confdeltype = 'r'`, invisible du drift check. En CASCADE, la suppression
  -- nommée de `patient/effacement.ts` deviendrait du code mort en silence.
  FOREACH cible IN ARRAY ARRAY['objectifs_negocies', 'ce_qui_compte_entrees',
                               'syntheses_comprehension', 'desaccords_comprehension',
                               'ratifications_objectif'] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    JOIN pg_class enfant ON enfant.oid = con.conrelid
    JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE con.contype = 'f'
      AND enfant.relname = cible
      AND ref.relname = 'patients'
      AND con.confdeltype = 'r';
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'DOSSIER À DEUX VOIX: FK de % vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', cible, nb;
    END IF;
  END LOOP;

  -- ── 6. Deny-all RLS sur les cinq (posture D-005) ─────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la
  -- retirer sans qu'un seul test ne parle.
  FOREACH cible IN ARRAY ARRAY['objectifs_negocies', 'ce_qui_compte_entrees',
                               'syntheses_comprehension', 'desaccords_comprehension',
                               'ratifications_objectif'] LOOP
    SELECT count(*) INTO nb
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = cible AND c.relrowsecurity;
    IF nb <> 1 THEN
      RAISE EXCEPTION 'DOSSIER À DEUX VOIX: RLS désactivée sur %', cible;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = cible
    ) THEN
      RAISE EXCEPTION 'DOSSIER À DEUX VOIX: policy inattendue sur % (deny-all attendu)', cible;
    END IF;
  END LOOP;

  RAISE NOTICE 'DOSSIER À DEUX VOIX: écritures valides acceptées sur les 5 tables, % CHECK rejetants, listes blanches exactes, 18 NOT NULL, 5 FK RESTRICT, RLS deny-all ×5.',
    array_length(cas, 1);
END $$;

ROLLBACK;
