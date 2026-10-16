-- JOURNAL DES GESTES NABM, EN AJOUT SEUL, ET CONSTAT SIGNÉ « AUCUN ACTE »
-- (M-3c, F54 ; réserve R1 de la revue de M-3).
--
-- Migration demandée explicitement par le responsable (lot M-3c, file A rang
-- 2, « PR 1 : schema.prisma + migration + contrat SQL, sans code
-- consommateur »). MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code
-- n'écrit ni ne lit encore ces tables. L'écriture du journal à chaque
-- signature et retrait, le constat et sa dérivation en `hors_nomenclature`
-- (`remboursable.ts`) viennent dans la PR 2, après l'application CONSTATÉE
-- par conteneur.
--
-- ── CE QUE LA MIGRATION FERME ──────────────────────────────────────────────
--
-- M-3 a livré la signature des correspondances analyte ↔ acte sans journal :
-- un retrait, ou une nouvelle signature après un retrait, effaçait le
-- signataire précédent sans trace (R1). Brancher la carte des remboursements
-- dans la proposition (lettre f) suppose d'abord ce journal. Et les analytes
-- qu'aucun acte de la nomenclature ne nomme restaient « non évalué » faute
-- d'un constat signé (arbitrage du 2026-10-15 : un constat signé « aucun acte
-- dans la nomenclature » les fait passer à « hors nomenclature »).
--
-- ── TROIS ARBITRAGES DU RESPONSABLE (2026-10-16) ───────────────────────────
--
--  1. Le constat ne vaut que pour le millésime CONSTATÉ : à l'import d'un
--     millésime suivant, l'analyte repasse « non évalué » jusqu'à un nouveau
--     constat. La base garde le millésime ; la dérivation, écrite une seule
--     fois dans `remboursable.ts`, le compare au pointeur courant.
--  2. Signature et constat S'EXCLUENT : un constat est refusé si l'analyte
--     porte une correspondance signée, une signature est refusée si
--     l'analyte porte un constat (périmé compris). Retrait d'abord.
--  3. LA BASE refuse tout changement de signature ou de constat sans ligne
--     de journal dans la même transaction — y compris par script ou à la
--     main. Conséquence acceptée : entre l'application de cette migration et
--     le déploiement de la PR 2, la signature et le retrait de M-3 (qui
--     n'écrivent pas de journal) échouent au COMMIT ; rien n'est écrit.
--
-- ── AUCUNE REPRISE ─────────────────────────────────────────────────────────
--
-- Les signatures posées avant cette migration ne sont PAS recopiées au
-- journal : aucune signature ne s'écrit par migration. Le journal commence
-- ici. Un retrait recopie dans sa ligne la signature qu'il efface
-- (`efface_par`, `efface_le`) : retirer une signature antérieure ne perd donc
-- rien de ce qu'elle portait.
--
-- ── LE CONSTAT DANS UNE TABLE NEUVE ────────────────────────────────────────
--
-- Pas en colonnes de `biology_analytes` : Prisma sélectionne toutes les
-- colonnes scalaires d'un modèle, et un `ADD COLUMN` sur l'analyte aurait mis
-- en panne tout le catalogue entre le déploiement du code et l'approbation de
-- la release-db. Deux tables neuves que personne ne lit encore n'en
-- arrêtent aucune.
--
-- ── LES VERROUS ────────────────────────────────────────────────────────────
--
-- L'exclusion (2) se lit dans l'AUTRE table : sans verrou, une signature et
-- un constat concurrents sur le même analyte passeraient tous deux. Les deux
-- écritures prennent un verrou consultatif de transaction sur l'analyte
-- (espace 292, `hashtext` du code ; 291 est celui des résultats
-- biologiques), puis relisent. En READ COMMITTED, chaque instruction de la
-- fonction relit après l'attente. Tout autre niveau est REFUSÉ : sous
-- REPEATABLE READ, l'instantané masquerait la ligne que le verrou vient de
-- laisser commettre ; sous SERIALIZABLE aussi, et la détection de conflit de
-- PostgreSQL ne protège que si les DEUX transactions sont SERIALIZABLE — un
-- constat commis en READ COMMITTED échapperait à une signature SERIALIZABLE
-- (revue `wn-reviewer` du lot, P2-2 ; plus strict que
-- `resultats_biologiques_verrouiller_cle`, 20261014200000).
--
-- ── « PAS SANS JOURNAL » : DES TRIGGERS DE CONTRAINTE DIFFÉRÉS ─────────────
--
-- Jugés au COMMIT (`DEFERRABLE INITIALLY DEFERRED`), ils exigent une ligne de
-- journal de la MÊME transaction (`transaction_id = txid_current()`, posé par
-- la base) et du même contenu :
--   - correspondance qui devient signée ⇒ `signature` (même couple, même
--     nature, auteur = signataire) ;
--   - signature qui disparaît, par retrait (UPDATE) ou par DELETE d'une
--     ligne signée ⇒ `retrait_signature` qui recopie la signature effacée ;
--   - constat posé ⇒ `constat_aucun_acte` (même analyte, même millésime,
--     auteur = signataire) ; constat retiré (DELETE) ⇒ `retrait_constat`
--     qui recopie le constat effacé.
-- Les lignes de PROPOSITION (non signées) passent sans journal. Et dans
-- l'autre sens, la DERNIÈRE ligne de journal d'une transaction pour un couple
-- (ou, pour un constat, pour un analyte) doit concorder avec l'état final :
-- une `signature` exige la correspondance signée par cet auteur avec cette
-- nature, un `retrait_signature` exige qu'aucune ne le soit plus, un
-- `constat_aucun_acte` exige le constat de cet auteur à ce millésime, un
-- `retrait_constat` qu'il n'y en ait plus. Sans cela, une seule ligne
-- `signature` satisfaisait deux signatures de la même transaction, et une
-- ligne de journal contraire à l'état final passait (revue `wn-reviewer` du
-- lot, P2-1, P2-3 ; limites ci-dessous). Un contrat négatif qui finit en ROLLBACK n'atteint jamais le
-- COMMIT : il éprouve ces triggers par `SET CONSTRAINTS … IMMEDIATE`.
--
-- `TRUNCATE biology_analyte_nabm` — qu'aucun trigger de ligne ne voit — est
-- refusé dès qu'une ligne signée existe (P1-1 de la revue).
--
-- ── CE QUE LA GARANTIE NE COUVRE PAS ───────────────────────────────────────
--
--  - Seule la DERNIÈRE ligne de chaque clé d'une transaction est jugée : une
--    ligne intermédiaire qu'une autre ligne de la même clé suit (une
--    `signature` au nom de X puis une au nom de Y, avant la signature réelle
--    par Y) reste au journal sans avoir été jugée.
--  - La concordance juge l'état FINAL, pas le geste : une ligne `signature`
--    (ou `constat_aucun_acte`) ajoutée seule, au nom du signataire d'une
--    signature (ou d'un constat) déjà en place, concorde et passe — une
--    reprise de fait, datée du jour, que l'arbitrage exclut et qu'aucun
--    écrivain de l'application ne fait.
--  - Un retrait journalisé ne prouve pas qu'une signature existait au début
--    de la transaction : un `retrait_signature` sur un couple jamais signé
--    concorde avec l'état final (rien de signé) et passe.
--  Aucune de ces lignes ne masque une signature ni un constat réels : la
--  garantie tenue est « aucun changement sans sa ligne de journal », et
--  « la dernière ligne de chaque clé dit l'état final ».
--  - Le propriétaire des tables — l'utilisateur de l'application sur
--    Scalingo — peut toujours `DISABLE TRIGGER`, `DROP TRIGGER` ou passer
--    `session_replication_role` : la garde vaut contre un écrivain qui
--    oublie le journal, pas contre un administrateur qui la désarme.
--
-- ── CE QUE LA BASE REFUSE ENCORE ───────────────────────────────────────────
--
--  - une signature MODIFIÉE en place (signée → signée, nature, signataire,
--    date, analyte ou acte changés) : retrait puis signature, deux lignes de
--    journal. Corollaires : le renommage d'un code d'analyte qui porte une
--    signature, un constat ou un journal est refusé (la cascade de la clé
--    étrangère se heurte aux triggers), et un analyte qui porte une ligne de
--    journal ne se supprime plus jamais (clé RESTRICT, journal figé) ; l'un
--    et l'autre deviennent une décision ;
--  - une ligne de journal `signature` dont l'acte n'est pas présent et actif
--    au millésime courant, ou dont le millésime n'est pas le millésime
--    courant ; un `constat_aucun_acte` sur un autre millésime que le courant ;
--  - un constat sur un analyte inactif, ou sur un autre millésime que le
--    courant (la base vérifie le millésime VU, elle ne le choisit pas) ;
--  - toute modification, suppression ou troncature du journal ; toute
--    modification ou troncature d'un constat (le retrait est un DELETE).
--
-- `acte_le`, `ordre`, `transaction_id` (journal), `verifie_le` (constat) et
-- désormais `verifie_le` d'une correspondance qui devient signée sont posés
-- par la base, en `clock_timestamp() AT TIME ZONE 'UTC'` pour les dates
-- (convention de Prisma) : aucune de ces dates ne s'antidate (P2-3 de la
-- revue). L'écrivain lit la date posée en retour d'écriture (PR 2) ; une
-- signature écrite SANS date reste refusée par le CHECK de M-3.
--
-- ── NON FERMÉ ICI ──────────────────────────────────────────────────────────
--
-- La course avec un import NABM concurrent (réserve R2 de M-3) : le
-- millésime courant et l'activité de l'acte se lisent sans verrou face à
-- `importNabm.ts`, dont le contrôle des signatures orphelines peut manquer
-- une signature commise juste après lui. Routée à la PR 2 du lot (F54).
--
-- Tables du référentiel, sans donnée patient : aucun effacement nommé à
-- ménager, le DELETE du journal est refusé comme l'UPDATE.

