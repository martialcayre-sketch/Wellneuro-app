-- Contrat du dossier administratif patient (campagne « rayon Patients »,
-- LOT-03 — adresse, NIR, médecin traitant).
--
-- La migration promet HUIT choses, et ce fichier les éprouve TOUTES :
--   1. les quatre colonnes existent, en `text`, et sont NULLABLES — un dossier
--      ouvert avant cette date doit rester valide sans rien remplir ;
--   2. une ligne qui les porte toutes à NULL est ACCEPTÉE. Sans ce cas positif,
--      un CHECK trop strict passerait le contrat en refusant tout, et les 29
--      dossiers de production deviendraient inécrivables au premier UPDATE ;
--   3. un NIR de forme invalide est REFUSÉ (23514) — quatorze chiffres, seize
--      chiffres, une lettre hors Corse ;
--   4. un NIR CORSE (`2A`, `2B`) est ACCEPTÉ. C'est le seul endroit où le NIR
--      porte une lettre, et l'oublier ferait refuser un assuré par la base,
--      avec un message que personne à l'écran ne saurait traduire ;
--   5. la CLÉ DE CONTRÔLE n'est PAS vérifiée ici, et c'est ÉPROUVÉ : un NIR de
--      forme juste mais de clé fausse est ACCEPTÉ en base. Ce cas positif est
--      la contrepartie du commentaire de la migration — il interdit de croire
--      que la base garde ce que seule l'application garde ;
--   6. une chaîne VIDE ou blanche est REFUSÉE sur les trois colonnes texte —
--      une colonne nullable dont la valeur peut être `'   '` offre deux façons
--      de dire « rien » ;
--   7. un dépassement de longueur est REFUSÉ ;
--   8. la RLS deny-all de `patients` est TOUJOURS active — re-vérifiée plutôt
--      que supposée. Un `ADD COLUMN` ne la touche pas, mais c'est précisément
--      le genre de garantie qu'on croit acquise (leçon `D-072`).
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR, et il faut le savoir en le lisant :
-- que le NIR saisi soit CELUI du patient. Aucune contrainte ne l'exprime, et
-- aucune qualification par téléservice n'a lieu — c'est un NIR DÉCLARÉ.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  ID_TEST CONSTANT text := 'PAT_CONTRAT_ADMIN_V1';
  -- Forme valide, clé volontairement quelconque : la base ne la vérifie pas.
  --   sexe(1) année(2) mois(2) | département(2) | commune+ordre+clé(8)
  NIR_FORME_OK CONSTANT text := '27807' ||  '33'  || '12345678';
  -- LE DÉPARTEMENT EST AU 6ᵉ ET 7ᵉ RANG, et nulle part ailleurs. La première
  -- écriture de cette constante plaçait `2A` au 8ᵉ : le contrat a rougi, et il
  -- avait raison — c'était la constante qui se trompait, pas la contrainte.
  NIR_CORSE    CONSTANT text := '27807' || '2A'   || '33345678';
BEGIN
  -- ── 1. Les quatre colonnes : présence, type, nullabilité ──────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'patients'
    AND column_name IN ('adresse', 'nir', 'medecin_traitant_nom', 'medecin_traitant_coordonnees')
    AND data_type = 'text'
    AND is_nullable = 'YES';
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT 1 : attendu 4 colonnes text nullables, trouvé %', nb;
  END IF;

  -- Un patient support, sans aucun des quatre champs.
  INSERT INTO "patients" (id, id_patient, email, prenom, nom, praticien_email, actif, created_at, updated_at)
  VALUES (ID_TEST, ID_TEST, 'contrat.admin@fictif.wellneuro.fr', 'Contrat', 'Admin',
          'contrat@wellneuro.fr', true, now(), now());

  -- ── 2. Tout à NULL : ACCEPTÉ ──────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM "patients"
  WHERE id_patient = ID_TEST
    AND adresse IS NULL AND nir IS NULL
    AND medecin_traitant_nom IS NULL AND medecin_traitant_coordonnees IS NULL;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 2 : une ligne sans aucun des quatre champs doit exister';
  END IF;

  -- ── 3. NIR de forme invalide : REFUSÉ ─────────────────────────────────────
  FOR nb IN 1..1 LOOP
    BEGIN
      refuse := false;
      UPDATE "patients" SET nir = '27807331234567' WHERE id_patient = ID_TEST; -- 14
    EXCEPTION WHEN check_violation THEN refuse := true;
    END;
    IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 3a : un NIR de 14 caracteres doit etre refuse'; END IF;

    BEGIN
      refuse := false;
      UPDATE "patients" SET nir = '2780733123456789' WHERE id_patient = ID_TEST; -- 16
    EXCEPTION WHEN check_violation THEN refuse := true;
    END;
    IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 3b : un NIR de 16 caracteres doit etre refuse'; END IF;

    BEGIN
      refuse := false;
      -- Une lettre ailleurs qu'au departement corse.
      UPDATE "patients" SET nir = '2A8073312345678' WHERE id_patient = ID_TEST;
    EXCEPTION WHEN check_violation THEN refuse := true;
    END;
    IF NOT refuse THEN RAISE EXCEPTION 'CONTRAT 3c : une lettre hors departement doit etre refusee'; END IF;
  END LOOP;

  -- ── 4. NIR corse : ACCEPTÉ ────────────────────────────────────────────────
  UPDATE "patients" SET nir = NIR_CORSE WHERE id_patient = ID_TEST;
  SELECT count(*) INTO nb FROM "patients" WHERE id_patient = ID_TEST AND nir = NIR_CORSE;
  IF nb <> 1 THEN RAISE EXCEPTION 'CONTRAT 4 : un NIR corse (2A/2B) doit etre accepte'; END IF;

  -- ── 5. La clé de contrôle n'est PAS gardée en base ────────────────────────
  -- Cas POSITIF assumé : la forme suffit. Si un jour ce cas rougit, c'est que
  -- quelqu'un a ajouté un calcul de clé en SQL — et le commentaire de la
  -- migration, qui dit l'inverse, sera devenu faux.
  UPDATE "patients" SET nir = NIR_FORME_OK WHERE id_patient = ID_TEST;
  SELECT count(*) INTO nb FROM "patients" WHERE id_patient = ID_TEST AND nir = NIR_FORME_OK;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 5 : la base ne verifie pas la cle — ce NIR doit passer';
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

  RAISE NOTICE 'CONTRAT dossier_administratif_patient_v1 : les huit promesses tiennent.';
END $$;

ROLLBACK;
