-- Contrat de DONNÉES du catalogue biologie CB-01 / CB-02a.
--
-- Les invariants STRUCTURELS (CHECK, RLS, index partiels, verrou HDS, existence
-- des tables) ont été extraits dans `cb_biologie_structure_v1.sql` : ils ne
-- dépendent pas des données importées et sont désormais rejoués DANS la
-- transaction de l'import (`prisma/importNabm.ts`), avant COMMIT.
--
-- Ce fichier-ci ne porte que les invariants de DONNÉES — pointeur de version,
-- snapshot, incompatibilités, correspondances signées, barrière D-003. Sur une
-- base VIDE (CI, juste après `migrate deploy`) ils renvoient 0 par vacuité : ils
-- ne mordent que là où des données existent. La barrière D-003, en particulier,
-- porte sur des tables peuplées par d'AUTRES lots (plages fonctionnelles, liens
-- cliniques) et reste donc un contrat de CATALOGUE — hors du chemin d'import.
BEGIN;

DO $$
DECLARE
  nb int;
BEGIN
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

  RAISE NOTICE 'CB-01: contrat de DONNÉES du catalogue biologie vérifié.';
END $$;

COMMIT;
