-- Contrat STRUCTUREL du catalogue biologie CB-01.
--
-- Invariants de SCHÉMA que le drift check de Prisma ne couvre PAS : ni les CHECK,
-- ni la RLS, ni les index partiels. Sans ce fichier, les ~40 CHECK de la migration
-- ne sont protégés par rien et un `DROP CONSTRAINT` en base resterait vert.
--
-- Extrait de `cb_biologie_catalogue_v1.sql` (qui ne porte plus, lui, que les
-- invariants de DONNÉES) pour être RÉUTILISABLE dans deux contextes :
--   1. standalone, en CI et via `prisma db execute --file` (autocommit) ;
--   2. DANS la transaction de l'import CB-02a (`prisma/importNabm.ts`), joué
--      avant le COMMIT : une violation structurelle annule alors l'import au lieu
--      d'être constatée après coup (« build rouge » impliquerait « rien écrit »).
--
-- C'est pourquoi ce fichier est un bloc `DO` NU, sans enveloppe `BEGIN;`/`COMMIT;` :
-- l'envelopper committerait prématurément la transaction d'import qui l'appelle.
-- Ne dépend d'AUCUNE donnée importée : ses assertions portent sur le schéma seul.
DO $$
DECLARE
  tables_cb CONSTANT text[] := ARRAY[
    'biology_analytes', 'biology_nabm_actes', 'biology_analyte_nabm',
    'biology_reference_ranges', 'biology_functional_ranges',
    'biology_preanalytics', 'biology_ratios', 'biology_panels',
    'biology_panel_items', 'biology_analyte_links',
    'biology_catalog_versions_courantes', 'biology_source_snapshots'
  ];
  colonne_suspecte text;
  nb int;
