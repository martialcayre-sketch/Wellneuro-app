-- STATUTS POSÉS PAR LE PRATICIEN PRÈS D'UNE VALEUR BIOLOGIQUE, EN AJOUT SEUL
-- ([[D-322]], fiche F58, amende [[D-308]] §2).
--
-- Migration demandée explicitement par le responsable le 2026-10-17 (« go »,
-- après D-322 §5 : « la migration seule, puis le code »).
-- MIGRATION SEULE ([[D-087]]) : aucun code n'écrit encore de statut, aucun
-- code ne le lit. La route, la lecture et l'écran de la série viendront dans
-- la PR suivante, après l'application CONSTATÉE par conteneur. Le seul code
-- qui l'accompagne est l'effacement nommé du dossier
-- (`patient/effacement.ts`), comme pour les annulations (BP-09) et les
-- lectures d'import (BP-10) : le banc de complétude de l'effacement l'exige de
-- toute table qui porte `id_patient`. Entre le déploiement du code et
-- l'approbation de la release-db, un effacement de dossier échouerait donc sur
-- la table absente — transaction annulée, rien d'effacé ; d'où l'approbation
-- dans la foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Deux actes, dans une seule table en ajout seul ([[D-322]] §2, §4) :
--
--  - `pose` : « je pose ce statut près de cette valeur », avec un statut pris
--    dans une liste FERMÉE de six gestes du praticien ([[D-322]] §1) :
--    `aucune_action_retenue`, `a_suivre`, `contexte_a_preciser`,
--    `donnee_a_verifier`, `avis_medical_a_envisager`, `relie_au_protocole`.
--    Poser un autre statut remplace le précédent ; aucune ligne ne s'efface.
--  - `retrait` : « je retire le statut posé » ; la valeur revient à « sans
--    statut posé ». L'acte ne porte pas de statut.
--
-- Le statut ACTIF d'une ligne de résultat est celui du dernier acte, par
-- `ordre` : une pose le donne, un retrait le vide. Rien par défaut, rien de
-- calculé. La table ne recopie AUCUNE valeur, aucun analyte, aucune date, et
-- ne porte aucun texte libre (contrat négatif, liste blanche des colonnes). Un
-- statut neuf passe par une décision, puis une migration.
--
-- ── LA VALEUR VISÉE : LA LIGNE EXACTE ──────────────────────────────────────
--
-- Le statut s'attache à la ligne de résultat que le praticien a vue, la tête
-- de son fil de correction au moment de l'acte ([[D-322]] §3). Une correction
-- crée une ligne neuve, qui apparaît sans statut : l'ancien reste attaché à
-- la ligne supplantée, lisible à l'historique. La base ne recopie donc rien
-- d'une ligne à l'autre. Un résultat annulé ([[D-294]]) sort de la série
-- avec son statut, qui reste à l'historique.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
--  1. LE RÉSULTAT APPARTIENT AU DOSSIER : refus nommé par le trigger. La clé
--     étrangère vers `resultats_biologiques(id)` est simple, comme celle des
--     annulations.
--  2. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER : l'e-mail de l'acte égale, sans
--     égard à la casse, celui que porte le dossier — la règle de
--     `filtrePatientsDuPraticien`. La route le vérifiera ; la base est la
--     garde qui reste si une route l'oubliait.
--  3. L'ACTE VISE UNE TÊTE DE FIL : une ligne qu'aucune autre ne supplante.
--     Une ligne corrigée n'est plus à l'écran ; ni pose ni retrait ne s'y
--     ajoutent.
--  4. UNE POSE CHANGE LE STATUT ACTIF : reposer le statut déjà actif est
--     refusé (un double clic n'écrit pas deux fois l'historique).
--  5. UN RETRAIT VISE UN STATUT ACTIF : retirer sans statut posé est refusé.
--
-- La base NE refuse PAS une pose sur un résultat annulé : la ligne n'est plus
-- à l'écran, et le statut n'y serait lu par personne ; la route le refusera.
-- Lire l'annulation exigerait ici les verrous de clé de BP-09.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- Le trigger prend, dans cet ordre :
--   1. `FOR KEY SHARE` sur la ligne du dossier — le verrou que prendrait la
--      clé étrangère, mais AVANT le reste : l'effacement nommé prend le
--      dossier `FOR UPDATE` en premier, et l'ordre « dossier, puis le reste »
--      est le même que celui de BP-09 (pas d'interblocage avec lui) ;
--   2. un verrou consultatif de transaction sur le résultat visé
--      (`hashtext('statuts_poses_resultats_biologiques:' || id_resultat)`,
--      l'espace à un argument des fiches d'usage et d'assiette) : deux actes
--      sur une même ligne se sérialisent, et le second lit le statut actif
--      laissé par le premier. Une collision de hachage sérialise deux lignes
--      sans rapport.
-- CE QUE LES VERROUS NE GARANTISSENT PAS : en REPEATABLE READ, l'instantané
-- peut masquer l'acte que le verrou vient de laisser commettre, et les refus
-- 4 et 5 peuvent se tromper dans les deux sens : une entrée redondante à
-- l'historique, ou un refus à tort (reposer un statut qu'un retrait
-- concurrent vient de vider ; retirer un statut qu'une pose concurrente vient
-- de poser). La règle de lecture (dernier `ordre`, tiré après le verrou)
-- reste déterministe, et aucun écrivain de l'application n'emploie ce niveau
-- au 2026-10-18. BP-09 le refuse en base parce qu'il y garde une unicité ;
-- ici aucune intégrité n'en dépend.
-- Une correction concurrente d'une pose n'est pas sérialisée avec elle : la
-- pose porte alors sur une ligne aussitôt supplantée, et la valeur corrigée
-- apparaît sans statut — exactement [[D-322]] §3.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, comme
-- pour les annulations et les lectures d'import : chaque ligne est une donnée
-- patient, et l'effacement du dossier la supprime NOMMÉMENT, avant les
-- résultats que sa clé RESTRICT retient.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion,
-- après le verrou du résultat : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "statuts_poses_resultats_biologiques" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "statut" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statuts_poses_resultats_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "statuts_poses_resultats_biologiques_ordre_key" ON "statuts_poses_resultats_biologiques"("ordre");

-- CreateIndex
-- « Les actes de ce dossier, dans l'ordre » (écran de la série) et « les
-- actes de cette ligne, dans l'ordre » (le statut actif, que relit le
-- trigger). Le second sert aussi la clé étrangère vers le résultat.
CREATE INDEX "statuts_poses_resultats_biologiques_patient_ordre_idx" ON "statuts_poses_resultats_biologiques"("id_patient", "ordre");
CREATE INDEX "statuts_poses_resultats_biologiques_resultat_ordre_idx" ON "statuts_poses_resultats_biologiques"("id_resultat", "ordre");

