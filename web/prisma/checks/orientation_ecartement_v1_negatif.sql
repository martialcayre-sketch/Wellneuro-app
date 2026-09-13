-- Contrat de `orientation_ecartements` — écartement praticien d'une proposition
-- d'orientation (arbitrage du 2026-09-13).
--
-- La table promet SEIZE choses, et ce fichier les éprouve TOUTES. Les neuf
-- premières étaient là dès la première rédaction ; les sept suivantes viennent
-- de la revue, et deux d'entre elles couvrent des défauts RÉELS de la migration :
--   1. un écartement valide s'écrit, et se relit ;
--   2. la FORME DE LA CIBLE est fermée : `Q_SOM_05` nu est REFUSÉ (23514).
--      Sans ce CHECK, deux espaces de noms se mélangeraient — un qid et un id
--      de pack se ressemblent assez pour qu'une route les confonde ;
--   3. l'ESPÈCE est fermée : `annulation` est REFUSÉE (23514). Ce qui compte
--      comme un geste sur une proposition est un arbitrage, pas un champ libre ;
--   4. le MOTIF est la décision : vide et blanc sont REFUSÉS (23514). Un
--      écartement sans motif écrit serait la suppression silencieuse d'une
--      discordance que `DC-30` interdit ;
--   5. UN ÉCARTEMENT SANS RÈGLES est REFUSÉ (23514) — et c'est le cas le plus
--      important du fichier. `regles_au_geste` est ce qui permet le RÉVEIL sur
--      un motif neuf ; une ligne sans règles ne se réveillerait jamais, et la
--      garde de `DC-30` tomberait en silence, sans rien casser ;
--   6. UNE REPRISE AVEC RÈGLES est REFUSÉE (23514), symétriquement : une
--      reprise ne motive rien, une liste y serait du bruit qu'un lecteur
--      finirait par interpréter ;
--   7. LA RACINE EST UNIQUE par (dossier, cible) — un second écartement racine
--      est REFUSÉ (23505) —, mais la REPRISE qui chaîne est ACCEPTÉE. Ces deux
--      cas vont ensemble : ils prouvent que l'index est bien PARTIEL. Un index
--      total passerait le premier et échouerait au second ;
--   8. LE FIL EST LINÉAIRE : deux gestes chaînant sur la MÊME ligne sont
--      REFUSÉS (23505) — la base refuse plutôt que d'élire à la lecture ;
--   9. la FK vers `patients` est en ON DELETE RESTRICT, et la RLS deny-all est
--      active et sans policy (posture `D-005`).
--
-- ── CE QUE CE FICHIER NE PROUVAIT PAS, ET QUI EST PASSÉ VERT EN CI ──────────
--
-- Une première rédaction de ce contrat a tourné VERTE sur une migration qui
-- portait deux défauts réels, relevés en revue. C'est la leçon la plus utile du
-- fichier, et elle vaut pour tout contrat négatif : **un contrat ne prouve que
-- ce qu'il TENTE**. Les deux cas manquants sont désormais là (10 et 11), et
-- l'un d'eux — la ligne qui se supplante elle-même — vidait l'index de racine
-- de tout son sens.
--
-- UN CAS QUI PASSAIT À VIDE, corrigé de même. Le cas 3 insérait une espèce hors
-- liste AVEC des règles : or le CHECK `regles_par_espece` est FAUX pour toute
-- espèce inconnue, si bien que l'INSERT restait refusé même si le CHECK
-- d'espèce disparaissait. `WHEN check_violation` ne distingue pas la contrainte.
-- L'espèce fermée est donc assertionnée au CATALOGUE (cas 14), comme l'index
-- partiel l'était déjà.
--
-- CE QUE CE CONTRAT NE PEUT PAS TENIR, et il faut le savoir en le lisant : que
-- `regles_au_geste` contienne des identifiants de RÈGLES et non de CIBLES.
-- Aucune contrainte SQL ne le sait — la distinction est celle qui porte tout
-- l'arbitrage de `D-053` (arbitrage 3). C'est la route qui la garde, et un banc
-- de dépôt qui tient la régression.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  racine_id text;
  reprise_id text;
  reelles text[];

  -- ORDRE ALPHABÉTIQUE OBLIGATOIRE (comparaison à un `array_agg(... ORDER BY
  -- column_name)`) : une colonne ajoutée à la fin rougirait alors qu'elle est
  -- déclarée, et le message afficherait deux ensembles identiques au tri près.
  COLS_ECARTEMENT CONSTANT text[] := ARRAY[
    'cible_id', 'created_at', 'espece', 'fait_le', 'id', 'id_patient',
    'motif', 'par_email', 'regles_au_geste', 'supersedes_ecartement_id'
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_ecart', 'PAT_CONTRAT_ECART', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIF — un écartement s'écrit et se relit ───────────────────
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_001', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'ecartement',
            ARRAY['R2-STR-02'], 'Le stress est déjà exploré par le PSS-10 revenu rassurant.',
            'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'ÉCARTEMENT: un écartement valide a été refusé (%)', SQLERRM;
  END;

  SELECT count(*) INTO nb FROM orientation_ecartements
  WHERE id_patient = 'PAT_CONTRAT_ECART' AND cible_id = 'questionnaire:Q_STR_03';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ÉCARTEMENT: l''écartement posé ne se relit pas (% ligne[s])', nb;
  END IF;

  -- ── 2. La forme de la cible est fermée ───────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_nu', 'PAT_CONTRAT_ECART', 'Q_SOM_05', 'ecartement',
            ARRAY['R-SOM-01'], 'motif quelconque', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: une cible NON PRÉFIXÉE a été acceptée — les deux espaces de noms peuvent se mélanger.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_inconnu', 'PAT_CONTRAT_ECART', 'instrument:Q_SOM_05', 'ecartement',
            ARRAY['R-SOM-01'], 'motif quelconque', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: un préfixe de cible INCONNU a été accepté.';
  END IF;

  -- ── 3. L'espèce est fermée ───────────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_esp', 'PAT_CONTRAT_ECART', 'pack:pack_socle_initial_neuronutrition',
            'annulation', ARRAY['R-SOM-01'], 'motif quelconque', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: l''espèce « annulation » a été ACCEPTÉE — le CHECK est tombé.';
  END IF;

  -- ── 4. Le motif est la décision : vide et blanc sont refusés ─────────────
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_vide', 'PAT_CONTRAT_ECART', 'pack:pack_socle_initial_neuronutrition',
            'ecartement', ARRAY['R-SOM-01'], '', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: un motif VIDE a été accepté.';
  END IF;

  -- Le blanc aussi : sans `btrim`, un espace suffirait à contourner le CHECK et
  -- à produire exactement l'écartement sans motif que la table refuse.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_blanc', 'PAT_CONTRAT_ECART', 'pack:pack_socle_initial_neuronutrition',
            'ecartement', ARRAY['R-SOM-01'], '   ', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: un motif fait d''ESPACES a été accepté — le CHECK ne mord pas sur le blanc.';
  END IF;

  -- ── 5. Un écartement SANS RÈGLES est refusé ──────────────────────────────
  -- LE CAS LE PLUS IMPORTANT DE CE FICHIER. Sans règles figées, la proposition
  -- ne se réveille JAMAIS sur un motif neuf : l'écartement par cible ferait
  -- alors taire un axe qui n'a rien demandé, et rien ne le signalerait.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_sansregle', 'PAT_CONTRAT_ECART', 'pack:pack_socle_initial_neuronutrition',
            'ecartement', ARRAY[]::text[], 'motif quelconque', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: un écartement SANS RÈGLES a été accepté — il ne se réveillerait jamais sur un motif neuf, et la garde de DC-30 tombe en silence.';
  END IF;

  -- ── 6. Une reprise AVEC règles est refusée, symétriquement ───────────────
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email, supersedes_ecartement_id)
    VALUES ('ec_repregl', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'reprise',
            ARRAY['R2-STR-02'], 'je reprends', 'praticien@wellneuro.fr', 'ec_001');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: une REPRISE portant des règles a été acceptée.';
  END IF;

  -- ── 7. La racine est unique, mais la reprise qui chaîne est acceptée ─────
  -- LES DEUX CAS VONT ENSEMBLE : c'est leur conjonction qui prouve que l'index
  -- est PARTIEL. Un index total sur (patient, cible) passerait le refus
  -- ci-dessous et ferait échouer l'acceptation qui suit.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_002', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'ecartement',
            ARRAY['R-SOM-01'], 'un second fil sur la même cible', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: une seconde RACINE sur la même cible a été acceptée — deux fils concurrents, et la lecture devrait élire.';
  END IF;

  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email, supersedes_ecartement_id)
    VALUES ('ec_rep1', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'reprise',
            ARRAY[]::text[], 'Le PSS-10 s''est dégradé, je rouvre l''exploration.',
            'praticien@wellneuro.fr', 'ec_001');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'ÉCARTEMENT: une REPRISE chaînée a été refusée (%) — l''index de racine n''est pas partiel, et la reprise est impossible.', SQLERRM;
  END;

  -- Et un troisième geste sur le même fil : écarter de nouveau après reprise.
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email, supersedes_ecartement_id)
    VALUES ('ec_003', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'ecartement',
            ARRAY['R-SOM-01'], 'Finalement non : le sommeil est traité ailleurs.',
            'praticien@wellneuro.fr', 'ec_rep1');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'ÉCARTEMENT: un troisième geste sur le même fil a été refusé (%)', SQLERRM;
  END;

  SELECT count(*) INTO nb FROM orientation_ecartements
  WHERE id_patient = 'PAT_CONTRAT_ECART' AND cible_id = 'questionnaire:Q_STR_03';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'ÉCARTEMENT: 3 lignes attendues sur le fil, % relue(s)', nb;
  END IF;

  -- ── 8. Le fil est LINÉAIRE — deux gestes sur la même ligne sont refusés ──
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email, supersedes_ecartement_id)
    VALUES ('ec_fourche', 'PAT_CONTRAT_ECART', 'questionnaire:Q_STR_03', 'reprise',
            ARRAY[]::text[], 'une fourche', 'praticien@wellneuro.fr', 'ec_rep1');
  EXCEPTION
    WHEN unique_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: une FOURCHE a été acceptée — deux praticiens croiraient chacun avoir tranché.';
  END IF;

  -- ── 10. UNE LIGNE NE SE SUPPLANTE PAS ELLE-MÊME ──────────────────────────
  -- LE CAS QUI MANQUAIT, et sans lui l'index de racine ne gardait rien : une
  -- ligne au `supersedes` non nul est HORS de l'index partiel, donc le créneau
  -- racine de sa cible reste libre pour une seconde ligne. Deux fils, et un
  -- geste praticien que rien n'atteint.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email, supersedes_ecartement_id)
    VALUES ('ec_reflex', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY['R-SOM-01'], 'je me supplante moi-même', 'praticien@wellneuro.fr', 'ec_reflex');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: une ligne qui SE SUPPLANTE ELLE-MÊME a été acceptée — elle sort de l''index partiel, libère le créneau racine, et la cible porte deux fils.';
  END IF;

  -- ── 11. UN MOTIF RÉDUIT À DES TABULATIONS EST REFUSÉ ─────────────────────
  -- SECOND CAS MANQUANT. `btrim/1` ne retire que l'espace ASCII : le cas 4
  -- ci-dessus, qui n'essayait que des espaces, laissait passer `E'\t'`.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_tab', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY['R-SOM-01'], E'\t\n\r ', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: un motif fait de TABULATIONS a été accepté — `btrim` a perdu sa liste de caractères.';
  END IF;

  -- ── 12. LA BORNE HAUTE DU MOTIF MORD, et l'auteur est exigé ──────────────
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_long', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY['R-SOM-01'], repeat('x', 2001), 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: un motif de 2001 caractères a été accepté.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_sansmail', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY['R-SOM-01'], 'un motif valide', E'\t ');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: un écartement SANS AUTEUR lisible a été accepté — il n''est pas attribuable.';
  END IF;

  -- ── 13. NI ÉLÉMENT NUL, NI CHAÎNE VIDE DANS LA LISTE DE RÈGLES ───────────
  -- `array_length(ARRAY[NULL]::text[], 1)` vaut 1 : la garde du cas 5 était
  -- satisfaite par une liste ne contenant AUCUNE règle réelle. Un lecteur SQL
  -- écrivant `NOT (regle = ANY(...))` obtient alors NULL, la ligne est filtrée,
  -- et l'écartement ne se réveille jamais.
  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_regnull', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY[NULL]::text[], 'un motif valide', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: une règle NULLE a été acceptée dans la liste — l''écartement ne se réveillerait jamais.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_regvide', 'PAT_CONTRAT_ECART', 'pack:pack_sommeil_chronobiologie', 'ecartement',
            ARRAY[''], 'un motif valide', 'praticien@wellneuro.fr');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'ÉCARTEMENT: une règle VIDE a été acceptée dans la liste.';
  END IF;

  -- ── 14. L'ESPÈCE FERMÉE, ASSERTIONNÉE AU CATALOGUE ───────────────────────
  -- Elle est INÉPROUVABLE par INSERT : le CHECK `regles_par_espece` refuse déjà
  -- toute espèce inconnue, quelles que soient les règles fournies. Le cas 3
  -- resterait donc vert si ce CHECK-ci disparaissait. On lit sa DÉFINITION.
  SELECT count(*) INTO nb
  FROM pg_constraint
  WHERE conname = 'orientation_ecartements_espece_check'
    AND conrelid = 'public.orientation_ecartements'::regclass
    AND pg_get_constraintdef(oid) LIKE '%ecartement%'
    AND pg_get_constraintdef(oid) LIKE '%reprise%';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: le CHECK d''espèce est absent ou ne nomme plus ses deux valeurs — et aucun INSERT ne peut le prouver.';
  END IF;

  -- ── 15. CAS POSITIF SUR UNE CIBLE `pack:` ────────────────────────────────
  -- Les autres cas `pack:` de ce fichier sont tous attendus en ÉCHEC : si le jeu
  -- de caractères du regex était faux pour les vrais identifiants de pack, le
  -- contrat resterait vert. Celui-ci le prouve dans l'autre sens, sur un id réel
  -- du registre (`snake_case`).
  BEGIN
    INSERT INTO orientation_ecartements
      (id, id_patient, cible_id, espece, regles_au_geste, motif, par_email)
    VALUES ('ec_pack_ok', 'PAT_CONTRAT_ECART', 'pack:pack_socle_initial_neuronutrition',
            'ecartement', ARRAY['R2-SOM-01'], 'Le socle est déjà servi par ailleurs.',
            'praticien@wellneuro.fr');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'ÉCARTEMENT: une cible `pack:` VALIDE a été refusée (%) — le regex ne couvre pas les identifiants réels du registre.', SQLERRM;
  END;

  -- ── 16. LISTE BLANCHE DE COLONNES ────────────────────────────────────────
  -- Promesse reprise du contrat de [[D-127]] : une colonne arrivée sans arbitrage
  -- ne se verrait pas autrement. ORDRE ALPHABÉTIQUE OBLIGATOIRE.
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'orientation_ecartements';
  IF reelles IS DISTINCT FROM COLS_ECARTEMENT THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: colonnes inattendues (%). Attendu exactement % — toute colonne neuve doit être arbitrée.',
      reelles, COLS_ECARTEMENT;
  END IF;

  -- ── 9. FK en ON DELETE RESTRICT, et RLS deny-all ─────────────────────────
  -- `confdeltype = 'r'`, invisible du drift check.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'orientation_ecartements'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ÉCARTEMENT: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s])', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'orientation_ecartements' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ÉCARTEMENT: RLS désactivée sur orientation_ecartements';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orientation_ecartements'
  ) THEN
    RAISE EXCEPTION 'ÉCARTEMENT: policy inattendue (deny-all attendu)';
  END IF;

  -- L'index de racine est bien PARTIEL, vérifié sur sa DÉFINITION et pas
  -- seulement par son comportement : les deux cas du point 7 le prouvent
  -- ensemble, celui-ci le dit en une ligne au relecteur.
  SELECT count(*) INTO nb
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'orientation_ecartements'
    AND indexname = 'orientation_ecartement_racine_unique'
    AND indexdef LIKE '%WHERE (supersedes_ecartement_id IS NULL)%';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'ÉCARTEMENT: l''index de racine n''est pas PARTIEL — un index total interdirait toute reprise.';
  END IF;

  RAISE NOTICE 'ÉCARTEMENT (16 cas): écartement valide accepté et relu ; auto-supplantation refusée ; motif en tabulations refusé ; motif de 2001 caractères refusé ; auteur illisible refusé ; règle nulle et règle vide refusées ; espèce fermée assertionnée au catalogue ; cible pack réelle acceptée ; liste blanche de 10 colonnes ; cible non préfixée et préfixe inconnu refusés (23514) ; espèce hors liste refusée ; motif vide et blanc refusés ; écartement SANS RÈGLES refusé ; reprise AVEC règles refusée ; seconde racine refusée (23505) mais reprise et troisième geste acceptés ; fourche refusée ; FK RESTRICT ; RLS deny-all ; index de racine PARTIEL.';
END $$;

ROLLBACK;
