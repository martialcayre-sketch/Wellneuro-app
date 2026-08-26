-- Contrat de la table des réponses d'étape (Alliance 6.0-B, LOT-05). Même
-- architecture que les contrats de 6.0-A et du LOT-01 de 6.0-B, dont il est le
-- pendant : ce qui a été prouvé là-bas ne se re-prouve pas ici, ce qui est NEUF
-- est prouvé ici.
--
-- La table promet huit choses, et ce fichier les éprouve TOUTES :
--   1. une écriture valide est ACCEPTÉE — avec EVA et sans EVA. Sans ce cas
--      positif, un CHECK devenu trop serré passerait vert et la route du lot
--      casserait en production ;
--   2. les CHECK mordent (23514) — SEPT cas pour TROIS contraintes : texte
--      vide, texte fait de blancs NON-ESPACE, jalon `T0`, jalon `J7`, jalon
--      inconnu, EVA sous 0, EVA au-dessus de 10. Le cas des blancs non-espace
--      n'est pas du zèle : `btrim/1` ne retire QUE l'espace ASCII, si bien
--      qu'un texte fait d'une tabulation passait la première rédaction de ce
--      CHECK — mesuré, pas supposé (revue du lot) ;
--   3. `T0` EST REFUSÉ COMME JALON, nommément. C'est la garde la plus propre
--      à ce lot : `T0` est l'ANCRE des fenêtres, le moment où l'objectif se
--      pose — demander à cet instant « où en êtes-vous par rapport à votre
--      objectif » n'a pas de sens, il n'y a rien derrière soi. `T0` étant une
--      valeur parfaitement légitime de `JOURS_JALON`, son refus ne se déduit
--      d'aucun autre cas et doit être éprouvé pour lui-même ;
--   4. la table porte EXACTEMENT ses colonnes, LISTE BLANCHE — l'arme de
--      l'interdit « aucun score, seuil, bande, rang ni taux d'atteinte »
--      (DC-19/DC-20). Un motif `score|seuil|rang` ne verrait pas passer un
--      `progression`, un `atteinte` ou un `ecart`, chemins les moins coûteux
--      pour ranger une mesure. Toute colonne future doit modifier CE contrat ;
--   5. les colonnes porteuses sont NOT NULL, et `eva` reste NULLABLE — la
--      rendre obligatoire forcerait un chiffre là où le patient n'a que des
--      mots, et un chiffre contraint n'est plus une réponse ;
--   6. la FK vers `patients` est en ON DELETE RESTRICT — passée en CASCADE, la
--      suppression nommée de `patient/effacement.ts` deviendrait du code mort
--      en silence ;
--   7. la RLS deny-all est active et sans policy (posture D-005) : cette table
--      porte la parole d'un patient sur lui-même ;
--   8. les trois CHECK du lot EXISTENT, NOMMÉMENT, et la taxonomie `jalon`
--      porte EXACTEMENT ses trois valeurs.
--
-- LE POINT 8 EST LA LEÇON DU LOT-01, APPLIQUÉE D'AVANCE. Un cas négatif prouve
-- qu'une insertion est rejetée ; il ne prouve pas PAR QUI. Ici le risque est
-- exact : un CHECK `jalon` ÉLARGI — à `T0`, à `J7` — laisserait tous les cas
-- négatifs verts, puisque aucun ne teste la valeur ajoutée. La lecture de la
-- DÉFINITION est le seul chemin qui refuse un élargissement.
--
-- AUCUNE CONTRAINTE D'UNICITÉ n'est attendue sur (id_patient, id_objectif,
-- jalon), et ce contrat le vérifie : répondre deux fois au même jalon fait DEUX
-- lignes. Un UNIQUE transformerait un second geste en erreur technique, ou
-- pousserait à l'upsert — c'est-à-dire à écraser ce que le patient avait écrit.
--
-- Les dates d'ÉVÉNEMENT sont nullables PAR CONSTRUCTION (deux dates, patron de
-- campagne) : ce contrat ne les exige pas — `cree_le` NOT NULL avec DEFAULT
-- est, lui, tenu par la liste NOT NULL.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  reelles text[];
  cible text;
  definition text;
  litteraux text[];

  COLS_REPONSES CONSTANT text[] := ARRAY[
    'cree_le', 'eva', 'id', 'id_objectif', 'id_patient', 'jalon',
    'repondu_le', 'texte'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes visent
  -- le patient de fixture (la FK existe) : le CHECK est alors le SEUL motif de
  -- rejet possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le
  -- cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['réponse d''étape — texte vide (un chiffre nu déposé dans un dossier)',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
        VALUES ('r1', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J21', '   ', 5)$q$],
    ['réponse d''étape — texte fait de blancs NON-ESPACE (tabulation, retour ligne)',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
        VALUES ('r1b', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J21', E'\t\n\r ', 5)$q$],
    ['réponse d''étape — jalon T0 : l''ancre n''est pas une étape',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte)
        VALUES ('r2', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'T0', 'Je commence tout juste')$q$],
    ['réponse d''étape — jalon J7 : taxonomie de protocol_checkins, pas la nôtre',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte)
        VALUES ('r3', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J7', 'Une semaine a passé')$q$],
    ['réponse d''étape — jalon inconnu',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte)
        VALUES ('r4', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J120', 'Quatre mois')$q$],
    ['réponse d''étape — EVA négative (hors borne technique de saisie)',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
        VALUES ('r5', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J42', 'Ça va mieux', -1)$q$],
    ['réponse d''étape — EVA au-delà de 10 (hors borne technique de saisie)',
     $q$INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
        VALUES ('r6', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J42', 'Ça va mieux', 11)$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli_j', 'PAT_CONTRAT_ALLI_J', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- Un objectif de fixture : la référence est souple, mais une cible réaliste
  -- rend le cas positif lisible.
  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_contrat_j1', 'PAT_CONTRAT_ALLI_J', 'praticien@wellneuro.fr',
          'Tenir jusqu''au dîner sans m''allonger');

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  -- Les INSERT OMETTENT `cree_le` À DESSEIN : c'est ce qui prouve que le
  -- DEFAULT de la base le pose.
  BEGIN
    -- Avec EVA, et avec sa date déclarée.
    INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva, repondu_le)
    VALUES ('rep_contrat_1', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J21',
            'Je tiens jusqu''au dîner deux soirs sur trois, pas plus.', 6,
            TIMESTAMP '2026-09-13 18:00:00');

    -- SANS EVA : le patient n'a que des mots, et c'est une réponse entière.
    INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte)
    VALUES ('rep_contrat_2', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J42',
            'Difficile à chiffrer. Certains jours oui, d''autres non.');

    -- Les DEUX BORNES de l'EVA passent : elles bornent, elles n'excluent pas.
    INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
    VALUES ('rep_contrat_3', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J90',
            'Rien n''a bougé.', 0);
    INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
    VALUES ('rep_contrat_4', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J90',
            'Je m''y retrouve complètement.', 10);

    -- Se raviser est une NOUVELLE ligne, sur le MÊME jalon et le MÊME objectif
    -- — c'est le cas qui prouve l'absence d'UNIQUE, et il est ici plutôt que
    -- dans un contrôle structurel parce qu'une contrainte d'unicité se
    -- manifeste par un rejet, pas par une absence lisible.
    INSERT INTO reponses_jalon_objectif (id, id_patient, id_objectif, jalon, texte, eva)
    VALUES ('rep_contrat_5', 'PAT_CONTRAT_ALLI_J', 'obj_contrat_j1', 'J21',
            'En relisant ma réponse : c''est plutôt un soir sur trois.', 4);
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'JALONS OBJECTIF: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, ou une UNIQUE interdit de se raviser ; la route du LOT-05 échouerait.',
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
          'JALONS OBJECTIF test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'JALONS OBJECTIF test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Liste blanche de colonnes — l'interdit score/taux opposable ───────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'reponses_jalon_objectif';

  IF reelles IS DISTINCT FROM COLS_REPONSES THEN
    RAISE EXCEPTION
      'JALONS OBJECTIF: colonnes inattendues sur reponses_jalon_objectif (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil, bande, rang ni taux d''atteinte » (DC-19/DC-20) en dépend.',
      reelles, COLS_REPONSES;
  END IF;

  -- ── 4. Colonnes porteuses NOT NULL, et `eva` NULLABLE ────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'reponses_jalon_objectif'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id_patient', 'id_objectif', 'jalon', 'texte', 'cree_le');
  IF nb <> 5 THEN
    RAISE EXCEPTION 'JALONS OBJECTIF: % colonne(s) porteuse(s) NOT NULL sur 5 attendues', nb;
  END IF;

  -- `eva` est FACULTATIVE et doit le rester. La rendre obligatoire forcerait un
  -- chiffre là où le patient n'a que des mots — et un chiffre contraint n'est
  -- plus une réponse, c'est une case remplie pour passer.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'reponses_jalon_objectif'
    AND c.column_name = 'eva' AND c.is_nullable = 'YES' AND c.column_default IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'JALONS OBJECTIF: `eva` doit rester NULLABLE et sans DEFAULT (un DEFAULT fabriquerait une réponse que nul n''a donnée)';
  END IF;

  -- ── 5. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'reponses_jalon_objectif'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'JALONS OBJECTIF: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s]) — en CASCADE, la suppression nommée d''effacement.ts deviendrait du code mort.', nb;
  END IF;

  -- ── 5bis. Les trois CHECK existent, NOMMÉMENT ───────────────────────────
  FOREACH cible IN ARRAY ARRAY[
    'reponses_jalon_objectif_texte_check',
    'reponses_jalon_objectif_jalon_check',
    'reponses_jalon_objectif_eva_check'
  ] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    WHERE con.contype = 'c' AND con.conname = cible;
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'JALONS OBJECTIF: le CHECK % est absent (% trouvé[s]).', cible, nb;
    END IF;
  END LOOP;

  -- La TAXONOMIE de `jalon` porte exactement ses trois valeurs. On lit la
  -- DÉFINITION de la contrainte, seul moyen de refuser un ÉLARGISSEMENT :
  -- ajouter `T0` rendrait le refus de l'ancre inopérant sans qu'aucun cas
  -- négatif ne bouge — ils testent des valeurs REFUSÉES, pas la liste admise.
  SELECT pg_get_constraintdef(con.oid) INTO definition
  FROM pg_constraint con
  WHERE con.contype = 'c' AND con.conname = 'reponses_jalon_objectif_jalon_check';

  SELECT array_agg(DISTINCT m[1] ORDER BY m[1]) INTO litteraux
  FROM regexp_matches(definition, '''([A-Za-z0-9_]+)''', 'g') AS m;

  IF litteraux IS DISTINCT FROM ARRAY['J21', 'J42', 'J90'] THEN
    RAISE EXCEPTION
      'JALONS OBJECTIF: la taxonomie `jalon` ne porte plus EXACTEMENT (J21, J42, J90) mais % — `T0` est l''ANCRE des fenêtres, pas une étape, et les points J7/J14 appartiennent à protocol_checkins. Définition : %',
      litteraux, definition;
  END IF;

  -- ── 5ter. AUCUNE contrainte d'unicité ────────────────────────────────────
  -- Répondre deux fois au même jalon fait DEUX lignes. Un UNIQUE
  -- transformerait un second geste en erreur technique, ou pousserait à
  -- l'upsert — c'est-à-dire à écraser ce que le patient avait écrit.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  WHERE enfant.relname = 'reponses_jalon_objectif'
    AND con.contype IN ('u', 'x');
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'JALONS OBJECTIF: % contrainte(s) d''unicité sur reponses_jalon_objectif — se raviser doit rester une ligne de plus, jamais un écrasement.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_index i
  JOIN pg_class enfant ON enfant.oid = i.indrelid
  WHERE enfant.relname = 'reponses_jalon_objectif' AND i.indisunique AND NOT i.indisprimary;
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'JALONS OBJECTIF: % index unique(s) hors clé primaire sur reponses_jalon_objectif — même motif.', nb;
  END IF;

  -- ── 6. Deny-all RLS (posture D-005) ──────────────────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la retirer
  -- sans qu'un seul test ne parle.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'reponses_jalon_objectif' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'JALONS OBJECTIF: RLS désactivée sur reponses_jalon_objectif';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reponses_jalon_objectif'
  ) THEN
    RAISE EXCEPTION 'JALONS OBJECTIF: policy inattendue sur reponses_jalon_objectif (deny-all attendu)';
  END IF;

  RAISE NOTICE 'JALONS OBJECTIF: 5 écritures valides acceptées (avec EVA, sans EVA, aux deux bornes, et deux fois le même jalon), % cas négatifs rejetés sur 3 CHECK (dont T0, J7 et les blancs non-espace nommément), liste blanche exacte, 5 NOT NULL, eva nullable sans default, 3 CHECK assertés par leur nom, taxonomie jalon exactement (J21, J42, J90), aucune unicité, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
