-- Contrat du compteur d'attente du rail ([[D-210]], corrigé par la revue de la
-- PR #1148).
--
-- POURQUOI CE FICHIER EXISTE. La sémantique du badge — « le DERNIER échange du
-- dossier est un envoi, et il remonte à plus de sept jours » — vivait dans du
-- TypeScript éprouvé par un mock. Or un mock rend la liste qu'on lui donne :
-- il ne peut pas prouver la déduplication, puisqu'il la simule. Le banc unitaire
-- passait donc même si une ligne plus ancienne du même dossier était comptée.
-- La sélection est désormais faite en SQL (`DISTINCT ON`), et c'est ici — contre
-- un vrai PostgreSQL — qu'elle est éprouvée.
--
-- CE FICHIER EMBARQUE UNE COPIE DE LA REQUÊTE de
-- `api/praticien/correspondance-medecin/recentes/compteur/route.ts`, et deux
-- copies peuvent diverger en silence — le dépôt connaît déjà ce piège avec
-- `VERSION_INDICATIONS_ATTENDUE`. Ce qui tient la laisse est ailleurs, et en T1 :
-- le banc de la route assertionne que son SQL porte bien `DISTINCT ON
-- (id_patient)`, son `ORDER BY` et le littéral `sens = 'sortant'`. Une dérive de
-- la route rougit donc à l'édition, avant même d'arriver ici.
--
-- Réciproquement, ce fichier n'est joué que parce qu'il est DÉCLARÉ dans
-- `.github/workflows/ci.yml` : `wn-test-worktree.sh` en extrait la liste. Un
-- contrat non déclaré est inerte, en local comme en CI — et se lit pourtant
-- comme une couverture.
--
-- Tout se déroule dans une transaction annulée à la fin.
BEGIN;

DO $$
DECLARE
  nb integer;
  -- `timestamp` SANS fuseau, comme la colonne (`TIMESTAMP(3)`) et comme la
  -- `Date` que Prisma envoie. Un `timestamptz` ici ferait dépendre la
  -- comparaison du fuseau de session — un écart invisible en local.
  seuil CONSTANT timestamp := CURRENT_TIMESTAMP - INTERVAL '7 days';
  PRATICIEN CONSTANT text := 'praticien@wellneuro.fr';

  -- Le compteur tel que la route l'exécute, à l'identique.
  compteur CONSTANT text := $q$
    SELECT count(*)::int
    FROM (
      SELECT DISTINCT ON (id_patient) id_patient, sens, consigne_le
      FROM correspondances_medecin
      WHERE praticien_email = $1
      ORDER BY id_patient, consigne_le DESC, (sens = 'sortant') ASC, id DESC
    ) AS dernieres
    WHERE sens = 'sortant' AND consigne_le < $2
  $q$;
