-- Contrat du retrait de la colonne `nir` (dette t03, H26 (g), D-284).
--
-- La migration `20261019190000_patients_retrait_nir_v1` promet QUATRE choses,
-- et ce fichier les éprouve toutes :
--   1. la colonne `nir` n'existe plus dans `patients` ;
--   2. la contrainte de forme `patients_nir_forme` est partie avec elle — une
--      contrainte orpheline sous un autre nom serait le signe d'un retrait
--      fait à moitié ;
--   3. les trois autres colonnes du dossier administratif sont INTACTES ;
--   4. la RLS deny-all de `patients` est TOUJOURS active.
--
-- Lecture seule du catalogue : rien n'est écrit.
DO $$
DECLARE
  nb integer;
BEGIN
  -- ── 1. La colonne est absente ─────────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'nir';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT 1 : la colonne nir doit avoir disparu de patients';
  END IF;

  -- ── 2. La contrainte de forme est absente ─────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint co
  JOIN pg_class c ON c.oid = co.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'patients'
    AND (co.conname = 'patients_nir_forme' OR pg_get_constraintdef(co.oid) ~* '\mnir\M');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT 2 : aucune contrainte de patients ne doit plus porter sur le NIR';
  END IF;

  -- ── 3. Les trois autres colonnes restent ──────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'patients'
    AND column_name IN ('adresse', 'medecin_traitant_nom', 'medecin_traitant_coordonnees')
    AND data_type = 'text' AND is_nullable = 'YES';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT 3 : attendu 3 colonnes text nullables, trouvé %', nb;
  END IF;

  -- ── 4. La RLS deny-all de `patients` tient toujours ───────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'patients' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT 4 : la RLS de patients doit rester active';
  END IF;

  RAISE NOTICE 'CONTRAT patients_retrait_nir_v1 : les quatre promesses tiennent.';
END $$;
