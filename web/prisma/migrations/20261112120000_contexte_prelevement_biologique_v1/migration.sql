-- LE CONTEXTE DU PRÉLÈVEMENT D'UN RÉSULTAT BIOLOGIQUE, TYPÉ, EN AJOUT SEUL,
-- RATTACHÉ À LA LIGNE RACINE DU RÉSULTAT ([[D-497]], BP-05, LOT-05, fiche
-- F20 ; DC-46).
--
-- Migration autorisée dans son principe par la demande du responsable du
-- 2026-11-12 ([[D-497]]), écrite sur sa confirmation distincte du même jour
-- (§8, PR 2). Déclaration au dossier RGPD (rubriques 2 ter, 5, 8) et texte
-- patient proposé, validés avant cette table (§7).
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore de
-- ligne, aucun code ne la lit. Le bloc de contexte de la saisie et de la
-- validation d'import, l'affichage des deux absences et les motifs de la
-- série viendront dans la PR suivante, sous les drapeaux existants
-- (`isCbResultsEnabled`, `isBioIngestEnabled`), après l'application
-- CONSTATÉE par conteneur. Le seul code qui l'accompagne est l'effacement
-- nommé du dossier (`patient/effacement.ts`) : le banc de complétude l'exige
-- de toute table qui porte `id_patient`. Entre le déploiement du code et
-- l'approbation de la release-db, un effacement de dossier échouerait donc
-- sur la table absente — transaction annulée, rien d'effacé ; d'où
-- l'approbation dans la foulée du merge.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Le contexte d'un prélèvement, tel que le praticien du dossier le saisit
-- (saisie d'un bilan, validation d'un import), écrit sur la ligne RACINE d'un
-- fil de résultat ([[D-497]] §4) : une correction du résultat ([[D-124]])
-- garde le contexte de sa racine. Sept champs, en trois formes (§2) :
--
--  - cinq DÉCLARATIONS, `oui` | `non` | `inconnu` : à jeun, supplémentation
--    arrêtée, traitement susceptible d'interférer (non nommé), épisode
--    inflammatoire déclaré, grossesse au prélèvement ;
--  - un FAIT ENTIER : le jour du cycle, état `renseigne` | `inconnu` ; si
--    `renseigne`, un entier ≥ 1 ;
--  - une DURÉE : le délai depuis la dernière prise, état `renseigne` |
--    `inconnu` ; si `renseigne`, un entier ≥ 0 et une unité `heure` | `jour`.
--
-- `inconnu` est la valeur PAR DÉFAUT de chaque champ, et une valeur écrite :
-- « le praticien ne le sait pas ». Elle n'est pas l'absence de ligne, qui
-- dit « contexte de prélèvement non recueilli » (résultat antérieur à
-- BP-05) ; aucun NULL ne porte l'un pour l'autre (§4). Les bornes ≥ 1 et ≥ 0
-- sont TECHNIQUES — un jour de cycle se compte à partir de 1, un délai n'est
-- pas négatif — ; elles n'ont aucun sens clinique, et aucune borne haute
-- n'est posée. Aucune catégorie (phase du cycle, plage horaire, délai
-- « conforme »), aucun texte libre, aucune valeur recopiée. Le moment de la
-- journée et le laboratoire ne sont pas des colonnes : ils restent ce que
-- l'import lit (§3).
--
-- ── UNE TÊTE PAR RACINE ────────────────────────────────────────────────────
--
-- Corriger un contexte écrit une ligne qui REMPLACE la tête
-- (`id_ligne_remplacee`, patron de [[D-331]] §2). La TÊTE d'une racine est
-- sa ligne que rien ne remplace. Deux index uniques la tiennent seule, sans
-- verrou et sous toute isolation :
--  - une seule ligne d'OUVERTURE par racine (`id_ligne_remplacee` nul) :
--    index unique PARTIEL sur `id_resultat` ;
--  - un seul successeur par ligne : index unique sur `id_ligne_remplacee`.
-- Avec le trigger, qui exige qu'un remplacement vise une ligne de la même
-- racine, les lignes d'une racine forment une seule chaîne : une ouverture,
-- puis chaque ligne remplacée au plus une fois — une tête. Une ligne ne
-- désigne qu'une ligne déjà écrite et ne change plus : aucun cycle.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- À l'insertion (trigger `contextes_prelevement_avant_insertion`) :
--  1. un résultat d'un autre dossier, ou absent ;
--  2. un résultat qui n'est pas la RACINE de son fil (une correction), au
--     sens de `resultats_biologiques_racine` — la remontée de BP-09, qui suit
--     `filCorrection.ts` ;
--  3. une ligne d'un autre praticien que celui du dossier (la casse ne
--     compte pas : règle de `filtrePatientsDuPraticien`) ;
--  4. un remplacement qui vise une ligne d'une autre racine, d'un autre
--     dossier, ou absente.
-- Puis les CHECK : chaque liste fermée, l'accord d'une valeur et de son
-- état, les bornes techniques, l'e-mail ; puis les deux index uniques
-- (deux ouvertures sur une racine, deux remplacements d'une même ligne).
--
-- En fin de transaction (trigger de contrainte DIFFÉRÉ
-- `contextes_prelevement_suppression_nommee`) :
--  5. une suppression dont le dossier ET le résultat désigné survivent à la
--     transaction : un contexte ne part qu'avec son résultat — l'effacement
--     nommé du dossier, ou le ramassage d'un résultat de test par les E2E
--     (`nettoyerResultatsBiologiques`, sous le drapeau que PR 3 allume) ;
--     rien d'autre ne supprime un résultat. Sans cette garde, supprimer une
--     tête ressusciterait la ligne qu'elle remplaçait (revue `wn-reviewer`
--     du lot : refuser dès que le dossier survit aurait rendu ce ramassage
--     impossible).
--
-- La base NE refuse PAS : une grossesse ou un jour du cycle renseignés pour
-- un dossier dont BP-13 déclare un autre sexe ou statut (la règle lirait une
-- autre table, à une autre date ; [[D-497]] §3 les affiche côte à côte, sans
-- les confronter) ; un contexte écrit sur un résultat dont le fil porte une
-- annulation ([[D-497]] ne l'interdit pas, et une annulation se révoque :
-- BP-09).
--
-- ── LE VERROU, ET SON ORDRE ────────────────────────────────────────────────
--
-- `FOR KEY SHARE` sur la ligne du dossier d'abord : l'effacement nommé la
-- prend `FOR UPDATE` en premier, l'ordre « dossier, puis le reste » est le
-- même partout. Aucun autre verrou : la tête ne se lit pas, les index la
-- tiennent.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est qu'en fin de
-- transaction, si le dossier et le résultat survivent (refus 5) : l'effacement du dossier
-- supprime NOMMÉMENT ces lignes, en une instruction, avant les résultats
-- (clé RESTRICT vers le résultat) et le dossier.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `pose_le` en `clock_timestamp() AT TIME ZONE 'UTC'` et `ordre` tiré à
-- l'insertion : ni l'un ni l'autre ne s'antidate.

