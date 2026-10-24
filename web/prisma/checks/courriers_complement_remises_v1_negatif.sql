-- Contrat des remises de courrier complément au patient ([[D-345]] §4-§5,
-- J3-12h, lot 2).
--
-- La table promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. une remise valide s'écrit ; l'instant et l'`ordre` sont posés par la
--      BASE ; la forme d'élément AVEC ingrédient est admise ;
--   2. un clic rejoué ne remet rien (zéro ligne, sans erreur) ;
--   3. un courrier déjà remis ne se remet pas pour une autre liste ;
--   4. une approbation d'un AUTRE dossier, ou croisée (ce dossier, le
--      protocole d'un autre), est refusée ;
--   5. un protocole sans complément ciblé est refusé — multivitaminé seul,
--      nature absente, nature « ciblé » sur un autre type, sans actions ;
--   6. une liste qui n'est pas celle du protocole est refusée — élément
--      manquant, en trop, désordre, intitulé changé, ingrédient changé ou
--      omis, ingrédient ajouté à tort ;
--   7. une intention ciblée mal formée est refusée — identifiant hors format,
--      intitulé vide, référence catalogue sans ingrédient ;
--   8. le courrier d'un autre dossier, entrant, sans ancrage ou d'un autre
--      ancrage (adressage) est refusé ;
--   9. un texte qui n'est pas celui du courrier est refusé ;
--  10. une empreinte du texte ou de la liste qui n'est pas la sienne est
--      refusée (CHECK) ;
--  11. une liste nulle, vide, à élément nul ou à deux dimensions est refusée
--      par le CHECK lui-même (trigger d'insertion suspendu le temps du cas) ;
--  12. UPDATE et TRUNCATE sont refusés ; l'effacement nommé passe ;
--      approbation et courrier ne s'effacent pas avant leurs remises
--      (RESTRICT) ;
--  13. FK, CHECK et index annoncés présents ;
--  14. la table porte EXACTEMENT ses dix colonnes ;
--  15. RLS deny-all sans policy, fonctions non exécutables par PUBLIC, et
--      l'espèce de lecture `courrier_complement` admise (une inconnue
--      refusée, les anciennes toujours admises).
--
-- Chaque refus du trigger est reconnu à son MESSAGE. Identités de fixture
-- seulement ; tout se déroule dans une transaction annulée.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