-- ═══ LES TABLES (forme de Prisma, parité de schéma) ═════════════════════════

-- CreateTable
CREATE TABLE "biology_analyte_nabm_journal" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "code_acte" TEXT,
    "nature" TEXT,
    "millesime" TEXT,
    "praticien_email" TEXT NOT NULL,
    "efface_par" TEXT,
    "efface_le" TIMESTAMP(3),
    "acte_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_id" BIGINT NOT NULL DEFAULT txid_current(),

    CONSTRAINT "biology_analyte_nabm_journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biology_analyte_nabm_constats" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "millesime" TEXT NOT NULL,
    "verifie_par" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_analyte_nabm_constats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- « Le journal de cet analyte, dans l'ordre » ; sert aussi la clé étrangère.
CREATE INDEX "biology_analyte_nabm_journal_analyte_ordre_idx" ON "biology_analyte_nabm_journal"("analyte_code", "ordre");

-- CreateIndex
-- La recherche des triggers différés : les lignes de la transaction.
CREATE INDEX "biology_analyte_nabm_journal_transaction_idx" ON "biology_analyte_nabm_journal"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "biology_analyte_nabm_journal_ordre_key" ON "biology_analyte_nabm_journal"("ordre");

-- CreateIndex
-- Au plus un constat par analyte.
CREATE UNIQUE INDEX "biology_analyte_nabm_constats_analyte_key" ON "biology_analyte_nabm_constats"("analyte_code");

