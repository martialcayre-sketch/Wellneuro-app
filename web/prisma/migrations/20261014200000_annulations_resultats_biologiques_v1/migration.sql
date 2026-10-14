-- ANNULATION D'UN RÉSULTAT DE BIOLOGIE SAISI PAR ERREUR, EN AJOUT SEUL
-- ([[D-294]], BIO-PARCOURS BP-09, fiche LOT-09).
--
-- Migration demandée explicitement par le responsable le 2026-10-14 (« PR 1,
-- la migration seule »), après la déclaration au registre RGPD (même PR).
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit encore
-- d'annulation, aucun code ne la lit. Les lecteurs de calcul et la route
-- viendront dans la PR 2 du lot, après l'application CONSTATÉE par conteneur.
-- Le seul code qui l'accompagne est l'effacement nommé du dossier
-- (`patient/effacement.ts`), comme pour `lectures_imports_biologiques` : le
-- banc de complétude de l'effacement l'exige de toute table qui porte
-- `id_patient`. Entre le déploiement du code et l'approbation de la
-- release-db, un effacement de dossier échouerait donc sur la table absente —
-- transaction annulée, rien d'effacé ; d'où l'approbation dans la foulée du
-- merge.
--
-- Deux objets, dans une seule transaction :
--   A. la table des actes d'annulation (neuve) ;
--   B. la garde anti-doublon de `resultats_biologiques`, qui cesse d'être un
--      index unique partiel pour devenir un trigger : un résultat annulé doit
--      LIBÉRER sa place (dossier, analyte, date) — arbitrage du responsable du
--      2026-10-14, [[D-294]] §3 —, et un index ne sait pas regarder une autre
--      table.
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Deux actes, dans une seule table en ajout seul :
--
--  - `annulation` : « ce résultat a été saisi par erreur », avec un motif pris
--    dans une liste FERMÉE ([[D-294]] §2) : `mauvais_dossier`,
--    `mauvaise_date_prelevement`, `mauvais_analyte`. Une erreur de valeur ou
--    d'unité reste une CORRECTION ([[D-124]]), jamais une annulation.
--  - `revocation` : « cette annulation-là était une erreur », avec un motif
--    pris dans une liste FERMÉE ([[D-294]] §4) : `mauvais_resultat_annule`,
--    `resultat_verifie_exact`, `motif_annulation_errone`. Le résultat revient
--    alors dans les séries parce qu'une ligne s'ajoute.
--
-- Rien ne s'efface. La table ne recopie AUCUNE valeur, aucun analyte, aucune
-- date, et ne porte aucun texte libre (contrat négatif, liste blanche des
-- colonnes). Un motif neuf passe par une décision, puis une migration.
--
-- ── LE FIL : SA RACINE DE CHAÎNE ───────────────────────────────────────────
--
-- L'annulation retire le FIL de correction entier, pas une ligne ([[D-294]]
-- §3). Le fil d'un résultat est l'ensemble des lignes qui descendent de la
-- même RACINE (la ligne au `supersedes_resultat_id` nul que l'on atteint en
-- remontant la chaîne) — la définition de `filCorrection.ts`. Ce n'est plus la
-- clé (dossier, analyte, date) : une place libérée par une annulation peut
-- recevoir une mesure neuve, et la clé porte alors deux fils, l'annulé et le
-- vivant. Un fil est annulé dès qu'UNE de ses lignes porte une annulation non
-- révoquée : une correction concurrente qui ferait naître une tête nouvelle ne
-- le ressuscite pas. La remontée vit dans `resultats_biologiques_racine`, qui
-- suit `filCorrection.ts` jusque sur les chaînes orphelines et les cycles.
--
-- ── LA GARDE ANTI-DOUBLON, DEVENUE TRIGGER (amende [[D-124]] §2) ───────────
--
-- Une saisie NEUVE (`supersedes_resultat_id` nul) est refusée si la clé porte
-- déjà une racine dont le fil n'est pas annulé. Sans annulation, c'est très
-- exactement ce que faisait l'index partiel ; la production (60 résultats,
-- 0 correction, 0 clé en double parmi les têtes au 2026-10-14) le satisfait
-- déjà. Le refus garde la forme d'une violation d'unicité — SQLSTATE 23505,
-- contrainte `cb_resultat_bio_patient_analyte_idx` (le nom de la garde depuis
-- la création de la table), détail `Key (id_patient, analyte_code,
-- preleve_le) already exists.` — si bien que l'adaptateur Prisma le rend en
-- `P2002` et que le 409 `doublon_mesure` des trois écrivains (saisie, bilan,
-- import) ne bouge pas. Le trigger vise aussi l'UPDATE, que l'index couvrait.
--
-- ── LES VERROUS, ET LEUR ORDRE ─────────────────────────────────────────────
--
-- Un index unique était sûr face aux courses ; un trigger ne l'est que par
-- ses verrous. `resultats_biologiques_verrouiller_cle` prend, dans cet ordre :
--   1. `FOR KEY SHARE` sur la ligne du dossier — le verrou que prendrait la
--      clé étrangère, mais AVANT tout le reste : l'effacement nommé prend le
--      dossier `FOR UPDATE` en premier, et l'ordre « dossier, puis le reste »
--      est alors le même partout (pas d'interblocage avec lui — revue
--      `wn-reviewer` du lot, P1-2) ;
--   2. un verrou consultatif de transaction sur la clé (espace 291,
--      `hashtext` de la clé) : deux saisies neuves de la même clé, ou une
--      saisie et un acte d'annulation, se sérialisent — une saisie neuve
--      n'a aucune ligne existante à verrouiller. Une collision de hachage
--      sérialise deux clés sans rapport.
-- Saisie neuve, annulation et révocation prennent ce même couple. Le
-- verrou consultatif n'entre en conflit avec aucun verrou de ligne.
-- CE QUE L'ORDRE GARANTIT, ET CE QU'IL NE GARANTIT PAS : pas d'interblocage
-- avec l'effacement. Deux transactions qui saisissent les mêmes clés dans
-- un ordre croisé s'interbloquent, comme elles le faisaient avec l'index —
-- et, cas neuf, deux clés sans rapport dont les hachages se rencontrent.
-- Postgres tue alors l'une des deux ; aucune n'écrit à tort.
-- L'ISOLATION, TENUE EN BASE (passe Codex du lot, P0-1) : l'index retiré
-- garantissait l'unicité sous tout niveau d'isolation ; un trigger qui lit
-- sous instantané ne la garantit pas en REPEATABLE READ — l'instantané
-- masquerait la ligne que le verrou vient de laisser commettre. Ce niveau
-- est donc REFUSÉ par `resultats_biologiques_verrouiller_cle` : une écriture
-- en REPEATABLE READ échoue, elle ne crée pas deux mesures courantes. En
-- READ COMMITTED (le régime de l'application), le refus est un 23505 ; en
-- SERIALIZABLE, l'intégrité tient par la détection de conflit de PostgreSQL
-- et la course finit en échec de sérialisation (40001, `P2034` côté
-- Prisma), pas en 409 `doublon_mesure`.
-- Le banc à deux sessions
-- (`scripts/banc-annulations-resultats-deux-sessions.test.mjs`) éprouve les
-- courses ; le contrat relit la présence des verrous.
--
-- ── CE QUE LA BASE REFUSE SUR LES ACTES ────────────────────────────────────
--
--  1. LE RÉSULTAT APPARTIENT AU DOSSIER : refus nommé par le trigger. La clé
--     étrangère vers `resultats_biologiques(id)` est simple — une clé
--     composite exigerait un index unique neuf sur `resultats_biologiques`.
--  2. L'ACTE EST CELUI DU PRATICIEN DU DOSSIER : l'e-mail de l'acte égale, sans
--     égard à la casse, celui que porte le dossier — la règle de
--     `filtrePatientsDuPraticien`. La route le vérifiera ; la base est la
--     garde qui reste si une route l'oubliait.
--  3. UNE ANNULATION VISE UNE TÊTE DE FIL : une ligne qu'aucune autre ne
--     supplante. Sur une fourche (deux corrections concurrentes, que
--     [[D-124]] tolère), les deux branches sont des têtes : l'une ou l'autre
--     annule le fil, et l'élection fine reste celle de la route.
--  4. AU PLUS UNE ANNULATION ACTIVE PAR FIL (par racine, pas par clé). Après
--     révocation, une nouvelle annulation est admise.
--  5. UNE RÉVOCATION VISE UNE ANNULATION DU MÊME RÉSULTAT, une fois (index
--     unique partiel), et elle est REFUSÉE si la place a été reprise : une
--     autre racine vivante sur la même clé ferait, une fois le fil revenu,
--     deux mesures courantes pour un même analyte à une même date.
--
-- La correction d'un fil annulé est refusée par la route (PR 2) : la base n'en
-- a pas besoin, le fil restant annulé quelle que soit sa tête.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, comme
-- pour `lectures_imports_biologiques` : chaque ligne est une donnée patient,
-- et l'effacement du dossier la supprime NOMMÉMENT, avant les résultats que
-- ses clés RESTRICT retiennent.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma :
-- un `now()` nu suit le fuseau de session), et `ordre` tiré à l'insertion :
-- ni l'un ni l'autre ne s'antidate.

