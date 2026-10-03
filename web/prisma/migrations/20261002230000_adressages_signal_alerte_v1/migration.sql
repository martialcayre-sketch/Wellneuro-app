-- SIGNAL D'ALERTE ADRESSÉ — LA COUVERTURE STRUCTURÉE D'UNE LETTRE D'ADRESSAGE
-- ([[D-257]] §4-§7, campagne « levée du blocage par signal d'alerte », LOT-02).
--
-- Migration demandée explicitement par le responsable le 2026-10-02 (« Oui
-- enchaîne », sur le LOT-02 du cadrage). MIGRATION SEULE ([[D-087]]) : aucun
-- code n'écrit encore d'adressage, aucun code ne le lit. L'écriture à la
-- consignation de la lettre et le geste de révocation (LOT-03), puis la
-- partition de la chaîne C1 derrière un drapeau éteint (LOT-04), ne viendront
-- qu'après l'application CONSTATÉE par conteneur. Le seul code qui
-- l'accompagne est l'effacement nommé du dossier (`patient/effacement.ts`).
--
-- ── CE QU'UNE LIGNE DIT ────────────────────────────────────────────────────
--
-- Deux actes, dans une seule table en ajout seul :
--
--  - `adressage` : « cette lettre d'adressage consignée couvre CES constats de
--    sécurité, déclarés dans CETTE consultation ». C'est la couverture que
--    [[D-257]] §5 exige STRUCTURÉE : la lettre ne garde les signaux que dans
--    sa prose, et une couverture ne se lit jamais dans la prose (A9 — les
--    lettres antérieures à cette table ne lèvent rien).
--  - `revocation` : « cet adressage-là est révoqué, et voici pourquoi »
--    ([[D-257]] §6, A12). Rien ne s'efface : le dossier rebloque parce qu'une
--    ligne s'ajoute, pas parce qu'une ligne disparaît.
--
-- La table ne recopie AUCUN libellé de signal : elle porte des identifiants de
-- constat (`safety:anamnese:` + 16 hexadécimaux, l'empreinte du libellé
-- verbatim calculée par `safetyFindings.ts`). Le libellé reste dans
-- l'anamnèse, la conduite dans la table signée.
--
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
-- Une ligne `adressage` LÈVE une inhibition de sécurité. Une route se
-- contourne ; une levée posée sur la mauvaise lettre, le mauvais dossier ou le
-- mauvais constat ferait proposer un protocole à un patient qu'aucun médecin
-- n'a vu passer. Les refus sont donc en base :
--
--  1. LA LETTRE EST UNE LETTRE D'ADRESSAGE DE CE DOSSIER : même patient, sens
--     `sortant`, ancrée sur la cotation des signaux (`ancrage_version` de la
--     famille `safety-signals-`, [[D-218]] §7). Une lettre de biologie, une
--     correspondance saisie à la main ou une lettre d'un autre dossier ne
--     lèvent rien.
--  2. LA LETTRE EST CONSIGNÉE DANS LA MÊME TRANSACTION QUE SA COUVERTURE
--     ([[D-257]] §5, A9 ; constat de revue P1-1). Sans cela, une lettre
--     ancienne — écrite sur les signaux d'une consultation antérieure, ou
--     consignée avant cette table — pourrait être rattachée après coup à une
--     consultation plus récente, et lever un signal REDÉCLARÉ que A6 dit
--     rebloquant (même libellé, donc même identifiant de constat). La preuve
--     est l'`xmin` de la lettre, comparé à la transaction courante : aucune
--     comparaison d'horodatage, donc aucune dépendance au fuseau de session.
--     Conséquence pour l'écrivain (LOT-03) : la lettre et sa couverture
--     s'insèrent dans une seule transaction, au même niveau — une lettre
--     insérée sous un point de sauvegarde porte l'identifiant de la
--     sous-transaction, et sa couverture est refusée (refus fermé).
--  3. LA CONSULTATION EST LA PORTEUSE DE CE DOSSIER AU MOMENT DE L'INSERTION
--     ([[D-257]] §4, A6) : validée, avec une anamnèse, et la première dans
--     l'ordre de `consultationPorteuse.ts` (`date_validation` décroissante
--     puis `created_at` décroissante, NULL en tête comme le fait Prisma). La
--     règle est rejouée ici telle quelle : deux lectures différentes de « la
--     porteuse » feraient lever une couverture que la chaîne C1 n'aurait pas
--     désignée. Avec le point 2, la lettre a donc été écrite sur les signaux
--     de cette consultation-là.
--  4. CHAQUE CONSTAT COUVERT EST UN CONSTAT D'ANAMNÈSE, une fois : un constat
--     d'effet indésirable n'est JAMAIS levé par une lettre ([[D-257]] §7,
--     [[D-218]] §10) — le préfixe est fermé ici, en base.
--  5. UNE LETTRE NE COUVRE QU'UNE FOIS (index unique partiel) : une seconde
--     ligne sur la même lettre élargirait la couverture d'une lettre déjà
--     relue et envoyée.
--  6. UNE RÉVOCATION VISE UN ADRESSAGE DE CE DOSSIER, une fois, avec un motif.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger : une couverture qui se
-- réécrirait n'est pas une trace. DELETE ne l'est PAS, comme pour
-- `fiches_assiette_remises` : chaque ligne est une donnée patient, et
-- l'effacement du dossier la supprime NOMMÉMENT. Qu'aucun autre code ne
-- supprime un adressage est tenu par un banc du dépôt
-- (`adressagesSignalAlerte.guard.test.ts`), pas par la base.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `acte_le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de Prisma,
-- précédent BIO-INGEST LOT-02 : un `now()` nu suit le fuseau de session), et
-- `ordre` tiré à l'insertion. Une levée antidatable, ou qui choisirait son
-- rang, n'est pas une preuve.

-- CreateTable
CREATE TABLE "adressages_signal_alerte" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "id_correspondance" TEXT,
    "id_consultation" TEXT,
    "finding_ids" TEXT[],
    "id_adressage_revoque" TEXT,
    "motif" TEXT,
    "praticien_email" TEXT NOT NULL,
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adressages_signal_alerte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adressages_signal_alerte_ordre_key" ON "adressages_signal_alerte"("ordre");

-- CreateIndex
-- « Les adressages et révocations de ce dossier, dans l'ordre » : la seule
-- lecture que la chaîne C1 fera (LOT-04).
CREATE INDEX "adressages_signal_alerte_patient_ordre_idx" ON "adressages_signal_alerte"("id_patient", "ordre");

-- CreateIndex
-- Index ORDINAIRES des trois clés étrangères vers la lettre, la consultation
-- et l'adressage révoqué (constat de revue Copilot, #1288) : la vérification
-- d'une clé étrangère, à l'effacement d'une consultation ou d'une lettre,
-- filtre sur la seule colonne — les index uniques partiels ci-dessous, qui
-- portent un prédicat sur `acte`, ne lui servent pas.
CREATE INDEX "adressages_signal_alerte_correspondance_idx" ON "adressages_signal_alerte"("id_correspondance");
CREATE INDEX "adressages_signal_alerte_consultation_idx" ON "adressages_signal_alerte"("id_consultation");
CREATE INDEX "adressages_signal_alerte_adressage_revoque_idx" ON "adressages_signal_alerte"("id_adressage_revoque");

-- Une lettre ne couvre qu'une fois ; un adressage ne se révoque qu'une fois.
-- Index partiels : Prisma ne les modélise pas, la parité de schéma ne les voit
-- pas, le contrat négatif les éprouve.
CREATE UNIQUE INDEX "adressages_signal_alerte_une_couverture_par_lettre"
  ON "adressages_signal_alerte"("id_correspondance") WHERE "acte" = 'adressage';
CREATE UNIQUE INDEX "adressages_signal_alerte_une_revocation_par_adressage"
  ON "adressages_signal_alerte"("id_adressage_revoque") WHERE "acte" = 'revocation';

-- AddForeignKey
-- ON DELETE RESTRICT vers le patient, la lettre et la consultation :
-- l'effacement d'un dossier est une suppression NOMMÉE, qui passe par les
-- adressages avant les consultations et les correspondances. En CASCADE, ils
-- partiraient en silence.
ALTER TABLE "adressages_signal_alerte" ADD CONSTRAINT "adressages_signal_alerte_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adressages_signal_alerte" ADD CONSTRAINT "adressages_signal_alerte_id_correspondance_fkey" FOREIGN KEY ("id_correspondance") REFERENCES "correspondances_medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adressages_signal_alerte" ADD CONSTRAINT "adressages_signal_alerte_id_consultation_fkey" FOREIGN KEY ("id_consultation") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- NO ACTION sur la clé interne : l'effacement supprime les adressages d'un
-- dossier en UNE instruction, révocations comprises, et la contrainte n'est
-- vérifiée qu'à la fin de l'instruction, quand les deux lignes sont parties
-- (éprouvé par le contrat, cas 14). Les trois clés vers le patient, la lettre
-- et la consultation sont en ON UPDATE CASCADE comme ailleurs dans le schéma ;
-- combinées au trigger de gel, un changement de clé parente serait refusé
-- comme une réécriture — sans effet aujourd'hui, aucune de ces clés ne change.
ALTER TABLE "adressages_signal_alerte" ADD CONSTRAINT "adressages_signal_alerte_id_adressage_revoque_fkey" FOREIGN KEY ("id_adressage_revoque") REFERENCES "adressages_signal_alerte"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── LES CHECK — la forme de chaque acte ────────────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`. Le trigger refuse avant eux ce qui touche à
-- un autre dossier ; ces CHECK sont la garde qui reste si le trigger tombait.

