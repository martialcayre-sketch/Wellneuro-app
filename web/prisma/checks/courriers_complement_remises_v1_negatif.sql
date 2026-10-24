-- Contrat des listes et des remises de courrier complément ([[D-345]] §4-§5,
-- J3-12h, lot 2).
--
-- LA LISTE D'UN COURRIER, À SA CONSIGNATION — sept promesses :
--   L1. une liste valide s'écrit ; l'instant est posé par la BASE, en UTC ;
--   L2. le courrier d'un autre dossier, entrant, sans ancrage ou d'un autre
--       ancrage (adressage) est refusé ;
--   L3. un élément hors format, une liste désordonnée ou à doublon sont
--       refusés ;
--   L4. une liste nulle, vide, à élément nul, à deux dimensions, ou une
--       empreinte qui n'est pas la sienne sont refusées (CHECK) ;
--   L5. un courrier n'a qu'une liste (clé primaire) ;
--   L6. UPDATE et TRUNCATE refusés ; un courrier ne s'efface pas avant sa
--       liste (RESTRICT) ; l'effacement nommé passe ;
--   L7. FK, CHECK, index, colonnes, RLS deny-all, fonctions fermées.
--
-- LA REMISE — seize promesses :
--   R1. une remise valide s'écrit ; l'instant et l'`ordre` sont posés par la
--       BASE ; la forme d'élément AVEC ingrédient est admise ; un élément
--       d'`actions` qui n'est pas un objet est ignoré ;
--   R2. un clic rejoué ne remet rien (zéro ligne, sans erreur) ;
--   R3. LE COURRIER A ÉTÉ ÉCRIT POUR CETTE LISTE : un courrier consigné pour
--       {magnésium} ne se remet pas pour {fer, magnésium} ; un courrier sans
--       liste consignée, ou déplacé vers un autre dossier après sa
--       consignation, ne se remet pas ;
--   R4. une approbation d'un AUTRE dossier, ou croisée, est refusée ;
--   R5. un protocole qui n'est pas au contrat V4 est refusé ;
--   R6. un protocole sans complément ciblé est refusé — multivitaminé seul,
--       nature absente, nature « ciblé » sur un autre type, sans actions,
--       `actions` qui n'est pas un tableau ;
--   R7. une liste qui n'est pas celle du protocole est refusée — élément
--       manquant, en trop, désordre, intitulé changé, ingrédient changé, omis
--       ou ajouté à tort ;
--   R8. une intention ciblée mal formée est refusée — identifiant hors format
--       ou non textuel, intitulé vide ou non textuel, référence catalogue
--       nulle, non objet, sans ingrédient ou à ingrédient blanc ;
--   R9. le courrier d'un autre dossier, entrant, sans ancrage ou d'un autre
--       ancrage (adressage) est refusé ;
--  R10. un texte qui n'est pas celui du courrier est refusé ;
--  R11. une empreinte du texte ou de la liste qui n'est pas la sienne est
--       refusée (CHECK) ;
--  R12. une liste nulle, vide, à élément nul ou à deux dimensions est refusée
--       par le CHECK lui-même (trigger d'insertion suspendu le temps du cas) ;
--  R13. UPDATE et TRUNCATE refusés ; l'effacement nommé passe ; ni l'approbation
--       ni la liste d'un courrier remis ne s'effacent avant leurs remises
--       (RESTRICT) ;
--  R14. FK, CHECK et index annoncés présents, l'index du courrier unique ;
--  R15. la table porte EXACTEMENT ses dix colonnes ;
--  R16. RLS deny-all sans policy, fonctions non exécutables par PUBLIC, et
--       l'espèce de lecture `courrier_complement` admise (une inconnue
--       refusée, les anciennes toujours admises).
--
-- Chaque refus d'un trigger est reconnu à son MESSAGE. Identités de fixture
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

-- La liste d'un courrier, empreinte calculée sur la liste FOURNIE telle quelle.
CREATE FUNCTION pg_temp.consigner(courrier text, patient text, liste text[])
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
  VALUES (courrier, patient, liste, pg_temp.h(array_to_string(liste, E'\n')))
