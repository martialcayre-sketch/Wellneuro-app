-- Contrat STRUCTUREL de la provenance du référentiel d'ingrédients (C4, 1b).
--
-- Raison d'être : `prisma migrate diff` ne voit ni les CHECK, ni la RLS. Les
-- quatre contraintes posées par `20260731090000_c4_referentiel_provenance`
-- ne seraient donc protégées par rien — un `DROP CONSTRAINT` en base
-- resterait vert au CI. Ce fichier les rend testables.
--
-- Il n'éprouve QUE le schéma : aucune donnée requise, aucune donnée écrite.
-- Bloc `DO` nu, sans `BEGIN;`/`COMMIT;`, pour rester réutilisable dans une
-- transaction appelante (même convention que `cb_biologie_structure_v1.sql`).
DO $$
DECLARE
  tables_ref CONSTANT text[] := ARRAY[
    'supplement_ingredients', 'supplement_ingredient_formes'
  ];
  t text;
  nb int;
BEGIN
  FOREACH t IN ARRAY tables_ref LOOP
    -- ── Les deux colonnes existent, et sont NULLABLES ────────────────────
    -- Nullables à dessein : une entrée saisie à la main par le praticien n'a
    -- pas de provenance externe. Les rendre NOT NULL fermerait cette porte.
    SELECT count(*) INTO nb FROM information_schema.columns
     WHERE table_name = t
       AND column_name IN ('source_provenance', 'source_identifiant')
       AND is_nullable = 'YES' AND data_type = 'text';
    IF nb <> 2 THEN
      RAISE EXCEPTION '%: les colonnes de provenance manquent ou ne sont pas TEXT NULL (trouvé %)', t, nb;
    END IF;

    -- ── Le vocabulaire de provenance est clos ────────────────────────────
    SELECT count(*) INTO nb FROM pg_constraint
     WHERE conrelid = t::regclass AND contype = 'c'
       AND conname = t || '_source_provenance_check';
    IF nb <> 1 THEN
      RAISE EXCEPTION '%: CHECK de vocabulaire de provenance absent', t;
    END IF;

    -- ── La nullabilité est APPARIÉE ──────────────────────────────────────
    -- C'est la contrainte qui compte. Une ligne (provenance NULL, identifiant
    -- renseigné) échappe à la fois au `findFirst` de la voie d'ingestion, qui
    -- filtre sur les deux colonnes, et à l'index unique — PostgreSQL ne fait
    -- pas conflit entre deux NULL. Le même identifiant officiel pourrait donc
    -- être inséré indéfiniment, et l'idempotence de l'ingestion serait fausse
    -- sans que rien ne le dise.
    SELECT count(*) INTO nb FROM pg_constraint
     WHERE conrelid = t::regclass AND contype = 'c'
       AND conname = t || '_source_paire_check';
    IF nb <> 1 THEN
      RAISE EXCEPTION '%: CHECK de nullabilité appariée absent', t;
    END IF;

    -- ── RLS toujours active ──────────────────────────────────────────────
    -- Acquise par `20260707123710_enable_rls_security` ; un ADD COLUMN ne la
    -- retire pas, mais rien n'empêcherait un lot ultérieur de le faire.
    SELECT count(*) INTO nb FROM pg_class
     WHERE relname = t AND relrowsecurity;
    IF nb <> 1 THEN
      RAISE EXCEPTION '%: RLS désactivée', t;
    END IF;
  END LOOP;

  -- ── Unicité CÔTÉ INGRÉDIENT, et elle seule ─────────────────────────────
  SELECT count(*) INTO nb FROM pg_indexes
   WHERE tablename = 'supplement_ingredients'
     AND indexname = 'supplement_ingredients_source_key'
     AND indexdef ILIKE 'CREATE UNIQUE INDEX%';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'supplement_ingredients_source_key manquant ou non unique';
  END IF;

  -- ── Côté FORME, l'index NE DOIT PAS être unique ────────────────────────
  -- Une même forme d'apport officielle relève parfois de plusieurs substances
  -- (69 cas mesurés, dont « D-pantothénate de calcium » → vitamine B5 ET
  -- calcium). Elle apparaît légitimement sous plusieurs ingrédients : rendre
  -- cet index unique refuserait la seconde attache et ferait échouer
  -- l'ingestion — en ayant l'air d'un durcissement.
  -- DEUX assertions, pas une. Compter les index UNIQUES portant ce nom et
  -- exiger zéro est satisfait aussi bien par « l'index existe et n'est pas
  -- unique » — ce qu'on veut — que par « l'index a disparu » ou « il a été
  -- renommé », qu'on ne veut pas du tout : la re-synchronisation par
  -- identifiant officiel perdrait son index sans que rien ne le dise. On
  -- vérifie donc d'abord l'EXISTENCE, ensuite la NON-UNICITÉ.
  SELECT count(*) INTO nb FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'supplement_ingredient_formes'
     AND indexname = 'supplement_ingredient_formes_source_idx';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'supplement_ingredient_formes_source_idx absent ou renommé';
  END IF;

  SELECT count(*) INTO nb FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'supplement_ingredient_formes'
     AND indexname = 'supplement_ingredient_formes_source_idx'
     AND indexdef ILIKE 'CREATE UNIQUE INDEX%';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'supplement_ingredient_formes_source_idx est devenu UNIQUE : le multi-rattachement officiel deviendrait impossible';
  END IF;

  -- ── L'unicité réelle de la forme reste (ingredient_id, code) ───────────
  SELECT count(*) INTO nb FROM pg_indexes
   WHERE tablename = 'supplement_ingredient_formes'
     AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
     AND indexdef ILIKE '%ingredient_id%' AND indexdef ILIKE '%code%';
  IF nb < 1 THEN
    RAISE EXCEPTION 'unicité (ingredient_id, code) perdue côté forme';
  END IF;
END $$;