ALTER TABLE "adressages_signal_alerte"
  ADD CONSTRAINT "adressages_signal_alerte_acte_check"
    CHECK ("acte" IN ('adressage', 'revocation')),
  ADD CONSTRAINT "adressages_signal_alerte_forme_adressage"
    CHECK ("acte" <> 'adressage' OR (
      "id_correspondance" IS NOT NULL
      AND "id_consultation" IS NOT NULL
      AND "finding_ids" IS NOT NULL
      AND cardinality("finding_ids") >= 1
      AND array_ndims("finding_ids") = 1
      AND "id_adressage_revoque" IS NULL
      AND "motif" IS NULL
    )),
  ADD CONSTRAINT "adressages_signal_alerte_forme_revocation"
    CHECK ("acte" <> 'revocation' OR (
      "id_adressage_revoque" IS NOT NULL
      AND "motif" IS NOT NULL
      AND "motif" ~ '\S'
      AND char_length("motif") <= 2000
      AND "id_correspondance" IS NULL
      AND "id_consultation" IS NULL
      AND "finding_ids" IS NULL
    )),
  ADD CONSTRAINT "adressages_signal_alerte_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S');

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.adressages_signal_alerte_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un adressage est figé (% refusé) ; seul l''effacement du dossier le supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER adressages_signal_alerte_no_update
  BEFORE UPDATE ON public.adressages_signal_alerte
  FOR EACH ROW EXECUTE FUNCTION public.adressages_signal_alerte_figee();