-- CreateTable
CREATE TABLE "contextes_prelevement" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT NOT NULL,
    "a_jeun" TEXT NOT NULL DEFAULT 'inconnu',
    "supplementation_arretee" TEXT NOT NULL DEFAULT 'inconnu',
    "traitement_interferent" TEXT NOT NULL DEFAULT 'inconnu',
    "episode_inflammatoire" TEXT NOT NULL DEFAULT 'inconnu',
    "grossesse" TEXT NOT NULL DEFAULT 'inconnu',
    "jour_cycle_etat" TEXT NOT NULL DEFAULT 'inconnu',
    "jour_cycle" INTEGER,
    "delai_derniere_prise_etat" TEXT NOT NULL DEFAULT 'inconnu',
    "delai_derniere_prise" INTEGER,
    "delai_derniere_prise_unite" TEXT,
    "id_ligne_remplacee" TEXT,
    "praticien_email" TEXT NOT NULL,
    "pose_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contextes_prelevement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contextes_prelevement_ordre_key" ON "contextes_prelevement"("ordre");

-- CreateIndex
-- Une ligne a au plus un successeur. Les NULL ne se comparent pas : les
-- ouvertures coexistent ici, l'index partiel ci-dessous les tient.
CREATE UNIQUE INDEX "contextes_prelevement_id_ligne_remplacee_key" ON "contextes_prelevement"("id_ligne_remplacee");

