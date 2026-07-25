-- Tests NÉGATIFS du catalogue biologie CB-01.
--
-- Le contrat `cb_biologie_catalogue_v1.sql` vérifie que les invariants sont en
-- place. Ce fichier-ci vérifie qu'ils MORDENT : chaque cas ci-dessous doit
-- être rejeté par la base. Un garde-fou qu'on n'a jamais vu refuser quelque
-- chose n'est pas un garde-fou, c'est une décoration — et les CHECK, la RLS et
-- les index partiels échappent tous au drift check de Prisma.
--
-- Tout se déroule dans une transaction annulée à la fin : aucune écriture ne
-- survit, y compris la colonne temporaire du premier test.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  trouve text;

  -- Chaque entrée : une insertion qui DOIT échouer, et ce qu'elle teste.
  cas CONSTANT text[][] := ARRAY[
    -- Le pivot ne se dédouble pas par la casse ni par une forme libre.
    ['code d''analyte hors forme BIO_*',
     $q$INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
        VALUES ('t1', 'ferritine', 'x', 'sang', 'saisie_praticien', 'partielle', now())$q$],
    -- Une unité inventée ne doit pas entrer : les plages se comparent entre elles.
    ['unité hors vocabulaire fermé',
     $q$INSERT INTO biology_analytes (id, code, libelle, unite, type_prelevement, source_provenance, niveau_completude, updated_at)
        VALUES ('t2', 'BIO_X', 'x', 'ug/L', 'sang', 'saisie_praticien', 'partielle', now())$q$],
    -- Une fiche vérifiée sans signataire ni date.
    ['fiche vérifiée non signée',
     $q$INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, statut_fiche, updated_at)
        VALUES ('t3', 'BIO_Y', 'x', 'sang', 'saisie_praticien', 'partielle', 'verifiee', now())$q$],
    -- LE NŒUD RACINE « NABM » : quatre caractères, mais pas un acte.
    ['code d''acte non numérique (racine NABM)',
     $q$INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, updated_at)
        VALUES ('t4', 'NABM', 'V105', 'NABM', now())$q$],
    -- Un chapitre (1 à 2 chiffres) n'est pas un acte non plus.
    ['code d''acte à deux chiffres (chapitre)',
     $q$INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, updated_at)
        VALUES ('t5', '12', 'V105', 'Chapitre', now())$q$],
    -- Une correspondance à demi signée.
    ['correspondance signée sans date',
     $q$INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par)
        VALUES ('t6', 'BIO_TEST', '1213', 'isole', 'praticien@wellneuro.fr')$q$],
    -- L'ancienne valeur `groupe`, qui confondait groupe imposé et groupe au choix.
    ['nature « groupe » (vocabulaire périmé)',
     $q$INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature)
        VALUES ('t7', 'BIO_TEST', '1213', 'groupe')$q$],
    -- Une plage fonctionnelle sans claim : l'invariant miroir de l'orientation.
    ['plage fonctionnelle à claim vide',
     $q$INSERT INTO biology_functional_ranges (id, analyte_code, borne_min, unite, claim_id, version_claim, niveau_preuve)
        VALUES ('t8', 'BIO_TEST', 30, 'µg/L', '  ', 'v1.0', 'C')$q$],
    -- Version de claim au mauvais format : le corpus écrit « v1.0 ».
    ['version de claim en entier nu',
     $q$INSERT INTO biology_functional_ranges (id, analyte_code, borne_min, unite, claim_id, version_claim, niveau_preuve)
        VALUES ('t9', 'BIO_TEST', 30, 'µg/L', 'clm_1', '1', 'C')$q$],
    -- Une plage qui ne vise ni analyte ni ratio, et une qui vise les deux.
    ['plage sans cible',
     $q$INSERT INTO biology_functional_ranges (id, borne_min, unite, claim_id, version_claim, niveau_preuve)
        VALUES ('t10', 30, 'µg/L', 'clm_1', 'v1.0', 'C')$q$],
    -- Un ratio dont la forme n'a pas besoin de constante en porte une.
    ['rapport avec constante',
     $q$INSERT INTO biology_ratios (id, code, libelle, operation, analyte_a_code, analyte_b_code, constante)
        VALUES ('t11', 'BIO_RATIO_X', 'x', 'rapport', 'BIO_TEST', 'BIO_TEST2', 22.5)$q$],
    -- ...et l'inverse : la forme qui en exige une n'en a pas.
    ['produit sur constante sans constante',
     $q$INSERT INTO biology_ratios (id, code, libelle, operation, analyte_a_code, analyte_b_code)
        VALUES ('t12', 'BIO_RATIO_Y', 'x', 'produit_sur_constante', 'BIO_TEST', 'BIO_TEST2')$q$],
    -- Un item de bilan portant deux cibles.
    ['item de bilan à deux cibles',
     $q$INSERT INTO biology_panel_items (id, panel_code, analyte_code, ratio_code)
        VALUES ('t13', 'BIO_PANEL_TEST', 'BIO_TEST', 'BIO_RATIO_TEST')$q$],
    -- Un besoin hors 1-12.
    ['besoin hors 1-12 dans un bilan',
     $q$INSERT INTO biology_panels (id, code, libelle, niveau, besoins, updated_at)
        VALUES ('t14', 'BIO_PANEL_Z', 'x', 'socle', ARRAY[47], now())$q$],
    ['lien vers un besoin mal formé',
     $q$INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
        VALUES ('t15', 'BIO_TEST', 'besoin', 'besion_3', 'bas_evocateur', 'clm_1', 'v1.0', 'C')$q$]
  ];
BEGIN
  -- On exige le BON motif de rejet, pas un rejet quelconque. La plupart de ces
  -- insertions citent des analytes qui n'existent pas : sans cette exigence,
  -- elles échoueraient sur une clé étrangère et le test resterait vert même si
  -- le CHECK visé avait été supprimé. Postgres évalue les CHECK avant de
  -- déclencher les triggers de clé étrangère : un 23514 (check_violation)
  -- prouve donc que c'est bien la contrainte de valeur qui a mordu.
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'CB-01 test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'CB-01 test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- Le verrou HDS mord-il ? On ajoute réellement une colonne de sémantique
  -- patient, on vérifie que la détection la trouve, et la transaction est
  -- annulée. Sans ce test, le verrou pourrait être devenu aveugle (motif trop
  -- étroit, exclusion trop large) sans que rien ne le dise.
  ALTER TABLE biology_analytes ADD COLUMN id_patient text;

  SELECT c.table_name || '.' || c.column_name INTO trouve
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name LIKE 'biology_%'
    AND c.column_name NOT IN ('libelle_patient', 'type_prelevement', 'unite_resultat')
    AND (
      c.column_name ~ '(patient|assignation|consultation|dossier)'
      OR c.column_name ~ '(valeur|resultat|mesure|preleve)'
    )
  LIMIT 1;

  IF trouve IS NULL THEN
    RAISE EXCEPTION
      'CB-01 test négatif: le verrou HDS n''a PAS vu une colonne « id_patient » ajoutée au catalogue — il est aveugle.';
  END IF;

  RAISE NOTICE 'CB-01: % invariants vérifiés comme rejetants, verrou HDS voyant.',
    array_length(cas, 1);
END $$;

-- Rien de ce qui précède ne survit : ni les lignes de test (toutes rejetées),
-- ni la colonne temporaire du verrou HDS.
ROLLBACK;
