-- Contrat de la table des propositions de priorité assistées par IA
-- (Alliance 6.0-B, `D-167` §11). Pendant des contrats de 6.0-A, de
-- `fins_objectif` et de la provenance : ce qui a été prouvé là-bas ne se
-- re-prouve pas ici, ce qui est NEUF est prouvé ici.
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. l'écriture NORMALE est acceptée — sans ce cas positif, un CHECK devenu
--      trop serré passerait vert et la route casserait ensuite ;
--   2. plusieurs TIRAGES cohabitent sur les mêmes sources : le bouton
--      « une autre » écrit une ligne de plus, il n'écrase rien (`D-167` §11) ;
--   3. deux tirages ne partagent PAS un rang — sans cette unicité, « resservir
--      la proposition figée » n'aurait pas de réponse déterministe ;
--   4. la borne de 200 caractères est dans la BASE, pas seulement dans la
--      consigne : un dépassement se REFUSE au lieu de se couper (`D-167` §3) ;
--   5. un texte vide est refusé — un modèle qui ne rend rien est un échec, et
--      un échec se dit ; il ne s'enregistre pas comme une ligne muette ;
--   6. les DEUX sources sont nommées, toujours : sans elles la ligne est
--      irrejouable, et l'arbitrage du 2026-09-10 au soir en fait des
--      conditions (`D-167` §3 amendé) ;
--   7. `modele` et `version_consigne` sont remplis — ils portent une PROMESSE
--      FAITE AU PATIENT dans la v2 de « L'intelligence artificielle dans
--      Wellneuro » : « le modèle utilisé et la version du procédé sont
--      enregistrés à chaque fois ». Vides, la phrase devient fausse sans que
--      rien ne rougisse.
--
-- LISTE BLANCHE DE COLONNES — ELLE EST ICI, et c'est la SEULE pour cette table.
-- Aucun autre contrat ne connaît `propositions_priorite_ia` : celle-ci n'a donc
-- pas de jumelle avec qui diverger. La leçon du 2026-09-10 tient dans l'autre
-- sens : une table a UNE liste, chez le contrat qui la crée. Si un jour un
-- second contrat touche cette table, il lira celle-ci au lieu d'en recopier une.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT À LA ROUTE. Que la
-- synthèse citée soit `Validee_Praticien`, que le dépôt visé appartienne au
-- dossier, que le rang soit bien le suivant, que la consigne envoyée soit celle
-- que `version_consigne` nomme : les références sont SOUPLES, sans FK, et la
-- base ne lit pas les autres tables.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  colonnes text[];
  attendues CONSTANT text[] := ARRAY[
    'id', 'id_patient', 'id_synthese', 'id_depot',
    'version_consigne', 'modele', 'rang', 'texte', 'cree_le'
  ];
  cas CONSTANT text[][] := ARRAY[
    ['texte au-delà de 200 caractères (tronquer serait une ALTÉRATION DE DONNÉE)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n1', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', 9, repeat('a', 201))$q$],
    ['texte vide (un modèle qui ne rend rien est un ÉCHEC, pas une ligne)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n2', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', 9, '')$q$],
    ['texte fait d''une tabulation (btrim/1 ne l''aurait pas vu)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n3', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', 9, E'\t')$q$],
    ['synthèse d''entrée vide (la ligne ne se rejoue pas)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n4', 'PAT_CONTRAT_PROP', '', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', 9, 'Sommeil continu')$q$],
    ['dépôt patient vide (la parole du patient est une CONDITION, D-167 §3 amendé)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n5', 'PAT_CONTRAT_PROP', 'SYN_1', '', 'priorite-v1', 'claude-sonnet-4-6', 9, 'Sommeil continu')$q$],
    ['version de consigne vide (la promesse faite au patient devient fausse)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n6', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', '', 'claude-sonnet-4-6', 9, 'Sommeil continu')$q$],
    ['modèle vide (même promesse, même faux)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n7', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', '', 9, 'Sommeil continu')$q$],
    ['rang nul (un ordre commence à 1)',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n8', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', 0, 'Sommeil continu')$q$],
    ['rang négatif',
     $q$INSERT INTO propositions_priorite_ia (id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte)
        VALUES ('n9', 'PAT_CONTRAT_PROP', 'SYN_1', 'DEP_1', 'priorite-v1', 'claude-sonnet-4-6', -1, 'Sommeil continu')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_prop', 'PAT_CONTRAT_PROP', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- L'écriture normale : un premier tirage, sources nommées, traçable.
    INSERT INTO propositions_priorite_ia (
      id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte
    )
    VALUES ('prop_1', 'PAT_CONTRAT_PROP', 'SYN_contrat_1', 'DEP_contrat_1',
            'priorite-v1', 'claude-sonnet-4-6', 1,
            'Retrouver un sommeil continu en seconde partie de nuit');

    -- LE BOUTON « UNE AUTRE » N'ÉCRASE RIEN. Mêmes sources, même consigne, rang
    -- suivant : deux lignes cohabitent. Si une contrainte d'unicité portait sur
    -- le couple de sources seul, ce cas tomberait — et le tirage précédent
    -- serait perdu, ce que l'append-only de la campagne interdit.
    INSERT INTO propositions_priorite_ia (
      id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte
    )
    VALUES ('prop_2', 'PAT_CONTRAT_PROP', 'SYN_contrat_1', 'DEP_contrat_1',
            'priorite-v1', 'claude-sonnet-4-6', 2,
            'Dormir sans réveil prolongé au milieu de la nuit');

    -- EXACTEMENT 200 CARACTÈRES PASSE. La borne est un maximum inclusif ; un
    -- `< 200` la déplacerait d'un cran sans que personne ne le remarque avant
    -- qu'un libellé juste à la limite ne soit refusé en production.
    INSERT INTO propositions_priorite_ia (
      id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte
    )
    VALUES ('prop_3', 'PAT_CONTRAT_PROP', 'SYN_contrat_1', 'DEP_contrat_1',
            'priorite-v1', 'claude-sonnet-4-6', 3, repeat('a', 200));

    -- UNE CONSIGNE NOUVELLE ROUVRE LE RANG 1. `version_consigne` fait partie de
    -- la clé : un bump de consigne n'est pas un tirage de plus sur la même
    -- proposition, c'est une proposition d'une autre nature.
    INSERT INTO propositions_priorite_ia (
      id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte
    )
    VALUES ('prop_4', 'PAT_CONTRAT_PROP', 'SYN_contrat_1', 'DEP_contrat_1',
            'priorite-v2', 'claude-sonnet-4-6', 1, 'Un sommeil qui ne se rompt plus');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'PROPOSITION PRIORITÉ: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée.',
        SQLSTATE;
  END;

  -- ── 2. Deux tirages ne partagent pas un rang ─────────────────────────────
  -- 23505 et non 23514 : c'est un index unique, pas un CHECK.
  refuse := false;
  BEGIN
    INSERT INTO propositions_priorite_ia (
      id, id_patient, id_synthese, id_depot, version_consigne, modele, rang, texte
    )
    VALUES ('prop_doublon', 'PAT_CONTRAT_PROP', 'SYN_contrat_1', 'DEP_contrat_1',
            'priorite-v1', 'claude-sonnet-4-6', 2, 'Un doublon de rang');
  EXCEPTION
    WHEN unique_violation THEN
      refuse := true;
    WHEN others THEN
      RAISE EXCEPTION
        'PROPOSITION PRIORITÉ: le doublon de rang a été rejeté pour le mauvais motif (SQLSTATE %, attendu 23505).',
        SQLSTATE;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'PROPOSITION PRIORITÉ: deux tirages ont pu partager un rang — « resservir la proposition figée » n''a plus de réponse déterministe.';
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
          'PROPOSITION PRIORITÉ test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION
        'PROPOSITION PRIORITÉ test négatif: « % » a été ACCEPTÉ — le CHECK correspondant manque.',
        cas[i][1];
    END IF;
  END LOOP;

  -- ── 4. Liste blanche de colonnes — l'interdit de FORME ───────────────────
  -- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI TAUX D'ATTEINTE. Une colonne neuve
  -- doit être ARBITRÉE (`D-xxx`) avant d'atterrir ici : ce test la refuse, et
  -- c'est le point. `rang` est dans la liste et compte des TIRAGES, jamais des
  -- priorités (`DC-19`/`DC-20`, `D-094` §3).
  SELECT array_agg(column_name ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'propositions_priorite_ia';

  IF colonnes IS DISTINCT FROM (SELECT array_agg(c ORDER BY c) FROM unnest(attendues) AS c) THEN
    RAISE EXCEPTION
      'PROPOSITION PRIORITÉ: la liste des colonnes a changé (%) — une colonne neuve doit être arbitrée avant d''atterrir ici.',
      array_to_string(colonnes, ', ');
  END IF;

  -- ── 5. RLS deny-all (D-005) ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'propositions_priorite_ia' AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'PROPOSITION PRIORITÉ: RLS DÉSACTIVÉE sur propositions_priorite_ia (posture D-005).';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'propositions_priorite_ia') THEN
    RAISE EXCEPTION 'PROPOSITION PRIORITÉ: une POLICY existe — la posture D-005 est deny-all SANS policy.';
  END IF;

  RAISE NOTICE 'OK — contrat des propositions de priorité vérifié (D-167 §11).';
END $$;

ROLLBACK;