-- AddForeignKey
ALTER TABLE "biology_analyte_nabm_journal" ADD CONSTRAINT "biology_analyte_nabm_journal_analyte_code_fkey" FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biology_analyte_nabm_constats" ADD CONSTRAINT "biology_analyte_nabm_constats_analyte_code_fkey" FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — la forme de chaque acte ────────────────────────────────────

ALTER TABLE "biology_analyte_nabm_journal"
  ADD CONSTRAINT "biology_analyte_nabm_journal_acte_check"
    CHECK ("acte" IN ('signature', 'retrait_signature', 'constat_aucun_acte', 'retrait_constat')),
  ADD CONSTRAINT "biology_analyte_nabm_journal_forme_signature"
    CHECK ("acte" <> 'signature' OR (
      "code_acte" IS NOT NULL AND "nature" IS NOT NULL AND "millesime" IS NOT NULL
      AND "efface_par" IS NULL AND "efface_le" IS NULL
    )),
  ADD CONSTRAINT "biology_analyte_nabm_journal_forme_retrait_signature"
    CHECK ("acte" <> 'retrait_signature' OR (
      "code_acte" IS NOT NULL AND "nature" IS NOT NULL AND "millesime" IS NULL
      AND "efface_par" IS NOT NULL AND "efface_le" IS NOT NULL
    )),
  ADD CONSTRAINT "biology_analyte_nabm_journal_forme_constat"
    CHECK ("acte" <> 'constat_aucun_acte' OR (
      "code_acte" IS NULL AND "nature" IS NULL AND "millesime" IS NOT NULL
      AND "efface_par" IS NULL AND "efface_le" IS NULL
    )),
  ADD CONSTRAINT "biology_analyte_nabm_journal_forme_retrait_constat"
    CHECK ("acte" <> 'retrait_constat' OR (
      "code_acte" IS NULL AND "nature" IS NULL AND "millesime" IS NOT NULL
      AND "efface_par" IS NOT NULL AND "efface_le" IS NOT NULL
    )),
  ADD CONSTRAINT "biology_analyte_nabm_journal_code_acte_check"
    CHECK ("code_acte" ~ '^[0-9]{4}$'),
  ADD CONSTRAINT "biology_analyte_nabm_journal_nature_check"
    CHECK ("nature" IN ('isole', 'groupe_et', 'groupe_ou')),
  ADD CONSTRAINT "biology_analyte_nabm_journal_millesime_non_vide"
    CHECK ("millesime" ~ '\S'),
  ADD CONSTRAINT "biology_analyte_nabm_journal_praticien_non_vide"
    CHECK ("praticien_email" ~ '\S' AND char_length("praticien_email") <= 320),
  ADD CONSTRAINT "biology_analyte_nabm_journal_efface_par_non_vide"
    CHECK ("efface_par" ~ '\S' AND char_length("efface_par") <= 320);