$$;

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
  ('ccr_a_4', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, quatrième courrier.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_5', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, cinquième courrier.', repeat('c', 64), 'complement-cible-v1'),
  ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, courrier sans liste.', repeat('c', 64), 'complement-cible-v1'),
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
  -- Les mêmes, précédés d'éléments qui ne sont pas des objets : ignorés.
  AVEC_SCALAIRES CONSTANT jsonb := '{"actions": ["x", 3, null,
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium", "natureComplement": "cible"},
    {"actionId": "action-1", "type": "supplement_exploration", "title": "Fer", "natureComplement": "cible",
     "supplementCatalogRef": {"ingredientId": "ing-fer", "ruleId": "r", "ruleVersion": 1, "justification": "j"}}]}';
  UN_CIBLE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium", "natureComplement": "cible"}]}';
  MULTI_SEUL CONSTANT jsonb := '{"actions": [
    {"actionId": "action-3", "type": "supplement_exploration", "title": "Multi", "natureComplement": "multivitamine_vente_libre"}]}';
  SANS_NATURE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-2", "type": "supplement_exploration", "title": "Magnésium"}]}';
  AUTRE_TYPE CONSTANT jsonb := '{"actions": [
    {"actionId": "action-4", "type": "food", "title": "Assiette", "natureComplement": "cible"}]}';
  LISTE text[];
  MG text[];
  nb integer;
  ligne record;
  colonnes text[];
  liste_ligne record;
