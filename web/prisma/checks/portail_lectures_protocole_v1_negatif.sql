-- Contrat de l'espèce `protocole` de `portail_lectures_patient` (CC-8,
-- [[D-315]], migration `20261016080000_portail_lectures_protocole_v1`).
--
-- La migration promet QUATRE choses, et ce fichier les éprouve toutes :
--   1. une lecture `protocole` s'écrit et se relit, une par version diffusée
--      (deux diffusions = deux lignes ; la même deux fois = 23505) ;
--   2. les quatre espèces d'avant restent acceptées : la nouvelle liste
--      contient l'ancienne, aucune ligne existante ne devient invalide ;
--   3. L'ESPÈCE RESTE FERMÉE : ce qui ressemble au protocole sans être
--      l'ouverture de son détail est REFUSÉ (23514) — « accueil » et
--      « connexion » ([[D-315]] §1 : ni l'affichage de l'accueil ni la
--      connexion ne comptent), la casse et un suffixe ;
--   4. la contrainte est VALIDÉE sur les lignes existantes (pas NOT VALID).
--
-- Le reste de la table (liste blanche de colonnes, aucun horodatage, FK, RLS) est tenu par
-- `portail_lectures_patient_v1_negatif.sql`, que ce fichier ne répète pas.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  espece_refusee text;
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_plprot', 'PAT_CONTRAT_PLPROT', 'jennifer.martin@example.test',
          'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Une lecture `protocole` par version diffusée ──────────────────────
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLPROT', 'protocole', 'diffusion_001'),
           ('PAT_CONTRAT_PLPROT', 'protocole', 'diffusion_002');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'LECTURE PROTOCOLE: deux lectures de deux diffusions ont été refusées (%)', SQLERRM;
  END;

  SELECT count(*) INTO nb FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLPROT' AND espece = 'protocole';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'LECTURE PROTOCOLE: 2 lectures attendues, % relue(s)', nb;
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLPROT', 'protocole', 'diffusion_001');
  EXCEPTION
    WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'LECTURE PROTOCOLE: la même diffusion lue deux fois a été ACCEPTÉE — la première ouverture ne serait plus structurelle.';
  END IF;

  -- ── 2. Les quatre espèces d'avant restent acceptées ──────────────────────
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLPROT', 'bilan', 'env_001'),
           ('PAT_CONTRAT_PLPROT', 'synthese', 'syn_001'),
           ('PAT_CONTRAT_PLPROT', 'fiche_assiette', 'far_001'),
           ('PAT_CONTRAT_PLPROT', 'lettre_adressage', 'lar_001');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'LECTURE PROTOCOLE: une espèce existante est désormais refusée (%) — la nouvelle liste doit contenir l''ancienne.', SQLERRM;
  END;

  -- ── 3. L'espèce reste fermée ─────────────────────────────────────────────
  FOREACH espece_refusee IN ARRAY ARRAY['accueil', 'connexion', 'Protocole', 'protocole_detail'] LOOP
    refuse := false;
    BEGIN
      INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
      VALUES ('PAT_CONTRAT_PLPROT', espece_refusee, 'objet_refuse');
    EXCEPTION
      WHEN check_violation THEN refuse := true;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION
        'LECTURE PROTOCOLE: l''espèce « % » a été ACCEPTÉE — le CHECK ne ferme plus la liste.', espece_refusee;
    END IF;
  END LOOP;

  -- ── 4. La contrainte est VALIDÉE sur l'existant ──────────────────────────
  -- Un `ADD CONSTRAINT … NOT VALID` passerait les trois cas ci-dessus (il
  -- contrôle les insertions neuves) sans avoir relu une seule ligne existante.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conname = 'portail_lectures_patient_espece_check'
    AND conrelid = 'public.portail_lectures_patient'::regclass
    AND contype = 'c' AND convalidated;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'LECTURE PROTOCOLE: CHECK de l''espèce absent ou NOT VALID (% validé[s])', nb;
  END IF;

  RAISE NOTICE 'LECTURE PROTOCOLE: une lecture par diffusion acceptée et relue, doublon refusé (23505), quatre espèces d''avant acceptées, accueil, connexion, casse et suffixe refusés (23514), CHECK validé.';
END $$;

ROLLBACK;
