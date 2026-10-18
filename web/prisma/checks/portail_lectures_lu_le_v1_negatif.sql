-- Contrat de la colonne `lu_le` de `portail_lectures_patient` (lettre ai,
-- [[D-297]], migration `20261018120000_portail_lectures_lu_le_v1`).
--
-- La migration promet SEPT choses, et ce fichier les éprouve toutes :
--   1. la colonne existe, de type DATE — le jour seul, sans heure (§2) ;
--   2. elle est NULLABLE : les lectures antérieures restent sans date, sans
--      rattrapage (§3) ;
--   3. elle n'a AUCUN DÉFAUT : une lecture écrite sans jour reste sans jour.
--      C'est l'invariant de §4 — aucune date ne s'écrit depuis une page qui ne
--      sert pas la phrase « Votre lecture est datée » ; seul le code qui la
--      sert DEMANDE un jour ;
--   4. LA BASE CHOISIT LE JOUR : une date fournie par l'appelant — d'un autre
--      jour, ou un horodatage — est REMPLACÉE par le jour de Paris de
--      l'horloge de la base (§2), quel que soit le fuseau de la session. Le code choisit s'il date, jamais quelle
--      date ;
--   5. le jour ne se pose pas APRÈS COUP sur une lecture sans jour (UPDATE
--      refusé — aucun rattrapage, §3) ;
--   6. le jour posé ne se CORRIGE ni ne s'EFFACE (UPDATE refusé, §1) ;
--   7. les deux triggers qui tiennent 4 à 6 existent, et une mise à jour qui
--      ne touche pas au jour n'est pas refusée par eux.
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
  refuse boolean;
  tz_origine text;
  jour_base CONSTANT date := (clock_timestamp() AT TIME ZONE 'Europe/Paris')::date;
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

  -- ── 7. Les deux triggers existent ────────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'portail_lectures_patient' AND NOT t.tgisinternal
    AND t.tgname IN ('portail_lectures_patient_lu_le_insertion', 'portail_lectures_patient_lu_le_fige');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'LU_LE: % trigger(s) sur 2 attendus — la base ne choisit plus le jour, ou il redevient modifiable', nb;
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

  -- ── 4. La base choisit le jour ───────────────────────────────────────────
  -- Une date d'un autre jour est remplacée.
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'bilan', 'envoi_antidate', DATE '2000-01-01');
  SELECT lu_le INTO jour FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_antidate';
  IF jour IS DISTINCT FROM jour_base THEN
    RAISE EXCEPTION 'LU_LE: une date fournie (2000-01-01) a été gardée (%) — l''appelant choisit le jour (D-297 §2)', jour;
  END IF;

  -- Un horodatage fourni est remplacé aussi : l'heure ne se stocke pas, et le
  -- jour non plus.
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'synthese', 'synthese_horodatee', TIMESTAMP '2001-02-03 23:59:59');
  SELECT lu_le INTO jour FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'synthese_horodatee';
  IF jour IS DISTINCT FROM jour_base THEN
    RAISE EXCEPTION 'LU_LE: un horodatage fourni n''a pas été remplacé par le jour de la base (%)', jour;
  END IF;

  -- Le jour est celui de PARIS, pas celui du fuseau de la session. Le CI tourne
  -- en UTC, où un `CURRENT_DATE` ne diffère de Paris qu'entre 22 h et 24 h :
  -- deux passes sous des fuseaux extrêmes (UTC+14, UTC-12) couvrent ensemble
  -- toutes les heures — l'une des deux rougit si le trigger perd son fuseau.
  tz_origine := current_setting('TimeZone');
  PERFORM set_config('TimeZone', 'Etc/GMT-14', true);
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'bilan', 'envoi_fuseau_est', DATE '2000-01-01');
  PERFORM set_config('TimeZone', 'Etc/GMT+12', true);
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet, lu_le)
  VALUES ('PAT_CONTRAT_PLULEE', 'bilan', 'envoi_fuseau_ouest', DATE '2000-01-01');
  PERFORM set_config('TimeZone', tz_origine, true);
  SELECT count(*) INTO nb FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet IN ('envoi_fuseau_est', 'envoi_fuseau_ouest')
    AND lu_le = jour_base;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'LU_LE: sous un fuseau de session extrême, le jour n''est plus celui de Paris (% sur 2) — le trigger lit le fuseau de la session', nb;
  END IF;

  -- ── 5. Aucun rattrapage : poser un jour après coup est refusé ────────────
  refuse := false;
  BEGIN
    UPDATE portail_lectures_patient SET lu_le = jour_base
    WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_sans_jour';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'LU_LE: un jour a été posé APRÈS COUP sur une lecture sans jour — rattrapage interdit (D-297 §3)';
  END IF;

  -- ── 6. Le jour posé ne se corrige ni ne s'efface ─────────────────────────
  refuse := false;
  BEGIN
    UPDATE portail_lectures_patient SET lu_le = DATE '2000-01-01'
    WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_antidate';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'LU_LE: le jour de première lecture a été CORRIGÉ (D-297 §1)';
  END IF;

  refuse := false;
  BEGIN
    UPDATE portail_lectures_patient SET lu_le = NULL
    WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_antidate';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'LU_LE: le jour de première lecture a été EFFACÉ (D-297 §1)';
  END IF;

  -- ── 7 (suite). Une mise à jour qui ne touche pas au jour passe ───────────
  -- Le trigger garde le JOUR, pas la ligne : il ne doit pas masquer un autre
  -- refus sous le sien.
  BEGIN
    UPDATE portail_lectures_patient SET id_objet = 'envoi_antidate_renomme'
    WHERE id_patient = 'PAT_CONTRAT_PLULEE' AND id_objet = 'envoi_antidate';
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'LU_LE: une mise à jour qui ne touche pas au jour a été refusée (%)', SQLERRM;
  END;

  RAISE NOTICE 'LU_LE: type date, nullable, AUCUN défaut, 2 triggers, lecture sans jour laissée vide, date et horodatage fournis remplacés par le jour de Paris (fuseaux UTC+14 et UTC-12 compris), rattrapage, correction et effacement refusés.';
END $$;

ROLLBACK;
