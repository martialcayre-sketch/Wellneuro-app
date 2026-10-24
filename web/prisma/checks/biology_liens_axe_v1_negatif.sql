-- Tests NÉGATIFS des liens analyte-axe (F79, D-351 §4 ; D-348 §5).
--
-- La migration `20261024160000_biology_liens_axe_signes_v1` rend
-- `niveau_preuve` nullable et pose un trigger contre le double lien
-- nutriment/axe. Ce fichier vérifie que les deux MORDENT, et pour le bon
-- motif :
--   - nul entre (« non gradé ») ; A à D entrent ; une lettre hors A-D, une
--     minuscule ou une chaîne vide sont refusées par le CHECK A-D ;
--   - un lien actif nutriment puis axe sur un même analyte est refusé, dans
--     les deux ordres, ainsi que sur un rapport ; la réactivation d'un lien
--     dormant et le changement de cible sont refusés de même (UPDATE) ;
--   - ce que la règle laisse passer passe : deux axes sur un même analyte
--     (liens 3 et 16 de D-351), un besoin à côté d'un axe, un lien désactivé
--     de l'autre cible.
--
-- Tout se déroule dans une transaction annulée : analytes, rapport et liens
-- de test ne survivent pas.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  etat text;
  contrainte text;
  msg text;
  lettres CONSTANT text[] := ARRAY['E', 'a', '', 'AB'];
  i integer;
