-- Contrat de `demandes_correction_objectif` (Alliance 6.0-B — le quatrième
-- verbe du patient).
--
-- La table promet sept choses, et ce fichier les éprouve TOUTES :
--   1. une demande AVEC texte est acceptée, et une demande SANS texte aussi —
--      sans ce second cas positif, une contrainte qui rendrait le texte
--      obligatoire passerait verte, et le quatrième verbe exigerait du patient
--      qu'il sache formuler pour avoir le droit de demander ;
--   2. DEUX demandes sur le MÊME objectif sont acceptées — aucune unicité.
--      Un patient qui redemande n'écrase pas sa première demande et ne se
--      heurte pas à un 500 : l'append-only de la campagne vaut ici aussi ;
--   3. les CHECK mordent (23514) : texte vide, texte d'espaces, texte réduit à
--      une tabulation, texte au-delà de 4 000, référence d'objectif vide ;
--   4. `texte` est NULLABLE — c'est l'arbitrage du responsable (2026-09-11,
--      « oui, mais facultatif ») et il se garde ICI. Une migration ultérieure
--      qui le passerait NOT NULL changerait la nature du geste sans qu'un seul
--      test ne parle ;
--   5. la table porte EXACTEMENT ses colonnes, LISTE BLANCHE — c'est l'arme de
--      l'interdit « aucun champ de score, seuil ou bande » (`DC-19`/`DC-20`),
--      et ici elle garde aussi l'absence de `statut`, `close_le` ou
--      `traitee_par` : la clôture d'une demande est DÉRIVÉE (l'objectif visé
--      n'est plus une tête active), et une colonne d'état permettrait de
--      classer une demande sans avoir rien reformulé ;
--   6. la FK vers `patients` est en ON DELETE RESTRICT — passée en CASCADE, la
--      suppression nommée de `patient/effacement.ts` deviendrait du code mort
--      en silence ;
--   7. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- `id_objectif` N'A PAS DE FK, et c'est le patron du dépôt : ni
-- `amendements_objectif`, ni `ratifications_objectif`, ni
-- `supersedes_objectif_id` n'en portent. Ce qui empêche une ligne de flotter
-- sans viser personne est le CHECK du point 3, éprouvé ci-dessous.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  reelles text[];

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE : la comparaison est un `IS DISTINCT FROM`
  -- entre ce tableau et un `array_agg(... ORDER BY column_name)`. Une colonne
  -- ajoutée à la fin de la liste rougit alors qu'elle est déclarée, et le
  -- message affiche deux ensembles identiques au tri près — illisible. Insérer
  -- chaque colonne neuve À SA PLACE (leçon du 2026-09-11).
  COLS_DEMANDES CONSTANT text[] := ARRAY[
    'cree_le', 'id', 'id_objectif', 'id_patient', 'texte'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes visent
  -- le patient de fixture (la FK existe) : le CHECK est alors le SEUL motif de
  -- rejet possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le
  -- cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['demande — texte présent mais vide (un envoi perdu, pas une demande muette)',
     $q$INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
        VALUES ('d1', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1', '')$q$],
    ['demande — texte réduit à des espaces',
     $q$INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
        VALUES ('d2', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1', '   ')$q$],
    ['demande — texte réduit à une tabulation (btrim/1 ne l''aurait pas vu)',
     $q$INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
        VALUES ('d3', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1', E'\t')$q$],
    ['demande — texte au-delà de 4 000 caractères',
     $q$INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
        VALUES ('d4', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1', repeat('x', 4001))$q$],
    ['demande — référence d''objectif vide (la ligne ne viserait aucune version)',
     $q$INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif)
        VALUES ('d5', 'PAT_CONTRAT_DEMCORR', '  ')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_demcorr', 'PAT_CONTRAT_DEMCORR', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_demcorr_1', 'PAT_CONTRAT_DEMCORR', 'praticien@wellneuro.fr',
          'Retrouver un sommeil qui repose');

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  -- Les INSERT OMETTENT `cree_le` À DESSEIN : c'est ce qui prouve que le
  -- DEFAULT de la base le pose. Lister toutes les colonnes « par propreté »
  -- perdrait cette couverture sans que rien ne rougisse.
  BEGIN
    -- Avec texte : le patient dit ce qui ne va pas.
    INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
    VALUES ('dem_contrat_1', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1',
            'Ce n''est pas le sommeil le plus important pour moi, c''est la fatigue de la journée.');

    -- SANS texte : le geste suffit. C'est le cas que le point 4 protège, et
    -- celui qu'une contrainte trop serrée ferait disparaître en silence.
    INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif)
    VALUES ('dem_contrat_2', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1');

    -- UNE TROISIÈME SUR LE MÊME OBJECTIF : aucune unicité. Un patient qui
    -- redemande parce que rien n'a bougé écrit une ligne de plus.
    INSERT INTO demandes_correction_objectif (id, id_patient, id_objectif, texte)
    VALUES ('dem_contrat_3', 'PAT_CONTRAT_DEMCORR', 'obj_demcorr_1',
            'Je redemande, je n''ai pas eu de retour.');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'DEMANDE DE CORRECTION: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route du portail échouerait.',
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
          'DEMANDE DE CORRECTION test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'DEMANDE DE CORRECTION test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. `texte` est NULLABLE — l'arbitrage « facultatif », opposable ──────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'demandes_correction_objectif'
    AND c.column_name = 'texte'
    AND c.is_nullable = 'YES';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'DEMANDE DE CORRECTION: `texte` n''est plus NULLABLE — le quatrième verbe exigerait du patient qu''il sache formuler pour avoir le droit de demander (arbitrage du 2026-09-11).';
  END IF;

  -- ── 4. Liste blanche de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'demandes_correction_objectif';

  IF reelles IS DISTINCT FROM COLS_DEMANDES THEN
    RAISE EXCEPTION
      'DEMANDE DE CORRECTION: colonnes inattendues (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil ou bande » (DC-19/DC-20) en dépend, et l''absence de `statut`/`close_le` aussi (la clôture est DÉRIVÉE de la reformulation, elle ne se coche pas).',
      reelles, COLS_DEMANDES;
  END IF;

  -- ── 5. Colonnes porteuses NOT NULL ───────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'demandes_correction_objectif'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id', 'id_patient', 'id_objectif', 'cree_le');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'DEMANDE DE CORRECTION: % colonne(s) porteuse(s) NOT NULL sur 4 attendues', nb;
  END IF;

  -- ── 6. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  -- `confdeltype = 'r'`, invisible du drift check. En CASCADE, la suppression
  -- nommée de `patient/effacement.ts` deviendrait du code mort en silence.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'demandes_correction_objectif'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'DEMANDE DE CORRECTION: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la retirer
  -- sans qu'un seul test ne parle.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'demandes_correction_objectif' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'DEMANDE DE CORRECTION: RLS désactivée sur demandes_correction_objectif';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'demandes_correction_objectif'
  ) THEN
    RAISE EXCEPTION 'DEMANDE DE CORRECTION: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'DEMANDE DE CORRECTION: 3 écritures valides acceptées (avec texte, sans texte, redemande), % CHECK rejetants, texte NULLABLE, liste blanche exacte, 4 NOT NULL, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
