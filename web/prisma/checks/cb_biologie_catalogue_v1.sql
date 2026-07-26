-- Contrat de migration CB-01 (catalogue biologie fonctionnelle).
-- Exécuté après `prisma migrate deploy`. Vérifie les invariants structurels
-- que le drift check ne couvre PAS : Prisma n'introspecte ni les CHECK, ni la
-- RLS, ni les index partiels. Sans ce fichier, les ~40 CHECK de la migration
-- ne sont protégés par rien et un `DROP CONSTRAINT` en base resterait vert.
BEGIN;

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

  -- ── Cohérence du pointeur de version ─────────────────────────────────────
  -- Une faute de frappe au pointeur ('V106' pour des lignes en 'V105') rend
  -- le catalogue entier invisible à toute lecture filtrée, sans erreur. C'est
  -- le seul mécanisme d'idempotence de l'import CB-02a.
  SELECT count(*) INTO nb
  FROM biology_catalog_versions_courantes v
  WHERE v.source_provenance = 'nabm_smt_ans'
    AND v.nombre_entrees <> (
      SELECT count(*) FROM biology_nabm_actes a
      WHERE a.version_source = v.version_source
    );

  IF nb > 0 THEN
    RAISE EXCEPTION
      'CB-01: le pointeur de version ne compte pas les actes de son millésime (% source(s))', nb;
  END IF;

  -- ── Tout millésime servi est adossé à son snapshot ───────────────────────
  -- CB-02a écrit le snapshot et déplace le pointeur dans la MÊME transaction.
  -- Un pointeur sans snapshot signifierait donc soit une écriture manuelle,
  -- soit un import partiel : dans les deux cas, un catalogue servi dont on ne
  -- peut plus prouver la provenance — ce que la LOv2 impose précisément de
  -- pouvoir citer. Silencieux tant qu'aucune source n'est importée.
  SELECT count(*) INTO nb
  FROM biology_catalog_versions_courantes v
  WHERE NOT EXISTS (
    SELECT 1 FROM biology_source_snapshots s
    WHERE s.source_provenance = v.source_provenance
      AND s.version_source = v.version_source
      AND (v.contenu_sha256 IS NULL OR v.contenu_sha256 = s.contenu_sha256)
  );

  IF nb > 0 THEN
    RAISE EXCEPTION
      'CB-01: % pointeur(s) de version sans snapshot correspondant (ou d''empreinte divergente)', nb;
  END IF;

  -- ── Une incompatibilité renvoie à un acte du même millésime ──────────────
  -- Le CHECK garantit la FORME des codes ; il ne peut pas garantir qu'ils
  -- EXISTENT — Postgres n'accepte pas de clé étrangère depuis un tableau.
  -- Mesure du 2026-07-26 : les 966 occurrences de la V105 se résolvent toutes.
  -- Une référence pendante signifierait un import tronqué à mi-parcours.
  SELECT count(*) INTO nb
  FROM biology_nabm_actes a
  CROSS JOIN LATERAL unnest(coalesce(a.code_incompatible, ARRAY[]::text[])) AS ref(code)
  WHERE NOT EXISTS (
    SELECT 1 FROM biology_nabm_actes cible
    WHERE cible.code_acte = ref.code AND cible.version_source = a.version_source
  );

  IF nb > 0 THEN
    RAISE EXCEPTION
      'CB-01: % référence(s) d''incompatibilité pendante(s) dans leur millésime', nb;
  END IF;

  -- ── Toute correspondance signée se résout dans le millésime courant ──────
  -- Remplace la clé étrangère que l'ancrage sur le code d'acte interdit.
  -- Silencieux tant que la nomenclature n'est pas importée (aucun pointeur) :
  -- c'est l'état attendu à la sortie de CB-01.
  SELECT count(*) INTO nb
  FROM biology_analyte_nabm c
  JOIN biology_catalog_versions_courantes v ON v.source_provenance = 'nabm_smt_ans'
  WHERE c.verifie_par IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM biology_nabm_actes a
      WHERE a.code_acte = c.code_acte AND a.version_source = v.version_source
    );

  IF nb > 0 THEN
    RAISE EXCEPTION
      'CB-01: % correspondance(s) signée(s) ne se résolvent pas dans le millésime courant', nb;
  END IF;

  -- ── Une plage fonctionnelle sans claim VALIDE ne doit pas exister ────────
  -- La base ne peut pas le contraindre (rag_corpus_claims est hors Prisma, en
  -- SQL brut) : la réconciliation se fait ici. En prod, la majorité des claims
  -- est EN_ATTENTE — c'est précisément la population qui ne doit pas servir.
  -- La clé métier d'un claim est le COUPLE (claim_id, version_claim), tous
  -- deux en texte — c'est l'unicité déclarée par rag_corpus_claims. Joindre
  -- sur la seule colonne `id` (la clé primaire technique) aurait comparé deux
  -- identifiants de nature différente et rendu ce contrôle toujours vert.
  IF to_regclass('public.rag_corpus_claims') IS NOT NULL THEN
    SELECT count(*) INTO nb
    FROM biology_functional_ranges r
    WHERE r.actif
      AND NOT EXISTS (
        SELECT 1 FROM rag_corpus_claims c
        WHERE c.claim_id = r.claim_id
          AND c.version_claim = r.version_claim
          AND c.statut = 'VALIDE'
          AND c.active
      );

    IF nb > 0 THEN
      RAISE EXCEPTION
        'CB-01: % plage(s) fonctionnelle(s) active(s) sans claim VALIDE et actif (barrière D-003)', nb;
    END IF;

    SELECT count(*) INTO nb
    FROM biology_analyte_links l
    WHERE l.actif
      AND NOT EXISTS (
        SELECT 1 FROM rag_corpus_claims c
        WHERE c.claim_id = l.claim_id
          AND c.version_claim = l.version_claim
          AND c.statut = 'VALIDE'
          AND c.active
      );

    IF nb > 0 THEN
      RAISE EXCEPTION
        'CB-01: % lien(s) clinique(s) actif(s) sans claim VALIDE et actif (barrière D-003)', nb;
    END IF;
  END IF;

  RAISE NOTICE 'CB-01: contrat du catalogue biologie vérifié.';
END $$;

COMMIT;