-- AddForeignKey
-- ON DELETE RESTRICT vers le patient et le résultat : l'effacement d'un
-- dossier est une suppression NOMMÉE, qui passe par les statuts avant les
-- résultats. En CASCADE, ils partiraient en silence.
ALTER TABLE "statuts_poses_resultats_biologiques" ADD CONSTRAINT "statuts_poses_resultats_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statuts_poses_resultats_biologiques" ADD CONSTRAINT "statuts_poses_resultats_biologiques_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — la forme de chaque acte, la liste fermée ───────────────────

ALTER TABLE "statuts_poses_resultats_biologiques"
  ADD CONSTRAINT "statuts_poses_resultats_biologiques_acte_check"
    CHECK ("acte" IN ('pose', 'retrait')),
  ADD CONSTRAINT "statuts_poses_resultats_biologiques_forme_pose"
    CHECK ("acte" <> 'pose' OR "statut" IS NOT NULL),
  ADD CONSTRAINT "statuts_poses_resultats_biologiques_forme_retrait"
    CHECK ("acte" <> 'retrait' OR "statut" IS NULL),
  ADD CONSTRAINT "statuts_poses_resultats_biologiques_statut_check"
    CHECK ("statut" IN (
      'aucune_action_retenue',
      'a_suivre',
      'contexte_a_preciser',
      'donnee_a_verifier',
      'avis_medical_a_envisager',
      'relie_au_protocole'
    )),
  ADD CONSTRAINT "statuts_poses_resultats_biologiques_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.statuts_poses_resultats_biologiques_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un acte de statut est figé (% refusé) ; seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER statuts_poses_resultats_biologiques_no_update
  BEFORE UPDATE ON public.statuts_poses_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.statuts_poses_resultats_biologiques_figee();

