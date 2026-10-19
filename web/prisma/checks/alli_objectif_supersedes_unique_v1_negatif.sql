-- Contrat de l'unicité de révision d'un objectif négocié (dette t11).
--
-- La migration promet QUATRE choses, et ce fichier les éprouve TOUTES :
--   1. l'index `alli_objectif_negocie_supersedes_unique` existe, est UNIQUE,
--      porte sur la SEULE colonne `supersedes_objectif_id`, et n'est PAS
--      partiel — un prédicat ajouté plus tard rouvrirait la course sur les
--      lignes qu'il exclut ;
--   2. deux RACINES (`supersedes_objectif_id` NULL) sur le même dossier sont
--      ACCEPTÉES — un dossier porte légitimement une chaîne close et une
--      chaîne nouvelle, et leur coexistence active se départage à l'écran ;
--   3. une révision d'une version est ACCEPTÉE, une SECONDE révision de la
--      même version est REFUSÉE (23505) — c'est la course que l'index ferme ;
--   4. la RLS deny-all de `objectifs_negocies` reste active — re-vérifiée
--      plutôt que supposée (leçon `D-072`).
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
BEGIN
  -- ── 1. L'index : présent, unique, une colonne, sans prédicat ─────────────
  SELECT count(*) INTO nb
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tab ON tab.oid = i.indrelid
  WHERE tab.relname = 'objectifs_negocies'
    AND idx.relname = 'alli_objectif_negocie_supersedes_unique'
    AND i.indisunique
    AND i.indpred IS NULL
    AND i.indnatts = 1
    AND (SELECT a.attname FROM pg_attribute a
         WHERE a.attrelid = tab.oid AND a.attnum = i.indkey[0]) = 'supersedes_objectif_id';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 1 : index unique total sur supersedes_objectif_id attendu, trouvé %', nb;
  END IF;

  -- Fixture — patient fictif autorisé (identité de fixture du dépôt).
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli_t11', 'PAT_CONTRAT_ALLI_T11', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 2. Deux racines sur le même dossier : ACCEPTÉES ──────────────────────
  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_t11_r1', 'PAT_CONTRAT_ALLI_T11', 'praticien@wellneuro.fr', 'Mieux dormir'),
         ('obj_t11_r2', 'PAT_CONTRAT_ALLI_T11', 'praticien@wellneuro.fr', 'Retrouver de l''énergie');
  SELECT count(*) INTO nb FROM objectifs_negocies
  WHERE id_patient = 'PAT_CONTRAT_ALLI_T11' AND supersedes_objectif_id IS NULL;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT 2 : deux racines doivent coexister, trouvé %', nb;
  END IF;

  -- ── 3. Une révision passe, la seconde de la même version est REFUSÉE ─────
  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, supersedes_objectif_id)
  VALUES ('obj_t11_v2', 'PAT_CONTRAT_ALLI_T11', 'praticien@wellneuro.fr', 'Mieux dormir', 'obj_t11_r1');

  refuse := false;
  BEGIN
    INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, supersedes_objectif_id)
    VALUES ('obj_t11_v2bis', 'PAT_CONTRAT_ALLI_T11', 'praticien@wellneuro.fr', 'Mieux dormir', 'obj_t11_r1');
  EXCEPTION WHEN unique_violation THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'CONTRAT 3 : une seconde révision de la même version doit être refusée (23505)';
  END IF;

  -- ── 4. RLS deny-all toujours active ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'objectifs_negocies' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 4 : RLS désactivée sur objectifs_negocies';
  END IF;
END $$;

ROLLBACK;