-- ═══ A. LA TABLE DES ACTES ═══════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "annulations_resultats_biologiques" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_resultat" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "motif_annulation" TEXT,
    "id_annulation_revoquee" TEXT,
    "motif_revocation" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annulations_resultats_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "annulations_resultats_biologiques_ordre_key" ON "annulations_resultats_biologiques"("ordre");

-- CreateIndex
-- « Les actes de ce dossier, dans l'ordre » (fiche praticien, lecteurs de
-- calcul) et « les actes de ce résultat, dans l'ordre ». Le second sert aussi
-- la clé étrangère vers le résultat.
CREATE INDEX "annulations_resultats_biologiques_patient_ordre_idx" ON "annulations_resultats_biologiques"("id_patient", "ordre");
CREATE INDEX "annulations_resultats_biologiques_resultat_ordre_idx" ON "annulations_resultats_biologiques"("id_resultat", "ordre");

-- CreateIndex
-- Index ORDINAIRE de la clé interne : la vérification d'une clé étrangère ne
-- se sert pas de l'index unique partiel.
CREATE INDEX "annulations_resultats_biologiques_annulation_revoquee_idx" ON "annulations_resultats_biologiques"("id_annulation_revoquee");

-- Une annulation ne se révoque qu'une fois. Index partiel : Prisma ne le
-- modélise pas, la parité de schéma ne le voit pas, le contrat négatif
-- l'éprouve.
CREATE UNIQUE INDEX "annulations_resultats_biologiques_une_revocation_par_annulation"
  ON "annulations_resultats_biologiques"("id_annulation_revoquee") WHERE "acte" = 'revocation';

