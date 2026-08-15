-- Tests NÉGATIFS de l'arbitrage biologique (LOT-06, D-059 §4).
--
-- Le schéma promet trois invariants — verdict borné, note obligatoire et non
-- vide sur « infirme », note ≤ 2000 caractères — et ce fichier vérifie qu'ils
-- MORDENT : chaque insertion ci-dessous doit être rejetée par un CHECK
-- (SQLSTATE 23514), jamais acceptée, jamais rejetée pour un autre motif.
--
-- La table est VOLONTAIREMENT hors de `tables_cb` du contrat structurel
-- catalogue : elle porte `id_patient` par construction (c'est un objet du
-- dossier, effacé par la transaction IDP2), là où le verrou HDS du catalogue
-- interdit toute sémantique patient dans les tables `biology_*`. Le verrou de
-- CE fichier est l'inverse : aucune colonne de VALEUR d'analyse ne doit
-- exister ici — l'arbitrage consigne un verdict, jamais un résultat.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  trouve text;

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Les clés
  -- étrangères citées n'existent pas, et c'est sans effet : Postgres évalue
  -- les CHECK avant les triggers de clé étrangère — un 23514 prouve que la
  -- contrainte de VALEUR a mordu.
  cas CONSTANT text[][] := ARRAY[
    ['verdict hors énuméré',
     $q$INSERT INTO arbitrages_biologiques (id, id_patient, protocol_draft_id, intention_id, verdict, arbitre_par)
        VALUES ('t1', 'PAT_X', 'draft_x', 'act-1', 'valide', 'praticien@wellneuro.fr')$q$],
    ['verdict infirmé sans note',
     $q$INSERT INTO arbitrages_biologiques (id, id_patient, protocol_draft_id, intention_id, verdict, arbitre_par)
        VALUES ('t2', 'PAT_X', 'draft_x', 'act-1', 'infirme', 'praticien@wellneuro.fr')$q$],
    ['verdict infirmé avec note réduite à des espaces',
     $q$INSERT INTO arbitrages_biologiques (id, id_patient, protocol_draft_id, intention_id, verdict, note_courte, arbitre_par)
        VALUES ('t3', 'PAT_X', 'draft_x', 'act-1', 'infirme', '   ', 'praticien@wellneuro.fr')$q$],
    ['note au-delà de 2000 caractères',
     $q$INSERT INTO arbitrages_biologiques (id, id_patient, protocol_draft_id, intention_id, verdict, note_courte, arbitre_par)
        VALUES ('t4', 'PAT_X', 'draft_x', 'act-1', 'sans_objet', repeat('x', 2001), 'praticien@wellneuro.fr')$q$]
  ];
BEGIN
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'ARBITRAGE test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'ARBITRAGE test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- Verrou « sans valeurs » : la table ne doit porter AUCUNE colonne de
  -- résultat d'analyse. Verdict, note courte et traçabilité, rien d'autre —
  -- la saisie de valeurs biologiques reste derrière la décision HDS.
  SELECT c.column_name INTO trouve
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'arbitrages_biologiques'
    AND c.column_name ~ '(valeur|resultat|mesure|unite|analyte)'
  LIMIT 1;

  IF trouve IS NOT NULL THEN
    RAISE EXCEPTION
      'ARBITRAGE: colonne de valeur biologique « % » dans arbitrages_biologiques — le verrou HDS sans valeurs est rompu.',
      trouve;
  END IF;

  RAISE NOTICE 'ARBITRAGE: % invariants vérifiés comme rejetants, table sans valeurs.',
    array_length(cas, 1);
END $$;

ROLLBACK;