BEGIN
  -- ── VERROU HDS ───────────────────────────────────────────────────────────
  -- Le lot CB-01 déclare qu'aucune de ses tables ne porte de donnée de santé
  -- patient. Cette déclaration était jusqu'ici un commentaire ; c'est
  -- maintenant un test. Il échoue si une colonne `biology_*` prend un nom de
  -- donnée patient — c'est-à-dire si un lot ultérieur commence à stocker un
  -- résultat ici plutôt que derrière le second flag et l'attestation HDS.
  -- Deux familles de noms interdites : celles qui DÉSIGNENT un patient et
  -- celles qui PORTERAIENT une mesure. Trois exclusions nommées, vérifiées
  -- comme étant les SEULES colonnes du catalogue à déclencher les motifs —
  -- toutes trois légitimes :
  --   `libelle_patient`  — le libellé DESTINÉ au patient (« réserves de fer »
  --                        pour la ferritine), pas une donnée DE patient ;
  --   `type_prelevement` — la nature du prélèvement (sang, urine…), propriété
  --                        de l'analyse, pas un acte de prélèvement daté ;
  --   `unite_resultat`   — l'unité du résultat d'un ratio, métadonnée de
  --                        spécification, jamais une valeur.
  -- La liste est nominative et non un motif : un faux positif userait le
  -- contrat jusqu'à ce qu'on le désarme, et une exclusion large rouvrirait le
  -- trou qu'il ferme. Ajouter une exclusion ici doit rester un geste motivé.
  SELECT c.table_name || '.' || c.column_name INTO colonne_suspecte
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(tables_cb)
    AND c.column_name NOT IN ('libelle_patient', 'type_prelevement', 'unite_resultat')
    AND (
      c.column_name ~ '(patient|assignation|consultation|dossier)'
      OR c.column_name ~ '(valeur|resultat|mesure|preleve)'
    )
  LIMIT 1;

  IF colonne_suspecte IS NOT NULL THEN
    RAISE EXCEPTION
      'CB-01 VERROU HDS: colonne à sémantique patient dans le catalogue (%). Les résultats biologiques relèvent de CB-09, derrière WN_CB_RESULTS_ENABLED et l''attestation HDS.',
      colonne_suspecte;
  END IF;

  -- Aucune clé étrangère vers les tables porteuses de données patient.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class cible ON cible.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = ANY(tables_cb)
    AND cible.relname IN ('patients', 'assignations', 'consultations',
                          'questionnaire_reponses');

  IF nb > 0 THEN
    RAISE EXCEPTION
      'CB-01 VERROU HDS: % clé(s) étrangère(s) du catalogue vers une table patient', nb;
  END IF;

  -- ── RLS deny-all ─────────────────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = ANY(tables_cb) AND NOT c.relrowsecurity;

  IF nb > 0 THEN
    RAISE EXCEPTION 'CB-01: RLS non activée sur % table(s) du catalogue', nb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(tables_cb)
  ) THEN
    RAISE EXCEPTION 'CB-01: policy inattendue sur le catalogue (deny-all attendu)';
  END IF;

  -- Les douze tables existent bien (onze de CB-01, plus la table de snapshots
  -- ajoutée par CB-02a).
  SELECT count(*) INTO nb
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = ANY(tables_cb);

  IF nb <> 12 THEN
    RAISE EXCEPTION 'CB-01: % tables du catalogue trouvées, 12 attendues', nb;
  END IF;

  -- ── Index partiels : la sémantique NULL de l'unicité ─────────────────────
  -- Chacun ferme un trou qu'une unicité composée laisserait ouvert. Prisma ne
  -- les voit pas : ils ne sont protégés que par ce contrat.
  FOREACH colonne_suspecte IN ARRAY ARRAY[
    'biology_panel_items_panel_analyte_key',
    'biology_panel_items_panel_ratio_key',
    'biology_analyte_links_analyte_cible_claim_key',
    'biology_analyte_links_ratio_cible_claim_key',
    'biology_reference_ranges_analyte_population_key',
    'biology_reference_ranges_ratio_population_key',
    'biology_functional_ranges_analyte_population_key',
    'biology_functional_ranges_ratio_population_key',
    'biology_preanalytics_analyte_type_key'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = colonne_suspecte
    ) THEN
      RAISE EXCEPTION 'CB-01: index partiel % absent', colonne_suspecte;
    END IF;
  END LOOP;

  -- ── Les CHECK nommés qui portent les invariants du cadrage ───────────────
  FOREACH colonne_suspecte IN ARRAY ARRAY[
    -- Le pivot ne se dédouble pas par la casse.
    'biology_analytes_code_format_check',
    'biology_analytes_source_provenance_check',
    'biology_analytes_unite_check',
    'biology_analytes_fiche_verifiee_signee_check',
    -- La racine « NABM » et les 63 concepts non-actes n'entrent pas.
    'biology_nabm_actes_code_acte_check',
    -- Une incompatibilité ne vise qu'un acte, jamais un chapitre ni soi-même.
    'biology_nabm_actes_code_incompatible_check',
    'biology_nabm_actes_regle_applicable_check',
    -- Un snapshot ment sur son contenu : impossible, le hash est recalculé.
    'biology_source_snapshots_sha256_verifie_check',
    'biology_source_snapshots_licence_check',
    -- Groupe imposé et groupe au choix restent distincts.
    'biology_analyte_nabm_nature_check',
    'biology_analyte_nabm_signature_check',
    -- Les deux référentiels de valeurs ne se comparent pas en unités libres.
    'biology_reference_ranges_unite_check',
    'biology_functional_ranges_unite_check',
    'biology_reference_ranges_cible_unique_check',
    'biology_functional_ranges_cible_unique_check',
    -- Une plage fonctionnelle sans claim n'existe pas.
    'biology_functional_ranges_claim_non_vide_check',
    'biology_analyte_links_claim_non_vide_check',
    -- Aucune formule textuelle exécutable.
    'biology_ratios_operation_check',
    'biology_ratios_constante_check',
    -- Les besoins sont numérotés 1 à 12.
    'biology_panels_besoins_bornes_check',
    'biology_analyte_links_cible_besoin_check',
    'biology_panel_items_cible_unique_check'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = colonne_suspecte AND contype = 'c'
    ) THEN
      RAISE EXCEPTION 'CB-01: contrainte CHECK % absente', colonne_suspecte;
    END IF;
  END LOOP;

  RAISE NOTICE 'CB-01: contrat STRUCTUREL du catalogue biologie vérifié.';
END $$;