CREATE FUNCTION pg_temp.refuse(cas text, requete text, code text, motif text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  recu_code text;
  recu_message text;
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS recu_code = RETURNED_SQLSTATE, recu_message = MESSAGE_TEXT;
    IF recu_code <> code OR position(motif IN recu_message) = 0 THEN
      RAISE EXCEPTION 'CONTRAT — % : refus inattendu (% / %), attendu (% / « % »)',
        cas, recu_code, recu_message, code, motif;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'CONTRAT — % : la requête est passée, elle devait être refusée.', cas;
END;
$$;

CREATE FUNCTION pg_temp.h(t text) RETURNS text LANGUAGE sql IMMUTABLE
AS $$ SELECT encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;

-- Un élément de la liste, tel que le lot 3 le calculera en TypeScript.
CREATE FUNCTION pg_temp.el(action_id text, titre text, ingredient text DEFAULT NULL) RETURNS text LANGUAGE sql IMMUTABLE
AS $$ SELECT action_id || ':' || pg_temp.h(titre) || CASE WHEN ingredient IS NULL THEN '' ELSE ':' || pg_temp.h(ingredient) END $$;

-- Une remise, en SQL : le texte est relu du courrier, les empreintes calculées
-- sur la liste FOURNIE, telle quelle (le trigger juge l'ordre et le contenu).
CREATE FUNCTION pg_temp.remettre(id_remise text, patient text, approbation text, courrier text, liste text[])
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  nb integer;
BEGIN
  INSERT INTO courriers_complement_remises
    (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
  SELECT id_remise, patient, approbation, c.id, c.texte, pg_temp.h(c.texte),
         liste, pg_temp.h(array_to_string(liste, E'\n'))
  FROM correspondances_medecin c WHERE c.id = courrier;
  GET DIAGNOSTICS nb = ROW_COUNT;
  RETURN nb;
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_ccr_a', 'PAT_CONTRAT_CCR_A', 'sophie.nicola+complement@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_ccr_b', 'PAT_CONTRAT_CCR_B', 'jennifer.martin+complement@example.test', 'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version) VALUES
  ('ccr_a_1', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, premier courrier.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_2', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, second courrier.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_3', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, troisième courrier.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_entrant', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'entrant', 'Dr Test', 'Réponse.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_adressage', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, adressage.', repeat('a', 64), 'safety-signals-nnpp2-v1'),
  ('ccr_b_1', 'PAT_CONTRAT_CCR_B', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, autre dossier.', repeat('c', 64), 'complement-cible-v1');
INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte) VALUES
  ('ccr_a_main', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Texte saisi à la main.');

DO $$
DECLARE
  H CONSTANT text := repeat('a', 64);
  -- Deux ciblés (l'un avec ingrédient), un multivitaminé, un aliment : la
  -- liste attendue ne porte que les deux ciblés.
  DEUX_CIBLES CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium", "natureComplement": "cible"},
    {"actionId": "action-1", "type": "supplement_exploration", "title": "Fer", "natureComplement": "cible",
     "supplementCatalogRef": {"ingredientId": "ing-fer", "ruleId": "r", "ruleVersion": 1, "justification": "j"}},
    {"actionId": "action-3", "type": "supplement_exploration", "title": "Multi", "natureComplement": "multivitamine_vente_libre"},
    {"actionId": "action-4", "type": "food", "title": "Assiette"}]}';
  UN_CIBLE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium", "natureComplement": "cible"}]}';
  MULTI_SEUL CONSTANT jsonb := '{"actions": [
    {"actionId": "action-3", "type": "supplement_exploration", "title": "Multi", "natureComplement": "multivitamine_vente_libre"}]}';
  SANS_NATURE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium"}]}';
  AUTRE_TYPE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-4", "type": "food", "title": "Assiette", "natureComplement": "cible"}]}';
  ID_HORS_FORMAT CONSTANT jsonb := '{"actions": [
    {"actionId": "action:2", "type": "supplement_exploration", "title": "Magnésium", "natureComplement": "cible"}]}';
  TITRE_VIDE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "  ", "natureComplement": "cible"}]}';
  REF_SANS_INGREDIENT CONSTANT jsonb := '{"actions": [
    {"actionId": "action-1", "type": "supplement_exploration", "title": "Fer", "natureComplement": "cible",
     "supplementCatalogRef": {"ruleId": "r", "ruleVersion": 1, "justification": "j"}}]}';
  LISTE text[];
  nb integer;
  ligne record;
  colonnes text[];