-- AddForeignKey
-- ON DELETE RESTRICT vers le patient et le résultat : l'effacement d'un
-- dossier est une suppression NOMMÉE, qui passe par les annulations avant
-- les résultats. En CASCADE, elles partiraient en silence.
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultats_biologiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION sur la clé interne : l'effacement supprime les actes d'un dossier
-- en UNE instruction, révocations comprises, et le contrat éprouve que cette
-- instruction passe.
ALTER TABLE "annulations_resultats_biologiques" ADD CONSTRAINT "annulations_resultats_biologiques_id_annulation_revoquee_fkey" FOREIGN KEY ("id_annulation_revoquee") REFERENCES "annulations_resultats_biologiques"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — la forme de chaque acte, les deux listes fermées ───────────

ALTER TABLE "annulations_resultats_biologiques"
  ADD CONSTRAINT "annulations_resultats_biologiques_acte_check"
    CHECK ("acte" IN ('annulation', 'revocation')),
  ADD CONSTRAINT "annulations_resultats_biologiques_forme_annulation"
    CHECK ("acte" <> 'annulation' OR (
      "motif_annulation" IS NOT NULL
      AND "id_annulation_revoquee" IS NULL
      AND "motif_revocation" IS NULL
    )),
  ADD CONSTRAINT "annulations_resultats_biologiques_forme_revocation"
    CHECK ("acte" <> 'revocation' OR (
      "id_annulation_revoquee" IS NOT NULL
      AND "motif_revocation" IS NOT NULL
      AND "motif_annulation" IS NULL
    )),
  ADD CONSTRAINT "annulations_resultats_biologiques_motif_annulation_check"
    CHECK ("motif_annulation" IN ('mauvais_dossier', 'mauvaise_date_prelevement', 'mauvais_analyte')),
  ADD CONSTRAINT "annulations_resultats_biologiques_motif_revocation_check"
    CHECK ("motif_revocation" IN ('mauvais_resultat_annule', 'resultat_verifie_exact', 'motif_annulation_errone')),
  ADD CONSTRAINT "annulations_resultats_biologiques_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320);