ALTER TABLE "biology_analyte_nabm_constats"
  ADD CONSTRAINT "biology_analyte_nabm_constats_millesime_non_vide"
    CHECK ("millesime" ~ '\S'),
  ADD CONSTRAINT "biology_analyte_nabm_constats_verifie_par_non_vide"
    CHECK ("verifie_par" ~ '\S' AND char_length("verifie_par") <= 320);

-- ═══ LES FONCTIONS PARTAGÉES ════════════════════════════════════════════════

-- Le verrou de l'analyte (en-tête, « Les verrous »).
CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_verrouiller(p_analyte text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'écriture refusée en % : l''exclusion signature ↔ constat NABM exige READ COMMITTED.', upper(current_setting('transaction_isolation'));
  END IF;
  PERFORM pg_advisory_xact_lock(292, hashtext(p_analyte));
END;
$$;

-- Le millésime courant de la nomenclature ; NULL si elle n'est pas importée.
CREATE OR REPLACE FUNCTION public.biology_nabm_millesime_courant()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT v.version_source
  FROM public.biology_catalog_versions_courantes v
  WHERE v.source_provenance = 'nabm_smt_ans';
$$;

-- ═══ LE JOURNAL ═════════════════════════════════════════════════════════════

-- ── FIGÉ : NI UPDATE, NI DELETE, NI TRUNCATE ───────────────────────────────

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_journal_fige()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : le journal des gestes NABM est en ajout seul (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER biology_analyte_nabm_journal_no_update
  BEFORE UPDATE ON public.biology_analyte_nabm_journal
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_journal_fige();

CREATE TRIGGER biology_analyte_nabm_journal_no_delete
  BEFORE DELETE ON public.biology_analyte_nabm_journal
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_journal_fige();

CREATE TRIGGER biology_analyte_nabm_journal_no_truncate
  BEFORE TRUNCATE ON public.biology_analyte_nabm_journal
  FOR EACH STATEMENT EXECUTE FUNCTION public.biology_analyte_nabm_journal_fige();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_journal_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  courant text := public.biology_nabm_millesime_courant();
BEGIN
  IF NEW.acte IN ('signature', 'constat_aucun_acte')
     AND NEW.millesime IS DISTINCT FROM courant THEN
    RAISE EXCEPTION 'journal NABM refusé : le millésime % n''est pas le millésime courant (%).', NEW.millesime, coalesce(courant, 'aucun');
  END IF;
  IF NEW.acte = 'signature' AND NOT EXISTS (
    SELECT 1 FROM public.biology_nabm_actes a
    WHERE a.code_acte = NEW.code_acte AND a.version_source = courant AND NOT a.inactif
  ) THEN
    RAISE EXCEPTION 'journal NABM refusé : l''acte % n''est ni présent ni actif au millésime %.', NEW.code_acte, courant;
  END IF;
  -- Un acte inconnu ou mal formé passe ici sans refus : les CHECK le
  -- refusent ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.biology_analyte_nabm_journal', 'ordre'));
  NEW.transaction_id := txid_current();
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_nabm_journal_avant_insertion
  BEFORE INSERT ON public.biology_analyte_nabm_journal
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_journal_avant_insertion();

-- ═══ LE CONSTAT ═════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_constats_fige()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : un constat NABM ne se modifie pas (% refusé) ; il se retire, puis se pose à nouveau.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER biology_analyte_nabm_constats_no_update
  BEFORE UPDATE ON public.biology_analyte_nabm_constats
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_constats_fige();

CREATE TRIGGER biology_analyte_nabm_constats_no_truncate
  BEFORE TRUNCATE ON public.biology_analyte_nabm_constats
  FOR EACH STATEMENT EXECUTE FUNCTION public.biology_analyte_nabm_constats_fige();

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_constats_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  courant text;
  actif boolean;
BEGIN
  PERFORM public.biology_analyte_nabm_verrouiller(NEW.analyte_code);

  SELECT a.actif INTO actif FROM public.biology_analytes a WHERE a.code = NEW.analyte_code;
  IF actif IS FALSE THEN
    RAISE EXCEPTION 'constat NABM refusé : l''analyte % est inactif au catalogue.', NEW.analyte_code;
  END IF;
  -- Analyte absent : la clé étrangère le refuse ensuite.

  courant := public.biology_nabm_millesime_courant();
  IF NEW.millesime IS DISTINCT FROM courant THEN
    RAISE EXCEPTION 'constat NABM refusé : le millésime % n''est pas le millésime courant (%).', NEW.millesime, coalesce(courant, 'aucun');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.biology_analyte_nabm c
    WHERE c.analyte_code = NEW.analyte_code AND c.verifie_par IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'constat NABM refusé : l''analyte % porte une correspondance signée ; retirez-la d''abord.', NEW.analyte_code;
  END IF;

  NEW.verifie_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_nabm_constats_avant_insertion
  BEFORE INSERT ON public.biology_analyte_nabm_constats
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_constats_avant_insertion();

-- ── PAS SANS JOURNAL (différé, jugé au COMMIT) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_constats_exige_journal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = txid_current()
        AND j.acte = 'constat_aucun_acte'
        AND j.analyte_code = NEW.analyte_code
        AND j.millesime = NEW.millesime
        AND j.praticien_email = NEW.verifie_par
    ) THEN
      RAISE EXCEPTION 'constat NABM refusé : aucune ligne de journal « constat_aucun_acte » de la même transaction pour %.', NEW.analyte_code;
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = txid_current()
        AND j.acte = 'retrait_constat'
        AND j.analyte_code = OLD.analyte_code
        AND j.millesime = OLD.millesime
        AND j.efface_par = OLD.verifie_par
        AND j.efface_le = OLD.verifie_le
    ) THEN
      RAISE EXCEPTION 'retrait de constat NABM refusé : aucune ligne de journal « retrait_constat » de la même transaction pour %.', OLD.analyte_code;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER biology_analyte_nabm_constats_exige_journal
  AFTER INSERT OR DELETE ON public.biology_analyte_nabm_constats
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_constats_exige_journal();

