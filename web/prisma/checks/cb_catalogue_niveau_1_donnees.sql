-- Contrat de DONNÉES du catalogue biologie niveau 1 (D-068).
--
-- Écrit sur prescription de la revue du 2026-08-17 : sans lui, une ligne
-- perdue en production ne se voyait nulle part — les contrats existants sont
-- vacués sur les tables que ce lot remplit. Les comptes sont CONDITIONNELS à
-- la présence du catalogue (`count(*) > 0`) pour rester verts en CI avant la
-- release ; les invariants structurels (espaces de codes, vocabulaires) sont
-- inconditionnels — vrais même à vide.
BEGIN;

DO $$
DECLARE
  nb int;
  nb_attendu int;
  def_analytes text;
  def_reference text;
  def_fonctionnelles text;
BEGIN
  -- ── Espaces de codes DISJOINTS (finding MA-2, inconditionnel) ────────────
  -- Les quatre entrées « rapport/indice » du §A sont des ANALYTES (fidélité au
  -- document validé — leurs opérandes ne sont pas tous au catalogue), et leurs
  -- codes occupent l'espace `BIO_RATIO_*` que `biology_ratios` réserve par son
  -- CHECK. Les deux tables ayant des unicités INDÉPENDANTES, le même code
  -- pourrait exister des deux côtés — deux objets cliniques concurrents sans
  -- signal. Ce contrat interdit l'intersection.
  SELECT count(*) INTO nb
  FROM biology_analytes a
  JOIN biology_ratios r ON r.code = a.code;

  IF nb > 0 THEN
    RAISE EXCEPTION
      'D-068: % code(s) présent(s) à la fois en analyte et en ratio — deux objets cliniques concurrents', nb;
  END IF;

  -- ── « Défini une fois, appliqué TROIS fois » (finding MA-1) ──────────────
  -- Le vocabulaire d'unités doit être IDENTIQUE sur l'analyte et les deux
  -- tables de plages : deux listes qui divergent réintroduisent le défaut B4
  -- de la revue d'origine (plages côte à côte en unités incomparables). La
  -- comparaison porte sur la LISTE elle-même, extraite de chaque définition —
  -- les trois CHECK diffèrent légitimement par leur garde de nullité.
  -- LE MOTIF EST `ARRAY[...]`, PAS `IN (...)` (revue, BL-5, vérifié sur
  -- cluster) : PostgreSQL normalise `IN (liste)` en `= ANY (ARRAY[...])` et
  -- `pg_get_constraintdef` ne rend jamais le mot IN. La garde IS NULL reste :
  -- une liste réduite à UN élément perdrait sa forme ARRAY (égalité simple)
  -- et doit faire rougir le contrat, jamais l'aveugler.
  SELECT substring(pg_get_constraintdef(oid) from 'ARRAY\[.*\]') INTO def_analytes
  FROM pg_constraint WHERE conname = 'biology_analytes_unite_check';
  SELECT substring(pg_get_constraintdef(oid) from 'ARRAY\[.*\]') INTO def_reference
  FROM pg_constraint WHERE conname = 'biology_reference_ranges_unite_check';
  SELECT substring(pg_get_constraintdef(oid) from 'ARRAY\[.*\]') INTO def_fonctionnelles
  FROM pg_constraint WHERE conname = 'biology_functional_ranges_unite_check';

  IF def_analytes IS NULL OR def_reference IS NULL OR def_fonctionnelles IS NULL
     OR def_analytes <> def_reference OR def_analytes <> def_fonctionnelles THEN
    RAISE EXCEPTION
      'D-068: les trois vocabulaires d''unités divergent (analytes/reference/fonctionnelles) — un analyte pourrait porter une unité que ses plages refusent';
  END IF;

  -- D-261 : l'unité du DFG est au vocabulaire (inconditionnel — une migration
  -- qui reposerait la liste en l'oubliant rendrait BIO_DFG_CKD_EPI insaisissable).
  IF position('mL/min/1,73 m²' in def_analytes) = 0 THEN
    RAISE EXCEPTION 'D-261: l''unité « mL/min/1,73 m² » manque au vocabulaire d''unités';
  END IF;

  -- ── Comptes du niveau 1 (conditionnels : base vide en CI avant release) ──
  -- COMPROMIS ÉCRIT (MI-9) : les panels et items sont comptés en TOTAUX de
  -- table — `biology_panels` ne porte pas de colonne de provenance. Un 16ᵉ
  -- panel LÉGITIME fera rougir ce contrat : c'est voulu, le rouge dit « le
  -- catalogue a changé, mettre à jour la décision et ces comptes », jamais
  -- « régression ». Les analytes, eux, sont filtrés sur `saisie_praticien`.
  -- 47 au niveau 1 (D-068), + 2 le 2026-09-24 (D-245 §5 : index oméga 3 et
  -- rapport AA/EPA, migration 20260924090000), + 36 le 2026-10-03 (D-261 :
  -- analyses d'un compte rendu courant, migration 20261003150000).
  SELECT count(*) INTO nb FROM biology_analytes WHERE source_provenance = 'saisie_praticien';
  IF nb > 0 THEN
    IF nb <> 85 THEN
      RAISE EXCEPTION 'D-068/D-245/D-261: % analyte(s) saisie_praticien au lieu des 85 du catalogue', nb;
    END IF;

    -- Les 36 analytes de D-261, LIGNE PAR LIGNE, pour la même raison que les
    -- deux de D-245 ci-dessous : aucun panel ne les cite. L'unité est celle
    -- arbitrée (SI) — une seconde unité imprimée ne s'y glisse jamais.
    SELECT count(*) INTO nb FROM biology_analytes
    WHERE type_prelevement = 'sang' AND NOT validation_medicale_requise
      AND (code, unite) IN (
      ('BIO_HEMATIES', '10^12/L'), ('BIO_HEMATOCRITE', '%'), ('BIO_VGM', 'fL'),
      ('BIO_TCMH', 'pg'), ('BIO_CCMH', 'g/L'), ('BIO_IDR', '%'),
      ('BIO_LEUCOCYTES', '10^9/L'), ('BIO_PLAQUETTES', '10^9/L'), ('BIO_VPM', 'fL'),
      ('BIO_NEUTROPHILES', '10^9/L'), ('BIO_EOSINOPHILES', '10^9/L'),
      ('BIO_BASOPHILES', '10^9/L'), ('BIO_LYMPHOCYTES', '10^9/L'), ('BIO_MONOCYTES', '10^9/L'),
      ('BIO_NEUTROPHILES_PCT', '%'), ('BIO_EOSINOPHILES_PCT', '%'),
      ('BIO_BASOPHILES_PCT', '%'), ('BIO_LYMPHOCYTES_PCT', '%'), ('BIO_MONOCYTES_PCT', '%'),
      ('BIO_SODIUM', 'mmol/L'), ('BIO_POTASSIUM', 'mmol/L'), ('BIO_CHLORE', 'mmol/L'),
      ('BIO_CREATININE', 'µmol/L'), ('BIO_DFG_CKD_EPI', 'mL/min/1,73 m²'),
      ('BIO_ASAT', 'UI/L'), ('BIO_ALAT', 'UI/L'), ('BIO_GGT', 'UI/L'),
      ('BIO_CHOLESTEROL_TOTAL', 'mmol/L'), ('BIO_HDL', 'mmol/L'),
      ('BIO_LDL_CALCULE', 'mmol/L'), ('BIO_NON_HDL', 'mmol/L'), ('BIO_TRIGLYCERIDES', 'mmol/L'),
      ('BIO_TRANSFERRINE', 'g/L'), ('BIO_CTF', 'µmol/L'),
      ('BIO_VITAMINE_B12', 'pmol/L'), ('BIO_CRP', 'mg/L')
    );
    IF nb <> 36 THEN
      RAISE EXCEPTION 'D-261: % analyte(s) du compte rendu courant conformes au lieu de 36 (code, unité, prélèvement)', nb;
    END IF;

    -- D-059 : un analyte ajouté par D-261 n'arrive avec AUCUNE plage.
    SELECT count(*) INTO nb FROM (
      SELECT analyte_code FROM biology_reference_ranges
      UNION ALL SELECT analyte_code FROM biology_functional_ranges
    ) p WHERE p.analyte_code IN (
      'BIO_HEMATIES', 'BIO_HEMATOCRITE', 'BIO_VGM', 'BIO_TCMH', 'BIO_CCMH', 'BIO_IDR',
      'BIO_LEUCOCYTES', 'BIO_PLAQUETTES', 'BIO_VPM',
      'BIO_NEUTROPHILES', 'BIO_EOSINOPHILES', 'BIO_BASOPHILES', 'BIO_LYMPHOCYTES', 'BIO_MONOCYTES',
      'BIO_NEUTROPHILES_PCT', 'BIO_EOSINOPHILES_PCT', 'BIO_BASOPHILES_PCT',
      'BIO_LYMPHOCYTES_PCT', 'BIO_MONOCYTES_PCT',
      'BIO_SODIUM', 'BIO_POTASSIUM', 'BIO_CHLORE', 'BIO_CREATININE', 'BIO_DFG_CKD_EPI',
      'BIO_ASAT', 'BIO_ALAT', 'BIO_GGT',
      'BIO_CHOLESTEROL_TOTAL', 'BIO_HDL', 'BIO_LDL_CALCULE', 'BIO_NON_HDL', 'BIO_TRIGLYCERIDES',
      'BIO_TRANSFERRINE', 'BIO_CTF', 'BIO_VITAMINE_B12', 'BIO_CRP');
    IF nb > 0 THEN
      RAISE EXCEPTION 'D-261: % plage(s) posée(s) sur un analyte du compte rendu courant — hors périmètre (D-059)', nb;
    END IF;

    -- Les deux analytes de D-245 §5, LIGNE PAR LIGNE : ils n'entrent dans aucun
    -- panel, donc aucun autre contrat n'éprouve leur identité — le seul total
    -- laisserait passer une faute de code, de libellé, d'unité ou de
    -- prélèvement (revue de la PR #1216).
    SELECT count(*) INTO nb FROM biology_analytes
    WHERE (code, libelle, unite, type_prelevement, source_provenance, validation_medicale_requise) IN (
      ('BIO_INDEX_OMEGA3', 'Index oméga 3', '%', 'sang', 'saisie_praticien', false),
      ('BIO_RATIO_AA_EPA', 'Rapport AA / EPA', 'ratio', 'autre', 'saisie_praticien', false)
    );
    IF nb <> 2 THEN
      RAISE EXCEPTION 'D-245: % analyte(s) oméga 3 / AA-EPA conformes au lieu de 2 (code, libellé, unité, prélèvement)', nb;
    END IF;

    SELECT count(*) INTO nb FROM biology_panels;
    IF nb <> 15 THEN
      RAISE EXCEPTION 'D-068: % panel(s) au lieu des 15 du catalogue niveau 1', nb;
    END IF;

    SELECT count(*) INTO nb FROM biology_panel_items;
    IF nb <> 78 THEN
      RAISE EXCEPTION 'D-068: % item(s) de composition au lieu des 78 du catalogue niveau 1', nb;
    END IF;

    -- Aucun item orphelin : chaque composition référence un analyte présent.
    SELECT count(*) INTO nb
    FROM biology_panel_items i
    LEFT JOIN biology_analytes a ON a.code = i.analyte_code
    WHERE i.analyte_code IS NOT NULL AND a.code IS NULL;
    IF nb > 0 THEN
      RAISE EXCEPTION 'D-068: % item(s) de panel sans analyte correspondant', nb;
    END IF;

    -- La validation médicale ne porte que l'insulinémie (arbitrage F.6).
    SELECT count(*) INTO nb FROM biology_analytes
    WHERE validation_medicale_requise AND code <> 'BIO_INSULINEMIE';
    IF nb > 0 THEN
      RAISE EXCEPTION 'D-068: % analyte(s) hors insulinémie marqué(s) validation_medicale_requise', nb;
    END IF;

    -- ── Plages : autant que de claims fondateurs présents (finding MA-6) ──
    -- Le nombre ATTENDU se calcule depuis le corpus, avec le prédicat exact de
    -- la barrière d'insertion : en CI (corpus vide) on attend 0, en production
    -- on attend 2 — et « moins que l'attendu » désigne la barrière D-003, pas
    -- une hypothèse à inventer.
    IF to_regclass('public.rag_corpus_claims') IS NOT NULL THEN
      SELECT count(*) INTO nb_attendu
      FROM rag_corpus_claims c
      WHERE (c.claim_id, c.version_claim) IN (('WN-CL-0044-003', 'v1.0'), ('WN-CL-0154-054', 'v1.0'))
        AND c.statut = 'VALIDE' AND c.active;

      SELECT count(*) INTO nb FROM biology_functional_ranges
      WHERE id IN ('biofr_ferritine', 'biofr_vitamine_d') AND actif;

      IF nb <> nb_attendu THEN
        RAISE EXCEPTION
          'D-068: % plage(s) du niveau 1 en base pour % claim(s) fondateur(s) VALIDE(s) — la barrière D-003 et l''état du corpus divergent', nb, nb_attendu;
      END IF;
    END IF;
  END IF;
END $$;

ROLLBACK;