-- ═══ LES TROIS FONCTIONS PARTAGÉES ═══════════════════════════════════════════

-- Le couple de verrous, dans l'ordre (en-tête, « Les verrous »).
CREATE OR REPLACE FUNCTION public.resultats_biologiques_verrouiller_cle(
  p_patient text, p_analyte text, p_preleve timestamp(3)
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- REPEATABLE READ refusé, en base (passe Codex du lot, P0-1) : son
  -- instantané de transaction masquerait la ligne que le verrou de clé vient
  -- de laisser commettre, et deux mesures courantes passeraient — l'index
  -- retiré, lui, ne dépendait d'aucun réglage. READ COMMITTED relit après
  -- l'attente ; SERIALIZABLE détecte le conflit lecture/écriture et annule
  -- l'une des deux. Aucun écrivain de l'application n'emploie REPEATABLE READ
  -- au 2026-10-14 ; un écrivain futur qui l'emploierait échoue, il n'écrit
  -- pas à tort.
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'écriture refusée en REPEATABLE READ : la garde anti-doublon des résultats biologiques exige READ COMMITTED ou SERIALIZABLE.';
  END IF;
  PERFORM 1 FROM public.patients p WHERE p.id_patient = p_patient FOR KEY SHARE;
  -- `to_char` à format fixe, jamais `::text` : la conversion suit le
  -- `DateStyle` de la session, et deux sessions aux réglages différents
  -- hacheraient la même clé différemment — elles ne se sérialiseraient plus
  -- (contre-revue du lot, P2-2).
  PERFORM pg_advisory_xact_lock(291, hashtext(
    p_patient || '|' || p_analyte || '|' || to_char(p_preleve, 'YYYY-MM-DD"T"HH24:MI:SS.MS')
  ));
END;
$$;

-- La racine du fil d'un résultat : on remonte `supersedes_resultat_id`. La
-- règle est celle de `filCorrection.ts` (`racine`), à l'identique, pour que la
-- base et l'écran voient les mêmes fils (contre-revue du lot, P2-1) :
--   - une cible ABSENTE (référence souple, chaîne orpheline) fait racine —
--     deux orphelines qui visent la même ligne absente forment un seul fil ;
--   - un CYCLE (irréalisable par la route) rend le plus petit identifiant du
--     cycle, en ordre binaire (`COLLATE "C"`, l'ordre de `sort()` en
--     JavaScript sur des identifiants ASCII) — un représentant canonique,
--     sans échec : une saisie neuve sur la clé ne tombe pas en 500.
CREATE OR REPLACE FUNCTION public.resultats_biologiques_racine(p_id text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  courante text := p_id;
  amont text;
  vues text[] := ARRAY[p_id];
  rang integer;
BEGIN
  LOOP
    SELECT r.supersedes_resultat_id INTO amont
    FROM public.resultats_biologiques r
    WHERE r.id = courante;
    IF amont IS NULL OR amont = '' THEN
      RETURN courante;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.resultats_biologiques r WHERE r.id = amont) THEN
      RETURN amont;
    END IF;
    rang := array_position(vues, amont);
    IF rang IS NOT NULL THEN
      RETURN (SELECT min(v COLLATE "C") FROM unnest(vues[rang:]) AS v);
    END IF;
    vues := vues || amont;
    courante := amont;
  END LOOP;
END;
$$;

-- Le fil de racine `p_racine`, sur la clé donnée, porte-t-il une annulation
-- non révoquée ? Les annulations candidates sont celles des lignes de la
-- clé : un fil tient entier dans sa clé (une correction hérite de l'analyte
-- et de la date de sa cible, relus par la route).
CREATE OR REPLACE FUNCTION public.resultats_biologiques_racine_annulee(
  p_racine text, p_patient text, p_analyte text, p_preleve timestamp(3)
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.annulations_resultats_biologiques a
    JOIN public.resultats_biologiques r ON r.id = a.id_resultat
    WHERE a.id_patient = p_patient
      AND a.acte = 'annulation'
      AND r.id_patient = p_patient
      AND r.analyte_code = p_analyte
      AND r.preleve_le = p_preleve
      AND NOT EXISTS (
        SELECT 1 FROM public.annulations_resultats_biologiques v
        WHERE v.acte = 'revocation' AND v.id_annulation_revoquee = a.id
      )
      AND public.resultats_biologiques_racine(a.id_resultat) = p_racine
  );
END;
$$;

-- ═══ B. LA GARDE ANTI-DOUBLON DE `resultats_biologiques` ═════════════════════

CREATE OR REPLACE FUNCTION public.resultats_biologiques_unicite_mesure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.resultats_biologiques_verrouiller_cle(NEW.id_patient, NEW.analyte_code, NEW.preleve_le);
  IF EXISTS (
    SELECT 1 FROM public.resultats_biologiques r
    WHERE r.id_patient = NEW.id_patient
      AND r.analyte_code = NEW.analyte_code
      AND r.preleve_le = NEW.preleve_le
      AND r.supersedes_resultat_id IS NULL
      AND r.id <> NEW.id
      AND NOT public.resultats_biologiques_racine_annulee(r.id, NEW.id_patient, NEW.analyte_code, NEW.preleve_le)
  ) THEN
    -- La forme d'une violation d'unicité, pour que le 409 `doublon_mesure`
    -- des écrivains ne bouge pas : l'adaptateur Prisma rend 23505 en P2002 et
    -- lit les champs dans `Key (…)`.
    RAISE EXCEPTION 'doublon de mesure : ce dossier porte déjà une mesure courante de cet analyte à cette date de prélèvement.'
      USING ERRCODE = 'unique_violation',
            CONSTRAINT = 'cb_resultat_bio_patient_analyte_idx',
            DETAIL = 'Key (id_patient, analyte_code, preleve_le) already exists.';
  END IF;
  RETURN NULL;
END;
$$;

-- Le trigger d'abord, l'index ensuite : la transaction de la migration ne
-- laisse aucune fenêtre sans garde.
--
-- AFTER, et non BEFORE : l'index refusait APRÈS les CHECK, et une ligne à la
-- fois invalide et en doublon doit garder son refus de forme (23514) — le
-- contrat `cb_resultats_biologiques_v1_negatif.sql` y tient. Les triggers
-- AFTER d'une table se déclenchent par ordre de nom : ceux des clés
-- étrangères (`RI_ConstraintTrigger_…`) passent avant celui-ci, si bien qu'un
-- dossier inexistant reste un refus de clé (23503), et que le `FOR KEY SHARE`
-- du dossier est déjà pris quand le verrou de clé l'est — l'ordre « dossier,
-- puis clé » tient. Les lignes d'une même instruction s'y voient toutes : deux
-- saisies neuves de la même clé dans un seul INSERT se refusent.
CREATE TRIGGER resultats_biologiques_unicite_mesure
  AFTER INSERT OR UPDATE ON public.resultats_biologiques
  FOR EACH ROW
  WHEN (NEW.supersedes_resultat_id IS NULL)
  EXECUTE FUNCTION public.resultats_biologiques_unicite_mesure();

-- DropIndex — la garde quitte l'index pour le trigger ci-dessus. Pas
-- d'`IF EXISTS` : si l'état divergeait, la migration doit échouer bruyamment.
-- La lecture de la clé reste servie par `cb_resultat_bio_serie_idx`, sur les
-- mêmes colonnes.
DROP INDEX "cb_resultat_bio_patient_analyte_idx";

-- ═══ LES TRIGGERS DE LA TABLE DES ACTES ══════════════════════════════════════

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.annulations_resultats_biologiques_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un acte d''annulation est figé (% refusé) ; seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER annulations_resultats_biologiques_no_update
  BEFORE UPDATE ON public.annulations_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.annulations_resultats_biologiques_figee();

CREATE TRIGGER annulations_resultats_biologiques_no_truncate
  BEFORE TRUNCATE ON public.annulations_resultats_biologiques
  FOR EACH STATEMENT EXECUTE FUNCTION public.annulations_resultats_biologiques_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.annulations_resultats_biologiques_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cible_id text;
  cible_analyte text;
  cible_preleve timestamp(3);
  racine text;
  praticien_dossier text;
  vise_resultat text;
  vise_acte text;
BEGIN
  SELECT r.id, r.analyte_code, r.preleve_le INTO cible_id, cible_analyte, cible_preleve
  FROM public.resultats_biologiques r
  WHERE r.id = NEW.id_resultat AND r.id_patient = NEW.id_patient;
  IF cible_id IS NULL THEN
    RAISE EXCEPTION 'acte d''annulation refusé : % n''est pas un résultat de ce dossier.', NEW.id_resultat;
  END IF;

  -- Les verrous d'abord : tout ce qui suit se lit après les saisies et les
  -- actes concurrents sur la même clé.
  PERFORM public.resultats_biologiques_verrouiller_cle(NEW.id_patient, cible_analyte, cible_preleve);

  SELECT p.praticien_email INTO praticien_dossier
  FROM public.patients p
  WHERE p.id_patient = NEW.id_patient;
  IF lower(praticien_dossier) IS DISTINCT FROM lower(NEW.praticien_email) THEN
    RAISE EXCEPTION 'acte d''annulation refusé : seul le praticien du dossier annule ou révoque.';
  END IF;

  racine := public.resultats_biologiques_racine(NEW.id_resultat);

  IF NEW.acte = 'annulation' THEN
    IF EXISTS (
      SELECT 1 FROM public.resultats_biologiques s
      WHERE s.supersedes_resultat_id = NEW.id_resultat
    ) THEN
      RAISE EXCEPTION 'annulation refusée : % a été corrigé ; seule la tête du fil s''annule.', NEW.id_resultat;
    END IF;
    IF public.resultats_biologiques_racine_annulee(racine, NEW.id_patient, cible_analyte, cible_preleve) THEN
      RAISE EXCEPTION 'annulation refusée : le fil de % porte déjà une annulation active.', NEW.id_resultat;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    SELECT a.id_resultat, a.acte INTO vise_resultat, vise_acte
    FROM public.annulations_resultats_biologiques a
    WHERE a.id = NEW.id_annulation_revoquee;
    IF vise_resultat IS DISTINCT FROM NEW.id_resultat
       OR vise_acte IS DISTINCT FROM 'annulation' THEN
      RAISE EXCEPTION 'révocation refusée : % n''est pas une annulation de ce résultat.', NEW.id_annulation_revoquee;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.resultats_biologiques r
      WHERE r.id_patient = NEW.id_patient
        AND r.analyte_code = cible_analyte
        AND r.preleve_le = cible_preleve
        AND r.supersedes_resultat_id IS NULL
        AND r.id <> racine
        AND NOT public.resultats_biologiques_racine_annulee(r.id, NEW.id_patient, cible_analyte, cible_preleve)
    ) THEN
      RAISE EXCEPTION 'révocation refusée : une autre mesure a repris la place de % (même analyte, même date).', NEW.id_resultat;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK `acte_check` le refuse
  -- ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.annulations_resultats_biologiques', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER annulations_resultats_biologiques_avant_insertion
  BEFORE INSERT ON public.annulations_resultats_biologiques
  FOR EACH ROW EXECUTE FUNCTION public.annulations_resultats_biologiques_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_verrouiller_cle(text, text, timestamp) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_racine(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_racine_annulee(text, text, text, timestamp) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_unicite_mesure() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_verrouiller_cle(text, text, timestamp) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_racine(text) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_racine_annulee(text, text, text, timestamp) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.resultats_biologiques_unicite_mesure() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_figee() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.annulations_resultats_biologiques_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."annulations_resultats_biologiques" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- annulation n'existe : recréer l'index unique partiel
-- `cb_resultat_bio_patient_analyte_idx` (forme de 20260905074500) AVANT de
-- retirer le trigger `resultats_biologiques_unicite_mesure`, dans la même
-- transaction ; déployer d'abord le code sans l'effacement des annulations et
-- sans le modèle `AnnulationResultatBiologique` ; puis DROP TABLE et DROP
-- FUNCTION des six fonctions ci-dessus. Après une annulation suivie d'une
-- saisie neuve sur la même clé, l'index ne se recrée plus : le retour arrière
-- devient une décision.