-- CreateIndex
-- Une seule ouverture par racine ([[D-497]] §4). Partiel : Prisma ne le
-- modélise pas, le contrat SQL le tient.
CREATE UNIQUE INDEX "contextes_prelevement_ouverture_par_racine_key" ON "contextes_prelevement"("id_resultat")
  WHERE "id_ligne_remplacee" IS NULL;

-- CreateIndex
-- « Les contextes de ce dossier, dans l'ordre » (écrans, effacement) et « les
-- lignes de cette racine, dans l'ordre » (la tête). Le second sert aussi la
-- clé étrangère vers le résultat.
CREATE INDEX "contextes_prelevement_patient_ordre_idx" ON "contextes_prelevement"("id_patient", "ordre");
CREATE INDEX "contextes_prelevement_resultat_ordre_idx" ON "contextes_prelevement"("id_resultat", "ordre");

-- AddForeignKey
-- ON DELETE RESTRICT vers le dossier et le résultat : l'effacement est une
-- suppression NOMMÉE, qui passe par les contextes avant les résultats. En
-- CASCADE, ils partiraient en silence.
ALTER TABLE "contextes_prelevement" ADD CONSTRAINT "contextes_prelevement_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contextes_prelevement" ADD CONSTRAINT "contextes_prelevement_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION : l'effacement supprime les lignes du dossier en une
-- instruction, et la clé se vérifie à sa fin.
ALTER TABLE "contextes_prelevement" ADD CONSTRAINT "contextes_prelevement_id_ligne_remplacee_fkey" FOREIGN KEY ("id_ligne_remplacee") REFERENCES "contextes_prelevement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — une contrainte par règle, nommée ───────────────────────────
--
-- Une valeur hors liste dans un `IN` vaut faux ; NULL est refusé par
-- NOT NULL avant. Pour les valeurs optionnelles, `IS NULL OR …` : l'accord
-- avec l'état est une règle à part.

