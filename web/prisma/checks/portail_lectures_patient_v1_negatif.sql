-- Contrat de `portail_lectures_patient` (campagne « vie du portail patient »,
-- LOT-08 — ce que le patient a déjà lu).
--
-- La table promet HUIT choses, et ce fichier les éprouve TOUTES :
--   1. un accusé s'écrit, et se relit ;
--   2. le MÊME accusé deux fois est REFUSÉ (23505) — la clé primaire porte le
--      triplet. Une route qui réenregistre une lecture doit donc être
--      idempotente par construction, pas par prudence ;
--   3. PLUSIEURS accusés par dossier sont ACCEPTÉS, et c'est l'écart assumé
--      avec sa voisine `portail_journal_reperes`. Sans ce cas positif, un
--      lecteur pourrait croire la table mono-ligne comme l'autre, et tout le
--      raisonnement sur le décompte serait mal posé ;
--   4. L'ESPÈCE EST FERMÉE : « objectif » est REFUSÉ (23514). Ce qui compte
--      comme une LECTURE est un arbitrage — sans le CHECK, une surface
--      pourrait y inscrire « connexion » et la table deviendrait le journal de
--      présence que la campagne s'interdit (`DC-19`/`DC-20`) ;
--   5. la table porte EXACTEMENT ses trois colonnes, LISTE BLANCHE ;
--   6. AUCUNE COLONNE DE TYPE DATE OU HORODATAGE — vérifié sur le TYPE, et non
--      sur des noms devinés. C'est la seule impossibilité que cette table
--      offre : « quand le patient a-t-il ouvert son bilan » reste sans
--      réponse. Un `lu_le` n'aurait servi à rien au fil du jour, qui ne
--      consulte que l'EXISTENCE de la ligne, et aurait servi à autre chose ;
--   7. la FK vers `patients` est en ON DELETE RESTRICT ;
--   8. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR, et il faut le savoir en le lisant :
-- qu'aucune surface PRATICIEN ne lise cette table. Aucune contrainte SQL ne
-- l'exprime. C'est un banc de dépôt qui le tient
-- (`portailLecturesPatient.guard.test.ts`), et une garde de dépôt se contourne
-- — elle ne protège pas la base, elle protège la relecture.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  reelles text[];

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparaison à un `array_agg(... ORDER BY
  -- column_name)`) : une colonne ajoutée à la fin rougirait alors qu'elle est
  -- déclarée, et le message afficherait deux ensembles identiques au tri près.
  COLS_LECTURES CONSTANT text[] := ARRAY['espece', 'id_objet', 'id_patient'];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_plect', 'PAT_CONTRAT_PLECT', 'sophie.nicola@example.test',
          'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIF — un accusé s'écrit et se relit ───────────────────────
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLECT', 'bilan', 'env_001');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'LECTURES PORTAIL: un accusé valide a été refusé (%)', SQLERRM;
  END;

  SELECT count(*) INTO nb FROM portail_lectures_patient
  WHERE id_patient = 'PAT_CONTRAT_PLECT' AND espece = 'bilan' AND id_objet = 'env_001';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: l''accusé posé ne se relit pas (% ligne[s])', nb;
  END IF;

  -- ── 2. Le MÊME accusé deux fois est refusé ───────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLECT', 'bilan', 'env_001');
  EXCEPTION
    WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'LECTURES PORTAIL: un accusé en double a été ACCEPTÉ — la clé primaire ne porte plus le triplet, et une relecture compterait double.';
  END IF;

  -- ── 3. PLUSIEURS accusés par dossier : ACCEPTÉS, et c'est l'écart assumé ──
  -- Deux objets de la même espèce, puis une autre espèce. Ce cas POSITIF est
  -- aussi important que les refus : il fixe par écrit que cette table n'est PAS
  -- mono-ligne, contrairement à `portail_journal_reperes`.
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLECT', 'bilan', 'env_002'),
           ('PAT_CONTRAT_PLECT', 'synthese', 'syn_001');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'LECTURES PORTAIL: plusieurs accusés sur un même dossier ont été refusés (%)', SQLERRM;
  END;

  SELECT count(*) INTO nb FROM portail_lectures_patient WHERE id_patient = 'PAT_CONTRAT_PLECT';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: 3 accusés attendus sur le dossier, % relu(s)', nb;
  END IF;

  -- ── 4. L'espèce est FERMÉE ───────────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLECT', 'objectif', 'obj_001');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'LECTURES PORTAIL: l''espèce « objectif » a été ACCEPTÉE — le CHECK est tombé, et la table peut devenir un journal de présence.';
  END IF;

  -- Et la chaîne vide non plus : un appelant qui omet l'espèce ne doit pas
  -- pouvoir écrire une ligne sans espèce sous couvert de NOT NULL.
  refuse := false;
  BEGIN
    INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
    VALUES ('PAT_CONTRAT_PLECT', '', 'vide_001');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: une espèce VIDE a été acceptée — le CHECK ne mord pas sur la chaîne vide.';
  END IF;

  -- ── 5. Liste blanche de colonnes ─────────────────────────────────────────
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'portail_lectures_patient';

  IF reelles IS DISTINCT FROM COLS_LECTURES THEN
    RAISE EXCEPTION
      'LECTURES PORTAIL: colonnes inattendues (%). Attendu exactement % — toute colonne neuve doit être arbitrée.',
      reelles, COLS_LECTURES;
  END IF;

  -- ── 6. AUCUNE COLONNE DE DATE, vérifié sur le TYPE ───────────────────────
  -- La liste blanche ci-dessus l'implique déjà, mais elle l'implique par des
  -- NOMS : le jour où une colonne serait ajoutée à la liste blanche par le même
  -- diff qui l'ajoute au schéma, ce test-ci rougirait quand même si elle porte
  -- un instant. C'est là toute sa valeur — il garde l'INTERDIT, pas la forme.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'portail_lectures_patient'
    AND c.data_type IN ('timestamp without time zone', 'timestamp with time zone', 'date', 'time without time zone');
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'LECTURES PORTAIL: % colonne(s) d''horodatage — « quand le patient a lu » doit rester SANS RÉPONSE. Le fil du jour ne consulte que l''existence de la ligne.',
      nb;
  END IF;

  -- ── 7. Les trois colonnes sont NOT NULL ──────────────────────────────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'portail_lectures_patient'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id_patient', 'espece', 'id_objet');
  IF nb <> 3 THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: % colonne(s) NOT NULL sur 3 attendues', nb;
  END IF;

  -- ── 8. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  -- `confdeltype = 'r'`, invisible du drift check.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'portail_lectures_patient'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  -- ── 9. Deny-all RLS (posture D-005) ──────────────────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'portail_lectures_patient' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: RLS désactivée sur portail_lectures_patient';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'portail_lectures_patient'
  ) THEN
    RAISE EXCEPTION 'LECTURES PORTAIL: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'LECTURES PORTAIL: accusé valide accepté et relu, doublon refusé (23505), plusieurs accusés par dossier acceptés, espèce hors liste et espèce vide refusées (23514), liste blanche exacte (3 colonnes), AUCUN horodatage, 3 NOT NULL, FK RESTRICT, RLS deny-all.';
END $$;

ROLLBACK;
