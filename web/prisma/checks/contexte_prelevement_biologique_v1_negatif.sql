-- Contrat du contexte de prélèvement d'un résultat biologique ([[D-497]],
-- BP-05, LOT-05 ; DC-46). Contrat négatif PAR FORME (§6), critère de fin de
-- F20.
--
-- La table promet QUATORZE choses, et ce fichier les éprouve TOUTES :
--   0. elle naît VIDE (relu ici sur la base du CI ; en production, par le
--      constat par conteneur) ;
--   1. une ligne réduite au rattachement s'écrit, et chaque champ y vaut
--      `inconnu` : sept champs, aucune valeur, aucune unité ;
--   2. l'instant et l'`ordre` sont posés par la BASE — l'instant en UTC,
--      même sous une session en Europe/Paris ; une date antidatée et un
--      ordre fournis sont ignorés ; l'ordre croît ;
--   3. les valeurs renseignées passent, bornes basses comprises (jour 1,
--      délai 0), dans les deux unités, et AUCUNE borne haute n'existe ;
--      `oui` et `non` passent sur les cinq déclarations ;
--   4. le résultat d'un AUTRE dossier, ou un résultat absent, est refusé ;
--   5. une CORRECTION est refusée : le contexte se rattache à la racine du
--      fil, qui l'accepte même corrigée ;
--   6. seul le praticien DU DOSSIER écrit (la casse ne compte pas) ;
--   7. DÉCLARATION : hors de `oui`, `non`, `inconnu`, ou nulle — refusée,
--      sur chacun des cinq champs, par sa contrainte ;
--   8. FAIT ENTIER (jour du cycle) : un état hors liste ou nul ; une valeur
--      avec `inconnu` ; une valeur absente avec `renseigne` ; un jour < 1 ;
--   9. DURÉE (délai) : un état hors liste ou nul ; une valeur ou une unité
--      avec `inconnu` ; une valeur absente avec `renseigne` ; un délai sans
--      unité, ou une unité sans délai ; un délai < 0 ; une unité hors de
--      `heure`, `jour` ;
--  10. RATTACHEMENT : deux ouvertures sur une racine, deux remplacements
--      d'une même ligne — refusés par les index ; un remplacement qui vise
--      une autre racine, un autre dossier, ou une ligne absente — refusé par
--      le trigger ; après remplacements, UNE tête par racine ;
--  11. FIGÉE ET EFFAÇABLE : UPDATE et TRUNCATE refusés ; une tête supprimée
--      quand son résultat et son dossier survivent, refusée en fin de
--      transaction ; une ligne remplacée ne se supprime pas sous son
--      successeur ; le résultat ne s'efface pas avant ses contextes
--      (RESTRICT) ; les contextes d'un résultat partent AVEC lui, dossier
--      conservé (ramassage E2E) ; l'effacement NOMMÉ passe, en une
--      instruction, puis le dossier ;
--  12. les FK ont la règle annoncée, les quatorze CHECK sont présents (et
--      aucun n'appelle `btrim`), les cinq index aussi — le partiel avec son
--      prédicat —, les quatre triggers, le verrou du dossier précède les
--      contrôles, la racine se lit par la remontée de BP-09, et les trois
--      fonctions ont leur `search_path` épinglé ;
--  13. la table porte EXACTEMENT ses dix-sept colonnes (liste blanche) :
--      aucune valeur, aucun analyte, aucune date recopiés, AUCUN TEXTE
--      LIBRE — toute colonne neuve s'arbitre ; les sept défauts disent
--      `inconnu` ;
--  14. la RLS deny-all est active et sans policy (posture `D-005`), et
--      aucune des trois fonctions n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST RECONNU à son code ET à son motif (message du trigger, nom
-- de la contrainte ou de la colonne) ; chaque CHECK est éprouvé seul. Trois
-- refus du trigger ont un second gardien : « résultat absent » et « ligne
-- absente » (la clé étrangère refuserait ensuite, en 23503 — le contrat
-- rougirait sur le code), « autre dossier » (un résultat n'a qu'un dossier :
-- la ligne d'un autre dossier est aussi d'une autre racine). Deux CHECK ne
-- s'isolent pas, parce que le trigger refuse avant eux : `praticien_non_vide`
-- (un e-mail blanc n'est pas celui du dossier) et `ne_se_remplace_pas` (une
-- ligne n'existe pas encore quand elle se désignerait). Ils restent la garde
-- si le trigger tombait, et le cas 12 relit leur clause.
--
-- Identités de fixture seulement. Tout se déroule dans une transaction annulée
-- à la fin.
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

-- Le contrôle de fin de transaction, joué sur-le-champ : `SET CONSTRAINTS
-- … IMMEDIATE` déclenche ceux en attente. Appelé dans `refuse`, il s'y annule
-- avec l'acte qu'il juge.
CREATE FUNCTION pg_temp.clore()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET CONSTRAINTS contextes_prelevement_suppression_nommee IMMEDIATE;
  SET CONSTRAINTS contextes_prelevement_suppression_nommee DEFERRED;
END;
$$;

-- Une suppression hors effacement, jugée sur-le-champ.
CREATE FUNCTION pg_temp.supprimer_puis_clore(p_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM contextes_prelevement WHERE id = p_id;
  PERFORM pg_temp.clore();
END;
$$;

-- ── 0. La table naît vide ───────────────────────────────────────────────────
DO $$
DECLARE
  nb integer;
BEGIN
  SELECT count(*) INTO nb FROM contextes_prelevement;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 0 : la table porte % ligne(s) avant toute fixture ; elle naît vide.', nb;
  END IF;
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr), une racine par date de prélèvement :
--   `res_c1` à `res_c9` seuls ; `res_c2` corrigé par `res_c2_corr`.
-- Dossier B, d'un AUTRE praticien : `res_cb` seul.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_ctx_a', 'PAT_CONTRAT_CTX_A', 'sophie.nicola+contexte@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_ctx_b', 'PAT_CONTRAT_CTX_B', 'jennifer.martin+contexte@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
VALUES ('bio_contrat_ctx', 'BIO_CONTRAT_CTX', 'Analyte de contrat', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP);

INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id) VALUES
  ('res_c1', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c2', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c2_corr', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 2, 'mg/L', TIMESTAMP '2026-09-02 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', 'res_c2'),
  ('res_c3', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-03 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c4', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-04 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c5', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-05 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c6', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-06 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c7', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-07 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c8', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-08 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_c9', 'PAT_CONTRAT_CTX_A', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-09 08:00:00', 'saisie_praticien', 'praticien@wellneuro.fr', NULL),
  ('res_cb', 'PAT_CONTRAT_CTX_B', 'BIO_CONTRAT_CTX', 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', 'autre.praticien@wellneuro.fr', NULL);

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  champ text;
BEGIN
  -- ── 1 et 2. Une ouverture réduite au rattachement ────────────────────────
  INSERT INTO contextes_prelevement (id, ordre, id_patient, id_resultat, praticien_email, pose_le)
  VALUES ('ctx_c1', 999999, 'PAT_CONTRAT_CTX_A', 'res_c1', 'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM contextes_prelevement WHERE id = 'ctx_c1';
  IF ligne.id_resultat IS DISTINCT FROM 'res_c1'
     OR ligne.a_jeun IS DISTINCT FROM 'inconnu'
     OR ligne.supplementation_arretee IS DISTINCT FROM 'inconnu'
     OR ligne.traitement_interferent IS DISTINCT FROM 'inconnu'
     OR ligne.episode_inflammatoire IS DISTINCT FROM 'inconnu'
     OR ligne.grossesse IS DISTINCT FROM 'inconnu'
     OR ligne.jour_cycle_etat IS DISTINCT FROM 'inconnu' OR ligne.jour_cycle IS NOT NULL
     OR ligne.delai_derniere_prise_etat IS DISTINCT FROM 'inconnu'
     OR ligne.delai_derniere_prise IS NOT NULL OR ligne.delai_derniere_prise_unite IS NOT NULL
     OR ligne.id_ligne_remplacee IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la ligne réduite au rattachement ne vaut pas « inconnu » partout.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé.';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.pose_le;
  IF ligne.pose_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;

  -- ── 3. Les valeurs renseignées, sans borne haute ─────────────────────────
  -- Bornes basses ; la casse de l'e-mail ne compte pas (cas 6).
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
    jour_cycle_etat, jour_cycle, delai_derniere_prise_etat, delai_derniere_prise, delai_derniere_prise_unite)
  VALUES ('ctx_c3', 'PAT_CONTRAT_CTX_A', 'res_c3', 'Praticien@WellNeuro.fr',
    'renseigne', 1, 'renseigne', 0, 'heure');
  SELECT ordre INTO ligne FROM contextes_prelevement WHERE id = 'ctx_c3';
  IF ligne.ordre <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''une ligne à la suivante.';
  END IF;
  -- Aucune borne haute : des valeurs que nulle consigne ne retiendrait.
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
    jour_cycle_etat, jour_cycle, delai_derniere_prise_etat, delai_derniere_prise, delai_derniere_prise_unite)
  VALUES ('ctx_c4', 'PAT_CONTRAT_CTX_A', 'res_c4', 'praticien@wellneuro.fr',
    'renseigne', 1000, 'renseigne', 100000, 'jour');
  -- `oui` puis `non` sur les cinq déclarations.
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
    a_jeun, supplementation_arretee, traitement_interferent, episode_inflammatoire, grossesse)
  VALUES ('ctx_c7', 'PAT_CONTRAT_CTX_A', 'res_c7', 'praticien@wellneuro.fr',
    'oui', 'oui', 'oui', 'oui', 'oui');
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
    a_jeun, supplementation_arretee, traitement_interferent, episode_inflammatoire, grossesse)
  VALUES ('ctx_c8', 'PAT_CONTRAT_CTX_A', 'res_c8', 'praticien@wellneuro.fr',
    'non', 'non', 'non', 'non', 'non');

  -- ── 4. Le résultat du dossier ────────────────────────────────────────────
  PERFORM pg_temp.refuse('4 résultat d''un autre dossier',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
       VALUES ('x4a', 'PAT_CONTRAT_CTX_A', 'res_cb', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');
  PERFORM pg_temp.refuse('4 résultat absent',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
       VALUES ('x4b', 'PAT_CONTRAT_CTX_A', 'res_absent', 'praticien@wellneuro.fr')$q$,
    'P0001', 'n''est pas un résultat de ce dossier');

  -- ── 5. La racine, jamais une correction ──────────────────────────────────
  PERFORM pg_temp.refuse('5 correction plutôt que racine',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
       VALUES ('x5', 'PAT_CONTRAT_CTX_A', 'res_c2_corr', 'praticien@wellneuro.fr')$q$,
    'P0001', 'le contexte se rattache à la ligne racine du fil');
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, a_jeun)
  VALUES ('ctx_c2', 'PAT_CONTRAT_CTX_A', 'res_c2', 'praticien@wellneuro.fr', 'oui');

  -- ── 6. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('6 autre praticien',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
       VALUES ('x6', 'PAT_CONTRAT_CTX_A', 'res_c5', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  -- Le dossier B, par son praticien : il sert au cas 10.
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
  VALUES ('ctx_cb', 'PAT_CONTRAT_CTX_B', 'res_cb', 'autre.praticien@wellneuro.fr');

  -- ── 7. Déclaration : liste fermée, jamais nulle ──────────────────────────
  -- `res_c5` n'a aucun contexte : seul le champ éprouvé peut faire refuser.
  FOREACH champ IN ARRAY ARRAY['a_jeun', 'supplementation_arretee', 'traitement_interferent',
                               'episode_inflammatoire', 'grossesse'] LOOP
    PERFORM pg_temp.refuse('7 ' || champ || ' hors liste',
      format($q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, %I)
                VALUES ('x7a', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'peut_etre')$q$, champ),
      '23514', 'contextes_prelevement_' || champ || '_check');
    PERFORM pg_temp.refuse('7 ' || champ || ' nul',
      format($q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, %I)
                VALUES ('x7b', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', NULL)$q$, champ),
      '23502', champ);
  END LOOP;

  -- ── 8. Fait entier : le jour du cycle ────────────────────────────────────
  PERFORM pg_temp.refuse('8 état hors liste',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat)
       VALUES ('x8a', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'approximatif')$q$,
    '23514', 'contextes_prelevement_jour_cycle_etat_check');
  PERFORM pg_temp.refuse('8 état nul',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat)
       VALUES ('x8b', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', NULL)$q$,
    '23502', 'jour_cycle_etat');
  PERFORM pg_temp.refuse('8 valeur avec inconnu',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat, jour_cycle)
       VALUES ('x8c', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'inconnu', 5)$q$,
    '23514', 'contextes_prelevement_jour_cycle_selon_etat');
  PERFORM pg_temp.refuse('8 valeur absente avec renseigne',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat)
       VALUES ('x8d', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne')$q$,
    '23514', 'contextes_prelevement_jour_cycle_selon_etat');
  PERFORM pg_temp.refuse('8 jour 0',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat, jour_cycle)
       VALUES ('x8e', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', 0)$q$,
    '23514', 'contextes_prelevement_jour_cycle_borne');
  PERFORM pg_temp.refuse('8 jour négatif',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, jour_cycle_etat, jour_cycle)
       VALUES ('x8f', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', -3)$q$,
    '23514', 'contextes_prelevement_jour_cycle_borne');

  -- ── 9. Durée : le délai depuis la dernière prise ─────────────────────────
  PERFORM pg_temp.refuse('9 état hors liste',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, delai_derniere_prise_etat)
       VALUES ('x9a', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'approximatif')$q$,
    '23514', 'contextes_prelevement_delai_etat_check');
  PERFORM pg_temp.refuse('9 état nul',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, delai_derniere_prise_etat)
       VALUES ('x9b', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', NULL)$q$,
    '23502', 'delai_derniere_prise_etat');
  PERFORM pg_temp.refuse('9 valeur et unité avec inconnu',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise, delai_derniere_prise_unite)
       VALUES ('x9c', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'inconnu', 12, 'heure')$q$,
    '23514', 'contextes_prelevement_delai_selon_etat');
  PERFORM pg_temp.refuse('9 unité seule avec inconnu',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise_unite)
       VALUES ('x9d', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'inconnu', 'heure')$q$,
    '23514', 'contextes_prelevement_delai_selon_etat');
  PERFORM pg_temp.refuse('9 valeur absente avec renseigne',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise_unite)
       VALUES ('x9e', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', 'jour')$q$,
    '23514', 'contextes_prelevement_delai_selon_etat');
  PERFORM pg_temp.refuse('9 délai sans unité',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise)
       VALUES ('x9f', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', 12)$q$,
    '23514', 'contextes_prelevement_delai_selon_etat');
  PERFORM pg_temp.refuse('9 délai négatif',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise, delai_derniere_prise_unite)
       VALUES ('x9g', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', -1, 'heure')$q$,
    '23514', 'contextes_prelevement_delai_borne');
  PERFORM pg_temp.refuse('9 unité hors liste',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email,
         delai_derniere_prise_etat, delai_derniere_prise, delai_derniere_prise_unite)
       VALUES ('x9h', 'PAT_CONTRAT_CTX_A', 'res_c5', 'praticien@wellneuro.fr', 'renseigne', 30, 'minute')$q$,
    '23514', 'contextes_prelevement_delai_unite_check');

  -- ── 10. Rattachement : une tête par racine ───────────────────────────────
  PERFORM pg_temp.refuse('10 seconde ouverture sur une racine',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email)
       VALUES ('x10a', 'PAT_CONTRAT_CTX_A', 'res_c1', 'praticien@wellneuro.fr')$q$,
    '23505', 'contextes_prelevement_ouverture_par_racine_key');
  -- Corriger : remplacer la tête, deux fois de suite.
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee, a_jeun)
  VALUES ('ctx_c1b', 'PAT_CONTRAT_CTX_A', 'res_c1', 'praticien@wellneuro.fr', 'ctx_c1', 'oui');
  INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee, a_jeun, grossesse)
  VALUES ('ctx_c1c', 'PAT_CONTRAT_CTX_A', 'res_c1', 'praticien@wellneuro.fr', 'ctx_c1b', 'oui', 'non');
  PERFORM pg_temp.refuse('10 second remplacement d''une même ligne',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee)
       VALUES ('x10b', 'PAT_CONTRAT_CTX_A', 'res_c1', 'praticien@wellneuro.fr', 'ctx_c1b')$q$,
    '23505', 'contextes_prelevement_id_ligne_remplacee_key');
  PERFORM pg_temp.refuse('10 remplacement d''une autre racine',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee)
       VALUES ('x10c', 'PAT_CONTRAT_CTX_A', 'res_c6', 'praticien@wellneuro.fr', 'ctx_c1c')$q$,
    'P0001', 'un remplacement vise une ligne de la même racine');
  PERFORM pg_temp.refuse('10 remplacement d''une ligne d''un autre dossier',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee)
       VALUES ('x10d', 'PAT_CONTRAT_CTX_A', 'res_c6', 'praticien@wellneuro.fr', 'ctx_cb')$q$,
    'P0001', 'un remplacement vise une ligne de la même racine');
  PERFORM pg_temp.refuse('10 remplacement d''une ligne absente',
    $q$INSERT INTO contextes_prelevement (id, id_patient, id_resultat, praticien_email, id_ligne_remplacee)
       VALUES ('x10e', 'PAT_CONTRAT_CTX_A', 'res_c6', 'praticien@wellneuro.fr', 'ctx_absent')$q$,
    'P0001', 'un remplacement vise une ligne de la même racine');
  -- Une tête par racine portant un contexte : la ligne que rien ne remplace.
  SELECT count(*) INTO nb FROM (
    SELECT c.id_resultat
    FROM contextes_prelevement c
    WHERE NOT EXISTS (SELECT 1 FROM contextes_prelevement s WHERE s.id_ligne_remplacee = c.id)
    GROUP BY c.id_resultat
    HAVING count(*) <> 1
  ) AS t;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 10 : % racine(s) portent zéro ou plusieurs têtes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM contextes_prelevement c
  WHERE c.id_resultat = 'res_c1'
    AND NOT EXISTS (SELECT 1 FROM contextes_prelevement s WHERE s.id_ligne_remplacee = c.id)
    AND c.id = 'ctx_c1c';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 10 : la tête de res_c1 n''est pas la dernière ligne qui la remplace.';
  END IF;

  -- ── 11. Figée, mais effaçable ────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 UPDATE',
    $q$UPDATE contextes_prelevement SET a_jeun = 'non' WHERE id = 'ctx_c1c'$q$,
    'P0001', 'un contexte de prélèvement est figé');
  PERFORM pg_temp.refuse('11 TRUNCATE',
    $q$TRUNCATE contextes_prelevement$q$,
    'P0001', 'un contexte de prélèvement est figé');
  -- Une tête : rien ne la désigne, seule la garde de fin de transaction peut
  -- la refuser.
  PERFORM pg_temp.refuse('11 tête supprimée hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('ctx_c1c')$q$,
    'P0001', 'contextes_prelevement : suppression refusée');
  PERFORM pg_temp.refuse('11 ligne remplacée supprimée sous son successeur',
    $q$DELETE FROM contextes_prelevement WHERE id = 'ctx_c1b'$q$,
    '23503', 'contextes_prelevement_id_ligne_remplacee_fkey');
  PERFORM pg_temp.refuse('11 résultat effacé avant ses contextes',
    $q$DELETE FROM resultats_biologiques WHERE id = 'res_c3'$q$,
    '23503', 'contextes_prelevement_id_resultat_fkey');
  -- Les contextes d'un résultat partent AVEC lui, le dossier conservé : le
  -- ramassage des résultats saisis par les E2E (revue `wn-reviewer`, A1).
  -- La chaîne entière de `res_c1`, en une instruction, puis le résultat.
  DELETE FROM contextes_prelevement WHERE id_resultat = 'res_c1';
  DELETE FROM resultats_biologiques WHERE id = 'res_c1';
  PERFORM pg_temp.clore();
  SELECT count(*) INTO nb FROM patients WHERE id_patient = 'PAT_CONTRAT_CTX_A';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : le dossier devait survivre au ramassage d''un résultat.';
  END IF;
  DELETE FROM contextes_prelevement WHERE id_patient = 'PAT_CONTRAT_CTX_A';
  SELECT count(*) INTO nb FROM contextes_prelevement WHERE id_patient = 'PAT_CONTRAT_CTX_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 11 : l''effacement en une instruction a laissé % ligne(s).', nb;
  END IF;
  -- Les résultats, puis le dossier : la garde différée ne refuse plus rien,
  -- le dossier ne survit pas.
  DELETE FROM resultats_biologiques WHERE id_patient = 'PAT_CONTRAT_CTX_A';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_CTX_A';
  PERFORM pg_temp.clore();

  -- ── 12. Clés, CHECK, index, triggers, verrou ─────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.contextes_prelevement'::regclass AND contype = 'f'
    AND ((conname = 'contextes_prelevement_id_patient_fkey' AND confdeltype = 'r'
          AND confrelid = 'public.patients'::regclass)
      OR (conname = 'contextes_prelevement_id_resultat_fkey' AND confdeltype = 'r'
          AND confrelid = 'public.resultats_biologiques'::regclass)
      OR (conname = 'contextes_prelevement_id_ligne_remplacee_fkey' AND confdeltype = 'a'
          AND confrelid = 'public.contextes_prelevement'::regclass));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clé(s) étrangère(s) sur 3 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.contextes_prelevement'::regclass AND contype = 'c'
    AND conname IN ('contextes_prelevement_a_jeun_check',
                    'contextes_prelevement_supplementation_arretee_check',
                    'contextes_prelevement_traitement_interferent_check',
                    'contextes_prelevement_episode_inflammatoire_check',
                    'contextes_prelevement_grossesse_check',
                    'contextes_prelevement_jour_cycle_etat_check',
                    'contextes_prelevement_jour_cycle_selon_etat',
                    'contextes_prelevement_jour_cycle_borne',
                    'contextes_prelevement_delai_etat_check',
                    'contextes_prelevement_delai_selon_etat',
                    'contextes_prelevement_delai_borne',
                    'contextes_prelevement_delai_unite_check',
                    'contextes_prelevement_praticien_non_vide',
                    'contextes_prelevement_ne_se_remplace_pas');
  IF nb <> 14 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK sur 14 sont présents.', nb;
  END IF;
  -- Aucun CHECK de la table n'appelle `btrim` : `btrim/1` ne retire que
  -- l'espace ASCII.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.contextes_prelevement'::regclass AND contype = 'c'
    AND position('btrim' IN pg_get_constraintdef(oid)) > 0;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % CHECK appelle(nt) btrim.', nb;
  END IF;
  -- Les deux CHECK que le trigger devance (voir l'en-tête) : leur clause est
  -- relue, faute de pouvoir l'éprouver par un refus isolé.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE conrelid = 'public.contextes_prelevement'::regclass AND contype = 'c'
    AND ((conname = 'contextes_prelevement_praticien_non_vide'
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conname = 'contextes_prelevement_ne_se_remplace_pas'
          AND position('id_ligne_remplacee IS DISTINCT FROM id' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % clause(s) relue(s) sur 2 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'contextes_prelevement'
    AND indexdef NOT LIKE '%WHERE%'
    AND ((indexname = 'contextes_prelevement_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
      OR (indexname = 'contextes_prelevement_id_ligne_remplacee_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_ligne_remplacee)')
      OR (indexname = 'contextes_prelevement_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
      OR (indexname = 'contextes_prelevement_resultat_ordre_idx' AND indexdef LIKE '%(id_resultat, ordre)'));
  IF nb <> 4 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % index sur 4 sont présents, sans prédicat.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE tablename = 'contextes_prelevement'
    AND indexname = 'contextes_prelevement_ouverture_par_racine_key'
    AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_resultat) WHERE (id_ligne_remplacee IS NULL)';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''index unique partiel « une ouverture par racine » est absent ou a perdu son prédicat.';
  END IF;
  -- Trois triggers BEFORE, actifs : insertion et UPDATE par ligne, TRUNCATE
  -- par instruction.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgrelid = 'public.contextes_prelevement'::regclass
    AND t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND ((t.tgname = 'contextes_prelevement_avant_insertion' AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname = 'contextes_prelevement_no_update' AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname = 'contextes_prelevement_no_truncate' AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % trigger(s) BEFORE sur 3 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- La suppression nommée : trigger de CONTRAINTE, AFTER DELETE par ligne,
  -- différable et différé par défaut.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgrelid = 'public.contextes_prelevement'::regclass
    AND t.tgname = 'contextes_prelevement_suppression_nommee'
    AND t.tgenabled = 'O' AND t.tgconstraint <> 0
    AND t.tgdeferrable AND t.tginitdeferred
    AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1 AND (t.tgtype & 8) = 8;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : la suppression nommée n''est pas un trigger de contrainte différé.';
  END IF;
  -- Le dossier verrouillé d'abord, puis le résultat de ce dossier, sa racine
  -- par la remontée de BP-09, le praticien, le remplacement. Une session
  -- seule n'éprouve pas la concurrence : elle relit l'ordre.
  IF pg_get_functiondef('public.contextes_prelevement_avant_insertion()'::regprocedure)
       !~ 'FOR KEY SHARE;[^$]*FROM public\.resultats_biologiques r[^$]*public\.resultats_biologiques_racine\(NEW\.id_resultat\) IS DISTINCT FROM NEW\.id_resultat[^$]*seul le praticien du dossier[^$]*FROM public\.contextes_prelevement c' THEN
    RAISE EXCEPTION 'CONTRAT — 12 : le verrou du dossier ne précède plus les contrôles, ou la racine ne se lit plus par la remontée de BP-09.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.contextes_prelevement_avant_insertion()'::regprocedure,
                  'public.contextes_prelevement_figee()'::regprocedure,
                  'public.contextes_prelevement_suppression_nommee()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 3 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : % fonction(s) sur 3 ont le search_path épinglé.', nb;
  END IF;

  -- ── 13. Liste blanche des colonnes, et les défauts ───────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name) INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'contextes_prelevement';
  IF colonnes <> ARRAY['a_jeun', 'delai_derniere_prise', 'delai_derniere_prise_etat',
                       'delai_derniere_prise_unite', 'episode_inflammatoire', 'grossesse',
                       'id', 'id_ligne_remplacee', 'id_patient', 'id_resultat',
                       'jour_cycle', 'jour_cycle_etat', 'ordre', 'pose_le',
                       'praticien_email', 'supplementation_arretee', 'traitement_interferent'] THEN
    RAISE EXCEPTION 'CONTRAT — 13 : colonnes inattendues : %', colonnes;
  END IF;
  SELECT count(*) INTO nb FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'contextes_prelevement'
    AND column_name IN ('a_jeun', 'supplementation_arretee', 'traitement_interferent',
                        'episode_inflammatoire', 'grossesse', 'jour_cycle_etat',
                        'delai_derniere_prise_etat')
    AND is_nullable = 'NO' AND column_default LIKE '''inconnu''%';
  IF nb <> 7 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % champ(s) sur 7 sont NOT NULL, « inconnu » par défaut.', nb;
  END IF;
  SELECT count(*) INTO nb FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'contextes_prelevement'
    AND column_name IN ('jour_cycle', 'delai_derniere_prise') AND data_type = 'integer';
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % valeur(s) sur 2 sont des entiers.', nb;
  END IF;

  -- ── 14. RLS et fonctions ─────────────────────────────────────────────────
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.contextes_prelevement'::regclass) THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS n''est pas active.';
  END IF;
  SELECT count(*) INTO nb FROM pg_policies WHERE tablename = 'contextes_prelevement';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('contextes_prelevement_figee',
                      'contextes_prelevement_avant_insertion',
                      'contextes_prelevement_suppression_nommee')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat contexte_prelevement_biologique_v1 : quatorze promesses tenues.';
END;
$$;

ROLLBACK;