-- ═══ LES CORRESPONDANCES — GARDES NEUVES SUR `biology_analyte_nabm` ════════

-- Exclusion avec le constat, et signature non modifiable en place.
CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_avant_ecriture()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.verifie_par IS NOT NULL AND NEW.verifie_par IS NOT NULL
     AND (NEW.analyte_code, NEW.code_acte, NEW.nature, NEW.verifie_par, NEW.verifie_le)
         IS DISTINCT FROM (OLD.analyte_code, OLD.code_acte, OLD.nature, OLD.verifie_par, OLD.verifie_le) THEN
    RAISE EXCEPTION 'correspondance NABM refusée : une signature ne se modifie pas en place ; retirez-la, puis signez à nouveau.';
  END IF;

  IF NEW.verifie_par IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.verifie_par IS NULL) THEN
    PERFORM public.biology_analyte_nabm_verrouiller(NEW.analyte_code);
    IF EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_constats k
      WHERE k.analyte_code = NEW.analyte_code
    ) THEN
      RAISE EXCEPTION 'correspondance NABM refusée : l''analyte % porte un constat « aucun acte » ; retirez-le d''abord.', NEW.analyte_code;
    END IF;
    -- La date de la signature est celle de la base. Une signature SANS date
    -- garde son refus par le CHECK `biology_analyte_nabm_signature_check`.
    IF NEW.verifie_le IS NOT NULL THEN
      NEW.verifie_le := clock_timestamp() AT TIME ZONE 'UTC';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- TRUNCATE, qu'aucun trigger de ligne ne voit : refusé dès qu'une ligne est
