-- Contrat des panels documentés hors outil (LOT-06, D-071).
--
-- La table promet six choses, et ce fichier les éprouve TOUTES — pas seulement
-- celles qui se lisent par leur nom :
--   1. une déclaration valide est ACCEPTÉE (sans ce cas positif, un CHECK
--      devenu trop serré passerait vert et la route casserait en production) ;
--   2. un doublon (patient, panel) est REJETÉ en 23505 — l'unicité RÉELLE,
--      pas un index qui porte le bon nom ;
--   3. les deux CHECK sur l'auteur de la déclaration MORDENT (23514) ;
--   4. la table porte EXACTEMENT sept colonnes, liste blanche — un motif
--      (`valeur|resultat|…`) ne verrait pas passer un `commentaire` ou un
--      `payload` jsonb, qui est le chemin le moins coûteux pour ranger un
--      résultat d'analyse ;
--   5. les deux clés étrangères existent et sont en ON DELETE RESTRICT ;
--   6. la RLS deny-all est active et sans policy.
--
-- Comme `arbitrages_biologiques`, la table est VOLONTAIREMENT hors de
-- `tables_cb` du contrat structurel catalogue : elle porte `id_patient` par
-- construction (c'est un objet du dossier, effacé par la transaction IDP2), là
-- où le verrou HDS du catalogue interdit toute sémantique patient dans les
-- tables `biology_*`. Le verrou de CE fichier est l'inverse : aucune colonne
-- de VALEUR d'analyse ne doit exister ici — l'outil consigne qu'un bilan a eu
-- lieu et quand, jamais ce qu'il disait.
--
-- Tout se déroule dans une transaction annulée à la fin : les fixtures posées
-- ci-dessous ne survivent pas au fichier.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  accepte boolean;
  nb integer;
  colonnes text[];
  est_unique boolean;
  cible text;

  COLONNES_ATTENDUES CONSTANT text[] := ARRAY[
    'created_at', 'declare_le', 'declare_par', 'documente_le',
    'id', 'id_patient', 'panel_code'
  ];

  -- Chaque entrée : une insertion qui DOIT échouer sur un CHECK. Elle vise des
  -- clés étrangères qui EXISTENT (fixtures ci-dessous) et un panel distinct de
  -- celui du cas positif : le CHECK est alors le SEUL motif de rejet possible.
  -- Si le CHECK visé disparaît, l'insertion est ACCEPTÉE et le cas le dit —
  -- au lieu d'être masquée par une violation de clé étrangère.
  cas CONSTANT text[][] := ARRAY[
    ['auteur de déclaration vide',
     $q$INSERT INTO panels_biologie_documentes (id, id_patient, panel_code, documente_le, declare_par)
        VALUES ('t1', 'PAT_CONTRAT_DOC', 'PANEL_CONTRAT_B', TIMESTAMP '2026-08-01 00:00:00', '')$q$],
    ['auteur de déclaration réduit à des espaces',
     $q$INSERT INTO panels_biologie_documentes (id, id_patient, panel_code, documente_le, declare_par)
        VALUES ('t2', 'PAT_CONTRAT_DOC', 'PANEL_CONTRAT_B', TIMESTAMP '2026-08-01 00:00:00', '   ')$q$],
    ['auteur de déclaration au-delà de 320 caractères',
     $q$INSERT INTO panels_biologie_documentes (id, id_patient, panel_code, documente_le, declare_par)
        VALUES ('t3', 'PAT_CONTRAT_DOC', 'PANEL_CONTRAT_B', TIMESTAMP '2026-08-01 00:00:00', repeat('x', 321))$q$]
  ];
BEGIN
  -- ── 0. Fixtures — patient fictif autorisé et deux panels de contrat ──────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_doc', 'PAT_CONTRAT_DOC', 'michel.dogne@example.test',
          'Michel', 'Dogné', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  INSERT INTO biology_panels (id, code, libelle, niveau, updated_at)
  VALUES ('pan_contrat_a', 'PANEL_CONTRAT_A', 'Panel de contrat A', 'socle', CURRENT_TIMESTAMP),
         ('pan_contrat_b', 'PANEL_CONTRAT_B', 'Panel de contrat B', 'socle', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIF : une déclaration valide doit être ACCEPTÉE ───────────
  BEGIN
    INSERT INTO panels_biologie_documentes (id, id_patient, panel_code, documente_le, declare_par)
    VALUES ('ok1', 'PAT_CONTRAT_DOC', 'PANEL_CONTRAT_A', TIMESTAMP '2026-08-01 00:00:00',
            'praticien@wellneuro.fr');
    accepte := true;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'PANELS DOCUMENTÉS: une déclaration VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée, la route échouerait en production.',
        SQLSTATE;
  END;

  -- ── 2. L'unicité MORD pour de vrai : même patient, même panel ────────────
  refuse := false;
  BEGIN
    INSERT INTO panels_biologie_documentes (id, id_patient, panel_code, documente_le, declare_par)
    VALUES ('ok2', 'PAT_CONTRAT_DOC', 'PANEL_CONTRAT_A', TIMESTAMP '2026-08-10 00:00:00',
            'praticien@wellneuro.fr');
  EXCEPTION
    WHEN unique_violation THEN
      refuse := true;
    WHEN others THEN
      RAISE EXCEPTION
        'PANELS DOCUMENTÉS: doublon (patient, panel) rejeté pour le mauvais motif (SQLSTATE %, attendu 23505).',
        SQLSTATE;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION
      'PANELS DOCUMENTÉS: DEUX déclarations acceptées pour le même (patient, panel) — le statut du panel dépendrait de l''ordre de lecture.';
  END IF;

  -- ── 3. Les CHECK sur l'auteur de la déclaration mordent ──────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'PANELS DOCUMENTÉS test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514 check_violation) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;

    IF NOT refuse THEN
      RAISE EXCEPTION 'PANELS DOCUMENTÉS test négatif: « % » a été ACCEPTÉ alors qu''il doit être rejeté', cas[i][1];
    END IF;
  END LOOP;

  -- ── 4. Verrou « sans valeurs » : LISTE BLANCHE, pas un motif ─────────────
  -- Un motif (`valeur|resultat|mesure|…`) laisse passer `commentaire`, `note`,
  -- `taux`, `payload` jsonb — c'est-à-dire les rangements les moins coûteux
  -- pour un résultat d'analyse. La liste exacte fait de TOUTE colonne future
  -- un geste qui doit modifier ce contrat, quel que soit son nom.
  SELECT array_agg(c.column_name::text ORDER BY c.column_name) INTO colonnes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'panels_biologie_documentes';

  IF colonnes IS DISTINCT FROM COLONNES_ATTENDUES THEN
    RAISE EXCEPTION
      'PANELS DOCUMENTÉS: colonnes inattendues (%). Attendu exactement % — une colonne neuve doit être arbitrée, le verrou HDS sans valeurs en dépend.',
      colonnes, COLONNES_ATTENDUES;
  END IF;

  -- Les quatre colonnes porteuses ne sont pas nullables : un `documente_le`
  -- devenu NULL ferait passer le moteur par son repli « date illisible », qui
  -- conclut `deja_documente` et RETIRE le panel des propositions.
  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'panels_biologie_documentes'
    AND c.column_name IN ('id_patient', 'panel_code', 'documente_le', 'declare_par')
    AND c.is_nullable = 'NO';
  IF nb <> 4 THEN
    RAISE EXCEPTION 'PANELS DOCUMENTÉS: % colonne(s) porteuse(s) NOT NULL sur 4 attendues', nb;
  END IF;

  -- ── 5. L'index unique est UNIQUE, et sur les BONNES colonnes ─────────────
  -- Compter un index par son NOM ne garde rien : recréé non unique, ou sur
  -- (panel_code) seul, il porterait le même nom et le contrat resterait vert.
  SELECT i.indisunique,
         (SELECT array_agg(a.attname::text ORDER BY k.ord)
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
    INTO est_unique, colonnes
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class tc ON tc.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = tc.relnamespace
  WHERE n.nspname = 'public'
    AND tc.relname = 'panels_biologie_documentes'
    AND ic.relname = 'cb_panel_documente_unique';

  IF est_unique IS NULL THEN
    RAISE EXCEPTION 'PANELS DOCUMENTÉS: index « cb_panel_documente_unique » absent.';
  END IF;
  IF NOT est_unique THEN
    RAISE EXCEPTION 'PANELS DOCUMENTÉS: « cb_panel_documente_unique » existe mais N''EST PAS UNIQUE.';
  END IF;
  IF colonnes IS DISTINCT FROM ARRAY['id_patient', 'panel_code'] THEN
    RAISE EXCEPTION
      'PANELS DOCUMENTÉS: « cb_panel_documente_unique » porte % au lieu de {id_patient, panel_code} — l''unicité ou l''index de lecture du dossier est faux.',
      colonnes;
  END IF;

  -- ── 6. Les deux clés étrangères sont en ON DELETE RESTRICT ───────────────
  -- `confdeltype = 'r'`, invisible du drift check. Passée en CASCADE côté
  -- `patients`, la suppression nommée de `patient/effacement.ts` deviendrait
  -- du CODE MORT en silence. Passée en CASCADE côté `biology_panels`, retirer
  -- un panel du catalogue effacerait des déclarations patient — et le panel
  -- repasserait « jamais exploré », donc reproposé : exactement le défaut
  -- clinique que cette table existe pour fermer.
  FOREACH cible IN ARRAY ARRAY['patients', 'biology_panels'] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    JOIN pg_class enfant ON enfant.oid = con.conrelid
    JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE con.contype = 'f'
      AND enfant.relname = 'panels_biologie_documentes'
      AND ref.relname = cible
      AND con.confdeltype = 'r';
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'PANELS DOCUMENTÉS: clé étrangère vers % absente ou hors ON DELETE RESTRICT (% trouvée[s])', cible, nb;
    END IF;
  END LOOP;

  -- ── 7. Deny-all RLS (posture D-005) ──────────────────────────────────────
  -- Prisma ne l'introspecte pas : une migration ultérieure pourrait la retirer
  -- sans qu'un seul test ne parle. La table porte un lien NOMINATIF — quel
  -- dossier a fait explorer quel panel, quand, déclaré par qui.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'panels_biologie_documentes'
    AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'PANELS DOCUMENTÉS: RLS désactivée sur panels_biologie_documentes';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'panels_biologie_documentes'
  ) THEN
    RAISE EXCEPTION 'PANELS DOCUMENTÉS: policy inattendue (deny-all attendu)';
  END IF;

  RAISE NOTICE 'PANELS DOCUMENTÉS: déclaration valide acceptée, doublon rejeté, % CHECK rejetants, 7 colonnes exactes, unicité réelle, 2 FK RESTRICT, RLS deny-all.',
    array_length(cas, 1);
END $$;

ROLLBACK;
