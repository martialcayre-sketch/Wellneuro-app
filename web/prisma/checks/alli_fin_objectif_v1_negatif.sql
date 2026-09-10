-- Contrat de la table des fins de chaîne d'objectif (Alliance 6.0-B, `D-161`).
-- Même architecture que les contrats de 6.0-A et des LOT-01/LOT-05, dont il est
-- le pendant : ce qui a été prouvé là-bas ne se re-prouve pas ici, ce qui est
-- NEUF est prouvé ici.
--
-- La table promet neuf choses, et ce fichier les éprouve TOUTES :
--   1. les écritures valides sont ACCEPTÉES — les trois motifs, les deux formes
--      de seconde voix, un refus, et deux fins sur la même racine. Sans ces cas
--      positifs, un CHECK devenu trop serré passerait vert et la route
--      casserait en production ;
--   2. les CHECK mordent (23514) — SEIZE cas pour DIX contraintes ;
--   3. UN PATIENT NE CONSIGNE JAMAIS LA VOIX DU PRATICIEN, nommément. C'est la
--      garde la plus propre à ce lot : l'asymétrie inverse est LÉGITIME et
--      porte un nom — le praticien qui atteste ce que le patient a dit en
--      consultation est un TÉMOIGNAGE, distinct de la PREUVE qu'est le geste
--      posé au portail (`D-161` §2). Les deux cas doivent donc être éprouvés
--      ENSEMBLE : l'un passe, l'autre est refusé, et rien d'autre ne le dit ;
--   4. SEUL `atteint` SE NÉGOCIE. Une réussite ne se constate pas seul ; le
--      renoncement et le remplacement, eux, sont unilatéraux. Un `confirme` sur
--      un `abandonne` n'a pas de sens et doit être refusé pour lui-même ;
--   5. `abandonne` PORTE SON MOTIF ÉCRIT — renoncer sans dire pourquoi
--      laisserait une chaîne close sans raison lisible. Le cas des blancs
--      NON-ESPACE est éprouvé : `btrim/1` ne retire QUE l'espace ASCII ;
--   6. `remplace` PORTE LA RACINE QUI PREND LA SUITE, et une chaîne ne peut pas
--      se remplacer elle-même. C'est ce motif qui départage deux têtes : sans
--      sa cible, on saurait qu'une chaîne s'arrête sans savoir au profit de
--      quoi ;
--   7. la table porte EXACTEMENT ses colonnes, LISTE BLANCHE — l'arme de
--      l'interdit « aucun score, seuil, bande, rang ni taux d'atteinte »
--      (`DC-19`/`DC-20`). Un motif `score|seuil|rang` ne verrait pas passer un
--      `progression`, un `atteinte` ou un `avancement`, chemins les moins
--      coûteux pour ranger une mesure de réussite. Toute colonne future doit
--      modifier CE contrat ;
--   8. les DIX CHECK existent NOMMÉMENT et les QUATRE taxonomies portent
--      EXACTEMENT leurs valeurs — un CHECK ÉLARGI laisserait tous les cas
--      négatifs verts sans qu'aucun ne bouge, puisqu'ils testent des valeurs
--      REFUSÉES et non la liste admise ;
--   9. aucune unicité, FK RESTRICT, RLS deny-all.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT AU MODULE. Que le
-- TÉMOIGNAGE CÈDE À LA PREUVE est une règle de LECTURE : la base ne connaît pas
-- l'ordre des paroles ni laquelle l'emporte. Que la racine visée SOIT une
-- racine (`supersedes_objectif_id IS NULL`), qu'elle appartienne au dossier, et
-- qu'une fin `atteint` ne soit acquise qu'à DEUX VOIX relèvent de la route :
-- les références sont SOUPLES, sans FK, patron de toute la campagne. Un CHECK
-- ne doit pas devenir un second schéma qui divergerait du premier.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  reelles text[];
  cible text;
  definition text;
  litteraux text[];
  attendus text[];

  COLS_FINS CONSTANT text[] := ARRAY[
    'consignee_par', 'cree_le', 'exprime_le', 'id', 'id_patient', 'motif',
    'motif_texte', 'praticien_email', 'racine_objectif_id',
    'remplace_par_racine_id', 'sens', 'voix'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Toutes visent
  -- le patient de fixture (la FK existe) : le CHECK est alors le SEUL motif de
  -- rejet possible. Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le
  -- cas le dit.
  cas CONSTANT text[][] := ARRAY[
    ['fin — motif inconnu (hors des trois arrêtés par D-161)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f01', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'suspendu', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr')$q$],
    ['fin — voix inconnue',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f02', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'machine', 'praticien', 'declare', 'praticien@wellneuro.fr')$q$],
    ['fin — consignataire inconnu',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f03', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'systeme', 'declare', 'praticien@wellneuro.fr')$q$],
    ['fin — sens inconnu',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f04', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'praticien', 'annule', 'praticien@wellneuro.fr')$q$],
    ['fin — UN PATIENT CONSIGNE LA VOIX DU PRATICIEN (l''asymétrie interdite)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens)
        VALUES ('f05', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'patient', 'declare')$q$],
    ['fin — e-mail praticien sur une ligne consignée au portail',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f06', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'patient', 'patient', 'confirme', 'praticien@wellneuro.fr')$q$],
    ['fin — e-mail praticien absent sur une ligne consignée au cockpit',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens)
        VALUES ('f07', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'praticien', 'declare')$q$],
    ['fin — un ABANDON se CONFIRME (or seul `atteint` se négocie)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, motif_texte)
        VALUES ('f08', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'abandonne', 'praticien', 'praticien', 'confirme', 'praticien@wellneuro.fr', 'La situation a changé')$q$],
    ['fin — un REMPLACEMENT se REFUSE (même motif)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, remplace_par_racine_id)
        VALUES ('f09', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'remplace', 'praticien', 'praticien', 'refuse', 'praticien@wellneuro.fr', 'obj_contrat_f2')$q$],
    ['fin — abandon SANS motif écrit (une chaîne close sans raison lisible)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f10', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'abandonne', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr')$q$],
    ['fin — abandon dont le motif est fait de blancs NON-ESPACE (tabulation, retour ligne)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, motif_texte)
        VALUES ('f11', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'abandonne', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr', E'\t\n\r ')$q$],
    ['fin — abandon porté par la voix du PATIENT (le renoncement est un geste du praticien)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, motif_texte)
        VALUES ('f12', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'abandonne', 'patient', 'praticien', 'declare', 'praticien@wellneuro.fr', 'Je ne veux plus de cet objectif')$q$],
    ['fin — remplacement SANS la racine qui prend la suite',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email)
        VALUES ('f13', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'remplace', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr')$q$],
    ['fin — une chaîne qui se remplace ELLE-MÊME',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, remplace_par_racine_id)
        VALUES ('f14', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'remplace', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr', 'obj_contrat_f1')$q$],
    ['fin — `atteint` porteur d''un motif écrit (une ligne qui dirait deux fins)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, motif_texte)
        VALUES ('f15', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr', 'Objectif rempli')$q$],
    ['fin — `atteint` porteur d''une racine de remplacement (même motif)',
     $q$INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, remplace_par_racine_id)
        VALUES ('f16', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint', 'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr', 'obj_contrat_f2')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_alli_f', 'PAT_CONTRAT_ALLI_F', 'jennifer.martin@example.test',
          'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- DEUX racines de fixture : les références sont souples, mais un
  -- remplacement a besoin d'une cible réaliste pour que le cas se lise.
  INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
  VALUES ('obj_contrat_f1', 'PAT_CONTRAT_ALLI_F', 'praticien@wellneuro.fr',
          'Dormir sans me réveiller à trois heures'),
         ('obj_contrat_f2', 'PAT_CONTRAT_ALLI_F', 'praticien@wellneuro.fr',
          'Tenir la matinée sans grignoter');

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  -- Les INSERT OMETTENT `cree_le` À DESSEIN : c'est ce qui prouve que le
  -- DEFAULT de la base le pose.
  BEGIN
    -- `atteint` DÉCLARÉ par le praticien : une fin PROPOSÉE, pas une chaîne
    -- achevée — la seconde voix n'a pas encore parlé.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, exprime_le)
    VALUES ('fin_contrat_1', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint',
            'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr',
            TIMESTAMP '2026-09-10 09:00:00');

    -- LA PREUVE : le patient confirme lui-même, au portail. Pas d'e-mail
    -- praticien sur cette ligne — ce n'est pas lui qui écrit.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens)
    VALUES ('fin_contrat_2', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint',
            'patient', 'patient', 'confirme');

    -- LE TÉMOIGNAGE : le praticien atteste ce que le patient a dit en
    -- consultation. Même parole, autre consignataire — et c'est exactement ce
    -- que les deux colonnes existent pour distinguer.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, exprime_le)
    VALUES ('fin_contrat_3', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint',
            'patient', 'praticien', 'confirme', 'praticien@wellneuro.fr',
            TIMESTAMP '2026-09-08 15:30:00');

    -- UN REFUS EST UNE LIGNE COMME UNE AUTRE : il reste lisible, il ne s'efface
    -- pas, et il n'est pas une panne du mécanisme.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens)
    VALUES ('fin_contrat_4', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint',
            'patient', 'patient', 'refuse');

    -- `abandonne` : unilatéral, voix du praticien, motif écrit.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, motif_texte)
    VALUES ('fin_contrat_5', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f2', 'abandonne',
            'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr',
            'La grossesse déclarée en juillet déplace la priorité.');

    -- `remplace` : le motif qui DÉPARTAGE deux têtes concurrentes.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens, praticien_email, remplace_par_racine_id)
    VALUES ('fin_contrat_6', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f2', 'remplace',
            'praticien', 'praticien', 'declare', 'praticien@wellneuro.fr',
            'obj_contrat_f1');

    -- Se raviser est une NOUVELLE ligne, sur la MÊME racine — c'est le cas qui
    -- prouve l'absence d'UNIQUE, et il est ici plutôt que dans un contrôle
    -- structurel parce qu'une contrainte d'unicité se manifeste par un rejet,
    -- pas par une absence lisible. Une chaîne close se rouvre ainsi.
    INSERT INTO fins_objectif (id, id_patient, racine_objectif_id, motif, voix, consignee_par, sens)
    VALUES ('fin_contrat_7', 'PAT_CONTRAT_ALLI_F', 'obj_contrat_f1', 'atteint',
            'patient', 'patient', 'refuse');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'FIN OBJECTIF: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, ou une UNIQUE interdit de se raviser ; la route casserait en production.',
        SQLSTATE;
  END;

  -- ── 2. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'FIN OBJECTIF test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'FIN OBJECTIF test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Liste blanche de colonnes — l'interdit score/atteinte opposable ───
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO reelles
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fins_objectif';

  IF reelles IS DISTINCT FROM COLS_FINS THEN
    RAISE EXCEPTION
      'FIN OBJECTIF: colonnes inattendues sur fins_objectif (%). Attendu exactement % — une colonne neuve doit être arbitrée : l''interdit « aucun score, seuil, bande, rang ni taux d''atteinte » (DC-19/DC-20) en dépend, et « atteint » ne dit RIEN d''une cause (DC-27).',
      reelles, COLS_FINS;
  END IF;

  -- ── 4. Colonnes porteuses NOT NULL, colonnes de motif NULLABLES ──────────
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'fins_objectif'
    AND c.is_nullable = 'NO'
    AND c.column_name IN ('id_patient', 'racine_objectif_id', 'motif', 'voix',
                          'consignee_par', 'sens', 'cree_le');
  IF nb <> 7 THEN
    RAISE EXCEPTION 'FIN OBJECTIF: % colonne(s) porteuse(s) NOT NULL sur 7 attendues', nb;
  END IF;

  -- Les trois colonnes conditionnelles restent NULLABLES et SANS DEFAULT : un
  -- DEFAULT sur `motif_texte` fabriquerait une raison que nul n'a donnée, un
  -- DEFAULT sur `praticien_email` attribuerait une ligne du portail à un
  -- praticien, et un DEFAULT sur `exprime_le` antidaterait une parole.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'fins_objectif'
    AND c.is_nullable = 'YES' AND c.column_default IS NULL
    AND c.column_name IN ('motif_texte', 'praticien_email',
                          'remplace_par_racine_id', 'exprime_le');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'FIN OBJECTIF: % colonne(s) conditionnelle(s) nullable(s) sans DEFAULT sur 4 attendues', nb;
  END IF;

  -- ── 5. La FK vers patients est en ON DELETE RESTRICT ─────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'fins_objectif'
    AND ref.relname = 'patients'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION
      'FIN OBJECTIF: FK vers patients absente ou hors ON DELETE RESTRICT (% trouvée[s]) — en CASCADE, la suppression nommée d''effacement.ts deviendrait du code mort.', nb;
  END IF;

  -- ── 5bis. Les DIX CHECK existent, NOMMÉMENT ────────────────────────────
  FOREACH cible IN ARRAY ARRAY[
    'fins_objectif_motif_check',
    'fins_objectif_voix_check',
    'fins_objectif_consignee_par_check',
    'fins_objectif_sens_check',
    'fins_objectif_consignation_check',
    'fins_objectif_praticien_email_check',
    'fins_objectif_negociation_check',
    'fins_objectif_abandon_check',
    'fins_objectif_remplacement_check',
    'fins_objectif_atteint_check'
  ] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    WHERE con.contype = 'c' AND con.conname = cible;
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'FIN OBJECTIF: le CHECK % est absent (% trouvé[s]).', cible, nb;
    END IF;
  END LOOP;

  -- Les QUATRE taxonomies portent EXACTEMENT leurs valeurs. On lit la
  -- DÉFINITION de la contrainte, seul moyen de refuser un ÉLARGISSEMENT :
  -- ajouter `suspendu` aux motifs, ou `machine` aux voix, laisserait tous les
  -- cas négatifs verts sans qu'aucun ne bouge — ils testent des valeurs
  -- REFUSÉES, pas la liste admise.
  FOR i IN 1 .. 4 LOOP
    cible := (ARRAY['fins_objectif_motif_check', 'fins_objectif_voix_check',
                    'fins_objectif_consignee_par_check', 'fins_objectif_sens_check'])[i];
    -- Un CASE et non un tableau de tableaux : Postgres exige des dimensions
    -- concordantes, et ces quatre taxonomies n'ont pas le même cardinal.
    attendus := CASE i
      WHEN 1 THEN ARRAY['abandonne', 'atteint', 'remplace']
      WHEN 2 THEN ARRAY['patient', 'praticien']
      WHEN 3 THEN ARRAY['patient', 'praticien']
      ELSE ARRAY['confirme', 'declare', 'refuse']
    END;

    SELECT pg_get_constraintdef(con.oid) INTO definition
    FROM pg_constraint con
    WHERE con.contype = 'c' AND con.conname = cible;

    SELECT array_agg(DISTINCT m[1] ORDER BY m[1]) INTO litteraux
    FROM regexp_matches(definition, '''([A-Za-z0-9_]+)''', 'g') AS m;

    IF litteraux IS DISTINCT FROM attendus THEN
      RAISE EXCEPTION
        'FIN OBJECTIF: la taxonomie de % ne porte plus EXACTEMENT % mais % — trois motifs et trois seulement (D-161), et toute extension est une décision D-xxx neuve. Définition : %',
        cible, attendus, litteraux, definition;
    END IF;
  END LOOP;

  -- ── 5ter. AUCUNE contrainte d'unicité ────────────────────────────────────
  -- Poser une fin deux fois fait DEUX lignes. Un UNIQUE transformerait un
  -- second geste en erreur technique, ou pousserait à l'upsert — c'est-à-dire à
  -- écraser une parole. Se rouvrir est une ligne de plus, comme se raviser.
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  WHERE enfant.relname = 'fins_objectif'
    AND con.contype IN ('u', 'x');
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'FIN OBJECTIF: % contrainte(s) d''unicité sur fins_objectif — se rouvrir doit rester une ligne de plus, jamais un écrasement.', nb;
  END IF;

  SELECT count(*) INTO nb
  FROM pg_index i
  JOIN pg_class enfant ON enfant.oid = i.indrelid
  WHERE enfant.relname = 'fins_objectif' AND i.indisunique AND NOT i.indisprimary;
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'FIN OBJECTIF: % index unique(s) hors clé primaire sur fins_objectif — même motif.', nb;
  END IF;

  -- ── 6. Deny-all RLS (posture D-005) ──────────────────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la retirer
  -- sans qu'un seul test ne parle.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'fins_objectif' AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FIN OBJECTIF: RLS désactivée sur fins_objectif';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fins_objectif'
  ) THEN
    RAISE EXCEPTION 'FIN OBJECTIF: policy inattendue sur fins_objectif (deny-all attendu)';
  END IF;

  RAISE NOTICE 'FIN OBJECTIF: 7 écritures valides acceptées (trois motifs, preuve ET témoignage, un refus, deux fins sur la même racine), % cas négatifs rejetés sur 10 CHECK (dont l''asymétrie de consignation et le remplacement de soi, nommément), liste blanche exacte, 7 NOT NULL, 4 conditionnelles nullables sans default, 10 CHECK assertés par leur nom, 4 taxonomies exactes, aucune unicité, FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
