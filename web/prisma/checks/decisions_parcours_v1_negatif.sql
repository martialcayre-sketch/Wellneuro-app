-- Contrat des décisions de parcours ([[D-343]], BP-15).
--
-- La table promet QUINZE choses, et ce fichier les éprouve TOUTES :
--   1. une pose valide de chaque famille s'écrit et se relit : un choix
--      avec sa note, un événement daté ou « inconnu », une révision ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ; une date
--      antidatée ou un ordre fournis sont ignorés ; l'ordre croît ;
--   3. la ligne est celle du praticien DU DOSSIER (l'e-mail d'un autre
--      praticien est refusé, la casse ne compte pas) ;
--   4. la version, et la version suivante, sont du MÊME dossier ;
--   5. UNE révision en vigueur par version : une révision sur une version
--      qui en porte une doit la désigner, une révision sans tête n'en
--      désigne aucune ; une autre version est indépendante ; après un
--      retrait, une révision neuve ne désigne rien ;
--   6. les FILS PAR ÉVÉNEMENT : choix et mise en œuvre coexistent ; un
--      remplacement corrige dans la même famille (une interruption devient
--      un arrêt) et garde la version et l'action ; il ne vise qu'une pose
--      de CE dossier que rien ne vise encore ; un retrait vise une tête ;
--      un refus levé est un retrait ; une ligne a au plus un successeur ;
--   7. la FORME de chaque acte : acte et nature fermés ; une pose porte une
--      nature ; un retrait ne porte rien ; la révision vise la version
--      entière, porte une issue fermée et ni source ni action ; l'issue
--      n'appartient qu'à la révision ; choix et mise en œuvre portent une
--      source fermée ;
--   8. les MOTIFS : chaque code de chaque liste passe sur sa nature ; un
--      code d'une autre liste, un motif absent là où il est requis, un motif
--      sur un début, une reprise ou un maintien sont refusés ; aucun motif
--      d'efficacité (`inefficace`, `objectif_atteint`, `amelioration`,
--      DC-39) ;
--   9. la NOTE : obligatoire avec `autre` et pour une préférence ; jamais
--      faite de blancs ; 2000 caractères au plus ;
--  10. la DATE DE L'ÉVÉNEMENT : une mise en œuvre porte une date au jour ou
--      « inconnue », l'un ou l'autre ; choix et révision n'en portent pas ;
--  11. la VERSION SUIVANTE : `ajuster` seule, autre que la version révisée,
--      facultative à la pose, posée par remplacement ; l'ACTION, jamais
--      faite de blancs, 200 caractères au plus ;
--  12. les VERSIONS NE BOUGENT PAS : après toutes ces poses, les quatre
--      empreintes, le statut et la date de mise à jour de chaque version
--      sont identiques, et aucune approbation de diffusion ni aucun check-in
--      n'est écrit ([[D-343]] §9) ;
--  13. UPDATE et TRUNCATE sont refusés ; l'effacement NOMMÉ passe, décisions
--      puis versions puis dossier ; une version citée ne s'efface pas avant
--      ses décisions (RESTRICT) ; une suppression dont le dossier survit est
--      refusée en fin de transaction ;
--  14. les FK ont la règle annoncée, les CHECK, les index et les triggers
--      sont présents (la suppression nommée, différée), REPEATABLE READ est
--      refusé avant les verrous, les verrous précèdent le contrôle du
--      praticien et des têtes, et les fonctions ont leur `search_path`
--      épinglé (présence relue : une session seule n'éprouve ni la
--      concurrence ni un autre niveau d'isolation — le banc à deux sessions
--      joue les courses et le refus de REPEATABLE READ,
--      `scripts/banc-decisions-parcours-deux-sessions.test.mjs`) ;
--  15. la table porte EXACTEMENT ses colonnes (liste blanche) : aucune
--      colonne d'efficacité, de score, de résultat, de valeur ni
--      d'attribution ([[D-343]] §10) ; la RLS deny-all est active et sans
--      policy (posture `D-005`), et aucune fonction n'est exécutable par
--      PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve (chaque cas ne viole qu'un CHECK). Chaque refus est
-- reconnu à son MESSAGE, pas seulement à son code. Deux gardes ne s'isolent
-- pas, parce que le trigger refuse avant elles : `ne_se_remplace_pas` (une
-- ligne qui se désigne n'est pas une tête) et `auteur_forme` (un e-mail blanc
-- n'est pas celui du dossier). Elles restent la garde si le trigger tombait,
-- et le cas 14 relit leur clause.
--
-- Identités de fixture seulement ; actions et versions SYNTHÉTIQUES, aucun
-- texte clinique. Tout se déroule dans une transaction annulée à la fin.
BEGIN;

SET LOCAL TIME ZONE 'Europe/Paris';

-- Un refus attendu : la requête doit échouer avec CE code et un message qui
-- contient CE motif. Un succès, ou un refus d'une autre nature, fait échouer
-- le contrat en nommant le cas.
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

-- Les gestes, en une ligne chacun.
CREATE FUNCTION pg_temp.choix(
  p_id text, p_version text, p_nature text, p_motif text, p_note text, p_remplace text,
  p_action text DEFAULT NULL, p_source text DEFAULT 'rapporte_par_patient',
  p_email text DEFAULT 'praticien@wellneuro.fr', p_patient text DEFAULT 'PAT_CONTRAT_DP_A'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_action, nature, motif, note, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_version, p_action, p_nature, p_motif, p_note, p_source, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.evenement(
  p_id text, p_version text, p_nature text, p_motif text, p_le date, p_inconnu boolean, p_remplace text,
  p_action text DEFAULT NULL, p_source text DEFAULT 'constate_par_praticien',
  p_email text DEFAULT 'praticien@wellneuro.fr', p_patient text DEFAULT 'PAT_CONTRAT_DP_A',
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_action, nature, motif, note, evenement_le, evenement_inconnu, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_version, p_action, p_nature, p_motif, p_note, p_le, p_inconnu, p_source, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.reviser(
  p_id text, p_version text, p_issue text, p_motif text, p_remplace text,
  p_suivante text DEFAULT NULL, p_note text DEFAULT NULL,
  p_email text DEFAULT 'praticien@wellneuro.fr', p_patient text DEFAULT 'PAT_CONTRAT_DP_A'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue, motif, note, id_version_suivante, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_version, 'revision', p_issue, p_motif, p_note, p_suivante, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.retirer(
  p_id text, p_version text, p_remplace text,
  p_email text DEFAULT 'praticien@wellneuro.fr', p_patient text DEFAULT 'PAT_CONTRAT_DP_A'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'retrait', p_version, p_remplace, p_email);
$$;

-- La révision en vigueur d'une version, lue comme le trigger la lit.
CREATE FUNCTION pg_temp.tete_revision(p_version text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT d.id FROM decisions_parcours d
  WHERE d.id_version = p_version AND d.acte = 'pose' AND d.nature = 'revision'
    AND NOT EXISTS (SELECT 1 FROM decisions_parcours s WHERE s.id_ligne_remplacee = d.id)
  ORDER BY d.ordre DESC
  LIMIT 1;
$$;

-- L'état des versions et de leurs voisines, pour le cas 12.
CREATE FUNCTION pg_temp.empreinte_versions()
RETURNS text
LANGUAGE sql
AS $$
  SELECT coalesce(string_agg(concat_ws('|', id, decision_card_input_hash, snapshot_input_hash,
                                       review_input_hash, input_hash, status, updated_at::text,
                                       supersedes_draft_id, reviewed_at::text), ',' ORDER BY id), '')
         || '#' || (SELECT count(*) FROM protocol_diffusion_approvals)::text
         || '#' || (SELECT count(*) FROM protocol_checkins)::text
  FROM protocol_drafts
  WHERE id_patient IN ('PAT_CONTRAT_DP_A', 'PAT_CONTRAT_DP_B');
$$;

-- Le contrôle de fin de transaction, joué sur-le-champ : `SET CONSTRAINTS …
-- IMMEDIATE` déclenche celui en attente. Appelé dans `refuse`, il s'y annule
-- avec l'acte qu'il juge.
CREATE FUNCTION pg_temp.clore()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET CONSTRAINTS decisions_parcours_suppression_nommee IMMEDIATE;
  SET CONSTRAINTS decisions_parcours_suppression_nommee DEFERRED;
END;
$$;

-- Une suppression hors effacement, jugée sur-le-champ.
CREATE FUNCTION pg_temp.supprimer_puis_clore(p_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM decisions_parcours WHERE id = p_id;
  PERFORM pg_temp.clore();
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr) : trois versions, `pd_dp_a1` à
--   `pd_dp_a3`.
-- Dossier B, d'un AUTRE praticien : une version, `pd_dp_b1`.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_dp_a', 'PAT_CONTRAT_DP_A', 'sophie.nicola+dp@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_dp_b', 'PAT_CONTRAT_DP_B', 'jennifer.martin+dp@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO protocol_drafts
  (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
   review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
VALUES
  ('pd_dp_a1', 'PAT_CONTRAT_DP_A', 'dc_dp', repeat('1', 64), repeat('2', 64), repeat('3', 64), 'prio', '{}'::jsonb, repeat('4', 64), 'c1-protocol-draft-v1', TIMESTAMP '2026-10-01 08:00:00'),
  ('pd_dp_a2', 'PAT_CONTRAT_DP_A', 'dc_dp', repeat('5', 64), repeat('6', 64), repeat('7', 64), 'prio', '{}'::jsonb, repeat('8', 64), 'c1-protocol-draft-v1', TIMESTAMP '2026-10-02 08:00:00'),
  ('pd_dp_a3', 'PAT_CONTRAT_DP_A', 'dc_dp', repeat('9', 64), repeat('a', 64), repeat('b', 64), 'prio', '{}'::jsonb, repeat('c', 64), 'c1-protocol-draft-v1', TIMESTAMP '2026-10-03 08:00:00'),
  ('pd_dp_a4', 'PAT_CONTRAT_DP_A', 'dc_dp', repeat('e', 64), repeat('f', 64), repeat('0', 64), 'prio', '{}'::jsonb, repeat('1', 64), 'c1-protocol-draft-v1', TIMESTAMP '2026-10-05 08:00:00'),
  ('pd_dp_b1', 'PAT_CONTRAT_DP_B', 'dc_dp_b', repeat('d', 64), repeat('e', 64), repeat('f', 64), 'prio', '{}'::jsonb, repeat('0', 64), 'c1-protocol-draft-v1', TIMESTAMP '2026-10-04 08:00:00');

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  code text;
  i integer := 0;
  avant text;
  tete text;
BEGIN
  avant := pg_temp.empreinte_versions();

  -- ── 1 et 2. Des poses valides, instant et ordre posés par la base ────────
  INSERT INTO decisions_parcours (id, ordre, id_patient, acte, id_version, id_action, nature, motif, note, source, praticien_email, acte_le)
  VALUES ('dp_pref', 999999, 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a1', 'ACTION_CONTRAT_1', 'preference', 'contrainte_pratique',
          'note de contrat', 'rapporte_par_patient', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM decisions_parcours WHERE id = 'dp_pref';
  IF ligne.acte IS DISTINCT FROM 'pose' OR ligne.id_version IS DISTINCT FROM 'pd_dp_a1'
     OR ligne.id_action IS DISTINCT FROM 'ACTION_CONTRAT_1' OR ligne.nature IS DISTINCT FROM 'preference'
     OR ligne.motif IS DISTINCT FROM 'contrainte_pratique' OR ligne.note IS DISTINCT FROM 'note de contrat'
     OR ligne.source IS DISTINCT FROM 'rapporte_par_patient' OR ligne.issue IS NOT NULL
     OR ligne.evenement_le IS NOT NULL OR ligne.evenement_inconnu IS NOT NULL
     OR ligne.id_ligne_remplacee IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : le choix relu n''est pas celui écrit.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;

  PERFORM pg_temp.evenement('dp_deb', 'pd_dp_a1', 'debut', NULL, DATE '2026-10-05', false, NULL, 'ACTION_CONTRAT_1');
  SELECT * INTO ligne FROM decisions_parcours WHERE id = 'dp_deb';
  IF ligne.evenement_le IS DISTINCT FROM DATE '2026-10-05' OR ligne.evenement_inconnu IS DISTINCT FROM false
     OR ligne.source IS DISTINCT FROM 'constate_par_praticien' OR ligne.motif IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''événement daté relu n''est pas celui écrit.';
  END IF;
  IF ligne.ordre <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''un acte au suivant.';
  END IF;
  PERFORM pg_temp.evenement('dp_int', 'pd_dp_a1', 'interruption', 'evenement_intercurrent', NULL, true, NULL, 'ACTION_CONTRAT_1', 'rapporte_par_patient');
  SELECT * INTO ligne FROM decisions_parcours WHERE id = 'dp_int';
  IF ligne.evenement_le IS NOT NULL OR ligne.evenement_inconnu IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CONTRAT — 1 : l''événement de date inconnue relu n''est pas celui écrit.';
  END IF;

  PERFORM pg_temp.reviser('dp_rev1', 'pd_dp_a1', 'maintenir', NULL, NULL);
  SELECT * INTO ligne FROM decisions_parcours WHERE id = 'dp_rev1';
  IF ligne.nature IS DISTINCT FROM 'revision' OR ligne.issue IS DISTINCT FROM 'maintenir'
     OR ligne.source IS NOT NULL OR ligne.id_action IS NOT NULL OR ligne.motif IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la révision relue n''est pas celle écrite.';
  END IF;

  -- ── 3. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('3 choix d''un autre praticien',
    $q$SELECT pg_temp.choix('x3a', 'pd_dp_a1', 'refus', 'choix_du_patient', NULL, NULL, NULL, 'rapporte_par_patient', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 retrait par un autre praticien',
    $q$SELECT pg_temp.retirer('x3b', 'pd_dp_a1', 'dp_pref', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 révision sans praticien',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue)
       VALUES ('x3c', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a2', 'revision', 'maintenir')$q$,
    'P0001', 'seul le praticien du dossier');
  -- La casse ne compte pas.
  PERFORM pg_temp.choix('dp_ref', 'pd_dp_a1', 'refus', 'avis_autre_soignant', NULL, NULL, 'ACTION_CONTRAT_2', 'rapporte_par_patient', 'PRATICIEN@wellneuro.fr');

  -- ── 4. La version, et la version suivante, du même dossier ───────────────
  PERFORM pg_temp.refuse('4 version d''un autre dossier',
    $q$SELECT pg_temp.choix('x4a', 'pd_dp_b1', 'refus', 'choix_du_patient', NULL, NULL)$q$,
    'P0001', 'la version du protocole n''appartient pas à ce dossier');
  PERFORM pg_temp.refuse('4 version absente',
    $q$SELECT pg_temp.choix('x4b', 'pd_dp_absente', 'refus', 'choix_du_patient', NULL, NULL)$q$,
    'P0001', 'la version du protocole n''appartient pas à ce dossier');
  PERFORM pg_temp.refuse('4 version suivante d''un autre dossier',
    $q$SELECT pg_temp.reviser('x4c', 'pd_dp_a2', 'ajuster', 'choix_du_patient', NULL, 'pd_dp_b1')$q$,
    'P0001', 'la version suivante n''appartient pas à ce dossier');
  PERFORM pg_temp.refuse('4 retrait sur la version d''un autre dossier',
    $q$SELECT pg_temp.retirer('x4d', 'pd_dp_b1', 'dp_pref')$q$,
    'P0001', 'la version du protocole n''appartient pas à ce dossier');
  PERFORM pg_temp.refuse('4 retrait qui change de version',
    $q$SELECT pg_temp.retirer('x4e', 'pd_dp_a2', 'dp_pref')$q$,
    'P0001', 'la ligne visée porte sur une autre version');

  -- ── 5. Une révision en vigueur par version ───────────────────────────────
  PERFORM pg_temp.refuse('5 révision sans désigner la tête',
    $q$SELECT pg_temp.reviser('x5a', 'pd_dp_a1', 'arreter', 'choix_du_patient', NULL)$q$,
    'P0001', 'la version porte une révision en vigueur (dp_rev1)');
  PERFORM pg_temp.refuse('5 révision qui désigne un événement',
    $q$SELECT pg_temp.reviser('x5b', 'pd_dp_a1', 'arreter', 'choix_du_patient', 'dp_deb')$q$,
    'P0001', 'la version porte une révision en vigueur (dp_rev1)');
  PERFORM pg_temp.refuse('5 révision neuve qui remplace',
    $q$SELECT pg_temp.reviser('x5c', 'pd_dp_a2', 'maintenir', NULL, 'dp_rev1')$q$,
    'P0001', 'une révision neuve ne remplace rien');
  PERFORM pg_temp.reviser('dp_rev2', 'pd_dp_a1', 'ajuster', 'mise_en_oeuvre_incomplete', 'dp_rev1');
  PERFORM pg_temp.refuse('5 révision qui désigne une tête dépassée',
    $q$SELECT pg_temp.reviser('x5d', 'pd_dp_a1', 'maintenir', NULL, 'dp_rev1')$q$,
    'P0001', 'la version porte une révision en vigueur (dp_rev2)');
  -- Une autre version est indépendante.
  PERFORM pg_temp.reviser('dp_rev_a2', 'pd_dp_a2', 'maintenir', NULL, NULL);
  IF pg_temp.tete_revision('pd_dp_a1') IS DISTINCT FROM 'dp_rev2'
     OR pg_temp.tete_revision('pd_dp_a2') IS DISTINCT FROM 'dp_rev_a2' THEN
    RAISE EXCEPTION 'CONTRAT — 5 : la tête de révision d''une version dépend d''une autre.';
  END IF;
  -- Retirée, la révision rend la version à « aucune révision » : la suivante
  -- ne désigne rien.
  PERFORM pg_temp.retirer('dp_rev_a2_r', 'pd_dp_a2', 'dp_rev_a2');
  IF pg_temp.tete_revision('pd_dp_a2') IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 5 : une révision retirée est restée en vigueur.';
  END IF;
  PERFORM pg_temp.refuse('5 révision après retrait qui désigne la ligne retirée',
    $q$SELECT pg_temp.reviser('x5e', 'pd_dp_a2', 'maintenir', NULL, 'dp_rev_a2')$q$,
    'P0001', 'une révision neuve ne remplace rien');
  PERFORM pg_temp.reviser('dp_rev_a2b', 'pd_dp_a2', 'arreter', 'nouvelle_donnee_au_dossier', NULL);

  -- ── 6. Les fils par événement ────────────────────────────────────────────
  -- Deux événements de même nature coexistent : chacun ouvre son fil.
  PERFORM pg_temp.evenement('dp_rep', 'pd_dp_a1', 'reprise', NULL, DATE '2026-10-12', false, NULL, 'ACTION_CONTRAT_1');
  PERFORM pg_temp.evenement('dp_int2', 'pd_dp_a1', 'interruption', 'contrainte_pratique', DATE '2026-10-15', false, NULL, 'ACTION_CONTRAT_1');
  -- Correction dans la même famille : l'interruption devient un arrêt.
  PERFORM pg_temp.evenement('dp_arr', 'pd_dp_a1', 'arret', 'effet_indesirable_rapporte', DATE '2026-10-15', false, 'dp_int2', 'ACTION_CONTRAT_1', 'rapporte_par_patient');
  -- Une séquence lacunaire se pose (aucune règle de séquence) : une reprise
  -- sur la version entière, sans interruption ni début.
  PERFORM pg_temp.evenement('dp_rep_v', 'pd_dp_a1', 'reprise', NULL, NULL, true, NULL);
  PERFORM pg_temp.refuse('6 remplacement qui change de famille',
    $q$SELECT pg_temp.choix('x6a', 'pd_dp_a1', 'refus', 'choix_du_patient', NULL, 'dp_deb', 'ACTION_CONTRAT_1')$q$,
    'P0001', 'un remplacement garde l''action et la famille');
  PERFORM pg_temp.refuse('6 remplacement d''une révision par un événement',
    $q$SELECT pg_temp.evenement('x6b', 'pd_dp_a1', 'debut', NULL, NULL, true, 'dp_rev2')$q$,
    'P0001', 'un remplacement garde l''action et la famille');
  PERFORM pg_temp.refuse('6 remplacement qui change d''action',
    $q$SELECT pg_temp.evenement('x6c', 'pd_dp_a1', 'debut', NULL, NULL, true, 'dp_deb', 'ACTION_CONTRAT_2')$q$,
    'P0001', 'un remplacement garde l''action et la famille');
  PERFORM pg_temp.refuse('6 remplacement qui retire l''action',
    $q$SELECT pg_temp.evenement('x6d', 'pd_dp_a1', 'debut', NULL, NULL, true, 'dp_deb')$q$,
    'P0001', 'un remplacement garde l''action et la famille');
  PERFORM pg_temp.refuse('6 remplacement sur une autre version',
    $q$SELECT pg_temp.evenement('x6e', 'pd_dp_a2', 'debut', NULL, NULL, true, 'dp_deb', 'ACTION_CONTRAT_1')$q$,
    'P0001', 'la ligne visée porte sur une autre version');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne remplacée',
    $q$SELECT pg_temp.evenement('x6f', 'pd_dp_a1', 'interruption', 'autre', NULL, true, 'dp_int2', 'ACTION_CONTRAT_1')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne absente',
    $q$SELECT pg_temp.evenement('x6g', 'pd_dp_a1', 'debut', NULL, NULL, true, 'dp_absente')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  -- Le refus levé : un retrait. Le refus et son retrait restent lisibles.
  PERFORM pg_temp.retirer('dp_ref_r', 'pd_dp_a1', 'dp_ref');
  SELECT count(*) INTO nb FROM decisions_parcours WHERE id IN ('dp_ref', 'dp_ref_r');
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 6 : le refus levé n''a pas laissé ses deux lignes.';
  END IF;
  PERFORM pg_temp.refuse('6 retrait d''un retrait',
    $q$SELECT pg_temp.retirer('x6h', 'pd_dp_a1', 'dp_ref_r')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  PERFORM pg_temp.refuse('6 retrait d''une ligne retirée',
    $q$SELECT pg_temp.retirer('x6i', 'pd_dp_a1', 'dp_ref')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  PERFORM pg_temp.refuse('6 retrait d''une ligne remplacée',
    $q$SELECT pg_temp.retirer('x6j', 'pd_dp_a1', 'dp_rev1')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  -- Une ligne d'un autre dossier n'est pas une tête de CE dossier.
  PERFORM pg_temp.choix('dp_b_ref', 'pd_dp_b1', 'refus', 'choix_du_patient', NULL, NULL, NULL,
                        'rapporte_par_patient', 'autre.praticien@wellneuro.fr', 'PAT_CONTRAT_DP_B');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne d''un autre dossier',
    $q$SELECT pg_temp.choix('x6k', 'pd_dp_a1', 'refus', 'choix_du_patient', NULL, 'dp_b_ref')$q$,
    'P0001', 'seule une ligne en vigueur de ce dossier se remplace ou se retire');
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'decisions_parcours' AND indexname = 'decisions_parcours_id_ligne_remplacee_key'
    AND indexdef NOT LIKE '%WHERE%' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_ligne_remplacee)';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 6 : l''unicité du successeur est absente.';
  END IF;

  -- ── 7. La forme de chaque acte ───────────────────────────────────────────
  -- Sur `pd_dp_a3`, aucune révision n'est en vigueur : le trigger laisse
  -- passer, seul le CHECK nommé refuse.
  PERFORM pg_temp.refuse('7 acte inconnu',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, praticien_email)
       VALUES ('x7a', 'PAT_CONTRAT_DP_A', 'modification', 'pd_dp_a3', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_acte_check');
  PERFORM pg_temp.refuse('7 pose sans nature',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, praticien_email)
       VALUES ('x7b', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_pose');
  PERFORM pg_temp.refuse('7 nature inconnue',
    $q$SELECT pg_temp.choix('x7c', 'pd_dp_a3', 'abandon', NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_nature_check');
  PERFORM pg_temp.refuse('7 retrait avec une action',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_action, id_ligne_remplacee, praticien_email)
       VALUES ('x7d', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', 'ACTION_CONTRAT_1', 'dp_deb', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait avec un motif',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, motif, id_ligne_remplacee, praticien_email)
       VALUES ('x7e', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', 'choix_du_patient', 'dp_deb', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait avec une note',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, note, id_ligne_remplacee, praticien_email)
       VALUES ('x7f', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', 'note', 'dp_deb', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait avec une source',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, source, id_ligne_remplacee, praticien_email)
       VALUES ('x7g', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', 'rapporte_par_patient', 'dp_deb', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait avec une date inconnue',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, evenement_inconnu, id_ligne_remplacee, praticien_email)
       VALUES ('x7h', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', true, 'dp_deb', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait sans cible',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, praticien_email)
       VALUES ('x7i', 'PAT_CONTRAT_DP_A', 'retrait', 'pd_dp_a1', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_retrait');
  PERFORM pg_temp.refuse('7 révision sur une action',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_action, nature, issue, praticien_email)
       VALUES ('x7j', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'ACTION_CONTRAT_1', 'revision', 'maintenir', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_revision');
  PERFORM pg_temp.refuse('7 révision avec une source',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue, source, praticien_email)
       VALUES ('x7k', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'revision', 'maintenir', 'constate_par_praticien', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_revision');
  PERFORM pg_temp.refuse('7 révision sans issue',
    $q$SELECT pg_temp.reviser('x7l', 'pd_dp_a3', NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_forme_revision');
  PERFORM pg_temp.refuse('7 issue inconnue',
    $q$SELECT pg_temp.reviser('x7m', 'pd_dp_a3', 'poursuivre', NULL, NULL)$q$,
    '23514', 'decisions_parcours_forme_revision');
  PERFORM pg_temp.refuse('7 issue sur un choix',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue, motif, source, praticien_email)
       VALUES ('x7n', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'refus', 'maintenir', 'choix_du_patient', 'rapporte_par_patient', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_forme_revision');
  PERFORM pg_temp.refuse('7 choix sans source',
    $q$SELECT pg_temp.choix('x7o', 'pd_dp_a3', 'refus', 'choix_du_patient', NULL, NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_source_check');
  PERFORM pg_temp.refuse('7 événement sans source',
    $q$SELECT pg_temp.evenement('x7p', 'pd_dp_a3', 'debut', NULL, NULL, true, NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_source_check');
  PERFORM pg_temp.refuse('7 source inconnue',
    $q$SELECT pg_temp.choix('x7q', 'pd_dp_a3', 'refus', 'choix_du_patient', NULL, NULL, NULL, 'declare_par_un_tiers')$q$,
    '23514', 'decisions_parcours_source_check');

  -- ── 8. Les motifs ────────────────────────────────────────────────────────
  -- Chaque code de chaque liste passe sur sa nature (chaque pose ouvre son
  -- fil ; `autre` porte sa note).
  FOREACH code IN ARRAY ARRAY['choix_du_patient', 'contrainte_pratique', 'avis_autre_soignant', 'autre'] LOOP
    i := i + 1;
    PERFORM pg_temp.choix('dp_m_ref_' || i, 'pd_dp_a3', 'refus', code, 'note de contrat', NULL);
    PERFORM pg_temp.choix('dp_m_pref_' || i, 'pd_dp_a3', 'preference', code, 'note de contrat', NULL);
  END LOOP;
  FOREACH code IN ARRAY ARRAY['effet_indesirable_rapporte', 'contrainte_pratique', 'choix_du_patient',
                              'avis_autre_soignant', 'evenement_intercurrent', 'autre'] LOOP
    i := i + 1;
    PERFORM pg_temp.evenement('dp_m_int_' || i, 'pd_dp_a3', 'interruption', code, DATE '2026-10-10', false, NULL,
                              p_note => 'note de contrat');
    PERFORM pg_temp.evenement('dp_m_arr_' || i, 'pd_dp_a3', 'arret', code, NULL, true, NULL,
                              p_note => 'note de contrat');
  END LOOP;
  FOREACH code IN ARRAY ARRAY['mise_en_oeuvre_incomplete', 'nouvelle_donnee_au_dossier',
                              'effet_indesirable_rapporte', 'choix_du_patient', 'autre'] LOOP
    i := i + 1;
    tete := pg_temp.tete_revision('pd_dp_a3');
    PERFORM pg_temp.reviser('dp_m_aj_' || i, 'pd_dp_a3', 'ajuster', code, tete, NULL, 'note de contrat');
    PERFORM pg_temp.reviser('dp_m_ar_' || i, 'pd_dp_a3', 'arreter', code, 'dp_m_aj_' || i, NULL, 'note de contrat');
  END LOOP;
  PERFORM pg_temp.reviser('dp_m_ma', 'pd_dp_a3', 'maintenir', NULL, pg_temp.tete_revision('pd_dp_a3'));
  -- Les refus : aucun ne laisse de tête neuve.
  tete := pg_temp.tete_revision('pd_dp_a3');
  PERFORM pg_temp.refuse('8 refus avec un motif d''interruption',
    $q$SELECT pg_temp.choix('x8a', 'pd_dp_a3', 'refus', 'evenement_intercurrent', NULL, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 refus sans motif',
    $q$SELECT pg_temp.choix('x8b', 'pd_dp_a3', 'refus', NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 interruption avec un motif de révision',
    $q$SELECT pg_temp.evenement('x8c', 'pd_dp_a3', 'interruption', 'mise_en_oeuvre_incomplete', NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 arrêt sans motif',
    $q$SELECT pg_temp.evenement('x8d', 'pd_dp_a3', 'arret', NULL, NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 début avec un motif',
    $q$SELECT pg_temp.evenement('x8e', 'pd_dp_a3', 'debut', 'choix_du_patient', NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 reprise avec un motif',
    $q$SELECT pg_temp.evenement('x8f', 'pd_dp_a3', 'reprise', 'choix_du_patient', NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 maintien avec un motif',
    format($q$SELECT pg_temp.reviser('x8g', 'pd_dp_a3', 'maintenir', 'choix_du_patient', %L)$q$, tete),
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 ajustement avec un motif de choix',
    format($q$SELECT pg_temp.reviser('x8h', 'pd_dp_a3', 'ajuster', 'contrainte_pratique', %L)$q$, tete),
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 arrêt de révision sans motif',
    format($q$SELECT pg_temp.reviser('x8i', 'pd_dp_a3', 'arreter', NULL, %L)$q$, tete),
    '23514', 'decisions_parcours_motif_selon_nature');
  -- Aucun motif d'efficacité (DC-39).
  PERFORM pg_temp.refuse('8 refus « inefficace »',
    $q$SELECT pg_temp.choix('x8j', 'pd_dp_a3', 'refus', 'inefficace', NULL, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 arrêt « objectif atteint »',
    $q$SELECT pg_temp.evenement('x8k', 'pd_dp_a3', 'arret', 'objectif_atteint', NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_motif_selon_nature');
  PERFORM pg_temp.refuse('8 révision « amélioration »',
    format($q$SELECT pg_temp.reviser('x8l', 'pd_dp_a3', 'arreter', 'amelioration', %L)$q$, tete),
    '23514', 'decisions_parcours_motif_selon_nature');

  -- ── 9. La note ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('9 « autre » sans note',
    $q$SELECT pg_temp.choix('x9a', 'pd_dp_a3', 'refus', 'autre', NULL, NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.refuse('9 « autre » d''interruption sans note',
    $q$SELECT pg_temp.evenement('x9b', 'pd_dp_a3', 'interruption', 'autre', NULL, true, NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.refuse('9 préférence sans note',
    $q$SELECT pg_temp.choix('x9c', 'pd_dp_a3', 'preference', 'choix_du_patient', NULL, NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.refuse('9 note faite d''espaces',
    $q$SELECT pg_temp.choix('x9d', 'pd_dp_a3', 'refus', 'choix_du_patient', '   ', NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.refuse('9 note faite de tabulations',
    $q$SELECT pg_temp.choix('x9e', 'pd_dp_a3', 'refus', 'choix_du_patient', E'\t\t', NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.refuse('9 note de 2001 caractères',
    $q$SELECT pg_temp.choix('x9f', 'pd_dp_a3', 'refus', 'choix_du_patient', repeat('n', 2001), NULL)$q$,
    '23514', 'decisions_parcours_note_forme');
  PERFORM pg_temp.choix('dp_n2000', 'pd_dp_a3', 'refus', 'choix_du_patient', repeat('n', 2000), NULL);

  -- ── 10. La date de l'événement ───────────────────────────────────────────
  PERFORM pg_temp.refuse('10 début sans date ni « inconnue »',
    $q$SELECT pg_temp.evenement('x10a', 'pd_dp_a3', 'debut', NULL, NULL, NULL, NULL)$q$,
    '23514', 'decisions_parcours_evenement_selon_nature');
  PERFORM pg_temp.refuse('10 début daté et « inconnue »',
    $q$SELECT pg_temp.evenement('x10b', 'pd_dp_a3', 'debut', NULL, DATE '2026-10-05', true, NULL)$q$,
    '23514', 'decisions_parcours_evenement_selon_nature');
  PERFORM pg_temp.refuse('10 début connu sans date',
    $q$SELECT pg_temp.evenement('x10c', 'pd_dp_a3', 'debut', NULL, NULL, false, NULL)$q$,
    '23514', 'decisions_parcours_evenement_selon_nature');
  PERFORM pg_temp.refuse('10 date seule, sans le drapeau',
    $q$SELECT pg_temp.evenement('x10d', 'pd_dp_a3', 'reprise', NULL, DATE '2026-10-05', NULL, NULL)$q$,
    '23514', 'decisions_parcours_evenement_selon_nature');
  PERFORM pg_temp.refuse('10 choix daté',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, motif, evenement_le, evenement_inconnu, source, praticien_email)
       VALUES ('x10e', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'refus', 'choix_du_patient', DATE '2026-10-05', false, 'rapporte_par_patient', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_evenement_selon_nature');
  PERFORM pg_temp.refuse('10 révision de date inconnue',
    format($q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue, evenement_inconnu, id_ligne_remplacee, praticien_email)
       VALUES ('x10f', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'revision', 'maintenir', true, %L, 'praticien@wellneuro.fr')$q$, tete),
    '23514', 'decisions_parcours_evenement_selon_nature');

  -- ── 11. La version suivante, l'action ────────────────────────────────────
  PERFORM pg_temp.refuse('11 version suivante sur un maintien',
    format($q$SELECT pg_temp.reviser('x11a', 'pd_dp_a3', 'maintenir', NULL, %L, 'pd_dp_a2')$q$, tete),
    '23514', 'decisions_parcours_version_suivante_forme');
  PERFORM pg_temp.refuse('11 version suivante sur un arrêt',
    format($q$SELECT pg_temp.reviser('x11b', 'pd_dp_a3', 'arreter', 'choix_du_patient', %L, 'pd_dp_a2')$q$, tete),
    '23514', 'decisions_parcours_version_suivante_forme');
  PERFORM pg_temp.refuse('11 version suivante sur un choix',
    $q$INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, motif, source, id_version_suivante, praticien_email)
       VALUES ('x11c', 'PAT_CONTRAT_DP_A', 'pose', 'pd_dp_a3', 'refus', 'choix_du_patient', 'rapporte_par_patient', 'pd_dp_a2', 'praticien@wellneuro.fr')$q$,
    '23514', 'decisions_parcours_version_suivante_forme');
  PERFORM pg_temp.refuse('11 version suivante = version révisée',
    format($q$SELECT pg_temp.reviser('x11d', 'pd_dp_a3', 'ajuster', 'choix_du_patient', %L, 'pd_dp_a3')$q$, tete),
    '23514', 'decisions_parcours_version_suivante_forme');
  -- Facultative à la pose (`dp_rev2` l'est), posée ensuite par remplacement.
  -- `pd_dp_a4` n'est citée que comme version suivante (cas 13).
  PERFORM pg_temp.reviser('dp_rev3', 'pd_dp_a1', 'ajuster', 'mise_en_oeuvre_incomplete', 'dp_rev2', 'pd_dp_a4');
  IF (SELECT id_version_suivante FROM decisions_parcours WHERE id = 'dp_rev3') IS DISTINCT FROM 'pd_dp_a4' THEN
    RAISE EXCEPTION 'CONTRAT — 11 : la version suivante posée par remplacement n''est pas relue.';
  END IF;
  PERFORM pg_temp.refuse('11 action faite de blancs',
    $q$SELECT pg_temp.choix('x11e', 'pd_dp_a3', 'refus', 'choix_du_patient', NULL, NULL, E' \t ')$q$,
    '23514', 'decisions_parcours_action_forme');
  PERFORM pg_temp.refuse('11 action de 201 caractères',
    $q$SELECT pg_temp.choix('x11f', 'pd_dp_a3', 'refus', 'choix_du_patient', NULL, NULL, repeat('a', 201))$q$,
    '23514', 'decisions_parcours_action_forme');

  -- Tout ce qui est posé jusqu'ici tient en fin de transaction.
  PERFORM pg_temp.clore();

  -- ── 12. Les versions ne bougent pas ──────────────────────────────────────
  IF pg_temp.empreinte_versions() IS DISTINCT FROM avant THEN
    RAISE EXCEPTION 'CONTRAT — 12 : une version, une approbation ou un check-in a changé sous les décisions de parcours.';
  END IF;

  -- ── 13. Figée ; l'effacement nommé ───────────────────────────────────────
  PERFORM pg_temp.refuse('13 UPDATE',
    $q$UPDATE decisions_parcours SET motif = 'autre' WHERE id = 'dp_arr'$q$,
    'P0001', 'decisions_parcours : une ligne est figée');
  PERFORM pg_temp.refuse('13 TRUNCATE',
    $q$TRUNCATE decisions_parcours$q$,
    'P0001', 'decisions_parcours : une ligne est figée');
  -- La ligne supprimée hors effacement est une tête : rien ne la désigne,
  -- seule la garde de fin de transaction peut la refuser.
  PERFORM pg_temp.refuse('13 suppression hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('dp_pref')$q$,
    'P0001', 'decisions_parcours : suppression refusée');
  PERFORM pg_temp.refuse('13 version citée effacée avant ses décisions',
    $q$DELETE FROM protocol_drafts WHERE id = 'pd_dp_a1'$q$,
    '23503', 'decisions_parcours_id_version_fkey');
  PERFORM pg_temp.refuse('13 version suivante effacée avant sa révision',
    $q$DELETE FROM protocol_drafts WHERE id = 'pd_dp_a4'$q$,
    '23503', 'decisions_parcours_id_version_suivante_fkey');
  DELETE FROM decisions_parcours WHERE id_patient = 'PAT_CONTRAT_DP_A';
  SELECT count(*) INTO nb FROM decisions_parcours WHERE id_patient = 'PAT_CONTRAT_DP_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : l''effacement a laissé % ligne(s).', nb;
  END IF;
  -- Les versions, puis le dossier : le contrôle différé ne refuse plus rien,
  -- le dossier ne survit pas.
  DELETE FROM protocol_drafts WHERE id_patient = 'PAT_CONTRAT_DP_A';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_DP_A';
  PERFORM pg_temp.clore();

  -- ── 14. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f' AND conrelid = 'public.decisions_parcours'::regclass
    AND ((conname = 'decisions_parcours_id_patient_fkey' AND confdeltype = 'r')
      OR (conname = 'decisions_parcours_id_version_fkey' AND confdeltype = 'r')
      OR (conname = 'decisions_parcours_id_version_suivante_fkey' AND confdeltype = 'r')
      OR (conname = 'decisions_parcours_id_ligne_remplacee_fkey' AND confdeltype = 'a'));
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % clé(s) étrangère(s) sur 4 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c' AND conrelid = 'public.decisions_parcours'::regclass AND conname IN (
    'decisions_parcours_acte_check', 'decisions_parcours_forme_retrait', 'decisions_parcours_forme_pose',
    'decisions_parcours_nature_check', 'decisions_parcours_forme_revision', 'decisions_parcours_source_check',
    'decisions_parcours_motif_selon_nature', 'decisions_parcours_note_forme',
    'decisions_parcours_evenement_selon_nature', 'decisions_parcours_version_suivante_forme',
    'decisions_parcours_action_forme', 'decisions_parcours_auteur_forme',
    'decisions_parcours_ne_se_remplace_pas');
  IF nb <> 13 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % CHECK sur 13 sont présents.', nb;
  END IF;
  -- Les gardes que le trigger devance (voir l'en-tête) : leur clause est
  -- relue.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c' AND conrelid = 'public.decisions_parcours'::regclass
    AND ((conname = 'decisions_parcours_auteur_forme'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'decisions_parcours_ne_se_remplace_pas'
          AND position('id_ligne_remplacee IS DISTINCT FROM id' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % clause(s) relue(s) sur 2 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'decisions_parcours' AND indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'decisions_parcours_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'decisions_parcours_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'decisions_parcours_id_version_idx' AND indexdef LIKE '%(id_version)')
      OR (indexname = 'decisions_parcours_id_version_suivante_idx' AND indexdef LIKE '%(id_version_suivante)'));
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % index sur 4 sont présents, sans prédicat.', nb;
  END IF;
  -- Trois triggers BEFORE, actifs : insertion et UPDATE par ligne, TRUNCATE
  -- par instruction.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND t.tgrelid = 'public.decisions_parcours'::regclass
    AND ((t.tgname = 'decisions_parcours_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname = 'decisions_parcours_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname = 'decisions_parcours_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % trigger(s) BEFORE sur 3 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- La suppression nommée : trigger de CONTRAINTE, AFTER DELETE par ligne,
  -- différable et différé par défaut.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O' AND t.tgconstraint <> 0
    AND t.tgdeferrable AND t.tginitdeferred
    AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1 AND (t.tgtype & 8) = 8
    AND t.tgrelid = 'public.decisions_parcours'::regclass
    AND t.tgname = 'decisions_parcours_suppression_nommee';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la suppression nommée n''est pas un trigger de contrainte différé.';
  END IF;
  -- REPEATABLE READ refusé, puis les verrous, avant le contrôle du praticien
  -- et des têtes. Une session seule n'éprouve pas la concurrence : elle
  -- relit l'appel et sa place.
  IF pg_get_functiondef('public.decisions_parcours_avant_insertion()'::regprocedure)
       !~ '''repeatable read''[^$]*FOR KEY SHARE;\s*PERFORM pg_advisory_xact_lock\(343, hashtext\(NEW\.id_patient \|\| ''\|decision_parcours''\)\);[^$]*seul le praticien du dossier[^$]*SELECT d\.id INTO tete[^$]*SELECT c\.acte, c\.id_version, c\.id_action, c\.nature' THEN
    RAISE EXCEPTION 'CONTRAT — 14 : REPEATABLE READ refusé, puis dossier et décisions verrouillés AVANT les contrôles : l''ordre n''y est plus.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.decisions_parcours_avant_insertion()'::regprocedure,
                  'public.decisions_parcours_famille(text)'::regprocedure,
                  'public.donnees_parcours_figee()'::regprocedure,
                  'public.donnees_parcours_suppression_nommee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) sur 4 ont le search_path épinglé.', nb;
  END IF;

  -- ── 15. Liste blanche des colonnes, RLS et fonctions ─────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'decisions_parcours';
  IF colonnes <> ARRAY['acte', 'acte_le', 'evenement_inconnu', 'evenement_le', 'id', 'id_action',
                       'id_ligne_remplacee', 'id_patient', 'id_version', 'id_version_suivante', 'issue',
                       'motif', 'nature', 'note', 'ordre', 'praticien_email', 'source'] THEN
    RAISE EXCEPTION 'CONTRAT — 15 : colonnes inattendues sur les décisions de parcours : %', colonnes;
  END IF;
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid = 'public.decisions_parcours'::regclass AND relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'decisions_parcours';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('decisions_parcours_avant_insertion', 'decisions_parcours_famille')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 15 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat decisions_parcours_v1 : quinze promesses tenues.';
END;
$$;

ROLLBACK;