BEGIN
  -- ── Fixture : trois identités fictives autorisées ────────────────────────
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
    ('pat_att_1', 'PAT_ATT_1', 'sophie.nicola@example.test',  'Sophie',   'Nicola', PRATICIEN, CURRENT_TIMESTAMP),
    ('pat_att_2', 'PAT_ATT_2', 'jennifer.martin@example.test', 'Jennifer', 'Martin', PRATICIEN, CURRENT_TIMESTAMP),
    ('pat_att_3', 'PAT_ATT_3', 'michel.dogne@example.test',    'Michel',   'Dogné',  PRATICIEN, CURRENT_TIMESTAMP);

  -- ── 1. LE CAS QUE LE MOCK NE POUVAIT PAS ATTRAPER ────────────────────────
  -- Un envoi ancien, PUIS une réponse transcrite plus récemment : la dernière
  -- ligne du dossier est la réponse, donc l'attente est refermée. Sans la
  -- déduplication, l'envoi ancien serait compté et le badge mentirait.
  INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, consigne_le) VALUES
    ('att_1a', 'PAT_ATT_1', PRATICIEN, 'sortant', 'Dr Test', 'Courrier envoyé.',  CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('att_1b', 'PAT_ATT_1', PRATICIEN, 'entrant', 'Dr Test', 'Réponse reçue.',    CURRENT_TIMESTAMP - INTERVAL '20 days');

  EXECUTE compteur INTO nb USING PRATICIEN, seuil;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'ATTENTE: une réponse transcrite APRÈS l’envoi n’a pas refermé l’attente (compté %) — la déduplication ne mord pas.', nb;
  END IF;

  -- ── 2. Un envoi resté sans réponse, antérieur au seuil, COMPTE ───────────
  INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, consigne_le) VALUES
    ('att_2a', 'PAT_ATT_2', PRATICIEN, 'sortant', 'Dr Test', 'Courrier sans retour.', CURRENT_TIMESTAMP - INTERVAL '30 days');

  EXECUTE compteur INTO nb USING PRATICIEN, seuil;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ATTENTE: un envoi sans réponse de plus de 7 jours n’est pas compté (compté %).', nb;
  END IF;

  -- ── 3. Un envoi RÉCENT ne compte pas encore ──────────────────────────────
  -- Le délai n'est pas une décoration : avant lui, il n'y a pas d'attente, il y
  -- a un échange en cours.
  INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, consigne_le) VALUES
    ('att_3a', 'PAT_ATT_3', PRATICIEN, 'sortant', 'Dr Test', 'Courrier d’hier.', CURRENT_TIMESTAMP - INTERVAL '1 day');

  EXECUTE compteur INTO nb USING PRATICIEN, seuil;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ATTENTE: un envoi récent a été compté comme une attente (compté %).', nb;
  END IF;

  -- ── 4. UN SENS ILLISIBLE N’INVENTE AUCUNE ATTENTE ([[DC-24]]) ────────────
  -- La colonne n'a aucun CHECK. Une valeur hors vocabulaire ne soutient aucun
  -- jugement : elle ne doit ni compter, ni faire disparaître les autres.
  UPDATE correspondances_medecin SET sens = 'brouillon' WHERE id = 'att_2a';

  EXECUTE compteur INTO nb USING PRATICIEN, seuil;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'ATTENTE: un sens hors vocabulaire a été compté comme une attente (compté %).', nb;
  END IF;

  -- ── 5. Le compteur d’un AUTRE praticien ne voit rien ─────────────────────
  -- Le filtre ne discrimine rien sur un cabinet mono-praticien ; il est la
  -- condition de réouverture écrite d'un second compte, et doit donc mordre.
  UPDATE correspondances_medecin SET sens = 'sortant' WHERE id = 'att_2a';
  EXECUTE compteur INTO nb USING 'autre@wellneuro.fr', seuil;
  IF nb <> 0 THEN
    RAISE EXCEPTION 'ATTENTE: le compteur d’un autre praticien voit des dossiers qui ne sont pas les siens (compté %).', nb;
  END IF;

  -- ── 6. ÉGALITÉ EXACTE DE `consigne_le` : AUCUNE ATTENTE INVENTÉE ────────
  -- `consigne_le` est un `TIMESTAMP(3)` : deux consignations de la même
  -- milliseconde sont possibles, et `DISTINCT ON` choisirait alors au hasard.
  -- Le départage penche du côté qui n'alerte pas : quand on ne peut pas savoir
  -- laquelle des deux lignes est la dernière, on n'invente pas une tâche
  -- ([[DC-24]]). Constat de revue de la PR #1157.
  --
  -- Sans départage, ce bloc est INDÉTERMINISTE — il passerait parfois. C'est
  -- précisément ce qu'il refuse.
  DELETE FROM correspondances_medecin WHERE id_patient = 'PAT_ATT_3';
  INSERT INTO correspondances_medecin (id, id_patient, praticien_email, sens, medecin_libelle, texte, consigne_le) VALUES
    ('att_6a', 'PAT_ATT_3', PRATICIEN, 'sortant', 'Dr Test', 'Envoi.',   CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('att_6b', 'PAT_ATT_3', PRATICIEN, 'entrant', 'Dr Test', 'Réponse.', CURRENT_TIMESTAMP - INTERVAL '30 days');

  EXECUTE compteur INTO nb USING PRATICIEN, seuil;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'ATTENTE: sur une égalité de consigne_le, le compteur a retenu l’envoi et inventé une attente (compté % au lieu de 1 — seul PAT_ATT_2 doit compter).', nb;
  END IF;

  RAISE NOTICE 'ATTENTE: déduplication, seuil, sens illisible, égalité de date et cloisonnement praticien éprouvés contre PostgreSQL.';
END $$;

ROLLBACK;