BEGIN
  LISTE := ARRAY[pg_temp.el('action-1', 'Fer', 'ing-fer'), pg_temp.el('action-2', 'Magnésium')];
  MG := ARRAY[pg_temp.el('action-2', 'Magnésium')];

  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  SELECT c.id, c.patient, 'dc', H, H, H, 'prio', c.payload, H, c.contrat, CURRENT_TIMESTAMP
  FROM (VALUES
    ('pd_ccr_a', 'PAT_CONTRAT_CCR_A', DEUX_CIBLES, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_scalaires', 'PAT_CONTRAT_CCR_A', AVEC_SCALAIRES, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_un', 'PAT_CONTRAT_CCR_A', UN_CIBLE, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_v3', 'PAT_CONTRAT_CCR_A', DEUX_CIBLES, 'c1-protocol-draft-v3'),
    ('pd_ccr_a_multi', 'PAT_CONTRAT_CCR_A', MULTI_SEUL, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_sans_nature', 'PAT_CONTRAT_CCR_A', SANS_NATURE, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_autre_type', 'PAT_CONTRAT_CCR_A', AUTRE_TYPE, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_vide', 'PAT_CONTRAT_CCR_A', '{}'::jsonb, 'c1-protocol-draft-v4'),
    ('pd_ccr_a_chaine', 'PAT_CONTRAT_CCR_A', '{"actions": "action-2"}'::jsonb, 'c1-protocol-draft-v4'),
    ('pd_ccr_b', 'PAT_CONTRAT_CCR_B', DEUX_CIBLES, 'c1-protocol-draft-v4')
  ) AS c(id, patient, payload, contrat);

  -- Les intentions mal formées : une ligne ciblée, l'anomalie seule.
  INSERT INTO protocol_drafts
    (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
  SELECT 'pd_ccr_a_mal_' || c.cas, 'PAT_CONTRAT_CCR_A', 'dc', H, H, H, 'prio',
         jsonb_build_object('actions', jsonb_build_array(
           jsonb_build_object('type', 'supplement_exploration', 'natureComplement', 'cible') || c.champs)),
         H, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP
  FROM (VALUES
    ('id_format', '{"actionId": "action:2", "title": "Magnésium"}'::jsonb),
    ('id_nombre', '{"actionId": 2, "title": "Magnésium"}'::jsonb),
    ('titre_vide', '{"actionId": "action-2", "title": "  "}'::jsonb),
    ('titre_nombre', '{"actionId": "action-2", "title": 7}'::jsonb),
    ('ref_nulle', '{"actionId": "action-1", "title": "Fer", "supplementCatalogRef": null}'::jsonb),
    ('ref_chaine', '{"actionId": "action-1", "title": "Fer", "supplementCatalogRef": "ing-fer"}'::jsonb),
    ('ref_sans_ingredient', '{"actionId": "action-1", "title": "Fer", "supplementCatalogRef": {"ruleId": "r"}}'::jsonb),
    ('ref_ingredient_blanc', '{"actionId": "action-1", "title": "Fer", "supplementCatalogRef": {"ingredientId": " "}}'::jsonb)
  ) AS c(cas, champs);

  INSERT INTO protocol_diffusion_approvals
    (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
  SELECT d.id, d.id_patient, d.draft, H, H, CURRENT_TIMESTAMP, 'content_approved_for_diffusion'
  FROM (
    SELECT 'pda' || substr(p.id, 3) AS id, p.id_patient, p.id AS draft
    FROM protocol_drafts p WHERE p.id LIKE 'pd\_ccr\_%'
    UNION ALL SELECT 'pda_ccr_a2', 'PAT_CONTRAT_CCR_A', 'pd_ccr_a'
    UNION ALL SELECT 'pda_ccr_croisee', 'PAT_CONTRAT_CCR_B', 'pd_ccr_a'
  ) AS d;

  -- ═══ LA LISTE D'UN COURRIER ═══════════════════════════════════════════════

  -- ── L1. Une liste valide ─────────────────────────────────────────────────
  INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256, consigne_le)
  VALUES ('ccr_a_1', 'PAT_CONTRAT_CCR_A', LISTE, pg_temp.h(array_to_string(LISTE, E'\n')), TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO liste_ligne FROM courriers_complement_listes WHERE id_correspondance = 'ccr_a_1';
  IF liste_ligne.consigne_le = TIMESTAMP '2000-01-01 00:00:00'
     OR abs(extract(epoch FROM (liste_ligne.consigne_le - (now() AT TIME ZONE 'UTC')))) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — L1 : l''instant (UTC) n''a pas été posé par la base.';
  END IF;
  PERFORM pg_temp.consigner('ccr_a_2', 'PAT_CONTRAT_CCR_A', MG);
  PERFORM pg_temp.consigner('ccr_a_3', 'PAT_CONTRAT_CCR_A', LISTE);
  PERFORM pg_temp.consigner('ccr_a_4', 'PAT_CONTRAT_CCR_A', LISTE);
  PERFORM pg_temp.consigner('ccr_a_5', 'PAT_CONTRAT_CCR_A', LISTE);
  PERFORM pg_temp.consigner('ccr_b_1', 'PAT_CONTRAT_CCR_B', LISTE);

  -- ── L2. Courrier complément de ce dossier ────────────────────────────────
  PERFORM pg_temp.refuse('L2 courrier d''un autre dossier',
    format($q$SELECT pg_temp.consigner('ccr_b_1', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('L2 courrier entrant',
    format($q$SELECT pg_temp.consigner('ccr_a_entrant', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('L2 sans ancrage',
    format($q$SELECT pg_temp.consigner('ccr_a_main', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('L2 lettre d''adressage',
    format($q$SELECT pg_temp.consigner('ccr_a_adressage', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');

  -- ── L3. Format, ordre, doublon ───────────────────────────────────────────
  PERFORM pg_temp.refuse('L3 élément hors format',
    $q$SELECT pg_temp.consigner('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', ARRAY['action-2:Magnésium'])$q$,
    'P0001', 'est hors format');
  PERFORM pg_temp.refuse('L3 empreinte en majuscules',
    format($q$SELECT pg_temp.consigner('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', ARRAY[%L])$q$, upper(MG[1])),
    'P0001', 'est hors format');
  PERFORM pg_temp.refuse('L3 désordre',
    format($q$SELECT pg_temp.consigner('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, ARRAY[LISTE[2], LISTE[1]]),
    'P0001', 'n''est pas distincte et triée');
  PERFORM pg_temp.refuse('L3 doublon',
    format($q$SELECT pg_temp.consigner('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, ARRAY[MG[1], MG[1]]),
    'P0001', 'n''est pas distincte et triée');

  -- ── L4. Les CHECK de la liste ────────────────────────────────────────────
  PERFORM pg_temp.refuse('L4 liste nulle',
    $q$INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
       VALUES ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', NULL, pg_temp.h(''))$q$,
    '23514', 'courriers_complement_listes_complements_non_vide');
  PERFORM pg_temp.refuse('L4 liste vide',
    $q$INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
       VALUES ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', '{}'::text[], pg_temp.h(''))$q$,
    '23514', 'courriers_complement_listes_complements_non_vide');
  PERFORM pg_temp.refuse('L4 élément nul',
    format($q$INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
       VALUES ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', ARRAY[%L, NULL]::text[], pg_temp.h(%L))$q$, MG[1], MG[1]),
    '23514', 'courriers_complement_listes_complements_non_vide');
  PERFORM pg_temp.refuse('L4 deux dimensions',
    format($q$INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
       VALUES ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', ARRAY[[%L], [%L]]::text[], pg_temp.h('x'))$q$, LISTE[1], LISTE[2]),
    '23514', 'courriers_complement_listes_complements_non_vide');
  PERFORM pg_temp.refuse('L4 empreinte fausse',
    format($q$INSERT INTO courriers_complement_listes (id_correspondance, id_patient, complements, complements_sha256)
       VALUES ('ccr_a_sans_liste', 'PAT_CONTRAT_CCR_A', %L::text[], repeat('0', 64))$q$, MG),
    '23514', 'courriers_complement_listes_complements_sha256');

  -- ── L5. Une liste par courrier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('L5 seconde liste',
    format($q$SELECT pg_temp.consigner('ccr_a_2', 'PAT_CONTRAT_CCR_A', %L::text[])$q$, LISTE),
    '23505', 'courriers_complement_listes_pkey');

  -- ── L6. Figée, RESTRICT ──────────────────────────────────────────────────
  PERFORM pg_temp.refuse('L6 UPDATE',
    format($q$UPDATE courriers_complement_listes SET complements = %L::text[] WHERE id_correspondance = 'ccr_a_2'$q$, LISTE),
    'P0001', 'une liste consignée est figée');
  -- Seule, la table des listes est déjà protégée par la FK des remises
  -- (0A000) ; avec elles, ce sont les triggers qui répondent.
  PERFORM pg_temp.refuse('L6 TRUNCATE seul (FK)',
    $q$TRUNCATE courriers_complement_listes$q$,
    '0A000', 'foreign key');
  PERFORM pg_temp.refuse('L6 TRUNCATE avec les remises',
    $q$TRUNCATE courriers_complement_listes, courriers_complement_remises$q$,
    'P0001', 'est figée');
  SELECT count(*) INTO nb FROM pg_trigger
  WHERE tgrelid = 'public.courriers_complement_listes'::regclass
    AND tgname IN ('courriers_complement_listes_no_update', 'courriers_complement_listes_no_truncate',
                   'courriers_complement_listes_avant_insertion')
    AND tgenabled = 'O';
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — L6 : % trigger(s) de la liste actif(s) sur 3.', nb;
  END IF;
  PERFORM pg_temp.refuse('L6 courrier avant sa liste',
    $q$DELETE FROM correspondances_medecin WHERE id = 'ccr_a_4'$q$,
    '23503', 'courriers_complement_listes');

  -- ═══ LA REMISE ════════════════════════════════════════════════════════════

  -- ── R1. Une remise valide (forme avec ingrédient comprise) ───────────────
  INSERT INTO courriers_complement_remises
    (id, ordre, id_patient, id_approbation, id_correspondance, texte, texte_sha256,
     complements, complements_sha256, remise_le)
  SELECT 'rem_1', 999999, 'PAT_CONTRAT_CCR_A', 'pda_ccr_a', c.id, c.texte, pg_temp.h(c.texte),
         LISTE, pg_temp.h(array_to_string(LISTE, E'\n')), TIMESTAMP '2000-01-01 00:00:00'
  FROM correspondances_medecin c WHERE c.id = 'ccr_a_1';
  SELECT * INTO ligne FROM courriers_complement_remises WHERE id = 'rem_1';
  IF ligne.texte <> 'Docteur, premier courrier.' OR ligne.complements <> LISTE THEN
    RAISE EXCEPTION 'CONTRAT — R1 : le texte ou la liste relus ne sont pas ceux remis.';
  END IF;
  IF ligne.ordre = 999999 OR ligne.remise_le = TIMESTAMP '2000-01-01 00:00:00'
     OR abs(extract(epoch FROM (ligne.remise_le - (now() AT TIME ZONE 'UTC')))) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — R1 : l''ordre ou l''instant (UTC) n''ont pas été posés par la base.';
  END IF;
  -- Des éléments d'`actions` qui ne sont pas des objets sont ignorés.
  nb := pg_temp.remettre('rem_scalaires', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_scalaires', 'ccr_a_5', LISTE);
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — R1 : des éléments non objets ont empêché la remise.';
  END IF;

  -- ── R2. Idempotence ──────────────────────────────────────────────────────
  nb := pg_temp.remettre('rem_rejoue', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_1', LISTE);
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — R2 : un clic rejoué a remis % ligne(s).', nb;
  END IF;

  -- ── R3. Le courrier a été écrit pour cette liste ─────────────────────────
  PERFORM pg_temp.refuse('R3 courrier écrit pour {Mg}, version {Fer, Mg}',
    format($q$SELECT pg_temp.remettre('x3a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_2', %L::text[])$q$, LISTE),
    'P0001', 'n''a pas été écrit pour cette liste');
  PERFORM pg_temp.refuse('R3 courrier écrit pour {Fer, Mg}, version {Mg}',
    format($q$SELECT pg_temp.remettre('x3b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_un', 'ccr_a_1', %L::text[])$q$, MG),
    'P0001', 'n''a pas été écrit pour cette liste');
  -- Un courrier déplacé vers B après sa consignation dans A (geste qu'aucun
  -- code ne fait) : sa liste reste celle de A, et ne couvre rien chez B.
  INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, ancrage_sha256, ancrage_version)
  VALUES ('ccr_a_deplace', 'PAT_CONTRAT_CCR_A', 'praticien@wellneuro.fr', 'sortant', 'Dr Test', 'Docteur, courrier déplacé.', repeat('c', 64), 'complement-cible-v1');
  PERFORM pg_temp.consigner('ccr_a_deplace', 'PAT_CONTRAT_CCR_A', LISTE);
  UPDATE correspondances_medecin SET id_patient = 'PAT_CONTRAT_CCR_B' WHERE id = 'ccr_a_deplace';
  PERFORM pg_temp.refuse('R3 courrier déplacé après sa consignation',
    format($q$SELECT pg_temp.remettre('x3d', 'PAT_CONTRAT_CCR_B', 'pda_ccr_b', 'ccr_a_deplace', %L::text[])$q$, LISTE),
    'P0001', 'n''a pas été consignée dans ce dossier');
  PERFORM pg_temp.refuse('R3 courrier sans liste',
    format($q$SELECT pg_temp.remettre('x3c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_sans_liste', %L::text[])$q$, LISTE),
    'P0001', 'n''a aucune liste consignée');

  -- ── R4. Approbation ──────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('R4 approbation d''un autre dossier',
    format($q$SELECT pg_temp.remettre('x4a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_b', 'ccr_a_3', %L::text[])$q$, LISTE),
    'P0001', 'ne porte pas sur ce dossier');
  PERFORM pg_temp.refuse('R4 approbation croisée',
    format($q$SELECT pg_temp.remettre('x4b', 'PAT_CONTRAT_CCR_B', 'pda_ccr_croisee', 'ccr_b_1', %L::text[])$q$, LISTE),
    'P0001', 'ne porte pas sur ce dossier');

  -- ── R5. Contrat V4 ───────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('R5 protocole V3 forgé avec « ciblé »',
    format($q$SELECT pg_temp.remettre('x5', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_v3', 'ccr_a_3', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas au contrat V4');

  -- ── R6. Protocole sans complément ciblé ──────────────────────────────────
  PERFORM pg_temp.refuse('R6 multivitaminé seul',
    format($q$SELECT pg_temp.remettre('x6a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_multi', 'ccr_a_3', %L::text[])$q$,
           ARRAY[pg_temp.el('action-3', 'Multi')]),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('R6 nature absente',
    format($q$SELECT pg_temp.remettre('x6b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_sans_nature', 'ccr_a_3', %L::text[])$q$, MG),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('R6 « ciblé » sur un autre type',
    format($q$SELECT pg_temp.remettre('x6c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_autre_type', 'ccr_a_3', %L::text[])$q$,
           ARRAY[pg_temp.el('action-4', 'Assiette')]),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('R6 sans actions',
    format($q$SELECT pg_temp.remettre('x6d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_vide', 'ccr_a_3', %L::text[])$q$, LISTE),
    'P0001', 'ne porte aucun complément ciblé');
  PERFORM pg_temp.refuse('R6 actions qui ne sont pas un tableau',
    format($q$SELECT pg_temp.remettre('x6e', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_chaine', 'ccr_a_3', %L::text[])$q$, LISTE),
    'P0001', 'ne porte aucun complément ciblé');

  -- ── R7. La liste du protocole, et elle seule ─────────────────────────────
  PERFORM pg_temp.refuse('R7 élément manquant',
    format($q$SELECT pg_temp.remettre('x7a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$, MG),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 élément en trop (le multivitaminé)',
    format($q$SELECT pg_temp.remettre('x7b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           LISTE || pg_temp.el('action-3', 'Multi')),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 désordre',
    format($q$SELECT pg_temp.remettre('x7c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           ARRAY[LISTE[2], LISTE[1]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 intitulé changé',
    format($q$SELECT pg_temp.remettre('x7d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           ARRAY[LISTE[1], pg_temp.el('action-2', 'Magnesium')]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 ingrédient changé',
    format($q$SELECT pg_temp.remettre('x7e', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           ARRAY[pg_temp.el('action-1', 'Fer', 'ing-autre'), LISTE[2]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 ingrédient omis',
    format($q$SELECT pg_temp.remettre('x7f', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           ARRAY[pg_temp.el('action-1', 'Fer'), LISTE[2]]),
    'P0001', 'n''est pas celle du protocole approuvé');
  PERFORM pg_temp.refuse('R7 ingrédient ajouté à tort',
    format($q$SELECT pg_temp.remettre('x7g', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', %L::text[])$q$,
           ARRAY[LISTE[1], pg_temp.el('action-2', 'Magnésium', 'ing-mg')]),
    'P0001', 'n''est pas celle du protocole approuvé');

  -- ── R8. Intention ciblée mal formée ──────────────────────────────────────
  FOR ligne IN SELECT id FROM protocol_diffusion_approvals WHERE id LIKE 'pda\_ccr\_a\_mal\_%' ORDER BY id LOOP
    PERFORM pg_temp.refuse('R8 ' || ligne.id,
      format($q$SELECT pg_temp.remettre('x8', 'PAT_CONTRAT_CCR_A', %L, 'ccr_a_3', %L::text[])$q$, ligne.id, MG),
      'P0001', 'est mal formée');
  END LOOP;
  SELECT count(*) INTO nb FROM protocol_diffusion_approvals WHERE id LIKE 'pda\_ccr\_a\_mal\_%';
  IF nb <> 8 THEN
    RAISE EXCEPTION 'CONTRAT — R8 : % cas mal formés éprouvés sur 8.', nb;
  END IF;

  -- ── R9. Courrier complément de ce dossier ────────────────────────────────
  PERFORM pg_temp.refuse('R9 courrier d''un autre dossier',
    format($q$SELECT pg_temp.remettre('x9a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_b_1', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('R9 courrier entrant',
    format($q$SELECT pg_temp.remettre('x9b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_entrant', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('R9 sans ancrage',
    format($q$SELECT pg_temp.remettre('x9c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_main', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');
  PERFORM pg_temp.refuse('R9 lettre d''adressage',
    format($q$SELECT pg_temp.remettre('x9d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_adressage', %L::text[])$q$, LISTE),
    'P0001', 'n''est pas un courrier complément de ce dossier');

  -- ── R10. Texte recopié ───────────────────────────────────────────────────
  PERFORM pg_temp.refuse('R10 texte étranger',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x10', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Un autre texte.', pg_temp.h('Un autre texte.'),
               %L::text[], pg_temp.h(array_to_string(%L::text[], E'\n')))$q$, LISTE, LISTE),
    'P0001', 'n''est pas celui du courrier');

  -- ── R11. Empreintes ──────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('R11 empreinte du texte fausse',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.', repeat('0', 64),
               %L::text[], pg_temp.h(array_to_string(%L::text[], E'\n')))$q$, LISTE, LISTE),
    '23514', 'courriers_complement_remises_texte_sha256');
  PERFORM pg_temp.refuse('R11 empreinte de la liste fausse',
    format($q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x11b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.',
               pg_temp.h('Docteur, troisième courrier.'), %L::text[], repeat('0', 64))$q$, LISTE),
    '23514', 'courriers_complement_remises_complements_sha256');

  -- ── R12. Le CHECK de la liste, trigger d'insertion suspendu ──────────────
  -- Le trigger refuserait d'abord ces listes (elles ne sont pas celles du
  -- protocole) : suspendu le temps du cas, c'est le CHECK seul qui répond.
  ALTER TABLE courriers_complement_remises DISABLE TRIGGER courriers_complement_remises_avant_insertion;
  PERFORM pg_temp.refuse('R12 liste nulle',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x12a', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.',
               pg_temp.h('Docteur, troisième courrier.'), NULL, pg_temp.h(''))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('R12 liste vide',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x12b', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.',
               pg_temp.h('Docteur, troisième courrier.'), '{}'::text[], pg_temp.h(''))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('R12 élément nul',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x12c', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.',
               pg_temp.h('Docteur, troisième courrier.'), ARRAY['a', NULL]::text[], pg_temp.h('a'))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  PERFORM pg_temp.refuse('R12 deux dimensions',
    $q$INSERT INTO courriers_complement_remises
         (id, id_patient, id_approbation, id_correspondance, texte, texte_sha256, complements, complements_sha256)
       VALUES ('x12d', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a2', 'ccr_a_3', 'Docteur, troisième courrier.',
               pg_temp.h('Docteur, troisième courrier.'), ARRAY[['a'], ['b']]::text[], pg_temp.h(E'a\nb'))$q$,
    '23514', 'courriers_complement_remises_complements_non_vide');
  ALTER TABLE courriers_complement_remises ENABLE TRIGGER courriers_complement_remises_avant_insertion;

  -- Le courrier écrit pour {Mg} se remet pour une version {Mg}.
  nb := pg_temp.remettre('rem_2', 'PAT_CONTRAT_CCR_A', 'pda_ccr_a_un', 'ccr_a_2', MG);
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — R3 : le courrier écrit pour sa liste n''a pas été remis.';
  END IF;

  -- ── R13. Figée, effaçable, RESTRICT ──────────────────────────────────────
  PERFORM pg_temp.refuse('R13 UPDATE',
    $q$UPDATE courriers_complement_remises SET texte = 'réécrit' WHERE id = 'rem_1'$q$,
    'P0001', 'une remise est figée');
  PERFORM pg_temp.refuse('R13 TRUNCATE',
    $q$TRUNCATE courriers_complement_remises$q$,
    'P0001', 'une remise est figée');
  PERFORM pg_temp.refuse('R13 approbation avant ses remises',
    $q$DELETE FROM protocol_diffusion_approvals WHERE id = 'pda_ccr_a'$q$,
    '23503', 'courriers_complement_remises');
  PERFORM pg_temp.refuse('R13 liste d''un courrier remis avant sa remise',
    $q$DELETE FROM courriers_complement_listes WHERE id_correspondance = 'ccr_a_1'$q$,
    '23503', 'courriers_complement_remises_liste_fkey');
  -- L'effacement nommé : remises, puis listes, puis courriers.
  DELETE FROM courriers_complement_remises WHERE id_patient = 'PAT_CONTRAT_CCR_A';
  DELETE FROM courriers_complement_listes WHERE id_patient = 'PAT_CONTRAT_CCR_A';
  DELETE FROM correspondances_medecin WHERE id_patient = 'PAT_CONTRAT_CCR_A';
  SELECT (SELECT count(*) FROM courriers_complement_remises WHERE id_patient = 'PAT_CONTRAT_CCR_A')
       + (SELECT count(*) FROM courriers_complement_listes WHERE id_patient = 'PAT_CONTRAT_CCR_A') INTO nb;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — R13 : l''effacement nommé a laissé % ligne(s).', nb;
  END IF;

  -- ── L7 et R14. FK, CHECK, index ──────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_listes'::regclass AND contype = 'f' AND confdeltype = 'r';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — L7 : % clé(s) étrangère(s) RESTRICT sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_listes'::regclass AND contype = 'c'
    AND conname IN ('courriers_complement_listes_complements_non_vide', 'courriers_complement_listes_complements_sha256');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — L7 : % CHECK sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'courriers_complement_listes'
    AND indexname IN ('courriers_complement_listes_pkey', 'courriers_complement_listes_patient_idx');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — L7 : % index sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_remises'::regclass AND contype = 'f' AND confdeltype = 'r';
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — R14 : % clé(s) étrangère(s) RESTRICT sur 4.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.courriers_complement_remises'::regclass AND contype = 'c'
    AND conname IN ('courriers_complement_remises_texte_non_vide', 'courriers_complement_remises_texte_sha256',
                    'courriers_complement_remises_complements_non_vide', 'courriers_complement_remises_complements_sha256');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — R14 : % CHECK sur 4.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'courriers_complement_remises'
    AND indexname IN ('courriers_complement_remises_ordre_key', 'courriers_complement_remises_id_correspondance_key',
                      'courriers_complement_remises_patient_ordre_idx', 'courriers_complement_remises_approbation_idx');
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — R14 : % index sur 4.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_index
  WHERE indexrelid = 'public.courriers_complement_remises_id_correspondance_key'::regclass AND indisunique;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — R14 : l''index du courrier n''est pas unique.';
  END IF;

  -- ── L7 et R15. Listes blanches des colonnes ──────────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'courriers_complement_listes';
  IF colonnes <> ARRAY['complements', 'complements_sha256', 'consigne_le', 'id_correspondance', 'id_patient'] THEN
    RAISE EXCEPTION 'CONTRAT — L7 : colonnes inattendues : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'courriers_complement_remises';
  IF colonnes <> ARRAY['complements', 'complements_sha256', 'id', 'id_approbation', 'id_correspondance',
                       'id_patient', 'ordre', 'remise_le', 'texte', 'texte_sha256'] THEN
    RAISE EXCEPTION 'CONTRAT — R15 : colonnes inattendues : %', colonnes;
  END IF;

  -- ── L7 et R16. RLS, fonctions, espèce de lecture ─────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.courriers_complement_listes'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.courriers_complement_remises'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — L7/R16 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('courriers_complement_listes', 'courriers_complement_remises');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — L7/R16 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('courriers_complement_listes_figee', 'courriers_complement_listes_avant_insertion',
                      'courriers_complement_remises_figee', 'courriers_complement_remises_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — L7/R16 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;
  INSERT INTO portail_lectures_patient (id_patient, espece, id_objet)
  SELECT 'PAT_CONTRAT_CCR_B', e, 'objet'
  FROM unnest(ARRAY['bilan', 'synthese', 'fiche_assiette', 'lettre_adressage', 'protocole', 'courrier_complement']) AS e;
  PERFORM pg_temp.refuse('R16 espèce inconnue',
    $q$INSERT INTO portail_lectures_patient (id_patient, espece, id_objet) VALUES ('PAT_CONTRAT_CCR_B', 'courrier', 'objet')$q$,
    '23514', 'portail_lectures_patient_espece_check');

  RAISE NOTICE 'Contrat courriers_complement_remises_v1 : sept promesses de la liste et seize de la remise tenues.';
END;
$$;

ROLLBACK;