BEGIN
  INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
  VALUES ('f79_a', 'BIO_TEST_F79_A', 'x', 'sang', 'saisie_praticien', 'partielle', now()),
         ('f79_b', 'BIO_TEST_F79_B', 'x', 'sang', 'saisie_praticien', 'partielle', now()),
         ('f79_c', 'BIO_TEST_F79_C', 'x', 'sang', 'saisie_praticien', 'partielle', now()),
         ('f79_d', 'BIO_TEST_F79_D', 'x', 'sang', 'saisie_praticien', 'partielle', now());
  INSERT INTO biology_ratios (id, code, libelle, operation, analyte_a_code, analyte_b_code)
  VALUES ('f79_r', 'BIO_RATIO_TEST_F79', 'x', 'rapport', 'BIO_TEST_F79_A', 'BIO_TEST_F79_B');

  -- ── Niveau de preuve : nul et A-D entrent ─────────────────────────────
  INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
  VALUES ('f79_np_nul', 'BIO_TEST_F79_A', 'axe', 'methylation',  'haut_evocateur', 'WN-CL-0000-000', 'v1.0', NULL),
         ('f79_np_a',   'BIO_TEST_F79_A', 'axe', 'inflammation', 'haut_evocateur', 'WN-CL-0000-001', 'v1.0', 'A'),
         ('f79_np_d',   'BIO_TEST_F79_A', 'axe', 'inflammation', 'haut_evocateur', 'WN-CL-0000-002', 'v1.0', 'D');

  -- ── Niveau de preuve : une lettre hors A-D est refusée par CE check ───
  FOR i IN 1 .. array_length(lettres, 1) LOOP
    refuse := false;
    BEGIN
      INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
      VALUES ('f79_np_ko_' || i, 'BIO_TEST_F79_A', 'axe', 'stress_oxydant', 'haut_evocateur', 'WN-CL-0000-003', 'v1.0', lettres[i]);
    EXCEPTION WHEN others THEN
      GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, contrainte = CONSTRAINT_NAME;
      IF etat <> '23514' OR contrainte IS DISTINCT FROM 'biology_analyte_links_niveau_preuve_check' THEN
        RAISE EXCEPTION 'F79 test négatif: niveau « % » rejeté pour le mauvais motif (SQLSTATE %, contrainte %)',
          lettres[i], etat, contrainte;
      END IF;
      refuse := true;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION 'F79 test négatif: niveau « % » ACCEPTÉ alors qu''il doit être rejeté', lettres[i];
    END IF;
  END LOOP;

  -- ── Ce que D-348 §5 laisse passer ─────────────────────────────────────
  -- Deux axes sur un même analyte (BIO_TEST_F79_A en porte déjà trois) ;
  -- un besoin à côté d'un axe ; un nutriment DÉSACTIVÉ à côté d'un axe.
  INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, actif)
  VALUES ('f79_ok_besoin',  'BIO_TEST_F79_A', 'besoin',    '3',   'bas_evocateur', 'WN-CL-0000-004', 'v1.0', true),
         ('f79_ok_dormant', 'BIO_TEST_F79_A', 'nutriment', 'zinc', 'bas_evocateur', 'WN-CL-0000-005', 'v1.0', false);

  -- ── Double lien refusé : axe déjà posé, nutriment ensuite ─────────────
  refuse := false;
  BEGIN
    INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
    VALUES ('f79_ko_nut', 'BIO_TEST_F79_A', 'nutriment', 'zinc', 'bas_evocateur', 'WN-CL-0000-006', 'v1.0');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF etat <> 'P0001' OR position('D-348 §5' in msg) = 0 THEN
      RAISE EXCEPTION 'F79 test négatif: nutriment après axe rejeté pour le mauvais motif (SQLSTATE %)', etat;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F79 test négatif: nutriment après axe ACCEPTÉ sur un même analyte';
  END IF;

  -- ── Double lien refusé : nutriment déjà posé, axe ensuite ─────────────
  INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
  VALUES ('f79_nut_c', 'BIO_TEST_F79_C', 'nutriment', 'zinc', 'bas_evocateur', 'WN-CL-0000-007', 'v1.0');
  refuse := false;
  BEGIN
    INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
    VALUES ('f79_ko_axe', 'BIO_TEST_F79_C', 'axe', 'methylation', 'haut_evocateur', 'WN-CL-0000-008', 'v1.0');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF etat <> 'P0001' OR position('D-348 §5' in msg) = 0 THEN
      RAISE EXCEPTION 'F79 test négatif: axe après nutriment rejeté pour le mauvais motif (SQLSTATE %)', etat;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F79 test négatif: axe après nutriment ACCEPTÉ sur un même analyte';
  END IF;

  -- ── Double lien refusé sur un rapport ─────────────────────────────────
  INSERT INTO biology_analyte_links (id, ratio_code, cible_type, cible_code, direction, claim_id, version_claim)
  VALUES ('f79_r_axe', 'BIO_RATIO_TEST_F79', 'axe', 'inflammation', 'haut_evocateur', 'WN-CL-0000-009', 'v1.0');
  refuse := false;
  BEGIN
    INSERT INTO biology_analyte_links (id, ratio_code, cible_type, cible_code, direction, claim_id, version_claim)
    VALUES ('f79_ko_r_nut', 'BIO_RATIO_TEST_F79', 'nutriment', 'zinc', 'bas_evocateur', 'WN-CL-0000-010', 'v1.0');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF etat <> 'P0001' OR position('D-348 §5' in msg) = 0 THEN
      RAISE EXCEPTION 'F79 test négatif: double lien sur un rapport rejeté pour le mauvais motif (SQLSTATE %)', etat;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F79 test négatif: double lien nutriment/axe ACCEPTÉ sur un rapport';
  END IF;

  -- ── Double lien refusé par UPDATE : réactiver le nutriment dormant ────
  refuse := false;
  BEGIN
    UPDATE biology_analyte_links SET actif = true WHERE id = 'f79_ok_dormant';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF etat <> 'P0001' OR position('D-348 §5' in msg) = 0 THEN
      RAISE EXCEPTION 'F79 test négatif: réactivation rejetée pour le mauvais motif (SQLSTATE %)', etat;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F79 test négatif: réactivation d''un nutriment à côté d''un axe ACCEPTÉE';
  END IF;

  -- ── Double lien refusé par UPDATE : changer la cible d'un besoin ──────
  refuse := false;
  BEGIN
    UPDATE biology_analyte_links SET cible_type = 'nutriment', cible_code = 'zinc' WHERE id = 'f79_ok_besoin';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS etat = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF etat <> 'P0001' OR position('D-348 §5' in msg) = 0 THEN
      RAISE EXCEPTION 'F79 test négatif: changement de cible rejeté pour le mauvais motif (SQLSTATE %)', etat;
    END IF;
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'F79 test négatif: changement de cible besoin → nutriment ACCEPTÉ à côté d''un axe';
  END IF;

  -- ── Témoin : un analyte sans axe prend un nutriment ───────────────────
  -- Sans lui, un trigger qui refuserait tout nutriment garderait ce fichier
  -- vert.
  INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
  VALUES ('f79_ok_nut_d', 'BIO_TEST_F79_D', 'nutriment', 'zinc', 'bas_evocateur', 'WN-CL-0000-011', 'v1.0');

  RAISE NOTICE 'F79: nul et A-D acceptés, % lettres refusées ; double lien nutriment/axe refusé dans 5 cas, 4 cas permis acceptés.',
    array_length(lettres, 1);
END $$;

-- Rien de ce qui précède ne survit.
ROLLBACK;