BEGIN
  LISTE := ARRAY[pg_temp.el('action-1', 'Fer', 'ing-fer'), pg_temp.el('action-2', 'Magnésium')];

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  SELECT c.id, c.patient, 'dc', H, H, H, 'prio', c.payload, H, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP
  FROM (VALUES
    ('pd_ccr_a', 'PAT_CONTRAT_CCR_A', DEUX_CIBLES),
    ('pd_ccr_a_un', 'PAT_CONTRAT_CCR_A', UN_CIBLE),
    ('pd_ccr_a_multi', 'PAT_CONTRAT_CCR_A', MULTI_SEUL),
    ('pd_ccr_a_sans_nature', 'PAT_CONTRAT_CCR_A', SANS_NATURE),
    ('pd_ccr_a_autre_type', 'PAT_CONTRAT_CCR_A', AUTRE_TYPE),
    ('pd_ccr_a_vide', 'PAT_CONTRAT_CCR_A', '{}'::jsonb),
    ('pd_ccr_a_id', 'PAT_CONTRAT_CCR_A', ID_HORS_FORMAT),
    ('pd_ccr_a_titre', 'PAT_CONTRAT_CCR_A', TITRE_VIDE),
    ('pd_ccr_a_ref', 'PAT_CONTRAT_CCR_A', REF_SANS_INGREDIENT),
    ('pd_ccr_b', 'PAT_CONTRAT_CCR_B', DEUX_CIBLES)
  ) AS c(id, patient, payload);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  SELECT c.id, c.patient, c.draft, H, H, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'
  FROM (VALUES
    ('pda_ccr_a1', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a'),
    ('pda_ccr_a2', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a'),
    ('pda_ccr_a3', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a'),
    ('pda_ccr_a_un', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_un'),
    ('pda_ccr_a_multi', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_multi'),
    ('pda_ccr_a_sans_nature', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_sans_nature'),
    ('pda_ccr_a_autre_type', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_autre_type'),
    ('pda_ccr_a_vide', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_vide'),
    ('pda_ccr_a_id', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_id'),
    ('pda_ccr_a_titre', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_titre'),
    ('pda_ccr_a_ref', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a_ref'),
    ('pda_ccr_b', 'PAT_CONTRAT_CCR_B', 'pd_ccr_b'),
    ('pda_ccr_croisee', 'PAT_CONTRAT_CCR_B', 'pd_ccr_a')
  ) AS c(id, patient, draft);

  -- ── 1. Une remise valide (forme avec ingrédient comprise) ────────────────
  INSERT INTO courriers_complement_remises
    (id, ordre, id_patient, id_approbation, id_correspondance, texte, texte_sha256,
     complements, complements_sha256, remise_le)
  SELECT 'rem_1', 999999, 'PAT_CONTRAT_CCR_A', 'pda_ccr_a1', c.id, c.texte, pg_temp.h(c.texte),
         LISTE, pg_temp.h(array_to_string(LISTE, E'\n')), TIMESTAMP '2000-01-01 00:00:00'
  FROM correspondances_medecin c WHERE c.id = 'ccr_a_1';
  SELECT * INTO ligne FROM courriers_complement_remises WHERE id = 'rem_1';
  IF ligne.texte <> 'Docteur, premier courrier.' OR ligne.complements <> LISTE THEN
    RAISE EXCEPTION 'CONTRAT — 1 : le texte ou la liste relus ne sont pas ceux remis.';
  END IF;
  IF ligne.ordre = 999999 OR ligne.remise_le = TIMESTAMP '2000-01-01 00:00:00'
     OR abs(extract(epoch FROM (ligne.remise_le - (now() AT TIME ZONE 'UTC')))) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''ordre ou l''instant (UTC) n''ont pas été posés par la base.';
  END IF;

  -- ── 2. Idempotence ───────────────────────────────────────────────────────
  nb := pg_temp.remettre('rem_rejoue', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_1', LISTE);
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : un clic rejoué a remis % ligne(s).', nb;
  END IF;

  -- ── 3. Un courrier, une liste ────────────────────────────────────────────
  PERFORM pg_temp.refuse('3 même courrier, autre liste',
    format($q$SELECT pg_temp.remettre('x3', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_un', 'ccr_a_1', %L::text[])$q$,
           ARRAY[pg_temp.el('action-2', 'Magnésium')]),
    'P0001', 'déjà remis pour une autre liste');

  -- ── 4. Approbation ───────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('4 approbation d''un autre dossier',
    format($q$SELECT pg_temp.remettre('x4a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_b', 'ccr_a_2', %L::text[])$q$, LISTE),
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('4 approbation croisée',
    format($q$SELECT pg_temp.remettre('x4b', 'PAT_CONTRAT_CCR_B', 'pda_ccr_croisee', 'ccr_b_1', %L::text[])$q$, LISTE),
    'P0001', 'ne porte pas sur ce dossier');

  -- ── 5. Protocole sans complément ciblé ───────────────────────────────────
  PERFORM pg_temp.refuse('5 multivitaminé seul',
    format($q$SELECT pg_temp.remettre('x5a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_multi', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-3', 'Multi')]),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('5 nature absente',
    format($q$SELECT pg_temp.remettre('x5b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_sans_nature', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-2', 'Magnésium')]),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('5 « ciblé » sur un autre type',
    format($q$SELECT pg_temp.remettre('x5c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_autre_type', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-4', 'Assiette')]),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('5 sans actions',
    format($q$SELECT pg_temp.remettre('x5d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_vide', 'ccr_a_2', %L::text[])$q$, LISTE),
    'P0001', 'ne porte aucun complément ciblé');

  -- ── 6. La liste du protocole, et elle seule ──────────────────────────────
  PERFORM pg_temp.refuse('6 élément manquant',
    format($q$SELECT pg_temp.remettre('x6a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-2', 'Magnésium')]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 élément en trop (le multivitaminé)',
    format($q$SELECT pg_temp.remettre('x6b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           LISTE || pg_temp.el('action-3', 'Multi')),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 désordre',
    format($q$SELECT pg_temp.remettre('x6c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[LISTE[2], LISTE[1]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 intitulé changé',
    format($q$SELECT pg_temp.remettre('x6d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[LISTE[1], pg_temp.el('action-2', 'Magnesium')]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 ingrédient changé',
    format($q$SELECT pg_temp.remettre('x6e', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-1', 'Fer', 'ing-autre'), LISTE[2]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 ingrédient omis',
    format($q$SELECT pg_temp.remettre('x6f', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-1', 'Fer'), LISTE[2]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('6 ingrédient ajouté à tort',
    format($q$SELECT pg_temp.remettre('x6g', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', %L::text[])$q$,
           ARRAY[LISTE[1], pg_temp.el('action-2', 'Magnésium', 'ing-mg')]),
    'P0001', 'n''est pas celle du protocole approuvé');

  -- ── 7. Intention ciblée mal formée ───────────────────────────────────────
  PERFORM pg_temp.refuse('7 identifiant hors format',
    format($q$SELECT pg_temp.remettre('x7a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_id', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action:2', 'Magnésium')]),
    'P0001', 'est mal formée');
  PERFORM pg_temp.refuse('7 intitulé vide',
    format($q$SELECT pg_temp.remettre('x7b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_titre', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-2', '  ')]),
    'P0001', 'est mal formée');
  PERFORM pg_temp.refuse('7 référence sans ingrédient',
    format($q$SELECT pg_temp.remettre('x7c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_ref', 'ccr_a_2', %L::text[])$q$,
           ARRAY[pg_temp.el('action-1', 'Fer')]),
    'P0001', 'est mal formée');

  -- ── 8. Courrier complément de ce dossier ─────────────────────────────────
  PERFORM pg_temp.refuse('8 courrier d''un autre dossier',
    format($q$SELECT pg_temp.remettre('x8a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_b_1', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('8 courrier entrant',
    format($q$SELECT pg_temp.remettre('x8b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_entrant', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('8 sans ancrage',
    format($q$SELECT pg_temp.remettre('x8c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_main', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('8 lettre d''adressage',
    format($q$SELECT pg_temp.remettre('x8d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_adressage', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');

  -- ── 9. Texte recopié ─────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('9 texte étranger',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x9', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Un autre texte.', pg_temp.h('Un autre texte.'),
               %L::text[], pg_temp.h(array_to_string(%L::text[], E'\n')))$q$, LISTE, LISTE),
    'P0001', 'n''est pas celui du courrier');

  -- ── 10. Empreintes ───────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('10 empreinte du texte fausse',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x10a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.', repeat('0', 64),
               %L::text[], pg_temp.h(array_to_string(%L::text[], E'\n')))$q$, LISTE, LISTE),
    '23514', 'courriers_complement_remises_texte_sha256');
  PERFORM pg_temp.refuse('10 empreinte de la liste fausse',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x10b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.',
               pg_temp.h('Docteur, second courrier.'), %L::text[], repeat('0', 64))$q$, LISTE),
    '23514', 'courriers_complement_remises_complements_sha256');

  -- ── 11. Le CHECK de la liste, trigger d'insertion suspendu ───────────────
  -- Le trigger refuserait d'abord ces listes (elles ne sont pas celles du
  -- protocole) : suspendu le temps du cas, c'est le CHECK seul qui répond.
  ALTER TABLE courriers_complement_remises DISABLE TRIGGER courriers_complement_remises_avant_insertion;
  PERFORM pg_temp.refuse('11 liste nulle',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.',
               pg_temp.h('Docteur, second courrier.'), NULL, pg_temp.h(''))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('11 liste vide',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.',
               pg_temp.h('Docteur, second courrier.'), '{}'::text[], pg_temp.h(''))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('11 élément nul',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.',
               pg_temp.h('Docteur, second courrier.'), ARRAY['a', NULL]::text[], pg_temp.h('a'))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('11 deux dimensions',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a3', 'ccr_a_2', 'Docteur, second courrier.',
               pg_temp.h('Docteur, second courrier.'), ARRAY[['a'], ['b']]::text[], pg_temp.h(E'a\nb'))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  ALTER TABLE courriers_complement_remises ENABLE TRIGGER courriers_complement_remises_avant_insertion;

  -- Un second courrier, pour une autre liste : il se remet.
  nb := pg_temp.remettre('rem_2', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_un', 'ccr_a_2', ARRAY[pg_temp.el('action-2', 'Magnésium')]);
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 1 : un courrier neuf pour une autre liste n''a pas été remis.';
  END IF;

  -- ── 12. Figée, effaçable, RESTRICT ───────────────────────────────────────
  PERFORM pg_temp.refuse('12 UPDATE',
    $q$UPDATE courriers_complement_remises SET texte = 'réécrit' WHERE id = 'rem_1'$q$,
    'P0001', 'une remise est figée');
  PERFORM pg_temp.refuse('12 TRUNCATE',
    $q$TRUNCATE courriers_complement_remises$q$,
    'P0001', 'une remise est figée');
  PERFORM pg_temp.refuse('12 approbation avant ses remises',
    $q$DELETE FROM protocol_diffusion_approvals WHERE id = 'pda_ccr_a1'$q$,
    '23503', 'courriers_complement_remises');
  PERFORM pg_temp.refuse('12 courrier avant sa remise',
    $q$DELETE FROM correspondances_medecin WHERE id = 'ccr_a_1'$q$,
    '23503', 'courriers_complement_remises');
  DELETE FROM courriers_complement_remises WHERE id_patient = 'PAT_CONTRAT_CCR_A';
  SELECT count(*) INTO nb FROM courriers_complement_remises WHERE id_patient = 'PAT_CONTRAT_CCR_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''effacement nommé a laissé % remise(s).', nb;
  END IF;

  -- ── 13. FK, CHECK, index ─────────────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_remises'::regclass AND contype = 'f' AND confdeltype = 'r';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clé(s) étrangère(s) RESTRICT sur 3.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_remises'::regclass AND contype = 'c'
    AND conname IN ('courriers_complement_remises_texte_non_vide', 'courriers_complement_remises_texte_sha256',
                    'courriers_complement_remises_complements_non_vide', 'courriers_complement_remises_complements_sha256');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % CHECK sur 4.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'courriers_complement_remises'
    AND indexname IN ('courriers_complement_remises_ordre_key', 'courriers_complement_remises_id_correspondance_key',
                      'courriers_complement_remises_patient_ordre_idx', 'courriers_complement_remises_approbation_idx');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % index sur 4.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_index
  WHERE indexrelid = 'public.courriers_complement_remises_id_correspondance_key'::regclass AND indisunique;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : l''index du courrier n''est pas unique.';
  END IF;

  -- ── 14. Liste blanche des colonnes ───────────────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'courriers_complement_remises';
  IF colonnes <> ARRAY['complements', 'complements_sha256', 'id', 'id_approbation', 'id_correspondance',
                       'id_patient', 'ordre', 'remise_le', 'texte', 'texte_sha256'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── 15. RLS, fonctions, espèce de lecture ────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.courriers_complement_remises'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'courriers_complement_remises';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('courriers_complement_remises_figee', 'courriers_complement_remises_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
  SELECT 'PAT_CONTRAT_CCR_B', e, 'objet'
  FROM unnest(ARRAY['bilan', 'synthese', 'fiche_assiette', 'lettre_adressage', 'protocole', 'courrier_complement']) AS e;
  PERFORM pg_temp.refuse('15 espèce inconnue',
    $q$INSERT INTO portail_lectures_patient (id_patient, espece, id_objet) VALUES ('PAT_CONTRAT_CCR_B', 'courrier', 'objet')$q$,
    '23514', 'portail_lectures_patient_espece_check');

  RAISE NOTICE 'Contrat courriers_complement_remises_v1 : quinze promesses tenues.';
END;
$$;

ROLLBACK;
