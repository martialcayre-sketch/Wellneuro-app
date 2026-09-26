-- Contrat du catalogue des fiches d'assiette ([[D-251]], lot 3, migration M1).
--
-- Les deux tables promettent DOUZE choses, et ce fichier les éprouve TOUTES :
--   1. une version et un acte valides s'écrivent et se relisent ;
--   2. les instants sont posés par la BASE, pas par l'appelant ;
--   3. le numéro de version SUIT le dernier de sa fiche : un saut est refusé,
--      un doublon aussi (23505) ;
--   4. les formats sont fermés : source, assiette, empreintes (23514) ;
--   5. un texte source ou un modèle VIDE est refusé — « vide » compris comme
--      « sans caractère visible » ;
--   6. l'acte est FERMÉ : ni « brouillon » ni « publiee » (23514) ;
--   7. VALIDER exige la déclaration de relecture intégrale ;
--   8. RETIRER exige un motif ;
--   9. un acte dont l'empreinte n'est PAS celle de sa version est refusé —
--      sans cela, on validerait un texte et on en servirait un autre ;
--  10. UPDATE, DELETE et TRUNCATE sont refusés sur les deux tables ;
--  11. la FK acte → version est en ON DELETE RESTRICT ;
--  12. la RLS deny-all est active et sans policy (posture `D-005`), et AUCUNE
--      colonne ne désigne un patient.
--
-- TEXTE SYNTHÉTIQUE SEULEMENT : aucune phrase d'une Fiche MY n'entre dans le
-- dépôt, qui est public ([[D-251]] §4).
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  refuse boolean;
  nb integer;
  instant timestamp;
  H1 CONSTANT text := repeat('a', 64);
  H2 CONSTANT text := repeat('b', 64);
