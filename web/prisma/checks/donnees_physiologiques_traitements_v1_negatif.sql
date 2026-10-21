-- Contrat des données physiologiques déclarées, des traitements en cours et
-- de la clé de traitement des pièces de constat ([[D-335]], BP-13).
--
-- Les deux tables et la clé promettent QUATORZE choses, et ce fichier les
-- éprouve TOUTES :
--   1. une pose valide s'écrit et se relit : réponse fermée, mesure datée,
--      traitement complet ;
--   2. l'instant et l'`ordre` sont posés par la BASE, pas par l'appelant —
--      l'instant en UTC, même sous une session en Europe/Paris ; une date
--      antidatée ou un ordre fournis sont ignorés ; l'ordre croît ;
--   3. une ligne `praticien` est celle du praticien DU DOSSIER (l'e-mail
--      d'un autre praticien est refusé, la casse ne compte pas) ;
--   4. UNE TÊTE par critère et par dossier : une pose sur un critère qui a
--      une tête doit la désigner, une pose sans tête n'en désigne aucune ;
--      un autre critère, ou le même dans un autre dossier, est indépendant ;
--      le patient remplace une tête posée par le praticien ; une ligne a au
--      plus un successeur ;
--   5. un retrait vise LA TÊTE seule : une ligne remplacée ne se retire pas,
--      un retrait ne se retire pas, un critère sans tête n'a rien à
--      retirer ; le patient ne retire que ce qu'il a déclaré ([[D-335]] §5) ;
--      après un retrait, une pose neuve ne désigne rien ;
--   6. les FILS DE TRAITEMENT : une pose sans prédécesseur ouvre un fil, et
--      plusieurs fils coexistent ; remplacer ou retirer ne vise qu'une pose
--      de CE dossier que rien ne vise encore (ni une ligne remplacée, ni un
--      retrait, ni un autre dossier, ni une ligne absente) ; le patient
--      remplace une tête du praticien, l'arrêt est un remplacement qui porte
--      une fin, mais il ne retire que ses lignes ;
--   7. la forme d'une donnée physiologique : chaque réponse de chaque liste
--      fermée passe, une réponse d'une autre liste ou absente est refusée ;
--      poids de 1 à 500 kg, taille de 30 à 260 cm à l'unité, chacun avec sa
--      date et sans réponse ; un critère fermé ne porte pas de mesure ; un
--      retrait ne porte rien ; un acte ou un critère inconnus sont refusés ;
--   8. la source et l'auteur : `patient` sans e-mail, `praticien` avec ; une
--      source inconnue est refusée ; le patient ne pose que le sexe déclaré
--      et le statut menstruel ;
--   9. la forme d'un traitement : une pose porte nature, nom, précision du
--      début et « prescrit par un autre soignant » ; listes fermées ; textes
--      jamais faits de blancs (même non-espace), 200 caractères au plus
--      (motif : 500) ; une date au jour, au mois (le 1er) ou à l'année (le
--      1er janvier), `inconnu` sans date, aucune date sans précision ; un
--      arrêt sans date connue passe ; la période d'une fin ne s'achève pas
--      avant le début, et une fin moins précise que le début, dans la même
--      période, passe ; un retrait ne porte rien ;
--  10. une PIÈCE DE TRAITEMENT cite une pose de son dossier, tête de son
--      fil : ni un autre dossier, ni un retrait, ni une ligne remplacée ou
--      retirée ; une seule fois par constat ; une pièce porte une seule des
--      trois clés ;
--  11. UPDATE et TRUNCATE sont refusés sur les deux tables ;
--  12. l'effacement NOMMÉ passe en base, pièces, constats, puis ces lignes,
--      une instruction chacune, avec le dossier ; un traitement cité ne
--      s'efface pas avant sa pièce (RESTRICT) ; une suppression dont le
--      dossier survit est refusée en fin de transaction ;
--  13. les FK ont la règle annoncée, les CHECK, les index et les triggers
--      sont présents (les deux suppressions nommées, différées), REPEATABLE
--      READ est refusé avant les verrous, les verrous précèdent les
--      contrôles de tête — y compris dans la fonction des pièces, réécrite,
--      qui garde ceux de BP-11 — et les fonctions ont leur `search_path`
--      épinglé (présence relue : une session seule n'éprouve ni la
--      concurrence ni un autre niveau d'isolation — le banc à deux sessions
--      joue les courses et le refus de REPEATABLE READ,
--      `scripts/banc-physio-traitements-deux-sessions.test.mjs`) ;
--  14. les deux tables et les pièces portent EXACTEMENT leurs colonnes
--      (liste blanche) : aucun IMC, aucune classe, aucun code de référentiel
--      ([[D-335]] §10) ; la RLS deny-all est active et sans policy (posture
--      `D-005`), et aucune fonction n'est exécutable par PUBLIC.
--
-- CHAQUE REFUS EST ISOLÉ : le cas refusé passerait si l'on retirait la seule
-- règle qu'il éprouve (chaque cas ne viole qu'un CHECK). Chaque refus est
-- reconnu à son MESSAGE, pas seulement à son code. Trois gardes ne s'isolent
-- pas, parce que le trigger refuse avant elles : `ne_se_remplace_pas` sur
-- chaque table (une ligne qui se désigne n'est pas une tête), et la forme de
-- l'e-mail du praticien dans `auteur_selon_source` (un e-mail blanc n'est pas
-- celui du dossier). Elles restent la garde si le trigger tombait, et le
-- cas 13 relit leur clause.
--
-- Identités de fixture seulement ; noms de traitement SYNTHÉTIQUES
-- (`TRAITEMENT_CONTRAT_…`), aucun nom de médicament. Tout se déroule dans une
-- transaction annulée à la fin.
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
CREATE FUNCTION pg_temp.physio(
  p_id text, p_patient text, p_critere text, p_reponse text, p_remplace text,
  p_source text DEFAULT 'praticien', p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, reponse, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_critere, p_reponse, p_source, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.mesure(
  p_id text, p_patient text, p_critere text, p_mesure numeric, p_le date, p_remplace text
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, mesure, mesure_le, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', p_critere, p_mesure, p_le, 'praticien', p_remplace, 'praticien@wellneuro.fr');
$$;

CREATE FUNCTION pg_temp.retirer_physio(
  p_id text, p_patient text, p_critere text, p_remplace text,
  p_source text DEFAULT 'praticien', p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'retrait', p_critere, p_source, p_remplace, p_email);
$$;

-- La tête d'un critère, lue comme le trigger la lit.
CREATE FUNCTION pg_temp.tete_physio(p_patient text, p_critere text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT d.id FROM donnees_physiologiques d
  WHERE d.id_patient = p_patient AND d.critere = p_critere AND d.acte = 'pose'
    AND NOT EXISTS (SELECT 1 FROM donnees_physiologiques s WHERE s.id_ligne_remplacee = d.id)
  ORDER BY d.ordre DESC
  LIMIT 1;
$$;

-- Une pose de traitement minimale : nature, nom, début `inconnu`, prescrit
-- `inconnu`.
CREATE FUNCTION pg_temp.traiter(
  p_id text, p_patient text, p_remplace text,
  p_source text DEFAULT 'praticien', p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', 'inconnu', p_source, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.retirer_traitement(
  p_id text, p_patient text, p_remplace text,
  p_source text DEFAULT 'praticien', p_email text DEFAULT 'praticien@wellneuro.fr'
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO traitements_en_cours (id, id_patient, acte, source, id_ligne_remplacee, praticien_email)
  VALUES (p_id, p_patient, 'retrait', p_source, p_remplace, p_email);
$$;

CREATE FUNCTION pg_temp.piece_t(p_id text, p_constat text, p_patient text, p_traitement text)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_traitement)
  VALUES (p_id, p_constat, p_patient, p_traitement);
$$;

-- Les contrôles de fin de transaction, joués sur-le-champ : `SET CONSTRAINTS
-- … IMMEDIATE` déclenche ceux en attente. Appelé dans `refuse`, il s'y annule
-- avec l'acte qu'il juge. Ceux de BP-11 en sont : l'effacement nommé touche
-- aussi les constats et leurs pièces.
CREATE FUNCTION pg_temp.clore()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  SET CONSTRAINTS donnees_physiologiques_suppression_nommee, traitements_en_cours_suppression_nommee,
    constats_praticien_pieces_requises, constats_praticien_suppression_nommee,
    pieces_constats_praticien_suppression_nommee IMMEDIATE;
  SET CONSTRAINTS donnees_physiologiques_suppression_nommee, traitements_en_cours_suppression_nommee,
    constats_praticien_pieces_requises, constats_praticien_suppression_nommee,
    pieces_constats_praticien_suppression_nommee DEFERRED;
END;
$$;

-- Une suppression hors effacement, jugée sur-le-champ.
CREATE FUNCTION pg_temp.supprimer_puis_clore(p_table text, p_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DELETE FROM %I WHERE id = %L', p_table, p_id);
  PERFORM pg_temp.clore();
END;
$$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- Dossier A (praticien@wellneuro.fr) : une passation VALID, pour la pièce à
--   deux clés du cas 10.
-- Dossier B, d'un AUTRE praticien.

INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
  ('pat_contrat_physio_a', 'PAT_CONTRAT_PHYSIO_A', 'sophie.nicola+physio@example.test', 'Sophie', 'Nicola', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP),
  ('pat_contrat_physio_b', 'PAT_CONTRAT_PHYSIO_B', 'jennifer.martin+physio@example.test', 'Jennifer', 'Martin', 'autre.praticien@wellneuro.fr', CURRENT_TIMESTAMP);

INSERT INTO questionnaire_reponses (id, id_reponse, id_patient, email_patient, id_questionnaire, titre, scores_json, statut_validite)
VALUES ('q_physio', 'REP_CONTRAT_PHYSIO_1', 'PAT_CONTRAT_PHYSIO_A', 'sophie.nicola+physio@example.test', 'Q_CONTRAT', 'Questionnaire de contrat', '{}', 'VALID');

DO $$
DECLARE
  ligne record;
  nb integer;
  ordre_premier bigint;
  ecart interval;
  colonnes text[];
  couple text[];
  i integer := 0;
BEGIN
  -- ── 1 et 2. Des poses valides, instant et ordre posés par la base ────────
  INSERT INTO donnees_physiologiques (id, ordre, id_patient, acte, critere, reponse, source, praticien_email, acte_le)
  VALUES ('d_s1', 999999, 'PAT_CONTRAT_PHYSIO_A', 'pose', 'sexe_declare', 'feminin', 'praticien',
          'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM donnees_physiologiques WHERE id = 'd_s1';
  IF ligne.acte IS DISTINCT FROM 'pose' OR ligne.critere IS DISTINCT FROM 'sexe_declare'
     OR ligne.reponse IS DISTINCT FROM 'feminin' OR ligne.source IS DISTINCT FROM 'praticien'
     OR ligne.mesure IS NOT NULL OR ligne.id_ligne_remplacee IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la donnée relue n''est pas celle écrite.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé (donnée).';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;
  ordre_premier := ligne.ordre;

  PERFORM pg_temp.mesure('d_p1', 'PAT_CONTRAT_PHYSIO_A', 'poids', 72.4, DATE '2026-10-01', NULL);
  SELECT * INTO ligne FROM donnees_physiologiques WHERE id = 'd_p1';
  IF ligne.mesure IS DISTINCT FROM 72.4 OR ligne.mesure_le IS DISTINCT FROM DATE '2026-10-01'
     OR ligne.reponse IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : la mesure relue n''est pas celle écrite.';
  END IF;

  INSERT INTO traitements_en_cours (id, ordre, id_patient, acte, nature, nom, dose, moment, motif, debut, debut_precision,
                                    prescrit_par_tiers, source, praticien_email, acte_le)
  VALUES ('t_1', 999999, 'PAT_CONTRAT_PHYSIO_A', 'pose', 'complement', 'TRAITEMENT_CONTRAT_A', 'dose de contrat',
          'moment de contrat', 'objectif de contrat', DATE '2026-03-01', 'mois', 'non', 'praticien',
          'praticien@wellneuro.fr', TIMESTAMP '2000-01-01 00:00:00');
  SELECT * INTO ligne FROM traitements_en_cours WHERE id = 't_1';
  IF ligne.nature IS DISTINCT FROM 'complement' OR ligne.nom IS DISTINCT FROM 'TRAITEMENT_CONTRAT_A'
     OR ligne.dose IS DISTINCT FROM 'dose de contrat' OR ligne.moment IS DISTINCT FROM 'moment de contrat'
     OR ligne.motif IS DISTINCT FROM 'objectif de contrat' OR ligne.debut IS DISTINCT FROM DATE '2026-03-01'
     OR ligne.debut_precision IS DISTINCT FROM 'mois' OR ligne.prescrit_par_tiers IS DISTINCT FROM 'non'
     OR ligne.fin IS NOT NULL OR ligne.fin_precision IS NOT NULL THEN
    RAISE EXCEPTION 'CONTRAT — 1 : le traitement relu n''est pas celui écrit.';
  END IF;
  IF ligne.ordre = 999999 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre fourni par l''appelant a été conservé (traitement).';
  END IF;
  ecart := (now() AT TIME ZONE 'UTC') - ligne.acte_le;
  IF ligne.acte_le = TIMESTAMP '2000-01-01 00:00:00' OR abs(extract(epoch FROM ecart)) > 60 THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''instant du traitement n''est pas l''instant UTC posé par la base (écart %).', ecart;
  END IF;

  -- ── 3. Le praticien du dossier ───────────────────────────────────────────
  PERFORM pg_temp.refuse('3 donnée d''un autre praticien',
    $q$SELECT pg_temp.physio('x3a', 'PAT_CONTRAT_PHYSIO_A', 'grossesse', 'non', NULL, 'praticien', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 retrait d''une donnée par un autre praticien',
    $q$SELECT pg_temp.retirer_physio('x3b', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'd_s1', 'praticien', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.refuse('3 traitement d''un autre praticien',
    $q$SELECT pg_temp.traiter('x3c', 'PAT_CONTRAT_PHYSIO_A', NULL, 'praticien', 'autre.praticien@wellneuro.fr')$q$,
    'P0001', 'seul le praticien du dossier');
  PERFORM pg_temp.physio('d_g1', 'PAT_CONTRAT_PHYSIO_A', 'grossesse', 'non', NULL, 'praticien', 'PRATICIEN@wellneuro.fr');
  PERFORM pg_temp.traiter('t_2', 'PAT_CONTRAT_PHYSIO_A', NULL, 'praticien', 'PRATICIEN@wellneuro.fr');

  -- ── 4. Une tête par critère et par dossier ───────────────────────────────
  PERFORM pg_temp.refuse('4 pose sans désigner la tête',
    $q$SELECT pg_temp.physio('x4a', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', NULL)$q$,
    'P0001', 'porte une ligne en vigueur');
  PERFORM pg_temp.refuse('4 pose qui désigne la tête d''un autre critère',
    $q$SELECT pg_temp.physio('x4b', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', 'd_g1')$q$,
    'P0001', 'porte une ligne en vigueur');
  PERFORM pg_temp.refuse('4 pose neuve qui remplace',
    $q$SELECT pg_temp.physio('x4c', 'PAT_CONTRAT_PHYSIO_A', 'allaitement', 'non', 'd_s1')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  -- Le patient remplace la tête posée par le praticien ; l'ordre croît.
  PERFORM pg_temp.physio('d_s2', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'inconnu', 'd_s1', 'patient', NULL);
  IF (SELECT ordre FROM donnees_physiologiques WHERE id = 'd_s2') <= ordre_premier THEN
    RAISE EXCEPTION 'CONTRAT — 2 : l''ordre ne croît pas d''un acte au suivant.';
  END IF;
  PERFORM pg_temp.refuse('4 pose qui désigne une tête dépassée',
    $q$SELECT pg_temp.physio('x4d', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', 'd_s1')$q$,
    'P0001', 'porte une ligne en vigueur (d_s2)');
  -- Le même critère dans un autre dossier est indépendant.
  PERFORM pg_temp.physio('d_b1', 'PAT_CONTRAT_PHYSIO_B', 'sexe_declare', 'masculin', NULL, 'praticien', 'autre.praticien@wellneuro.fr');
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((tablename = 'donnees_physiologiques' AND indexname = 'donnees_physiologiques_id_ligne_remplacee_key'
          AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_ligne_remplacee)')
      OR (tablename = 'traitements_en_cours' AND indexname = 'traitements_en_cours_id_ligne_remplacee_key'
          AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_ligne_remplacee)'));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 4 : l''unicité du successeur est présente sur % table(s) sur 2.', nb;
  END IF;

  -- ── 5. Un retrait vise la tête seule ─────────────────────────────────────
  PERFORM pg_temp.refuse('5 retrait d''une ligne remplacée',
    $q$SELECT pg_temp.retirer_physio('x5a', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'd_s1')$q$,
    'P0001', 'seule la ligne en vigueur sur ce critère se retire');
  PERFORM pg_temp.refuse('5 retrait sans tête',
    $q$SELECT pg_temp.retirer_physio('x5b', 'PAT_CONTRAT_PHYSIO_A', 'allaitement', 'd_s2')$q$,
    'P0001', 'seule la ligne en vigueur sur ce critère se retire');
  -- Le praticien confirme ; le patient ne retire pas sa ligne.
  PERFORM pg_temp.physio('d_s3', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'feminin', 'd_s2');
  PERFORM pg_temp.refuse('5 retrait par le patient d''une ligne du praticien',
    $q$SELECT pg_temp.retirer_physio('x5c', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'd_s3', 'patient', NULL)$q$,
    'P0001', 'le patient ne retire que les lignes qu''il a déclarées');
  -- Le patient remplace, puis retire sa propre ligne.
  PERFORM pg_temp.physio('d_s4', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', 'd_s3', 'patient', NULL);
  PERFORM pg_temp.retirer_physio('d_s5', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'd_s4', 'patient', NULL);
  PERFORM pg_temp.refuse('5 retrait d''un retrait',
    $q$SELECT pg_temp.retirer_physio('x5d', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'd_s5')$q$,
    'P0001', 'seule la ligne en vigueur sur ce critère se retire');
  PERFORM pg_temp.refuse('5 après retrait, une pose qui remplace',
    $q$SELECT pg_temp.physio('x5e', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'feminin', 'd_s4')$q$,
    'P0001', 'une pose neuve ne remplace rien');
  PERFORM pg_temp.physio('d_s6', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'feminin', NULL);

  -- ── 6. Les fils de traitement ────────────────────────────────────────────
  -- Plusieurs fils coexistent : `t_1`, `t_2`, et celui du patient.
  PERFORM pg_temp.traiter('t_3', 'PAT_CONTRAT_PHYSIO_A', NULL, 'patient', NULL);
  -- Le patient remplace une tête du praticien, et l'arrête : une fin au jour.
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision,
                                    prescrit_par_tiers, source, id_ligne_remplacee)
  VALUES ('t_1b', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'complement', 'TRAITEMENT_CONTRAT_A', DATE '2026-03-01', 'mois',
          DATE '2026-09-15', 'jour', 'non', 'patient', 't_1');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne remplacée',
    $q$SELECT pg_temp.traiter('x6a', 'PAT_CONTRAT_PHYSIO_A', 't_1')$q$,
    'P0001', 'remplacement refusé : seule une ligne en vigueur de ce dossier');
  PERFORM pg_temp.refuse('6 retrait d''une ligne remplacée',
    $q$SELECT pg_temp.retirer_traitement('x6b', 'PAT_CONTRAT_PHYSIO_A', 't_1')$q$,
    'P0001', 'retrait refusé : seule une ligne en vigueur de ce dossier');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne absente',
    $q$SELECT pg_temp.traiter('x6c', 'PAT_CONTRAT_PHYSIO_A', 't_absent')$q$,
    'P0001', 'remplacement refusé : seule une ligne en vigueur de ce dossier');
  PERFORM pg_temp.traiter('t_b1', 'PAT_CONTRAT_PHYSIO_B', NULL, 'praticien', 'autre.praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne d''un autre dossier',
    $q$SELECT pg_temp.traiter('x6d', 'PAT_CONTRAT_PHYSIO_A', 't_b1')$q$,
    'P0001', 'remplacement refusé : seule une ligne en vigueur de ce dossier');
  PERFORM pg_temp.refuse('6 retrait par le patient d''une ligne du praticien',
    $q$SELECT pg_temp.retirer_traitement('x6e', 'PAT_CONTRAT_PHYSIO_A', 't_2', 'patient', NULL)$q$,
    'P0001', 'le patient ne retire que les lignes qu''il a déclarées');
  PERFORM pg_temp.retirer_traitement('t_3r', 'PAT_CONTRAT_PHYSIO_A', 't_3', 'patient', NULL);
  PERFORM pg_temp.refuse('6 retrait d''un retrait',
    $q$SELECT pg_temp.retirer_traitement('x6f', 'PAT_CONTRAT_PHYSIO_A', 't_3r')$q$,
    'P0001', 'retrait refusé : seule une ligne en vigueur de ce dossier');
  PERFORM pg_temp.refuse('6 remplacement d''une ligne retirée',
    $q$SELECT pg_temp.traiter('x6g', 'PAT_CONTRAT_PHYSIO_A', 't_3')$q$,
    'P0001', 'remplacement refusé : seule une ligne en vigueur de ce dossier');

  -- ── 7. La forme d'une donnée physiologique ───────────────────────────────
  -- Chaque réponse de chaque liste passe, chacune en remplacement de la tête
  -- de son critère.
  FOREACH couple SLICE 1 IN ARRAY ARRAY[
    ARRAY['sexe_declare', 'feminin'], ARRAY['sexe_declare', 'masculin'],
    ARRAY['sexe_declare', 'autre'], ARRAY['sexe_declare', 'inconnu'],
    ARRAY['statut_menstruel', 'cycles_reguliers'], ARRAY['statut_menstruel', 'cycles_irreguliers'],
    ARRAY['statut_menstruel', 'absence_de_cycles'], ARRAY['statut_menstruel', 'menopause'],
    ARRAY['statut_menstruel', 'inconnu'],
    ARRAY['grossesse', 'oui'], ARRAY['grossesse', 'non'], ARRAY['grossesse', 'inconnu'],
    ARRAY['allaitement', 'oui'], ARRAY['allaitement', 'non'], ARRAY['allaitement', 'inconnu']
  ] LOOP
    i := i + 1;
    PERFORM pg_temp.physio('d_f' || i, 'PAT_CONTRAT_PHYSIO_A', couple[1], couple[2],
                           pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', couple[1]));
  END LOOP;
  PERFORM pg_temp.mesure('d_p2', 'PAT_CONTRAT_PHYSIO_A', 'poids', 1, DATE '2026-10-02', 'd_p1');
  PERFORM pg_temp.mesure('d_p3', 'PAT_CONTRAT_PHYSIO_A', 'poids', 500, DATE '2026-10-03', 'd_p2');
  PERFORM pg_temp.mesure('d_t1', 'PAT_CONTRAT_PHYSIO_A', 'taille', 30, DATE '2026-10-01', NULL);
  PERFORM pg_temp.mesure('d_t2', 'PAT_CONTRAT_PHYSIO_A', 'taille', 260, DATE '2026-10-02', 'd_t1');
  PERFORM pg_temp.refuse('7 réponse d''une autre liste',
    $q$SELECT pg_temp.physio('x7a', 'PAT_CONTRAT_PHYSIO_A', 'grossesse', 'feminin', pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'grossesse'))$q$,
    '23514', 'donnees_physiologiques_reponse_selon_critere');
  PERFORM pg_temp.refuse('7 réponse inconnue',
    $q$SELECT pg_temp.physio('x7b', 'PAT_CONTRAT_PHYSIO_A', 'statut_menstruel', 'grossesse', pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'statut_menstruel'))$q$,
    '23514', 'donnees_physiologiques_reponse_selon_critere');
  PERFORM pg_temp.refuse('7 réponse absente',
    $q$SELECT pg_temp.physio('x7c', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', NULL, pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'sexe_declare'))$q$,
    '23514', 'donnees_physiologiques_reponse_selon_critere');
  PERFORM pg_temp.refuse('7 critère fermé avec une mesure',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, reponse, mesure, mesure_le, source, id_ligne_remplacee, praticien_email)
       VALUES ('x7d', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'allaitement', 'non', 10, DATE '2026-10-01', 'praticien',
               pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'allaitement'), 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_reponse_selon_critere');
  PERFORM pg_temp.refuse('7 poids sous la borne',
    $q$SELECT pg_temp.mesure('x7e', 'PAT_CONTRAT_PHYSIO_A', 'poids', 0.9, DATE '2026-10-04', 'd_p3')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 poids au-dessus de la borne',
    $q$SELECT pg_temp.mesure('x7f', 'PAT_CONTRAT_PHYSIO_A', 'poids', 500.1, DATE '2026-10-04', 'd_p3')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 taille sous la borne',
    $q$SELECT pg_temp.mesure('x7g', 'PAT_CONTRAT_PHYSIO_A', 'taille', 29, DATE '2026-10-04', 'd_t2')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 taille au-dessus de la borne',
    $q$SELECT pg_temp.mesure('x7h', 'PAT_CONTRAT_PHYSIO_A', 'taille', 261, DATE '2026-10-04', 'd_t2')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 taille au dixième',
    $q$SELECT pg_temp.mesure('x7i', 'PAT_CONTRAT_PHYSIO_A', 'taille', 170.5, DATE '2026-10-04', 'd_t2')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 mesure sans date',
    $q$SELECT pg_temp.mesure('x7j', 'PAT_CONTRAT_PHYSIO_A', 'poids', 70, NULL, 'd_p3')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 mesure sans valeur',
    $q$SELECT pg_temp.mesure('x7k', 'PAT_CONTRAT_PHYSIO_A', 'poids', NULL, DATE '2026-10-04', 'd_p3')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 mesure avec une réponse',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, reponse, mesure, mesure_le, source, id_ligne_remplacee, praticien_email)
       VALUES ('x7l', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'poids', 'oui', 70, DATE '2026-10-04', 'praticien', 'd_p3', 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_mesure_selon_critere');
  PERFORM pg_temp.refuse('7 retrait avec une réponse',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, reponse, source, id_ligne_remplacee, praticien_email)
       VALUES ('x7m', 'PAT_CONTRAT_PHYSIO_A', 'retrait', 'grossesse', 'oui', 'praticien',
               pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'grossesse'), 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_forme_retrait');
  PERFORM pg_temp.refuse('7 retrait avec une mesure',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, mesure, source, id_ligne_remplacee, praticien_email)
       VALUES ('x7n', 'PAT_CONTRAT_PHYSIO_A', 'retrait', 'poids', 70, 'praticien', 'd_p3', 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_forme_retrait');
  PERFORM pg_temp.refuse('7 acte inconnu',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, source, praticien_email)
       VALUES ('x7o', 'PAT_CONTRAT_PHYSIO_A', 'modification', 'grossesse', 'praticien', 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_acte_check');
  PERFORM pg_temp.refuse('7 critère inconnu',
    $q$SELECT pg_temp.physio('x7p', 'PAT_CONTRAT_PHYSIO_A', 'imc', 'oui', NULL)$q$,
    '23514', 'donnees_physiologiques_critere_check');

  -- ── 8. La source et l'auteur ─────────────────────────────────────────────
  PERFORM pg_temp.refuse('8 source inconnue',
    $q$SELECT pg_temp.physio('x8a', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'sexe_declare'), 'tiers', NULL)$q$,
    '23514', 'donnees_physiologiques_source_check');
  PERFORM pg_temp.refuse('8 donnée du patient avec un e-mail',
    $q$SELECT pg_temp.physio('x8b', 'PAT_CONTRAT_PHYSIO_A', 'sexe_declare', 'autre', pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'sexe_declare'), 'patient', 'praticien@wellneuro.fr')$q$,
    '23514', 'donnees_physiologiques_auteur_selon_source');
  PERFORM pg_temp.refuse('8 le patient pose une grossesse',
    $q$SELECT pg_temp.physio('x8c', 'PAT_CONTRAT_PHYSIO_A', 'grossesse', 'oui', pg_temp.tete_physio('PAT_CONTRAT_PHYSIO_A', 'grossesse'), 'patient', NULL)$q$,
    '23514', 'donnees_physiologiques_criteres_du_patient');
  PERFORM pg_temp.refuse('8 le patient pose un poids',
    $q$INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, mesure, mesure_le, source, id_ligne_remplacee)
       VALUES ('x8d', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'poids', 70, DATE '2026-10-04', 'patient', 'd_p3')$q$,
    '23514', 'donnees_physiologiques_criteres_du_patient');
  PERFORM pg_temp.refuse('8 traitement de source inconnue',
    $q$SELECT pg_temp.traiter('x8e', 'PAT_CONTRAT_PHYSIO_A', NULL, 'tiers', NULL)$q$,
    '23514', 'traitements_en_cours_source_check');
  PERFORM pg_temp.refuse('8 traitement du patient avec un e-mail',
    $q$SELECT pg_temp.traiter('x8f', 'PAT_CONTRAT_PHYSIO_A', NULL, 'patient', 'praticien@wellneuro.fr')$q$,
    '23514', 'traitements_en_cours_auteur_selon_source');

  -- ── 9. La forme d'un traitement ──────────────────────────────────────────
  -- Un arrêt sans date connue passe : fin absente, précision `inconnu`.
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, fin_precision,
                                    prescrit_par_tiers, source, praticien_email)
  VALUES ('t_4', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT_B', 'inconnu', 'inconnu', 'oui', 'praticien',
          'praticien@wellneuro.fr');
  -- Au 1er janvier, le début `annee` passe.
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision,
                                    prescrit_par_tiers, source, praticien_email)
  VALUES ('t_5', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT_C', DATE '2025-01-01', 'annee', 'oui', 'praticien',
          'praticien@wellneuro.fr');
  -- Une fin moins précise que le début, dans la même période, passe : au
  -- mois pour un début au jour, à l'année pour un début au mois.
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision,
                                    prescrit_par_tiers, source, praticien_email)
  VALUES ('t_6', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT_D', DATE '2024-05-10', 'jour',
          DATE '2024-05-01', 'mois', 'oui', 'praticien', 'praticien@wellneuro.fr');
  INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision,
                                    prescrit_par_tiers, source, praticien_email)
  VALUES ('t_7', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT_E', DATE '2024-05-01', 'mois',
          DATE '2024-01-01', 'annee', 'oui', 'praticien', 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('9 pose sans nature',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9a', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'TRAITEMENT_CONTRAT', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_forme_pose');
  PERFORM pg_temp.refuse('9 pose sans nom',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9b', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_forme_pose');
  PERFORM pg_temp.refuse('9 pose sans précision du début',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, prescrit_par_tiers, source)
       VALUES ('x9c', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_forme_pose');
  PERFORM pg_temp.refuse('9 pose sans « prescrit par un autre soignant »',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, source)
       VALUES ('x9d', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_forme_pose');
  PERFORM pg_temp.refuse('9 nature inconnue',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9e', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'classe', 'TRAITEMENT_CONTRAT', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_nature_check');
  PERFORM pg_temp.refuse('9 « prescrit » hors liste',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9f', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', 'peut_etre', 'patient')$q$,
    '23514', 'traitements_en_cours_prescrit_check');
  PERFORM pg_temp.refuse('9 nom fait de tabulations',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9g', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', E'\t\n', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_textes_forme');
  PERFORM pg_temp.refuse('9 nom trop long',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9h', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', repeat('n', 201), 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_textes_forme');
  PERFORM pg_temp.refuse('9 dose trop longue',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, dose, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9i', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', repeat('d', 201), 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_textes_forme');
  PERFORM pg_temp.refuse('9 moment fait de blancs',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, moment, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9j', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', '   ', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_textes_forme');
  PERFORM pg_temp.refuse('9 motif trop long',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, motif, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9k', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', repeat('m', 501), 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_textes_forme');
  PERFORM pg_temp.refuse('9 précision hors liste',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9l', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'semaine', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_precision_check');
  PERFORM pg_temp.refuse('9 début inconnu avec une date',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9m', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2026-03-01', 'inconnu', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_debut_selon_precision');
  PERFORM pg_temp.refuse('9 début au jour sans date',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9n', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'jour', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_debut_selon_precision');
  PERFORM pg_temp.refuse('9 début au mois hors du 1er',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9o', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2026-03-15', 'mois', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_debut_selon_precision');
  PERFORM pg_temp.refuse('9 début à l''année hors du 1er janvier',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, prescrit_par_tiers, source)
       VALUES ('x9p', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2026-03-01', 'annee', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_debut_selon_precision');
  PERFORM pg_temp.refuse('9 fin sans précision',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, fin, prescrit_par_tiers, source)
       VALUES ('x9q', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', DATE '2026-09-15', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_fin_selon_precision');
  PERFORM pg_temp.refuse('9 fin au jour sans date',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, fin_precision, prescrit_par_tiers, source)
       VALUES ('x9r', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', 'inconnu', 'jour', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_fin_selon_precision');
  PERFORM pg_temp.refuse('9 fin avant le début',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision, prescrit_par_tiers, source)
       VALUES ('x9s', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2026-03-01', 'mois', DATE '2026-02-01', 'mois', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_fin_apres_debut');
  PERFORM pg_temp.refuse('9 fin au jour, la veille du début',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision, prescrit_par_tiers, source)
       VALUES ('x9s2', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2024-05-10', 'jour', DATE '2024-05-09', 'jour', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_fin_apres_debut');
  PERFORM pg_temp.refuse('9 fin à l''année, avant l''année du début',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut, debut_precision, fin, fin_precision, prescrit_par_tiers, source)
       VALUES ('x9s3', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'medicament', 'TRAITEMENT_CONTRAT', DATE '2024-01-01', 'mois', DATE '2023-01-01', 'annee', 'inconnu', 'patient')$q$,
    '23514', 'traitements_en_cours_fin_apres_debut');
  PERFORM pg_temp.refuse('9 retrait avec un nom',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, nom, source, id_ligne_remplacee, praticien_email)
       VALUES ('x9t', 'PAT_CONTRAT_PHYSIO_A', 'retrait', 'TRAITEMENT_CONTRAT', 'praticien', 't_4', 'praticien@wellneuro.fr')$q$,
    '23514', 'traitements_en_cours_forme_retrait');
  PERFORM pg_temp.refuse('9 retrait avec une fin',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, fin, fin_precision, source, id_ligne_remplacee, praticien_email)
       VALUES ('x9u', 'PAT_CONTRAT_PHYSIO_A', 'retrait', DATE '2026-09-01', 'mois', 'praticien', 't_4', 'praticien@wellneuro.fr')$q$,
    '23514', 'traitements_en_cours_forme_retrait');
  PERFORM pg_temp.refuse('9 acte inconnu',
    $q$INSERT INTO traitements_en_cours (id, id_patient, acte, source)
       VALUES ('x9v', 'PAT_CONTRAT_PHYSIO_A', 'modification', 'patient')$q$,
    '23514', 'traitements_en_cours_acte_check');

  -- ── 10. La pièce de traitement ───────────────────────────────────────────
  -- Un constat posé dans cette transaction, `non_evaluable` : aucune pièce
  -- n'est requise, il en reçoit.
  INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, motif, structure_sha256, praticien_email)
  VALUES ('c_t1', 'PAT_CONTRAT_PHYSIO_A', 'pose', 'HYP_CONTRAT_TRAITEMENT', 'non_evaluable', 'piece_attendue_manquante',
          repeat('a', 64), 'praticien@wellneuro.fr');
  PERFORM pg_temp.refuse('10 traitement d''un autre dossier',
    $q$SELECT pg_temp.piece_t('x10a', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_b1')$q$,
    'P0001', 'n''est pas un traitement de ce dossier');
  PERFORM pg_temp.refuse('10 retrait de traitement',
    $q$SELECT pg_temp.piece_t('x10b', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_3r')$q$,
    'P0001', 'un retrait de traitement ne se cite pas');
  PERFORM pg_temp.refuse('10 traitement remplacé',
    $q$SELECT pg_temp.piece_t('x10c', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_1')$q$,
    'P0001', 't_1 a été remplacé ou retiré');
  PERFORM pg_temp.refuse('10 traitement retiré',
    $q$SELECT pg_temp.piece_t('x10d', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_3')$q$,
    'P0001', 't_3 a été remplacé ou retiré');
  PERFORM pg_temp.refuse('10 traitement et réponse',
    $q$INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_questionnaire_reponse, id_traitement)
       VALUES ('x10e', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 'q_physio', 't_1b')$q$,
    '23514', 'pieces_constats_praticien_une_piece');
  -- La tête du fil se cite, une fois.
  PERFORM pg_temp.piece_t('p_t1', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_1b');
  PERFORM pg_temp.refuse('10 traitement cité deux fois',
    $q$SELECT pg_temp.piece_t('x10f', 'c_t1', 'PAT_CONTRAT_PHYSIO_A', 't_1b')$q$,
    '23505', 'pieces_constats_praticien_constat_traitement_key');
  -- Tout ce qui est posé jusqu'ici tient en fin de transaction.
  PERFORM pg_temp.clore();

  -- ── 11. Figées ───────────────────────────────────────────────────────────
  PERFORM pg_temp.refuse('11 UPDATE donnée',
    $q$UPDATE donnees_physiologiques SET reponse = 'masculin' WHERE id = 'd_s6'$q$,
    'P0001', 'donnees_physiologiques : une ligne est figée');
  PERFORM pg_temp.refuse('11 TRUNCATE données',
    $q$TRUNCATE donnees_physiologiques$q$,
    'P0001', 'donnees_physiologiques : une ligne est figée');
  PERFORM pg_temp.refuse('11 UPDATE traitement',
    $q$UPDATE traitements_en_cours SET nom = 'TRAITEMENT_CONTRAT_Z' WHERE id = 't_2'$q$,
    'P0001', 'traitements_en_cours : une ligne est figée');
  PERFORM pg_temp.refuse('11 TRUNCATE traitements',
    $q$TRUNCATE traitements_en_cours CASCADE$q$,
    'P0001', 'traitements_en_cours : une ligne est figée');

  -- ── 12. L'effacement nommé ───────────────────────────────────────────────
  -- Les lignes supprimées hors effacement sont des têtes : rien ne les
  -- désigne, seule la garde de fin de transaction peut les refuser.
  PERFORM pg_temp.refuse('12 donnée supprimée hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('donnees_physiologiques', 'd_t2')$q$,
    'P0001', 'donnees_physiologiques : suppression refusée');
  PERFORM pg_temp.refuse('12 traitement supprimé hors effacement',
    $q$SELECT pg_temp.supprimer_puis_clore('traitements_en_cours', 't_b1')$q$,
    'P0001', 'traitements_en_cours : suppression refusée');
  PERFORM pg_temp.refuse('12 traitement cité effacé avant sa pièce',
    $q$DELETE FROM traitements_en_cours WHERE id = 't_1b'$q$,
    '23503', 'pieces_constats_praticien_id_traitement_fkey');
  DELETE FROM pieces_constats_praticien WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  DELETE FROM constats_praticien WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  DELETE FROM donnees_physiologiques WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  DELETE FROM traitements_en_cours WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  SELECT count(*) INTO nb FROM donnees_physiologiques WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  SELECT nb + count(*) INTO nb FROM traitements_en_cours WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 12 : l''effacement a laissé % ligne(s).', nb;
  END IF;
  -- Le reste du dossier, puis le dossier : les contrôles différés ne
  -- refusent plus rien, le dossier ne survit pas.
  DELETE FROM questionnaire_reponses WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  DELETE FROM patients WHERE id_patient = 'PAT_CONTRAT_PHYSIO_A';
  PERFORM pg_temp.clore();

  -- ── 13. Clés, CHECK, index, triggers, verrous ────────────────────────────
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'f'
    AND ((conrelid = 'public.donnees_physiologiques'::regclass AND (
           (conname = 'donnees_physiologiques_id_patient_fkey' AND confdeltype = 'r')
        OR (conname = 'donnees_physiologiques_id_ligne_remplacee_fkey' AND confdeltype = 'a')))
      OR (conrelid = 'public.traitements_en_cours'::regclass AND (
           (conname = 'traitements_en_cours_id_patient_fkey' AND confdeltype = 'r')
        OR (conname = 'traitements_en_cours_id_ligne_remplacee_fkey' AND confdeltype = 'a')))
      OR (conrelid = 'public.pieces_constats_praticien'::regclass
          AND conname = 'pieces_constats_praticien_id_traitement_fkey' AND confdeltype = 'r'));
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clé(s) étrangère(s) sur 5 ont la règle annoncée.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conrelid = 'public.donnees_physiologiques'::regclass AND conname IN (
           'donnees_physiologiques_acte_check', 'donnees_physiologiques_critere_check',
           'donnees_physiologiques_forme_retrait', 'donnees_physiologiques_reponse_selon_critere',
           'donnees_physiologiques_mesure_selon_critere', 'donnees_physiologiques_source_check',
           'donnees_physiologiques_auteur_selon_source', 'donnees_physiologiques_criteres_du_patient',
           'donnees_physiologiques_ne_se_remplace_pas'))
      OR (conrelid = 'public.traitements_en_cours'::regclass AND conname IN (
           'traitements_en_cours_acte_check', 'traitements_en_cours_forme_retrait',
           'traitements_en_cours_forme_pose', 'traitements_en_cours_nature_check',
           'traitements_en_cours_prescrit_check', 'traitements_en_cours_textes_forme',
           'traitements_en_cours_precision_check', 'traitements_en_cours_debut_selon_precision',
           'traitements_en_cours_fin_selon_precision', 'traitements_en_cours_fin_apres_debut',
           'traitements_en_cours_source_check', 'traitements_en_cours_auteur_selon_source',
           'traitements_en_cours_ne_se_remplace_pas')));
  IF nb <> 22 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % CHECK sur 22 sont présents.', nb;
  END IF;
  -- Les gardes que le trigger devance (voir l'en-tête), et la pièce sur
  -- trois clés : leur clause est relue.
  SELECT count(*) INTO nb FROM pg_constraint
  WHERE contype = 'c'
    AND ((conrelid IN ('public.donnees_physiologiques'::regclass, 'public.traitements_en_cours'::regclass)
          AND conname IN ('donnees_physiologiques_auteur_selon_source', 'traitements_en_cours_auteur_selon_source')
          AND position('praticien_email ~ ''\S''' IN pg_get_constraintdef(oid)) > 0
          AND position('char_length(praticien_email) <= 320' IN pg_get_constraintdef(oid)) > 0)
      OR (conrelid IN ('public.donnees_physiologiques'::regclass, 'public.traitements_en_cours'::regclass)
          AND conname IN ('donnees_physiologiques_ne_se_remplace_pas', 'traitements_en_cours_ne_se_remplace_pas')
          AND position('id_ligne_remplacee IS DISTINCT FROM id' IN pg_get_constraintdef(oid)) > 0)
      OR (conrelid = 'public.pieces_constats_praticien'::regclass
          AND conname = 'pieces_constats_praticien_une_piece'
          AND position('num_nonnulls(id_resultat, id_questionnaire_reponse, id_traitement) = 1' IN pg_get_constraintdef(oid)) > 0));
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % clause(s) relue(s) sur 5 sont présentes.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_indexes
  WHERE indexdef NOT LIKE '%WHERE%'
    AND ((tablename = 'donnees_physiologiques' AND (
           (indexname = 'donnees_physiologiques_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
        OR (indexname = 'donnees_physiologiques_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')
        OR (indexname = 'donnees_physiologiques_patient_critere_idx' AND indexdef LIKE '%(id_patient, critere)')))
      OR (tablename = 'traitements_en_cours' AND (
           (indexname = 'traitements_en_cours_ordre_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(ordre)')
        OR (indexname = 'traitements_en_cours_patient_ordre_idx' AND indexdef LIKE '%(id_patient, ordre)')))
      OR (tablename = 'pieces_constats_praticien' AND (
           (indexname = 'pieces_constats_praticien_constat_traitement_key' AND indexdef LIKE 'CREATE UNIQUE INDEX%(id_constat, id_traitement)')
        OR (indexname = 'pieces_constats_praticien_id_traitement_idx' AND indexdef LIKE '%(id_traitement)'))));
  IF nb <> 7 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % index sur 7 sont présents, sans prédicat.', nb;
  END IF;
  -- Six triggers BEFORE, actifs : insertion et UPDATE par ligne, TRUNCATE par
  -- instruction, sur chaque table.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O'
    AND (t.tgtype & 2) = 2          -- BEFORE
    AND t.tgrelid IN ('public.donnees_physiologiques'::regclass, 'public.traitements_en_cours'::regclass)
    AND ((t.tgname IN ('donnees_physiologiques_avant_insertion', 'traitements_en_cours_avant_insertion')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 4) = 4)
      OR (t.tgname IN ('donnees_physiologiques_no_update', 'traitements_en_cours_no_update')
          AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16)
      OR (t.tgname IN ('donnees_physiologiques_no_truncate', 'traitements_en_cours_no_truncate')
          AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32));
  IF nb <> 6 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % trigger(s) BEFORE sur 6 sont présents et actifs, de la forme annoncée.', nb;
  END IF;
  -- Les deux suppressions nommées : triggers de CONTRAINTE, AFTER DELETE par
  -- ligne, différables et différés par défaut.
  SELECT count(*) INTO nb FROM pg_trigger t
  WHERE t.tgenabled = 'O' AND t.tgconstraint <> 0
    AND t.tgdeferrable AND t.tginitdeferred
    AND (t.tgtype & 2) = 0 AND (t.tgtype & 1) = 1 AND (t.tgtype & 8) = 8
    AND ((t.tgrelid = 'public.donnees_physiologiques'::regclass
          AND t.tgname = 'donnees_physiologiques_suppression_nommee')
      OR (t.tgrelid = 'public.traitements_en_cours'::regclass
          AND t.tgname = 'traitements_en_cours_suppression_nommee'));
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % suppression(s) nommée(s) sur 2 sont des triggers de contrainte différés.', nb;
  END IF;
  -- REPEATABLE READ refusé, puis les verrous, avant les contrôles. Une
  -- session seule n'éprouve pas la concurrence : elle relit l'appel et sa
  -- place.
  IF pg_get_functiondef('public.donnees_physiologiques_avant_insertion()'::regprocedure)
       !~ '''repeatable read''[^$]*FOR KEY SHARE;\s*PERFORM pg_advisory_xact_lock\(335, hashtext\(NEW\.id_patient \|\| ''\|physio\|'' \|\| NEW\.critere\)\);[^$]*seul le praticien du dossier[^$]*SELECT d\.id, d\.source INTO tete' THEN
    RAISE EXCEPTION 'CONTRAT — 13 : REPEATABLE READ refusé, puis dossier et critère verrouillés AVANT le contrôle de tête : l''ordre n''y est plus (données).';
  END IF;
  IF pg_get_functiondef('public.traitements_en_cours_avant_insertion()'::regprocedure)
       !~ '''repeatable read''[^$]*FOR KEY SHARE;\s*PERFORM pg_advisory_xact_lock\(335, hashtext\(NEW\.id_patient \|\| ''\|traitement''\)\);[^$]*seul le praticien du dossier[^$]*SELECT t\.acte, t\.source INTO cible_acte' THEN
    RAISE EXCEPTION 'CONTRAT — 13 : REPEATABLE READ refusé, puis dossier et traitements verrouillés AVANT le contrôle de tête : l''ordre n''y est plus (traitements).';
  END IF;
  -- La pièce prend les verrous d'un acte de traitement — la même clé —
  -- avant son contrôle de tête ; les gardes de BP-11 restent.
  IF pg_get_functiondef('public.pieces_constats_praticien_avant_insertion()'::regprocedure)
       !~ 'IF NEW\.id_traitement IS NOT NULL THEN[^$]*FOR KEY SHARE;\s*PERFORM pg_advisory_xact_lock\(335, hashtext\(NEW\.id_patient \|\| ''\|traitement''\)\);\s*SELECT t\.acte INTO traitement_acte[^$]*s\.id_ligne_remplacee = NEW\.id_traitement' THEN
    RAISE EXCEPTION 'CONTRAT — 13 : la pièce de traitement ne prend plus les verrous des traitements AVANT son contrôle de tête.';
  END IF;
  IF pg_get_functiondef('public.pieces_constats_praticien_avant_insertion()'::regprocedure)
       !~ 'constat_transaction IS DISTINCT FROM pg_current_xact_id\(\)::text::bigint[^$]*resultats_biologiques_verrouiller_cle\(NEW\.id_patient, cible_analyte, cible_preleve\)[^$]*FROM public\.questionnaire_reponses q[^$]*FOR SHARE;' THEN
    RAISE EXCEPTION 'CONTRAT — 13 : la fonction des pièces réécrite a perdu une garde de BP-11.';
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.oid IN ('public.donnees_parcours_figee()'::regprocedure,
                  'public.donnees_physiologiques_avant_insertion()'::regprocedure,
                  'public.traitements_en_cours_avant_insertion()'::regprocedure,
                  'public.donnees_parcours_suppression_nommee()'::regprocedure,
                  'public.pieces_constats_praticien_avant_insertion()'::regprocedure)
    AND p.proconfig @> ARRAY['search_path=public, pg_temp'];
  IF nb <> 5 THEN
    RAISE EXCEPTION 'CONTRAT — 13 : % fonction(s) sur 5 ont le search_path épinglé.', nb;
  END IF;

  -- ── 14. Liste blanche des colonnes, RLS et fonctions ─────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'donnees_physiologiques';
  IF colonnes <> ARRAY['acte', 'acte_le', 'critere', 'id', 'id_ligne_remplacee', 'id_patient',
                       'mesure', 'mesure_le', 'ordre', 'praticien_email', 'reponse', 'source'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues sur les données physiologiques : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'traitements_en_cours';
  IF colonnes <> ARRAY['acte', 'acte_le', 'debut', 'debut_precision', 'dose', 'fin', 'fin_precision',
                       'id', 'id_ligne_remplacee', 'id_patient', 'moment', 'motif', 'nature', 'nom',
                       'ordre', 'praticien_email', 'prescrit_par_tiers', 'source'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues sur les traitements : %', colonnes;
  END IF;
  SELECT array_agg(column_name::text ORDER BY column_name::text COLLATE "C") INTO colonnes
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'pieces_constats_praticien';
  IF colonnes <> ARRAY['id', 'id_constat', 'id_patient', 'id_questionnaire_reponse', 'id_resultat', 'id_traitement'] THEN
    RAISE EXCEPTION 'CONTRAT — 14 : colonnes inattendues sur les pièces : %', colonnes;
  END IF;
  SELECT count(*) INTO nb FROM pg_class
  WHERE oid IN ('public.donnees_physiologiques'::regclass, 'public.traitements_en_cours'::regclass)
    AND relrowsecurity;
  IF nb <> 2 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : la RLS est active sur % table(s) sur 2.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_policies
  WHERE tablename IN ('donnees_physiologiques', 'traitements_en_cours');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % policy(ies) présente(s), deny-all attendu.', nb;
  END IF;
  SELECT count(*) INTO nb FROM pg_proc p
  WHERE p.proname IN ('donnees_parcours_figee', 'donnees_physiologiques_avant_insertion',
                      'traitements_en_cours_avant_insertion', 'donnees_parcours_suppression_nommee',
                      'pieces_constats_praticien_avant_insertion')
    AND has_function_privilege('public', p.oid, 'EXECUTE');
  IF nb <> 0 THEN
    RAISE EXCEPTION 'CONTRAT — 14 : % fonction(s) exécutable(s) par PUBLIC.', nb;
  END IF;

  RAISE NOTICE 'Contrat donnees_physiologiques_traitements_v1 : quatorze promesses tenues.';
END;
$$;

ROLLBACK;
