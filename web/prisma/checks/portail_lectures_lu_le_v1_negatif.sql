-- Contrat de la colonne `lu_le` de `portail_lectures_patient` (lettre ai,
-- [[D-297]], migration `20261018120000_portail_lectures_lu_le_v1`).
--
-- La migration promet CINQ choses, et ce fichier les éprouve toutes :
--   1. la colonne existe, de type DATE — le jour seul, sans heure (§2) ;
--   2. elle est NULLABLE : les lectures antérieures restent sans date, sans
--      rattrapage (§3) ;
--   3. elle n'a AUCUN DÉFAUT : une lecture écrite sans jour reste sans jour.
--      C'est l'invariant de §4 — aucune date ne s'écrit depuis une page qui ne
--      sert pas la phrase « Votre lecture est datée » ; le jour ne vient que du
--      code qui la sert ;
--   4. le jour posé par l'horloge de la base, en heure de Paris, s'écrit et se
--      relit tel quel ;
--   5. un horodatage fourni est RAMENÉ AU JOUR par le type : l'heure ne se
--      stocke pas, même si un appelant la fournit.
--
-- Le reste de la table (liste blanche, aucun horodatage, FK, RLS) est tenu par
-- `portail_lectures_patient_v1_negatif.sql`, que ce fichier ne répète pas.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  nb integer;
  jour date;
  defaut text;
BEGIN
  -- ── 1, 2, 3. Type, nullabilité, aucun défaut ─────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'portail_lectures_patient'
    AND c.column_name = 'lu_le' AND c.data_type = 'date' AND c.is_nullable = 'YES';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'LU_LE: colonne absente, ou pas de type date, ou NOT NULL (D-297 §2-§3)';
  END IF;

  SELECT c.column_default INTO defaut
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'portail_lectures_patient' AND c.column_name = 'lu_le';
  IF defaut IS NOT NULL THEN
    RAISE EXCEPTION
      'LU_LE: un défaut (%) daterait les lectures avant que la phrase « Votre lecture est datée » ne soit servie (D-297 §4).',
      defaut;
  END IF;

  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_plulee', 'PAT_CONTRAT_PLULEE', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- Une lecture écrite sans jour reste sans jour.
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
  VALUES ('PAT_CONTRAT_PLULEE', 'bilan', 'envoi_sans_jour');
  SELECT lu_le INTO jour FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_sans_jour';
  IF jour IS NOT NULL THEN
    RAISE EXCEPTION 'LU_LE: une lecture écrite sans jour en porte un (%) — un défaut existe quelque part', jour;
  END IF;

  -- ── 4. Le jour posé par la base, en heure de Paris ───────────────────────
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'bilan', 'envoi_du_jour', (now() AT TIME ZONE 'Europe/Paris')::date);
  SELECT lu_le INTO jour FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_du_jour';
  IF jour IS DISTINCT FROM (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'LU_LE: le jour posé par la base n''est pas relu tel quel (%)', jour;
  END IF;

  -- ── 5. Un horodatage fourni est ramené au jour ───────────────────────────
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'synthese', 'synthese_horodatee', TIMESTAMP '2026-10-18 23:59:59');
  SELECT lu_le INTO jour FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'synthese_horodatee';
  IF jour IS DISTINCT FROM DATE '2026-10-18' THEN
    RAISE EXCEPTION 'LU_LE: un horodatage fourni n''a pas été ramené au jour (%)', jour;
  END IF;

  RAISE NOTICE 'LU_LE: type date, nullable, AUCUN défaut, lecture sans jour laissée vide, jour de Paris posé par la base relu, horodatage ramené au jour.';
END $$;

ROLLBACK;
