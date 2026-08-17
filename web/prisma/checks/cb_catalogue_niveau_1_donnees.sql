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

  -- ── Comptes du niveau 1 (conditionnels : base vide en CI avant release) ──
  -- COMPROMIS ÉCRIT (MI-9) : les panels et items sont comptés en TOTAUX de
  -- table — `biology_panels` ne porte pas de colonne de provenance. Un 16ᵉ
  -- panel LÉGITIME fera rougir ce contrat : c'est voulu, le rouge dit « le
  -- catalogue a changé, mettre à jour la décision et ces comptes », jamais
  -- « régression ». Les analytes, eux, sont filtrés sur `saisie_praticien`.
  SELECT count(*) INTO nb FROM biology_analytes WHERE source_provenance = 'saisie_praticien';
  IF nb > 0 THEN
    IF nb <> 47 THEN
      RAISE EXCEPTION 'D-068: % analyte(s) saisie_praticien au lieu des 47 du catalogue niveau 1', nb;
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
