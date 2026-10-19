-- Contrat du dossier administratif patient (campagne « rayon Patients »,
-- LOT-03 — adresse, NIR, médecin traitant).
--
-- La migration promettait HUIT choses ; depuis le retrait de la colonne `nir`
-- (2026-10-19, migration `20261019190000_patients_retrait_nir_v1`), les trois
-- promesses du NIR (3 à 5) n'ont plus d'objet et sont retirées — leur absence
-- est éprouvée par `patients_retrait_nir_v1_negatif.sql`. Restent, éprouvées
-- TOUTES :
--   1. les trois colonnes existent, en `text`, et sont NULLABLES — un dossier
--      ouvert avant cette date doit rester valide sans rien remplir ;
--   2. une ligne qui les porte toutes à NULL est ACCEPTÉE. Sans ce cas positif,
--      un CHECK trop strict passerait le contrat en refusant tout, et les
--      dossiers de production deviendraient inécrivables au premier UPDATE ;
--   6. une chaîne VIDE ou blanche est REFUSÉE sur les trois colonnes texte —
--      une colonne nullable dont la valeur peut être `'   '` offre deux façons
--      de dire « rien » ;
--   7. un dépassement de longueur est REFUSÉ ;
--   8. la RLS deny-all de `patients` est TOUJOURS active — re-vérifiée plutôt
--      que supposée. Un `ADD COLUMN` ne la touche pas, mais c'est précisément
--      le genre de garantie qu'on croit acquise (leçon `D-072`).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  ID_TEST CONSTANT text := 'PAT_CONTRAT_ADMIN_V1';
BEGIN
  -- ── 1. Les trois colonnes : présence, type, nullabilité ───────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'patients'
    AND column_name IN ('adresse', 'medecin_traitant_nom', 'medecin_traitant_coordonnees')
    AND data_type = 'text'
    AND is_nullable = 'YES';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT 1 : attendu 3 colonnes text nullables, trouvé %', nb;
  END IF;

  -- Un patient support, sans aucun des trois champs.
  INSERT INTO "patients" (id, id_patient, email, prenom, nom, praticien_email, actif, created_at, updated_at)
  VALUES (ID_TEST, ID_TEST, 'contrat.admin@fictif.wellneuro.fr', 'Contrat', 'Admin',
          'contrat@wellneuro.fr', true, now(), now());

  -- ── 2. Tout à NULL : ACCEPTÉ ──────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM "patients"
  WHERE id_patient = ID_TEST
    AND adresse IS NULL
    AND medecin_traitant_nom IS NULL AND medecin_traitant_coordonnees IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 2 : une ligne sans aucun des trois champs doit exister';
  END IF;

  -- ── 6. Chaînes vides ou blanches : REFUSÉES sur les trois colonnes ────────
  BEGIN
    refuse := false;
    UPDATE "patients" SET adresse = '   ' WHERE id_patient = ID_TEST;
  EXCEPTION WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 6a : une adresse blanche doit etre refusee'; END IF;

  BEGIN
    refuse := false;
    -- Une TABULATION seule : c'est ce que `btrim/1` laisserait passer.
    UPDATE "patients" SET medecin_traitant_nom = E'\t' WHERE id_patient = ID_TEST;
  EXCEPTION WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 6b : un nom de medecin tabule doit etre refuse'; END IF;

  BEGIN
    refuse := false;
    UPDATE "patients" SET medecin_traitant_coordonnees = '' WHERE id_patient = ID_TEST;
  EXCEPTION WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 6c : des coordonnees vides doivent etre refusees'; END IF;

  -- ── 7. Dépassement de longueur : REFUSÉ ───────────────────────────────────
  BEGIN
    refuse := false;
    UPDATE "patients" SET adresse = repeat('a', 501) WHERE id_patient = ID_TEST;
  EXCEPTION WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 7 : une adresse de 501 caracteres doit etre refusee'; END IF;

  -- ── 8. La RLS deny-all de `patients` tient toujours ───────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'patients' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 8 : la RLS de patients doit rester active';
  END IF;

  RAISE NOTICE 'CONTRAT dossier_administratif_patient_v1 : les cinq promesses restantes tiennent.';
END $$;

ROLLBACK;
