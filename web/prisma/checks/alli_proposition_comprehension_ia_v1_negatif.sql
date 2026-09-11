-- Contrat de la table des propositions de RÉSUMÉ GLOBAL assistées par IA
-- (Alliance 6.0-B). Pendant du contrat de `propositions_priorite_ia` : ce qui a
-- été prouvé là-bas ne se re-prouve pas ici, ce qui est NEUF est prouvé ici.
--
-- CE QUI EST NEUF, ET POURQUOI CE FICHIER NE DUPLIQUE PAS L'AUTRE : la matière
-- de ce tirage est PLURIELLE. Deux colonnes `text[]` remplacent les deux
-- colonnes d'identifiant de la priorité, et trois promesses en découlent que
-- l'autre table n'a jamais eu à tenir — un minimum de deux synthèses, aucune
-- source vide, aucun trou NULL dans les listes.
--
-- La table promet neuf choses, et ce fichier les éprouve TOUTES :
--   1. l'écriture NORMALE est acceptée — sans ce cas positif, un CHECK devenu
--      trop serré passerait vert et la route casserait ensuite ;
--   2. plusieurs TIRAGES cohabitent sur la même matière : le bouton « une
--      autre » écrit une ligne de plus, il n'écrase rien ;
--   3. deux tirages ne partagent PAS un rang, à matière et consigne égales ;
--   4. DEUX SYNTHÈSES AU MINIMUM — la règle du responsable du 2026-09-11 est
--      dans la BASE, pas seulement dans la route ;
--   5. un tableau de sources VIDE est refusé — et c'est le cas qui compte le
--      plus, parce que `array_length('{}', 1)` rend NULL et non 0 : sans le
--      `coalesce`, le CHECK du point 4 aurait laissé passer exactement cela ;
--   6. aucune source vide et aucun trou NULL dans les listes — une liste qui
--      nomme une source inexistante rend la ligne irrejouable ;
--   7. la borne de 4 000 caractères est dans la BASE : c'est celle du champ
--      que ce tirage pré-remplit (`LONGUEUR_MAX_SYNTHESE`) ;
--   8. un texte vide est refusé — un modèle qui ne rend rien est un échec, et
--      un échec se dit ;
--   9. `modele` et `version_consigne` sont remplis — ils portent une PROMESSE
--      FAITE AU PATIENT dans la v2 de « L'intelligence artificielle dans
--      Wellneuro » : « le modèle utilisé et la version du procédé sont
--      enregistrés à chaque fois ».
--
-- LISTE BLANCHE DE COLONNES — ELLE EST ICI, et c'est la SEULE pour cette table.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT À LA ROUTE. Que chaque
-- synthèse citée soit `Validee_Praticien`, qu'elle appartienne au dossier, que
-- les deux rideaux de `D-158` soient constitués, que le rang soit bien le
-- suivant : les références sont SOUPLES, sans FK, et la base ne lit pas les
-- autres tables.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  colonnes text[];
  attendues CONSTANT text[] := ARRAY[
    'id', 'id_patient', 'sources_syntheses', 'sources_desaccords',
    'version_consigne', 'modele', 'rang', 'texte', 'cree_le'
  ];
  cas CONSTANT text[][] := ARRAY[
    ['texte au-delà de 4 000 caractères (tronquer serait une ALTÉRATION DE DONNÉE)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n1', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', 9, repeat('a', 4001))$q$],
    ['texte vide (un modèle qui ne rend rien est un ÉCHEC, pas une ligne)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n2', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', 9, '')$q$],
    ['texte fait d''une tabulation (btrim/1 ne l''aurait pas vu)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n3', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', 9, E'\t')$q$],
    ['UNE SEULE synthèse source (la règle du 2026-09-11 en exige deux)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n4', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1'], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['AUCUNE synthèse source — le cas que array_length(''{}'', 1) IS NULL aurait laissé passer',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n5', 'PAT_CONTRAT_COMPR', ARRAY[]::text[], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['une synthèse source vide (la ligne ne se rejoue pas)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n6', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1',''], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['un TROU NULL dans les synthèses — sans ce test, le test du vide serait NULL donc vert',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n7', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1',NULL,'SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['un désaccord source vide (même exigence sur la seconde liste)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, sources_desaccords, version_consigne, modele, rang, texte)
        VALUES ('n8', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], ARRAY[''], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['un TROU NULL dans les désaccords',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, sources_desaccords, version_consigne, modele, rang, texte)
        VALUES ('n9', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], ARRAY['DES_1',NULL], 'comprehension-v1', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['version de consigne vide (la promesse faite au patient devient fausse)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n10', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], '', 'claude-sonnet-4-6', 9, 'Un résumé')$q$],
    ['modèle vide (même promesse, même faux)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n11', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', '', 9, 'Un résumé')$q$],
    ['rang nul (un ordre commence à 1)',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n12', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', 0, 'Un résumé')$q$],
    ['rang négatif',
     $q$INSERT INTO propositions_comprehension_ia (id, id_patient, sources_syntheses, version_consigne, modele, rang, texte)
        VALUES ('n13', 'PAT_CONTRAT_COMPR', ARRAY['SYN_1','SYN_2'], 'comprehension-v1', 'claude-sonnet-4-6', -1, 'Un résumé')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_compr', 'PAT_CONTRAT_COMPR', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- L'écriture normale : deux synthèses validées, aucun désaccord signalé —
    -- c'est l'état RÉEL de la production au 2026-09-11 (zéro désaccord en
    -- base). Le défaut `ARRAY[]::text[]` de `sources_desaccords` doit donc
    -- suffire, colonne omise.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_1', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            'comprehension-v1', 'claude-sonnet-4-6', 1,
            'Vous décrivez un sommeil qui ne répare pas, et un rythme régulier malgré tout.');

    -- AVEC DÉSACCORDS. La seconde liste est la moitié de la matière que
    -- l'arbitrage du 2026-09-11 a retenue : une nouvelle version tient compte
    -- de ce que le patient a contesté. Zéro ligne en production aujourd'hui —
    -- ce cas est la SEULE preuve que la branche existe.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, sources_desaccords, version_consigne, modele, rang, texte
    )
    VALUES ('compr_2', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            ARRAY['DES_contrat_1'], 'comprehension-v1', 'claude-sonnet-4-6', 1,
            'Vous m''avez repris sur le mot « fatigue » ; je le reformule ici.');

    -- LE BOUTON « UNE AUTRE » N'ÉCRASE RIEN. Même matière, même consigne, rang
    -- suivant : deux lignes cohabitent. Si l'unicité portait sur la matière
    -- seule, ce cas tomberait — et le tirage précédent serait perdu, ce que
    -- l'append-only de la campagne interdit.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_3', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            'comprehension-v1', 'claude-sonnet-4-6', 2,
            'Une autre manière de dire la même chose, sans le mot « fatigue ».');

    -- EXACTEMENT 4 000 CARACTÈRES PASSE. La borne est un maximum inclusif ; un
    -- `< 4000` la déplacerait d'un cran sans que personne ne le remarque avant
    -- qu'un texte juste à la limite ne soit refusé en production.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_4', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            'comprehension-v1', 'claude-sonnet-4-6', 3, repeat('a', 4000));

    -- UNE CONSIGNE NOUVELLE ROUVRE LE RANG 1. `version_consigne` fait partie de
    -- la clé : un bump de consigne n'est pas un tirage de plus sur le même
    -- résumé, c'est un résumé d'une autre nature.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_5', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            'comprehension-v2', 'claude-sonnet-4-6', 1, 'Le même dossier, une autre consigne.');

    -- UN ORDRE DIFFÉRENT EST UNE AUTRE MATIÈRE. `{B,A}` n'est pas `{A,B}` :
    -- l'ordre des synthèses est précisément ce que le texte produit reprend,
    -- donc deux ordres ne rendent pas le même texte et n'ont pas à partager
    -- une série de rangs. Le rang 1 se rouvre.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_6', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_2','SYN_contrat_1'],
            'comprehension-v1', 'claude-sonnet-4-6', 1, 'Les mêmes deux synthèses, lues dans l''autre sens.');

    -- TROIS SYNTHÈSES PASSENT. Le minimum est deux, pas un maximum : un dossier
    -- qui a fait trois tours nourrit le résumé de ses trois synthèses.
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_7', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2','SYN_contrat_3'],
            'comprehension-v1', 'claude-sonnet-4-6', 1, 'Trois tours, un seul texte.');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'PROPOSITION COMPRÉHENSION: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée.',
        SQLSTATE;
  END;

  -- ── 2. Deux tirages ne partagent pas un rang ─────────────────────────────
  -- 23505 et non 23514 : c'est un index unique, pas un CHECK.
  refuse := false;
  BEGIN
    INSERT INTO propositions_comprehension_ia (
      id, id_patient, sources_syntheses, version_consigne, modele, rang, texte
    )
    VALUES ('compr_doublon', 'PAT_CONTRAT_COMPR', ARRAY['SYN_contrat_1','SYN_contrat_2'],
            'comprehension-v1', 'claude-sonnet-4-6', 2, 'Un doublon de rang');
  EXCEPTION
    WHEN unique_violation THEN
      refuse := true;
    WHEN others THEN
      RAISE EXCEPTION
        'PROPOSITION COMPRÉHENSION: le doublon de rang a été rejeté pour le mauvais motif (SQLSTATE %, attendu 23505).',
        SQLSTATE;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'PROPOSITION COMPRÉHENSION: deux tirages ont pu partager un rang — resservir le tirage courant n''a plus de réponse déterministe.';
  END IF;

  -- ── 3. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'PROPOSITION COMPRÉHENSION test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION
        'PROPOSITION COMPRÉHENSION test négatif: « % » a été ACCEPTÉ — le CHECK correspondant manque.',
        cas[i][1];
    END IF;
  END LOOP;

  -- ── 4. Liste blanche de colonnes — l'interdit de FORME ───────────────────
  -- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI TAUX D'ATTEINTE. Une colonne neuve
  -- doit être ARBITRÉE (`D-xxx`) avant d'atterrir ici : ce test la refuse, et
  -- c'est le point. `rang` est dans la liste et compte des TIRAGES, jamais des
  -- sujets (`DC-19`/`DC-20`).
  SELECT array_agg(column_name ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'propositions_comprehension_ia';

  IF colonnes IS DISTINCT FROM (SELECT array_agg(c ORDER BY c) FROM unnest(attendues) AS c) THEN
    RAISE EXCEPTION
      'PROPOSITION COMPRÉHENSION: la liste des colonnes a changé (%) — une colonne neuve doit être arbitrée avant d''atterrir ici.',
      array_to_string(colonnes, ', ');
  END IF;

  -- ── 5. RLS deny-all (D-005) ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'propositions_comprehension_ia' AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'PROPOSITION COMPRÉHENSION: RLS DÉSACTIVÉE sur propositions_comprehension_ia (posture D-005).';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'propositions_comprehension_ia') THEN
    RAISE EXCEPTION 'PROPOSITION COMPRÉHENSION: une POLICY existe — la posture D-005 est deny-all SANS policy.';
  END IF;

  RAISE NOTICE 'OK — contrat des propositions de résumé global vérifié.';
END $$;

ROLLBACK;