BEGIN
  -- ── 1. Cas POSITIF — une version, puis un acte qui la valide ─────────────
  BEGIN
    INSERT INTO fiches_assiette_versions
      (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
       source_sha256, modele_redaction, modele_fidelite, version_consigne, cree_le)
    VALUES
      ('fav_contrat_1', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, '{"titre":"Synthétique"}'::jsonb, H1,
       'Texte source synthétique.', H2, 'modele-redaction', 'modele-fidelite', 'fiche-assiette-v1',
       TIMESTAMP '2000-01-01 00:00:00');
    INSERT INTO fiches_assiette_actes
      (id, id_version, acte, contenu_sha256, validateur, relecture_integrale, le)
    VALUES
      ('faa_contrat_1', 'fav_contrat_1', 'validee', H1, 'praticien@wellneuro.fr', true,
       TIMESTAMP '2000-01-01 00:00:00');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FICHES ASSIETTE: une version ou un acte valides ont été refusés (%)', SQLERRM;
  END;

  -- ── 2. Les instants sont posés par la base ──────────────────────────────
  SELECT cree_le INTO instant FROM fiches_assiette_versions WHERE id = 'fav_contrat_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: une version antidatée a gardé sa date (%) — le trigger ne pose plus l''instant.', instant;
  END IF;
  SELECT le INTO instant FROM fiches_assiette_actes WHERE id = 'faa_contrat_1';
  IF instant < TIMESTAMP '2020-01-01' THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: un acte antidaté a gardé sa date (%).', instant;
  END IF;

  -- ── 3. Le numéro suit le dernier de la fiche ─────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_versions
      (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
       source_sha256, modele_redaction, modele_fidelite, version_consigne)
    VALUES ('fav_saut', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 3, '{}'::jsonb, H1, 'Source.', H2, 'r', 'f', 'c');
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: une version n° 3 a été acceptée après la n° 1 — l''histoire d''une fiche a un trou.';
  END IF;

  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_versions
      (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
       source_sha256, modele_redaction, modele_fidelite, version_consigne)
    VALUES ('fav_doublon', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 1, '{}'::jsonb, H1, 'Source.', H2, 'r', 'f', 'c');
  EXCEPTION
    WHEN unique_violation OR raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: une seconde version n° 1 de la même fiche a été acceptée.';
  END IF;

  -- La n° 2 passe : le refus ci-dessus tient au numéro, pas à la fiche.
  BEGIN
    INSERT INTO fiches_assiette_versions
      (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
       source_sha256, modele_redaction, modele_fidelite, version_consigne)
    VALUES ('fav_contrat_2', 'WN-SRC-0300', 'ASSIETTE_PROTEINEE', 2, '{}'::jsonb, H2, 'Source.', H2, 'r', 'f', 'c');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FICHES ASSIETTE: la version n° 2 a été refusée (%)', SQLERRM;
  END;

  -- ── 4 et 5. Formats fermés, textes non vides ─────────────────────────────
  DECLARE
    cas text[][] := ARRAY[
      ARRAY['source', 'WN-SRC-300', 'ASSIETTE_PROTEINEE', H1, H2, 'Source.', 'r', '{}'],
      ARRAY['assiette', 'WN-SRC-0301', 'assiette_dopa', H1, H2, 'Source.', 'r', '{}'],
      ARRAY['empreinte contenu', 'WN-SRC-0301', 'ASSIETTE_DOPAMINERGIQUE', 'ABC', H2, 'Source.', 'r', '{}'],
      ARRAY['empreinte source', 'WN-SRC-0301', 'ASSIETTE_DOPAMINERGIQUE', H1, upper(H2), 'Source.', 'r', '{}'],
      ARRAY['texte source vide', 'WN-SRC-0301', 'ASSIETTE_DOPAMINERGIQUE', H1, H2, E'\t \n', 'r', '{}'],
      ARRAY['modèle vide', 'WN-SRC-0301', 'ASSIETTE_DOPAMINERGIQUE', H1, H2, 'Source.', '  ', '{}'],
      ARRAY['contenu non objet', 'WN-SRC-0301', 'ASSIETTE_DOPAMINERGIQUE', H1, H2, 'Source.', 'r', '[]']
    ];
    i integer;
  BEGIN
    FOR i IN 1 .. array_length(cas, 1) LOOP
      refuse := false;
      BEGIN
        INSERT INTO fiches_assiette_versions
          (id, source_id, plate_code, numero, contenu, contenu_sha256, texte_source,
           source_sha256, modele_redaction, modele_fidelite, version_consigne)
        VALUES ('fav_format_' || i, cas[i][2], cas[i][3], 1, cas[i][8]::jsonb, cas[i][4], cas[i][6],
                cas[i][5], cas[i][7], 'f', 'c');
      EXCEPTION
        WHEN check_violation THEN refuse := true;
      END;
      IF NOT refuse THEN
        RAISE EXCEPTION 'FICHES ASSIETTE: cas « % » ACCEPTÉ — le CHECK est tombé.', cas[i][1];
      END IF;
    END LOOP;
  END;

  -- ── 6. L'acte est fermé ──────────────────────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
    VALUES ('faa_publiee', 'fav_contrat_1', 'publiee', H1, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: l''acte « publiee » a été ACCEPTÉ — l''acte n''est plus fermé.';
  END IF;

  -- ── 7. Valider exige la relecture intégrale ──────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
    VALUES ('faa_non_relue', 'fav_contrat_1', 'validee', H1, 'praticien@wellneuro.fr', false);
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: une validation SANS déclaration de relecture intégrale a été acceptée.';
  END IF;

  -- ── 8. Retirer exige un motif, visible ───────────────────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale, motif)
    VALUES ('faa_retrait_muet', 'fav_contrat_1', 'retiree', H1, 'praticien@wellneuro.fr', false, E' \t');
  EXCEPTION
    WHEN check_violation THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: un retrait sans motif visible a été accepté — une fiche disparaîtrait en silence.';
  END IF;

  BEGIN
    INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale, motif)
    VALUES ('faa_retrait', 'fav_contrat_1', 'retiree', H1, 'praticien@wellneuro.fr', false, 'Motif synthétique.');
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'FICHES ASSIETTE: un retrait motivé a été refusé (%)', SQLERRM;
  END;

  -- ── 9. L'acte porte sur le texte EXACT de sa version ─────────────────────
  refuse := false;
  BEGIN
    INSERT INTO fiches_assiette_actes (id, id_version, acte, contenu_sha256, validateur, relecture_integrale)
    VALUES ('faa_autre_texte', 'fav_contrat_1', 'validee', H2, 'praticien@wellneuro.fr', true);
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: un acte portant l''empreinte d''un AUTRE texte a été accepté.';
  END IF;

  -- ── 10. Append-only ──────────────────────────────────────────────────────
  refuse := false;
  BEGIN
    UPDATE fiches_assiette_versions SET contenu = '{"titre":"Réécrit"}'::jsonb WHERE id = 'fav_contrat_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: une version a été RÉÉCRITE en place.'; END IF;

  refuse := false;
  BEGIN
    UPDATE fiches_assiette_actes SET acte = 'retiree', motif = 'x' WHERE id = 'faa_contrat_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: un acte a été RÉÉCRIT en place.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_assiette_actes WHERE id = 'faa_contrat_1';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: un acte a été SUPPRIMÉ.'; END IF;

  refuse := false;
  BEGIN
    DELETE FROM fiches_assiette_versions WHERE id = 'fav_contrat_2';
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: une version a été SUPPRIMÉE.'; END IF;

  refuse := false;
  BEGIN
    TRUNCATE fiches_assiette_actes;
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: TRUNCATE des actes accepté.'; END IF;

  refuse := false;
  BEGIN
    TRUNCATE fiches_assiette_versions CASCADE;
  EXCEPTION
    WHEN raise_exception THEN refuse := true;
  END;
  IF NOT refuse THEN RAISE EXCEPTION 'FICHES ASSIETTE: TRUNCATE des versions accepté.'; END IF;

  -- ── 11. FK acte → version en ON DELETE RESTRICT ──────────────────────────
  SELECT count(*) INTO nb
  FROM pg_constraint con
  JOIN pg_class enfant ON enfant.oid = con.conrelid
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND enfant.relname = 'fiches_assiette_actes'
    AND ref.relname = 'fiches_assiette_versions'
    AND con.confdeltype = 'r';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: FK acte → version absente ou hors ON DELETE RESTRICT (% trouvée[s]).', nb;
  END IF;

  -- ── 12. RLS deny-all, et aucune colonne patient ──────────────────────────
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('fiches_assiette_versions', 'fiches_assiette_actes')
    AND c.relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: RLS inactive sur % table(s) sur 2.', 2 - nb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('fiches_assiette_versions', 'fiches_assiette_actes')
  ) THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: policy inattendue (deny-all attendu).';
  END IF;

  SELECT count(*) INTO nb
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('fiches_assiette_versions', 'fiches_assiette_actes')
    AND (c.column_name LIKE '%patient%' OR c.column_name LIKE '%assignation%');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'FICHES ASSIETTE: % colonne(s) désignent un patient — le catalogue ne porte AUCUNE donnée patient.', nb;
  END IF;

  RAISE NOTICE 'FICHES ASSIETTE: version et acte valides acceptés, instants posés par la base, numéro contigu (saut et doublon refusés), 7 formats refusés, acte fermé, validation sans relecture refusée, retrait sans motif refusé, empreinte étrangère refusée, UPDATE/DELETE/TRUNCATE refusés sur les deux tables, FK RESTRICT, RLS deny-all, aucune colonne patient.';
END $$;

ROLLBACK;
