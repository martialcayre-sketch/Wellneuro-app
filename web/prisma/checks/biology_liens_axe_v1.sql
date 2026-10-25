-- Contrat de la LISTE EXACTE des liens analyte-axe signés (F79, D-351 §2 et §5).
--
-- CE QU'IL GARDE. Les liens de la cible `axe` sont exactement les dix-sept du
-- §2 de D-351 : un lien en plus, en moins ou modifié (analyte, axe, claim,
-- version, sens, niveau de preuve, actif) rougit. Chaque claim cité doit être
-- encore `VALIDE`, actif et non supplanté dans sa version. Retirer ou ajouter
-- un lien exige une nouvelle décision, donc une nouvelle migration ET la mise
-- à jour de la liste ci-dessous.
--
-- OÙ IL MORD. Trois états, lus dans la base elle-même :
--   - migration `20261024160000_biology_liens_axe_signes_v1` non appliquée :
--     la cible `axe` est vide ;
--   - migration appliquée sur une base sans corpus (CI, bases locales) :
--     la cible `axe` est vide, puisque la migration n'y écrit rien ;
--   - migration appliquée sur une base qui porte un corpus (production) :
--     les dix-sept liens, ni plus ni moins, et leurs claims frais.
-- En CI, le troisième état n'existe que dans le banc
-- `scripts/banc-rejeu-liens-axe-f79.test.mjs`, qui rejoue la migration sur des
-- claims de fixture puis joue ce fichier dans la même transaction annulée.
-- En production, il se joue par conteneur détaché, en lecture seule : c'est
-- le constat de la release (D-351 §5). Il tourne aussi en préflight de
-- `release-db` (`web/scripts/release-db-scalingo.sh`, étape
-- `preflight_liens_axe`, avant `migrate deploy` ; revue P2-1) : un claim
-- rejeté ou supplanté après la release bloque la suivante, au lieu de laisser
-- ses liens actifs sans signal. S'il rougit, la correction est un arbitrage
-- clinique, jamais un `UPDATE` à la main.
--
-- UNE LISTE FUTURE DOIT LIRE SA MIGRATION. Le préflight joue le contrat de
-- l'image AVANT `migrate deploy`. La migration qui changera un jour la liste
-- arrivera avec un contrat qui porte déjà la nouvelle, sur une base qui porte
-- encore l'ancienne : il rougirait et bloquerait sa propre release. Ce
-- contrat-là devra choisir sa liste selon la migration appliquée, comme
-- celui-ci le fait pour la cible vide.
-- Il en va de même de toute migration qui touche la STRUCTURE gardée plus bas
-- (texte exact du CHECK `niveau_preuve`, nullabilité, trigger nutriment/axe) :
-- graduer un lien, ajouter une lettre ou renommer le trigger exige un contrat
-- à double état. Et passer un lien à `actif = false` ne débloque rien : la
-- liste fige `actif = true`, et la fraîcheur se juge sur tous les liens d'axe
-- — retirer un lien est une nouvelle décision, donc une nouvelle liste.
--
-- Lecture seule : rien n'est écrit, la transaction est annulée.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  applique boolean;
  nb integer;
  nb_ecarts integer;
  def text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM _prisma_migrations
    WHERE migration_name = '20261024160000_biology_liens_axe_signes_v1'
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL)
  INTO applique;

  SELECT count(*) INTO nb FROM biology_analyte_links WHERE cible_type = 'axe';

  IF NOT applique THEN
    IF nb <> 0 THEN
      RAISE EXCEPTION 'D-351 : % lien(s) d''axe en base avant la migration qui les écrit — aucun lien d''axe ne naît hors de la liste signée.', nb;
    END IF;
    RAISE NOTICE 'D-351 : migration des liens d''axe non appliquée, cible axe vide.';
    RETURN;
  END IF;

  -- ── Structure posée par la migration ───────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'biology_analyte_links'
      AND column_name = 'niveau_preuve' AND is_nullable = 'YES') THEN
    RAISE EXCEPTION 'D-351 §4 : niveau_preuve n''est pas nullable.';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO def FROM pg_constraint
  WHERE conrelid = 'public.biology_analyte_links'::regclass
    AND conname = 'biology_analyte_links_niveau_preuve_check';
  IF def IS DISTINCT FROM
     'CHECK ((niveau_preuve = ANY (ARRAY[''A''::text, ''B''::text, ''C''::text, ''D''::text])))' THEN
    RAISE EXCEPTION 'D-351 §4 : le CHECK A-D de niveau_preuve a changé ou disparu (%).', def;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.biology_analyte_links'::regclass
      AND tgname = 'biology_analyte_links_nutriment_axe_exclusifs'
      AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'D-348 §5 : le trigger biology_analyte_links_nutriment_axe_exclusifs est absent ou désactivé.';
  END IF;

  -- ── Base sans corpus : la migration n'a rien écrit ─────────────────────
  IF NOT EXISTS (SELECT 1 FROM rag_corpus_claims) THEN
    IF nb <> 0 THEN
      RAISE EXCEPTION 'D-351 : % lien(s) d''axe sur une base sans corpus — aucun claim ne les fonde.', nb;
    END IF;
    RAISE NOTICE 'D-351 : base sans corpus, cible axe vide (attendu).';
    RETURN;
  END IF;

  -- ── La liste exacte (D-351 §2) ─────────────────────────────────────────
  -- EXCEPT ALL dans les deux sens : un doublon compte comme un lien en plus.
  WITH attendus (analyte_code, ratio_code, cible_code, claim_id, version_claim, direction, niveau_preuve, actif) AS (
    VALUES
      ('BIO_HOMOCYSTEINE',     NULL::text, 'methylation',               'WN-CL-0043-014', 'v1.0', 'haut_evocateur',       NULL::text, true),
      ('BIO_CRP_US',           NULL,       'inflammation',              'WN-CL-0125-047', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_RATIO_KYN_TRP',    NULL,       'inflammation',              'WN-CL-0293-013', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_ANTI_LDL_OXYDE',   NULL,       'stress_oxydant',            'WN-CL-0161-070', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_COENZYME_Q10',     NULL,       'energie_mitochondriale',    'WN-CL-0161-081', 'v1.0', 'bas_evocateur',        NULL,       true),
      ('BIO_RATIO_HOMA',       NULL,       'regulation_glycemique',     'WN-CL-0390-010', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_GLYCEMIE_JEUN',    NULL,       'regulation_glycemique',     'WN-CL-0025-010', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_INDEX_OMEGA3',     NULL,       'acides_gras_polyinsatures', 'WN-CL-0294-004', 'v1.0', 'bas_evocateur',        NULL,       true),
      ('BIO_RATIO_AA_EPA',     NULL,       'acides_gras_polyinsatures', 'WN-CL-0294-004', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_TSH_US',           NULL,       'thyreotrope',               'WN-CL-0110-012', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_CAR',              NULL,       'corticotrope',              'WN-CL-0107-031', 'v1.0', 'hors_plage_evocateur', NULL,       true),
      ('BIO_CORTISOL_8H_20H',  NULL,       'corticotrope',              'WN-CL-0107-033', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_ALPHA_AMYLASE',    NULL,       'corticotrope',              'WN-CL-0042-005', 'v1.0', 'hors_plage_evocateur', NULL,       true),
      ('BIO_LBP',              NULL,       'barriere_intestinale',      'WN-CL-0125-046', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_BETA_DEFENSINE_2', NULL,       'barriere_intestinale',      'WN-CL-0043-030', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_RATIO_KYN_TRP',    NULL,       'microbiote_cerveau',        'WN-CL-0041-061', 'v1.0', 'haut_evocateur',       NULL,       true),
      ('BIO_AGCC_FECAUX',      NULL,       'microbiote_cerveau',        'WN-CL-0291-015', 'v1.0', 'hors_plage_evocateur', NULL,       true)
  ),
  reels AS (
    SELECT analyte_code, ratio_code, cible_code, claim_id, version_claim, direction, niveau_preuve, actif
    FROM biology_analyte_links WHERE cible_type = 'axe'
  )
  SELECT (SELECT count(*) FROM (SELECT * FROM attendus EXCEPT ALL SELECT * FROM reels) manquants)
       + (SELECT count(*) FROM (SELECT * FROM reels EXCEPT ALL SELECT * FROM attendus) en_trop)
  INTO nb_ecarts;

  IF nb_ecarts <> 0 OR nb <> 17 THEN
    RAISE EXCEPTION 'D-351 §2 : les liens d''axe s''écartent de la liste signée (% lien(s) en base, % écart(s)) — un lien en plus, en moins ou modifié.', nb, nb_ecarts;
  END IF;

  -- ── Chaque claim cité est encore certifié dans sa version (D-351 §5) ───
  SELECT count(*) INTO nb_ecarts
  FROM biology_analyte_links l
  WHERE l.cible_type = 'axe'
    AND NOT EXISTS (
      SELECT 1 FROM rag_corpus_claims c
      WHERE c.claim_id = l.claim_id
        AND c.version_claim = l.version_claim
        AND c.statut = 'VALIDE'
        AND c.active
        AND c.superseded_at IS NULL);

  IF nb_ecarts <> 0 THEN
    RAISE EXCEPTION 'D-351 §5 : % lien(s) d''axe citent un claim qui n''est plus VALIDE, actif et non supplanté dans sa version.', nb_ecarts;
  END IF;

  RAISE NOTICE 'D-351 : 17 liens d''axe conformes à la liste signée, claims certifiés.';
END $$;

ROLLBACK;