-- signée (aucun écrivain du dépôt ne tronque cette table).
CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_troncature()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.biology_analyte_nabm WHERE verifie_par IS NOT NULL) THEN
    RAISE EXCEPTION 'biology_analyte_nabm : TRUNCATE refusé, des correspondances sont signées ; chaque retrait se journalise.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER biology_analyte_nabm_no_truncate
  BEFORE TRUNCATE ON public.biology_analyte_nabm
  FOR EACH STATEMENT EXECUTE FUNCTION public.biology_analyte_nabm_troncature();

CREATE TRIGGER biology_analyte_nabm_avant_ecriture
  BEFORE INSERT OR UPDATE ON public.biology_analyte_nabm
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_avant_ecriture();

CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_exige_journal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Devenue signée : naissance signée, ou proposition qui reçoit sa signature.
  IF TG_OP <> 'DELETE' AND NEW.verifie_par IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.verifie_par IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = txid_current()
        AND j.acte = 'signature'
        AND j.analyte_code = NEW.analyte_code
        AND j.code_acte = NEW.code_acte
        AND j.nature = NEW.nature
        AND j.praticien_email = NEW.verifie_par
    ) THEN
      RAISE EXCEPTION 'signature NABM refusée : aucune ligne de journal « signature » de la même transaction pour % → %.', NEW.analyte_code, NEW.code_acte;
    END IF;
  END IF;

  -- Signature perdue : retrait (UPDATE) ou suppression d'une ligne signée.
  IF TG_OP <> 'INSERT' AND OLD.verifie_par IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.verifie_par IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = txid_current()
        AND j.acte = 'retrait_signature'
        AND j.analyte_code = OLD.analyte_code
        AND j.code_acte = OLD.code_acte
        AND j.nature = OLD.nature
        AND j.efface_par = OLD.verifie_par
        AND j.efface_le = OLD.verifie_le
    ) THEN
      RAISE EXCEPTION 'retrait de signature NABM refusé : aucune ligne de journal « retrait_signature » de la même transaction pour % → %.', OLD.analyte_code, OLD.code_acte;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER biology_analyte_nabm_exige_journal
  AFTER INSERT OR UPDATE OR DELETE ON public.biology_analyte_nabm
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_exige_journal();

-- ═══ LE JOURNAL CONCORDE AVEC L'ÉTAT FINAL (différé, jugé au COMMIT) ═══════