CREATE TRIGGER statuts_poses_resultats_biologiques_no_truncate
  BEFORE TRUNCATE ON public.statuts_poses_resultats_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.statuts_poses_resultats_biologiques_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.statuts_poses_resultats_biologiques_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cible_id text;
  praticien_dossier text;
  statut_actif text;
BEGIN
  -- Le dossier d'abord (en-tête, « Les verrous »).
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;

  SELECT r.id INTO cible_id
  FROM public.resultats_biologiques r
  WHERE r.id = NEW.id_resultat AND r.id_patient = NEW.id_patient;
  IF cible_id IS NULL THEN
    RAISE EXCEPTION 'acte de statut refusé : % n''est pas un résultat de ce dossier.', NEW.id_resultat;
  END IF;

  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'acte de statut refusé : seul le praticien du dossier pose ou retire un statut.';
  END IF;

  -- Puis la ligne visée : tout ce qui suit se lit après les actes concurrents
  -- sur la même ligne.
  PERFORM pg_advisory_xact_lock(hashtext('statuts_poses_resultats_biologiques:' || NEW.id_resultat));

  IF EXISTS (
    SELECT 1 FROM public.resultats_biologiques s
    WHERE s.supersedes_resultat_id = NEW.id_resultat
  ) THEN
    RAISE EXCEPTION 'acte de statut refusé : % a été corrigé ; seule la tête du fil porte un statut.', NEW.id_resultat;
  END IF;

  -- Le statut actif : celui du dernier acte de la ligne (NULL après un
  -- retrait, ou sans aucun acte).
  SELECT s.statut INTO statut_actif
  FROM public.statuts_poses_resultats_biologiques s
  WHERE s.id_resultat = NEW.id_resultat
  ORDER BY s.ordre DESC
  LIMIT 1;

  -- `=` et non `IS NOT DISTINCT FROM` : une pose SANS statut doit atteindre
  -- le CHECK `forme_pose`, pas se lire comme la répétition d'un « sans statut ».
  IF NEW.acte = 'pose' AND statut_actif = NEW.statut THEN
    RAISE EXCEPTION 'pose refusée : ce statut est déjà le statut actif de %.', NEW.id_resultat;
  ELSIF NEW.acte = 'retrait' AND statut_actif IS NULL THEN
    RAISE EXCEPTION 'retrait refusé : % ne porte aucun statut posé.', NEW.id_resultat;
  END IF;
  -- Un acte inconnu, ou une pose sans statut, passe ici sans refus : les CHECK
  -- le refusent ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.statuts_poses_resultats_biologiques', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER statuts_poses_resultats_biologiques_avant_insertion
  BEFORE INSERT ON public.statuts_poses_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.statuts_poses_resultats_biologiques_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.statuts_poses_resultats_biologiques_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.statuts_poses_resultats_biologiques_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.statuts_poses_resultats_biologiques_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.statuts_poses_resultats_biologiques_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."statuts_poses_resultats_biologiques" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Déployer d'abord
-- le code sans l'effacement des statuts et sans le modèle
-- `StatutPoseResultatBiologique` ; puis DROP TABLE et DROP FUNCTION des deux
-- fonctions ci-dessus. Tant qu'aucun statut n'est posé, rien ne se perd ;
-- après la première pose, le DROP efface des actes du praticien : le retour
-- arrière devient une décision.
