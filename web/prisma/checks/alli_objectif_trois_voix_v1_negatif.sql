-- Contrat des trois tables de l'objectif à trois voix (Alliance 6.0-B,
-- LOT-01, D-094). Même architecture que le contrat de 6.0-A, dont il est le
-- pendant : ce qui a été prouvé là-bas ne se re-prouve pas ici, ce qui est
-- NEUF est prouvé ici.
--
-- Les tables promettent sept choses, et ce fichier les éprouve TOUTES :
--   1. une écriture valide est ACCEPTÉE sur chacune des trois (sans ce cas
--      positif, un CHECK devenu trop serré passerait vert et les routes des
--      lots 02/03/04 casseraient en production) ;
--   2. les CHECK mordent (23514) : auteur praticien vide/trop long, texte
--      d'amendement vide, `hash_sources` vide, `geste` hors taxonomie,
--      `fragments` vide ou non-tableau ;
--   3. LE COUPLE GESTE↔MOTIF est indissociable — un écart sans motif est
--      refusé, une reprise AVEC motif aussi. C'est la garde la plus
--      spécifique de ce lot : le motif d'écart est le matériau du LOT-06
--      (signer ou non le classement, D-093), et un écart muet ne dit rien ;
--   4. chaque table porte EXACTEMENT ses colonnes, LISTE BLANCHE — l'arme de
--      l'interdit « aucun score, seuil, bande NI RANG » (DC-19/DC-20 et
--      D-094 §3, qui interdit jusqu'à la numérotation : l'ordre des
--      candidats n'est couvert par aucune ligne signée et ne doit pas se
--      persister). Un motif `score|seuil|rang` ne verrait pas passer un
--      `position` ou un `ordre`, chemins les moins coûteux pour ranger un
--      classement. Toute colonne future doit modifier CE contrat ;
--   5. les colonnes porteuses sont NOT NULL ;
--   6. les trois FK vers `patients` sont en ON DELETE RESTRICT — passées en
--      CASCADE, la suppression nommée de `patient/effacement.ts` deviendrait
--      du code mort en silence ;
--   7. la RLS deny-all est active et sans policy sur les trois (posture
--      D-005) : proposition (citation de la parole du patient), amendement
--      (sa parole même) et disposition (le jugement praticien sur elle).
--
-- `caduque` n'est PAS testé comme geste, et son absence de la taxonomie EST
-- le test : la caducité se dérive de `hash_sources`, personne ne la décide.
--
-- Les dates d'ÉVÉNEMENT sont nullables PAR CONSTRUCTION (deux dates, patron
-- 6.0-A) : ce contrat ne les exige pas — `cree_le` NOT NULL avec DEFAULT
-- est, lui, tenu par la liste NOT NULL.
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

  COLS_PROPOSITIONS CONSTANT text[] := ARRAY[
    'assemblee_le', 'cree_le', 'fragments', 'hash_sources', 'id', 'id_patient'
  ];
  COLS_DISPOSITIONS CONSTANT text[] := ARRAY[
    'cree_le', 'dispose_le', 'geste', 'id', 'id_patient', 'id_proposition',
    'motif', 'praticien_email'
  ];
  COLS_AMENDEMENTS CONSTANT text[] := ARRAY[
    'cree_le', 'exprime_le', 'id', 'id_objectif', 'id_patient', 'texte'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes
  -- visent le patient de fixture (la FK existe) : le CHECK est alors le SEUL
  -- motif de rejet possible. Si le CHECK visé disparaît, l'insertion est
  -- ACCEPTÉE et le cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['proposition — hash de sources vide (la caducité ne se calculerait plus)',
     $q$INSERT INTO propositions_objectif (id, id_patient, fragments, hash_sources)
        VALUES ('p1', 'PAT_CONTRAT_ALLI_B', '[{"texte":"x","source":"anamnese"}]'::jsonb, '   ')$q$],
    ['proposition — fragments tableau VIDE (une proposition sans citation n''en est pas une)',
     $q$INSERT INTO propositions_objectif (id, id_patient, fragments, hash_sources)
        VALUES ('p2', 'PAT_CONTRAT_ALLI_B', '[]'::jsonb, 'h2')$q$],
    ['proposition — fragments non-tableau (objet nu : la forme se perdrait)',
     $q$INSERT INTO propositions_objectif (id, id_patient, fragments, hash_sources)
        VALUES ('p3', 'PAT_CONTRAT_ALLI_B', '{"texte":"x"}'::jsonb, 'h3')$q$],
    ['disposition — praticien vide',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste)
        VALUES ('d1', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', '', 'reprise')$q$],
    ['disposition — praticien au-delà de 320 caractères',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste)
        VALUES ('d2', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', repeat('x', 321), 'reprise')$q$],
    ['disposition — geste hors taxonomie',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste)
        VALUES ('d3', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', 'praticien@wellneuro.fr', 'peut_etre')$q$],
    ['disposition — « caduque » n''est pas un geste (elle se dérive, nul ne la décide)',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste)
        VALUES ('d4', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', 'praticien@wellneuro.fr', 'caduque')$q$],
    ['disposition — ÉCART SANS MOTIF (un écart muet ne dit rien au LOT-06)',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste)
        VALUES ('d5', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', 'praticien@wellneuro.fr', 'ecartee')$q$],
    ['disposition — écart au motif réduit à des espaces',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste, motif)
        VALUES ('d6', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', 'praticien@wellneuro.fr', 'ecartee', '  ')$q$],
    ['disposition — REPRISE AVEC MOTIF (la reprise se lit dans l''objectif produit)',
     $q$INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste, motif)
        VALUES ('d7', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1', 'praticien@wellneuro.fr', 'reprise', 'parce que')$q$],
    ['amendement — texte vide (sans mots, c''est une contestation, qui a déjà son objet)',
     $q$INSERT INTO amendements_objectif (id, id_patient, id_objectif, texte)
        VALUES ('a1', 'PAT_CONTRAT_ALLI_B', 'obj_contrat_b1', '   ')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli_b', 'PAT_CONTRAT_ALLI_B', 'jennifer.martin@example.test',
          'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- Un objectif de fixture, cible de l'amendement (référence souple, mais
  -- une cible réaliste rend le cas positif lisible).
  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_contrat_b1', 'PAT_CONTRAT_ALLI_B', 'praticien@wellneuro.fr',
          'Retrouver de l''énergie en fin de journée');

  -- ── 1. Cas POSITIFS : une écriture valide par table ──────────────────────
  -- Les INSERT OMETTENT `cree_le` À DESSEIN : c'est ce qui prouve que le
  -- DEFAULT de la base le pose.
  BEGIN
    -- Une proposition CITE : chaque fragment porte son texte et sa source.
    INSERT INTO propositions_objectif (id, id_patient, fragments, hash_sources, assemblee_le)
    VALUES ('prop_contrat_1', 'PAT_CONTRAT_ALLI_B',
            $j$[{"texte":"Retrouver de l'énergie en fin de journée","source":{"type":"anamnese","champ":"objectif_prioritaire"}},
                {"texte":"fatigue","source":{"type":"instrument","id":"Q_MOD_03"}}]$j$::jsonb,
            'h_sources_v1', TIMESTAMP '2026-08-23 10:00:00');

    -- La reprise : geste sans motif.
    INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste, dispose_le)
    VALUES ('disp_contrat_1', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1',
            'praticien@wellneuro.fr', 'reprise', TIMESTAMP '2026-08-23 11:00:00');

    -- L'écart : geste AVEC motif — le matériau du LOT-06.
    INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste, motif)
    VALUES ('disp_contrat_2', 'PAT_CONTRAT_ALLI_B', 'prop_contrat_1',
            'praticien@wellneuro.fr', 'ecartee',
            'La plainte citée n''est pas celle que le patient a mise en avant en consultation');

    -- L'objectif repris DÉCLARE sa proposition source (colonne 6.0-B).
    INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, source_proposition_id)
    VALUES ('obj_contrat_b2', 'PAT_CONTRAT_ALLI_B', 'praticien@wellneuro.fr',
            'Retrouver de l''énergie en fin de journée', 'prop_contrat_1');

    -- L'amendement : le patient le dit autrement, dans ses mots.
    INSERT INTO amendements_objectif (id, id_patient, id_objectif, texte, exprime_le)
    VALUES ('am_contrat_1', 'PAT_CONTRAT_ALLI_B', 'obj_contrat_b2',
            'Ce n''est pas l''énergie, c''est de ne pas m''effondrer le soir',
            TIMESTAMP '2026-08-23 18:00:00');

    -- Se raviser est une NOUVELLE ligne — les deux coexistent (append-only).
    INSERT INTO amendements_objectif (id, id_patient, id_objectif, texte)
    VALUES ('am_contrat_2', 'PAT_CONTRAT_ALLI_B', 'obj_contrat_b2',
            'En fait je dirais plutôt : tenir jusqu''au dîner sans m''allonger');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'OBJECTIF À TROIS VOIX: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, une route des lots 02/03/04 échouerait.',
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
          'OBJECTIF À TROIS VOIX test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'OBJECTIF À TROIS VOIX test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Listes blanches de colonnes — l'interdit score/rang opposable ─────
  FOR cible, colonnes IN
    SELECT t.nom, t.attendu FROM (VALUES
      ('propositions_objectif', COLS_PROPOSITIONS),
      ('dispositions_proposition', COLS_DISPOSITIONS),
      ('amendements_objectif', COLS_AMENDEMENTS)
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
          'OBJECTIF À TROIS VOIX: colonnes inattendues sur % (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil, bande ni rang » (DC-19/DC-20, D-094 §3) en dépend.',
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
      (c.table_name = 'propositions_objectif' AND c.column_name IN ('id_patient', 'fragments', 'hash_sources', 'cree_le'))
      OR (c.table_name = 'dispositions_proposition' AND c.column_name IN ('id_patient', 'id_proposition', 'praticien_email', 'geste', 'cree_le'))
      OR (c.table_name = 'amendements_objectif' AND c.column_name IN ('id_patient', 'id_objectif', 'texte', 'cree_le'))
    );
  IF nb <> 13 THEN
    RAISE EXCEPTION 'OBJECTIF À TROIS VOIX: % colonne(s) porteuse(s) NOT NULL sur 13 attendues', nb;
  END IF;

  -- `motif` est NULLABLE et doit le rester : c'est le CHECK couple
  -- geste↔motif qui l'exige sur un écart, pas la colonne. Le rendre NOT NULL
  -- forcerait un motif sur une reprise — exactement ce que le cas négatif
  -- « reprise avec motif » interdit.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'dispositions_proposition'
    AND c.column_name = 'motif' AND c.is_nullable = 'YES';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'OBJECTIF À TROIS VOIX: `motif` doit rester NULLABLE (le couple geste↔motif est porté par le CHECK)';
  END IF;

  -- `source_proposition_id` sur objectifs_negocies : NULLABLE et SANS
  -- DEFAULT. Un objectif rédigé de la main du praticien n'a pas de
  -- proposition source ; un DEFAULT fabriquerait un lien que personne n'a
  -- posé (DC-17).
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'objectifs_negocies'
    AND c.column_name = 'source_proposition_id'
    AND c.is_nullable = 'YES' AND c.column_default IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'OBJECTIF À TROIS VOIX: `source_proposition_id` absente, NOT NULL ou porteuse d''un DEFAULT';
  END IF;

  -- ── 5. Les trois FK vers patients sont en ON DELETE RESTRICT ─────────────
  -- `confdeltype = 'r'`, invisible du drift check. En CASCADE, la suppression
  -- nommée de `patient/effacement.ts` deviendrait du code mort en silence.
  FOREACH cible IN ARRAY ARRAY['propositions_objectif', 'dispositions_proposition',
                               'amendements_objectif'] LOOP
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
        'OBJECTIF À TROIS VOIX: FK de % vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', cible, nb;
    END IF;
  END LOOP;

  -- ── 6. Deny-all RLS sur les trois (posture D-005) ────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la
  -- retirer sans qu'un seul test ne parle.
  FOREACH cible IN ARRAY ARRAY['propositions_objectif', 'dispositions_proposition',
                               'amendements_objectif'] LOOP
    SELECT count(*) INTO nb
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = cible AND c.relrowsecurity;
    IF nb <> 1 THEN
      RAISE EXCEPTION 'OBJECTIF À TROIS VOIX: RLS désactivée sur %', cible;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = cible
    ) THEN
      RAISE EXCEPTION 'OBJECTIF À TROIS VOIX: policy inattendue sur % (deny-all attendu)', cible;
    END IF;
  END LOOP;

  RAISE NOTICE 'OBJECTIF À TROIS VOIX: écritures valides acceptées sur les 3 tables, % CHECK rejetants (dont le couple geste-motif dans les deux sens), listes blanches exactes, 13 NOT NULL, motif nullable, source_proposition_id nullable sans default, 3 FK RESTRICT, RLS deny-all ×3.',
    array_length(cas, 1);
END $$;

ROLLBACK;