CREATE TRIGGER adressages_signal_alerte_no_truncate
  BEFORE TRUNCATE ON public.adressages_signal_alerte
  FOR EACH STATEMENT EXECUTE FUNCTION public.adressages_signal_alerte_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.adressages_signal_alerte_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  lettre_patient text;
  lettre_sens text;
  lettre_ancrage text;
  lettre_xmin text;
  porteuse text;
  cible_patient text;
  cible_acte text;
  constat text;
BEGIN
  IF NEW.acte = 'adressage' THEN
    SELECT c.id_patient, c.sens, c.ancrage_version, c.xmin::text
      INTO lettre_patient, lettre_sens, lettre_ancrage, lettre_xmin
    FROM public.correspondances_medecin c
    WHERE c.id = NEW.id_correspondance;
    IF lettre_patient IS DISTINCT FROM NEW.id_patient
       OR lettre_sens IS DISTINCT FROM 'sortant'
       OR lettre_ancrage IS NULL
       OR lettre_ancrage NOT LIKE 'safety-signals-%' THEN
      RAISE EXCEPTION 'adressage refusé : la correspondance % n''est pas une lettre d''adressage de ce dossier.', NEW.id_correspondance;
    END IF;

    -- `txid_current()` porte l'époque : ses 32 bits bas sont l'identifiant
    -- de la transaction de haut niveau, celui que porte `xmin`.
    IF lettre_xmin IS DISTINCT FROM (txid_current() % 4294967296)::text THEN
      RAISE EXCEPTION 'adressage refusé : la lettre % n''a pas été consignée dans cette transaction.', NEW.id_correspondance;
    END IF;

    SELECT k.id INTO porteuse
    FROM public.consultations k
    WHERE k.id_patient = NEW.id_patient
      AND k.statut = 'validee'
      AND k.anamnese IS NOT NULL
    ORDER BY k.date_validation DESC, k.created_at DESC
    LIMIT 1;
    IF porteuse IS DISTINCT FROM NEW.id_consultation THEN
      RAISE EXCEPTION 'adressage refusé : la consultation % n''est pas la consultation porteuse de ce dossier.', NEW.id_consultation;
    END IF;

    -- Une couverture absente, vide ou multidimensionnelle est refusée par le
    -- CHECK `forme_adressage` ; elle ne se parcourt pas ici, où FOREACH
    -- échouerait sur un message qui ne dit rien du refus.
    IF NEW.finding_ids IS NOT NULL AND array_ndims(NEW.finding_ids) = 1 THEN
      IF array_position(NEW.finding_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'adressage refusé : un constat couvert est vide.';
      END IF;
      FOREACH constat IN ARRAY NEW.finding_ids LOOP
        IF constat !~ '^safety:anamnese:[0-9a-f]{16}$' THEN
          RAISE EXCEPTION 'adressage refusé : % n''est pas un constat de signal d''anamnèse.', constat;
        END IF;
      END LOOP;
      IF (SELECT count(DISTINCT x) FROM unnest(NEW.finding_ids) AS x) <> cardinality(NEW.finding_ids) THEN
        RAISE EXCEPTION 'adressage refusé : un constat est couvert deux fois.';
      END IF;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    SELECT a.id_patient, a.acte INTO cible_patient, cible_acte
    FROM public.adressages_signal_alerte a
    WHERE a.id = NEW.id_adressage_revoque;
    IF cible_patient IS DISTINCT FROM NEW.id_patient
       OR cible_acte IS DISTINCT FROM 'adressage' THEN
      RAISE EXCEPTION 'révocation refusée : % n''est pas un adressage de ce dossier.', NEW.id_adressage_revoque;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK `acte_check` le refuse
  -- ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.adressages_signal_alerte', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER adressages_signal_alerte_avant_insertion
  BEFORE INSERT ON public.adressages_signal_alerte
  FOR EACH ROW EXECUTE FUNCTION public.adressages_signal_alerte_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.adressages_signal_alerte_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."adressages_signal_alerte" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- ligne n'existe : déployer d'abord le code sans l'effacement des adressages
-- et sans le modèle `AdressageSignalAlerte`, puis DROP TABLE et DROP FUNCTION
-- des deux fonctions ci-dessus.