ALTER TABLE "contextes_prelevement"
  ADD CONSTRAINT "contextes_prelevement_a_jeun_check"
    CHECK ("a_jeun" IN ('oui', 'non', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_supplementation_arretee_check"
    CHECK ("supplementation_arretee" IN ('oui', 'non', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_traitement_interferent_check"
    CHECK ("traitement_interferent" IN ('oui', 'non', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_episode_inflammatoire_check"
    CHECK ("episode_inflammatoire" IN ('oui', 'non', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_grossesse_check"
    CHECK ("grossesse" IN ('oui', 'non', 'inconnu')),
  -- Le jour du cycle : un état, et la valeur présente si et seulement si
  -- l'état est `renseigne`. Borne TECHNIQUE basse seule.
  ADD CONSTRAINT "contextes_prelevement_jour_cycle_etat_check"
    CHECK ("jour_cycle_etat" IN ('renseigne', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_jour_cycle_selon_etat"
    CHECK (("jour_cycle_etat" = 'renseigne') = ("jour_cycle" IS NOT NULL)),
  ADD CONSTRAINT "contextes_prelevement_jour_cycle_borne"
    CHECK ("jour_cycle" IS NULL OR "jour_cycle" >= 1),
  -- Le délai depuis la dernière prise : un état, et la valeur ET son unité
  -- présentes si et seulement si l'état est `renseigne`. Borne TECHNIQUE
  -- basse seule.
  ADD CONSTRAINT "contextes_prelevement_delai_etat_check"
    CHECK ("delai_derniere_prise_etat" IN ('renseigne', 'inconnu')),
  ADD CONSTRAINT "contextes_prelevement_delai_selon_etat"
    CHECK (
      ("delai_derniere_prise_etat" = 'renseigne') = ("delai_derniere_prise" IS NOT NULL)
      AND ("delai_derniere_prise_etat" = 'renseigne') = ("delai_derniere_prise_unite" IS NOT NULL)
    ),
  ADD CONSTRAINT "contextes_prelevement_delai_borne"
    CHECK ("delai_derniere_prise" IS NULL OR "delai_derniere_prise" >= 0),
  ADD CONSTRAINT "contextes_prelevement_delai_unite_check"
    CHECK ("delai_derniere_prise_unite" IS NULL OR "delai_derniere_prise_unite" IN ('heure', 'jour')),
  -- `~ '\S'` et non `btrim/1` : un e-mail fait de tabulations n'en est pas un.
  ADD CONSTRAINT "contextes_prelevement_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320),
  ADD CONSTRAINT "contextes_prelevement_ne_se_remplace_pas"
    CHECK ("id_ligne_remplacee" IS DISTINCT FROM "id");

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.contextes_prelevement_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un contexte de prélèvement est figé (% refusé) ; on le corrige en remplaçant sa tête, et seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER contextes_prelevement_no_update
  BEFORE UPDATE ON public.contextes_prelevement
  FOR EACH ROW EXECUTE FUNCTION public.contextes_prelevement_figee();

CREATE TRIGGER contextes_prelevement_no_truncate
  BEFORE TRUNCATE ON public.contextes_prelevement
  FOR EACH STATEMENT EXECUTE FUNCTION public.contextes_prelevement_figee();

-- ── À L'INSERTION ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.contextes_prelevement_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  praticien_dossier text;
  resultat_patient text;
  remplacee_patient text;
  remplacee_resultat text;
BEGIN
  -- Le dossier d'abord (en-tête, « Le verrou, et son ordre »).
  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient
  FOR KEY SHARE;

  SELECT r.id_patient INTO resultat_patient
  FROM public.resultats_biologiques r
  WHERE r.id = NEW.id_resultat;
  IF resultat_patient IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'contexte refusé : % n''est pas un résultat de ce dossier.', NEW.id_resultat;
  END IF;

  IF public.resultats_biologiques_racine(NEW.id_resultat) IS DISTINCT FROM NEW.id_resultat THEN
    RAISE EXCEPTION 'contexte refusé : % est une correction ; le contexte se rattache à la ligne racine du fil.', NEW.id_resultat;
  END IF;

  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'contexte refusé : seul le praticien du dossier écrit le contexte d''un prélèvement.';
  END IF;

  IF NEW.id_ligne_remplacee IS NOT NULL THEN
    SELECT c.id_patient, c.id_resultat INTO remplacee_patient, remplacee_resultat
    FROM public.contextes_prelevement c
    WHERE c.id = NEW.id_ligne_remplacee;
    IF remplacee_patient IS DISTINCT FROM NEW.id_patient
       OR remplacee_resultat IS DISTINCT FROM NEW.id_resultat THEN
      RAISE EXCEPTION 'contexte refusé : un remplacement vise une ligne de la même racine, dans ce dossier.';
    END IF;
  END IF;
  -- Une ligne déjà remplacée, ou une seconde ouverture, passent ici : les
  -- index uniques les refusent ensuite. Le trigger ne double pas une garde
  -- que la concurrence ne contournerait pas.

  NEW.pose_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.contextes_prelevement', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER contextes_prelevement_avant_insertion
  BEFORE INSERT ON public.contextes_prelevement
  FOR EACH ROW EXECUTE FUNCTION public.contextes_prelevement_avant_insertion();

-- ── EN FIN DE TRANSACTION : LA SUPPRESSION EST CELLE DU DOSSIER ────────────

CREATE OR REPLACE FUNCTION public.contextes_prelevement_suppression_nommee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.id_patient = OLD.id_patient)
     AND EXISTS (SELECT 1 FROM public.resultats_biologiques r WHERE r.id = OLD.id_resultat) THEN
    RAISE EXCEPTION '% : suppression refusée ; un contexte de prélèvement ne s''efface qu''avec son résultat ou son dossier.', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER contextes_prelevement_suppression_nommee
  AFTER DELETE ON public.contextes_prelevement
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.contextes_prelevement_suppression_nommee();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_suppression_nommee() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.contextes_prelevement_suppression_nommee() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."contextes_prelevement" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans
-- l'effacement des contextes et sans le modèle `ContextePrelevement` ; puis
-- DROP TABLE et DROP FUNCTION des trois fonctions ci-dessus. Entre ces deux
-- temps, un dossier qui porte un contexte ne s'efface plus (la clé RESTRICT
-- vers le résultat refuse, la transaction d'effacement est annulée entière) :
-- la fenêtre se tient courte. Tant qu'aucun code ne l'écrit, la table est
-- vide ; après la première ligne, le DROP efface des actes du praticien : le
-- retour arrière devient une décision.