-- Seule la DERNIÈRE ligne de la transaction pour sa clé — le couple pour une
-- signature ou son retrait, l'analyte pour un constat ou son retrait — est
-- jugée : signature, retrait, signature dans une même transaction finissent
-- sur la seconde signature, et c'est elle que l'état doit refléter.
CREATE OR REPLACE FUNCTION public.biology_analyte_nabm_journal_concorde()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.acte IN ('signature', 'retrait_signature') THEN
    IF EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = NEW.transaction_id
        AND j.acte IN ('signature', 'retrait_signature')
        AND j.analyte_code = NEW.analyte_code
        AND j.code_acte = NEW.code_acte
        AND j.ordre > NEW.ordre
    ) THEN
      RETURN NULL;
    END IF;
    IF NEW.acte = 'signature' AND NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm c
      WHERE c.analyte_code = NEW.analyte_code AND c.code_acte = NEW.code_acte
        AND c.verifie_par = NEW.praticien_email AND c.nature = NEW.nature
    ) THEN
      RAISE EXCEPTION 'journal NABM refusé : la signature journalisée de % → % ne se retrouve pas dans la correspondance à la fin de la transaction.', NEW.analyte_code, NEW.code_acte;
    END IF;
    IF NEW.acte = 'retrait_signature' AND EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm c
      WHERE c.analyte_code = NEW.analyte_code AND c.code_acte = NEW.code_acte
        AND c.verifie_par IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'journal NABM refusé : le retrait journalisé de % → % laisse la correspondance signée à la fin de la transaction.', NEW.analyte_code, NEW.code_acte;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_journal j
      WHERE j.transaction_id = NEW.transaction_id
        AND j.acte IN ('constat_aucun_acte', 'retrait_constat')
        AND j.analyte_code = NEW.analyte_code
        AND j.ordre > NEW.ordre
    ) THEN
      RETURN NULL;
    END IF;
    IF NEW.acte = 'constat_aucun_acte' AND NOT EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_constats k
      WHERE k.analyte_code = NEW.analyte_code
        AND k.millesime = NEW.millesime AND k.verifie_par = NEW.praticien_email
    ) THEN
      RAISE EXCEPTION 'journal NABM refusé : le constat journalisé de % ne se retrouve pas à la fin de la transaction.', NEW.analyte_code;
    END IF;
    IF NEW.acte = 'retrait_constat' AND EXISTS (
      SELECT 1 FROM public.biology_analyte_nabm_constats k
      WHERE k.analyte_code = NEW.analyte_code
    ) THEN
      RAISE EXCEPTION 'journal NABM refusé : le retrait de constat journalisé de % laisse un constat à la fin de la transaction.', NEW.analyte_code;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER biology_analyte_nabm_journal_concorde
  AFTER INSERT ON public.biology_analyte_nabm_journal
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_nabm_journal_concorde();

-- ═══ HYGIÈNE D'EXÉCUTION ════════════════════════════════════════════════════

-- Ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_verrouiller(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_nabm_millesime_courant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_fige() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_fige() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_exige_journal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_avant_ecriture() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_exige_journal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_troncature() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_concorde() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_verrouiller(text) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_nabm_millesime_courant() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_fige() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_fige() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_constats_exige_journal() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_avant_ecriture() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_exige_journal() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_troncature() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.biology_analyte_nabm_journal_concorde() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."biology_analyte_nabm_journal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_analyte_nabm_constats" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées. Dans une seule transaction : DROP TRIGGER
-- `biology_analyte_nabm_exige_journal`, `biology_analyte_nabm_avant_ecriture`
-- et `biology_analyte_nabm_no_truncate` d'abord (ils rendent à M-3 sa
-- signature sans journal), puis DROP TABLE des deux tables et DROP FUNCTION
-- des onze fonctions ci-dessus. Déployer avant
-- le code sans les modèles `BiologyAnalyteNabmJournal` et
-- `BiologyAnalyteNabmConstat`. Dès qu'une ligne de journal existe, la
-- supprimer efface une trace : le retour arrière devient une décision.
