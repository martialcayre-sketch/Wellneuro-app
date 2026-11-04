-- POSITIONS D'EXPERT SIGNÉES ET ARBITRAGES DE CONFLITS DE SOURCES, EN AJOUT
-- SEUL ([[D-439]], BP-12b, LOT-28, fiche F09 ; applique [[D-266]] §8).
--
-- Migration demandée par le responsable le 2026-11-04 (« PR2 écris la
-- migration »), après l'acceptation de D-439 (#1867) ; registre RGPD
-- inchangé, confirmé le même jour : aucune donnée patient n'entre ici.
-- MIGRATION SEULE ([[D-087]], [[D-266]] §11) : aucun code n'écrit ni ne lit
-- encore ces tables. L'atelier et l'affichage viendront dans la PR suivante,
-- sous `WN_POSITIONS_EXPERT` né éteint, après l'application CONSTATÉE par
-- conteneur.
--
-- ── TROIS TABLES VIDES ─────────────────────────────────────────────────────
--
-- La migration crée les tables VIDES (D-439 §5) : le texte d'une position
-- vit en base hébergée HDS, jamais au dépôt, qui est public ([[D-251]] §4).
-- Le versement passe par l'atelier, acte daté du responsable, jamais par une
-- migration.
--
--  - `positions_expert_versions` : une version d'une position (D-439 §2),
--    `WN-PE-NNNN` × `vN.M`, son dossier de preuve (liste fermée), la fiche
--    d'usage qu'elle fonde (facultative), son contenu en quatre rubriques,
--    ses claims d'appui, la version qu'elle révise, l'auteur et l'instant.
--  - `positions_expert_actes` : les gestes du responsable sur une version,
--    `signee` ou `retiree`.
--  - `arbitrages_conflits_sources` : l'arbitrage d'un conflit déclaré
--    (`CS-…`) pour une question (`FU_…`), `pose` ou `revocation` (D-439 §3),
--    avec ce qu'il atteste à la pose (amendement A3).
--
-- ── LE CONTENU D'UNE POSITION ET SON EMPREINTE ─────────────────────────────
--
-- `contenu` est un objet à quatre clés exactement — `enonce`, `perimetre`,
-- `population`, `limites` (D-439 §2) —, chacune un texte visible. Une
-- rubrique de plus est une migration, relue.
--
-- L'empreinte que recopie un acte est recalculée ici, contre la version :
-- le SHA-256 (hex) de la concaténation des SHA-256 (hex) des quatre textes,
-- dans l'ordre `enonce`, `perimetre`, `population`, `limites`. Chaque texte
-- se hache comme une rubrique de fiche d'usage, UTF-8 au caractère près
-- (formule éprouvée contre le JS par le banc des fiches d'usage) ; on
-- n'hache jamais `contenu::text`, dont la mise en forme est celle de
-- Postgres et ne se reproduit pas sûrement ailleurs.
--
-- ── EN VIGUEUR, ET « À RELIRE » ────────────────────────────────────────────
--
-- La version COURANTE d'une position est celle qu'aucune version ne révise ;
-- elle est EN VIGUEUR si son dernier acte, au sens d'`ordre`, est `signee`.
-- Seule la version courante reçoit un acte. Rien ne stocke l'état : il se
-- dérive à la lecture, comme « à relire » (appui périmé, D-439 §2 ; les cinq
-- cas d'A3 pour un arbitrage).
--
-- ── UNE TÊTE PAR COUPLE CONFLIT × QUESTION ─────────────────────────────────
--
-- Le patron de [[D-331]] §2 (`constats_praticien`) : la TÊTE d'un couple est
-- la pose que ni un remplacement ni une révocation ne vise
-- (`id_arbitrage_remplace`). Une pose sur un couple qui a une tête doit la
-- désigner ; une pose sans tête n'en désigne aucune ; une révocation désigne
-- la tête, et elle seule, et ramène le couple à « non arbitré ».
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Sur une version (trigger `positions_expert_versions_avant_insertion`) :
--  1. un contenu qui n'a pas exactement les quatre rubriques, ou une rubrique
--     qui n'est pas un texte visible ;
--  2. des claims d'appui vides, mal formés (`WN-CL-NNNN-NNN@vN.M`, le `v`
--     facultatif comme dans `rag_corpus_claims`) ou en double ;
--  3. une première version qui dit en réviser une, ou une version suivante
--     qui ne révise pas la version courante de sa position ;
--  4. une version suivante d'un autre dossier, ou dont le numéro n'est pas
--     strictement supérieur à celui de la version courante.
-- Sur un acte (trigger `positions_expert_actes_avant_insertion`) :
--  5. une version inconnue, ou qui n'est plus la version courante ;
--  6. une empreinte qui n'est pas celle du contenu de la version.
-- Sur un arbitrage (trigger `arbitrages_conflits_sources_avant_insertion`) :
--  7. une pose qui ne désigne pas la tête du couple, ou qui en désigne une
--     quand il n'y en a pas ; une révocation qui ne désigne pas la tête ;
--  8. une position retenue qui n'est pas en vigueur (version remplacée, ou
--     dernier acte qui n'est pas `signee`).
-- Puis les CHECK : formats (`WN-PE-NNNN`, `vN.M`, `FU_…`, `CS-…`,
-- `identifiant@version`, empreintes), listes fermées (dossier, acte), la
-- relecture intégrale pour signer, le motif pour retirer, le motif de tout
-- arbitrage, la forme de la pose et celle de la révocation.
--
-- CE QUE LA BASE NE VÉRIFIE PAS, ET QUI EST À LA ROUTE (D-439 §3, A2) :
-- l'appartenance du conflit au registre signé (`conflitsSourcesV1`, une
-- table TS), celle de la fiche à la liste curée du conflit, celle du claim
-- retenu aux deux claims du conflit, et l'existence des claims d'appui au
-- corpus. Aucune clé étrangère vers `rag_corpus_claims` : la fraîcheur d'un
-- claim se dérive à la lecture, et un claim absent se lit « à relire ».
--
-- ── LES VERROUS ────────────────────────────────────────────────────────────
--
-- Un verrou consultatif par position (espace 439, clé `pe|WN-PE-NNNN`),
-- pris par une version neuve, par un acte et par un arbitrage qui retient
-- cette position : une révision, un retrait et un arbitrage concurrents se
-- sérialisent, et le second lit l'état laissé par le premier. Un verrou par
-- couple (espace 439, clé `cs|CS-…|FU_…`), pris AVANT celui de la position :
-- l'ordre « couple, puis position » est le seul qui prenne les deux.
-- REPEATABLE READ est refusé, avec le motif de BP-09 et de [[D-331]] : son
-- instantané masquerait l'acte que le verrou vient de laisser commettre.
-- SERIALIZABLE reste admis, comme dans le patron : deux têtes ou deux
-- versions courantes y sont annulées par la détection des conflits, mais un
-- acte (ou un arbitrage) qui attendait le verrou peut lire l'état d'avant une
-- révision ou un retrait tout juste commis. Sans effet sur l'invariant : la
-- signature d'une version révisée ne la rend pas en vigueur, et un arbitrage
-- sur une position retirée se lit « à relire ». L'application écrit en READ
-- COMMITTED (revue `wn-reviewer` du lot).
--
-- ── FIGÉES ─────────────────────────────────────────────────────────────────
--
-- UPDATE, DELETE et TRUNCATE sont refusés par trigger sur les trois tables :
-- une correction est une version NEUVE, un retrait est un acte NEUF, un
-- changement d'avis est une pose ou une révocation NEUVE. Limite assumée,
-- celle du patron : le rôle propriétaire peut désactiver un trigger.
--
-- ── L'INSTANT ET L'ORDRE SONT POSÉS PAR LA BASE ────────────────────────────
--
-- `cree_le` et `le` en `clock_timestamp() AT TIME ZONE 'UTC'` (convention de
-- Prisma : un `now()` nu suit le fuseau de session), `ordre` tiré de la
-- séquence après le verrou : ni l'un ni l'autre ne s'antidate.
--
-- ── AUCUNE DONNÉE PATIENT ──────────────────────────────────────────────────
--
-- Ni identifiant de dossier, ni texte de dossier : rien à ajouter à
-- l'effacement d'un dossier, ni au registre RGPD. L'auteur est un compte du
-- domaine praticien.

-- CreateTable
CREATE TABLE "positions_expert_versions" (
    "id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "dossier" TEXT NOT NULL,
    "fiche_id" TEXT,
    "contenu" JSONB NOT NULL,
    "claims_appui" TEXT[],
    "id_version_revisee" TEXT,
    "auteur" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_expert_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions_expert_actes" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_version" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "relecture_integrale" BOOLEAN NOT NULL,
    "motif" TEXT,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_expert_actes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitrages_conflits_sources" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "conflit_id" TEXT NOT NULL,
    "fiche_id" TEXT NOT NULL,
    "acte" TEXT NOT NULL,
    "id_arbitrage_remplace" TEXT,
    "claim_retenu" TEXT,
    "id_position_version" TEXT,
    "conflit_sha256" TEXT,
    "structure_sha256" TEXT,
    "motif" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbitrages_conflits_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "positions_expert_versions_position_version_key" ON "positions_expert_versions"("position_id", "version");

-- CreateIndex
-- Une version a au plus une successeure. Les NULL ne se comparent pas : les
-- premières versions coexistent.
CREATE UNIQUE INDEX "positions_expert_versions_id_version_revisee_key" ON "positions_expert_versions"("id_version_revisee");

-- CreateIndex
CREATE UNIQUE INDEX "positions_expert_actes_ordre_key" ON "positions_expert_actes"("ordre");

-- CreateIndex
-- « Le dernier acte » d'une version se lit par `ordre`, jamais par `le`.
CREATE INDEX "positions_expert_actes_version_ordre_idx" ON "positions_expert_actes"("id_version", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "arbitrages_conflits_sources_ordre_key" ON "arbitrages_conflits_sources"("ordre");

-- CreateIndex
-- Un arbitrage a au plus un successeur (remplacement ou révocation).
CREATE UNIQUE INDEX "arbitrages_conflits_sources_id_arbitrage_remplace_key" ON "arbitrages_conflits_sources"("id_arbitrage_remplace");

-- CreateIndex
-- La tête d'un couple, que relit le trigger, et l'historique d'une fiche.
CREATE INDEX "arbitrages_conflits_sources_couple_ordre_idx" ON "arbitrages_conflits_sources"("conflit_id", "fiche_id", "ordre");

-- CreateIndex
-- Les arbitrages qui retiennent une version : « position remplacée » ou
-- « retirée » (A3) part de la version.
CREATE INDEX "arbitrages_conflits_sources_id_position_version_idx" ON "arbitrages_conflits_sources"("id_position_version");

-- AddForeignKey
-- Auto-référence en NO ACTION, comme `constats_praticien` : le trigger
-- append-only refuse de toute façon le DELETE.
ALTER TABLE "positions_expert_versions" ADD CONSTRAINT "positions_expert_versions_id_version_revisee_fkey" FOREIGN KEY ("id_version_revisee") REFERENCES "positions_expert_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
-- ON DELETE RESTRICT : un acte ne survit pas à ce qu'il vise, et ce qui porte
-- un acte ne disparaît pas.
ALTER TABLE "positions_expert_actes" ADD CONSTRAINT "positions_expert_actes_id_version_fkey" FOREIGN KEY ("id_version") REFERENCES "positions_expert_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrages_conflits_sources" ADD CONSTRAINT "arbitrages_conflits_sources_id_arbitrage_remplace_fkey" FOREIGN KEY ("id_arbitrage_remplace") REFERENCES "arbitrages_conflits_sources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "arbitrages_conflits_sources" ADD CONSTRAINT "arbitrages_conflits_sources_id_position_version_fkey" FOREIGN KEY ("id_position_version") REFERENCES "positions_expert_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument, qui ne
-- retire que l'espace ASCII et laisse passer une ligne de tabulations.

ALTER TABLE "positions_expert_versions"
  ADD CONSTRAINT "positions_expert_versions_position_format"
    CHECK ("position_id" ~ '^WN-PE-[0-9]{4}$'),
  -- Quatre chiffres au plus de part et d'autre : la comparaison du trigger
  -- tient dans un entier.
  ADD CONSTRAINT "positions_expert_versions_version_format"
    CHECK ("version" ~ '^v[0-9]{1,4}\.[0-9]{1,4}$'),
  -- Iode et sélénium entre à la clôture de son dossier, par migration
  -- (D-439 §2 et §5).
  ADD CONSTRAINT "positions_expert_versions_dossier_ferme"
    CHECK ("dossier" IN ('fer', 'vitamine_d', 'zinc', 'magnesium', 'b9_b12')),
  ADD CONSTRAINT "positions_expert_versions_fiche_format"
    CHECK ("fiche_id" IS NULL OR ("fiche_id" ~ '^FU_[A-Z0-9_]+$' AND char_length("fiche_id") <= 128)),
  ADD CONSTRAINT "positions_expert_versions_contenu_objet"
    CHECK (jsonb_typeof("contenu") = 'object'),
  -- Au moins un claim d'appui, sur une dimension, sans NULL. Le format de
  -- chacun et l'absence de doublon sont au trigger (un CHECK ne parcourt pas
  -- un tableau).
  ADD CONSTRAINT "positions_expert_versions_appuis_presents"
    CHECK (
      "claims_appui" IS NOT NULL
      AND array_ndims("claims_appui") = 1
      AND cardinality("claims_appui") >= 1
      AND array_position("claims_appui", NULL) IS NULL
    ),
  ADD CONSTRAINT "positions_expert_versions_ne_se_revise_pas"
    CHECK ("id_version_revisee" IS DISTINCT FROM "id"),
  ADD CONSTRAINT "positions_expert_versions_auteur_non_vide"
    CHECK ("auteur" ~ '\S' AND char_length("auteur") <= 320);

ALTER TABLE "positions_expert_actes"
  ADD CONSTRAINT "positions_expert_actes_acte_ferme"
    CHECK ("acte" IN ('signee', 'retiree')),
  ADD CONSTRAINT "positions_expert_actes_empreinte_format"
    CHECK ("empreinte" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "positions_expert_actes_auteur_non_vide"
    CHECK ("auteur" ~ '\S' AND char_length("auteur") <= 320),
  -- SIGNER, C'EST DÉCLARER AVOIR TOUT LU ([[D-195]] §1).
  ADD CONSTRAINT "positions_expert_actes_signature_relue"
    CHECK ("acte" <> 'signee' OR "relecture_integrale"),
  -- UN RETRAIT DIT POURQUOI : rien ne disparaît en silence.
  ADD CONSTRAINT "positions_expert_actes_retrait_motive"
    CHECK ("acte" <> 'retiree' OR ("motif" IS NOT NULL AND "motif" ~ '\S')),
  ADD CONSTRAINT "positions_expert_actes_motif_borne"
    CHECK ("motif" IS NULL OR char_length("motif") <= 4000);

ALTER TABLE "arbitrages_conflits_sources"
  ADD CONSTRAINT "arbitrages_conflits_sources_conflit_format"
    CHECK ("conflit_id" ~ '^CS-[A-Z0-9]+(-[A-Z0-9]+)*$' AND char_length("conflit_id") <= 64),
  ADD CONSTRAINT "arbitrages_conflits_sources_fiche_format"
    CHECK ("fiche_id" ~ '^FU_[A-Z0-9_]+$' AND char_length("fiche_id") <= 128),
  ADD CONSTRAINT "arbitrages_conflits_sources_acte_ferme"
    CHECK ("acte" IN ('pose', 'revocation')),
  ADD CONSTRAINT "arbitrages_conflits_sources_claim_format"
    CHECK ("claim_retenu" IS NULL OR "claim_retenu" ~ '^WN-CL-[0-9]{4}-[0-9]{3}@v?[0-9]+\.[0-9]+$'),
  ADD CONSTRAINT "arbitrages_conflits_sources_conflit_sha256_format"
    CHECK ("conflit_sha256" IS NULL OR "conflit_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "arbitrages_conflits_sources_structure_sha256_format"
    CHECK ("structure_sha256" IS NULL OR "structure_sha256" ~ '^[0-9a-f]{64}$'),
  -- UNE POSE RETIENT UNE POSITION, UNE SEULE — l'un des deux claims, ou une
  -- position d'expert — et atteste ce qu'elle a lu (A3).
  ADD CONSTRAINT "arbitrages_conflits_sources_forme_pose"
    CHECK ("acte" <> 'pose' OR (
      num_nonnulls("claim_retenu", "id_position_version") = 1
      AND "conflit_sha256" IS NOT NULL
      AND "structure_sha256" IS NOT NULL
    )),
  -- UNE RÉVOCATION DÉSIGNE LA TÊTE, ET NE RETIENT RIEN.
  ADD CONSTRAINT "arbitrages_conflits_sources_forme_revocation"
    CHECK ("acte" <> 'revocation' OR (
      "id_arbitrage_remplace" IS NOT NULL
      AND "claim_retenu" IS NULL AND "id_position_version" IS NULL
      AND "conflit_sha256" IS NULL AND "structure_sha256" IS NULL
    )),
  ADD CONSTRAINT "arbitrages_conflits_sources_ne_se_remplace_pas"
    CHECK ("id_arbitrage_remplace" IS DISTINCT FROM "id"),
  -- LE MOTIF EST OBLIGATOIRE, POSE COMME RÉVOCATION (D-439 §3).
  ADD CONSTRAINT "arbitrages_conflits_sources_motif_visible"
    CHECK ("motif" ~ '\S' AND char_length("motif") <= 4000),
  ADD CONSTRAINT "arbitrages_conflits_sources_auteur_non_vide"
    CHECK ("auteur" ~ '\S' AND char_length("auteur") <= 320);

-- ── FIGÉES : NI UPDATE, NI DELETE, NI TRUNCATE ─────────────────────────────

CREATE OR REPLACE FUNCTION public.positions_expert_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% est append-only (% refusé).', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER positions_expert_versions_no_dml
  BEFORE UPDATE OR DELETE ON public.positions_expert_versions
  FOR EACH ROW EXECUTE FUNCTION public.positions_expert_append_only();

CREATE TRIGGER positions_expert_versions_no_truncate
  BEFORE TRUNCATE ON public.positions_expert_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.positions_expert_append_only();

CREATE TRIGGER positions_expert_actes_no_dml
  BEFORE UPDATE OR DELETE ON public.positions_expert_actes
  FOR EACH ROW EXECUTE FUNCTION public.positions_expert_append_only();

CREATE TRIGGER positions_expert_actes_no_truncate
  BEFORE TRUNCATE ON public.positions_expert_actes
  FOR EACH STATEMENT EXECUTE FUNCTION public.positions_expert_append_only();

CREATE TRIGGER arbitrages_conflits_sources_no_dml
  BEFORE UPDATE OR DELETE ON public.arbitrages_conflits_sources
  FOR EACH ROW EXECUTE FUNCTION public.positions_expert_append_only();

CREATE TRIGGER arbitrages_conflits_sources_no_truncate
  BEFORE TRUNCATE ON public.arbitrages_conflits_sources
  FOR EACH STATEMENT EXECUTE FUNCTION public.positions_expert_append_only();

-- ── L'EMPREINTE DU CONTENU ─────────────────────────────────────────────────
--
-- En tête : SHA-256 hex de la concaténation des SHA-256 hex des quatre
-- rubriques, dans l'ordre fixe. NULL si une rubrique manque : la version
-- l'a déjà refusé, et un acte ne s'y compare jamais.

CREATE OR REPLACE FUNCTION public.positions_expert_empreinte_contenu(contenu jsonb)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT encode(sha256(convert_to(
    encode(sha256(convert_to(contenu ->> 'enonce', 'UTF8')), 'hex')
    || encode(sha256(convert_to(contenu ->> 'perimetre', 'UTF8')), 'hex')
    || encode(sha256(convert_to(contenu ->> 'population', 'UTF8')), 'hex')
    || encode(sha256(convert_to(contenu ->> 'limites', 'UTF8')), 'hex'),
    'UTF8')), 'hex');
$$;

-- ── LA VERSION, À L'INSERTION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.positions_expert_versions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cle text;
  valeur jsonb;
  appui text;
  courante_id text;
  courante_version text;
  courante_dossier text;
  n_neuf integer;
  m_neuf integer;
  n_cour integer;
  m_cour integer;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'version de position refusée en REPEATABLE READ : la version courante exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- 1. Le contenu : quatre rubriques exactement, chacune un texte visible.
  IF jsonb_typeof(NEW.contenu) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'version de % refusée : le contenu doit être un objet de quatre rubriques.', NEW.position_id;
  END IF;
  FOR cle, valeur IN SELECT r.key, r.value FROM jsonb_each(NEW.contenu) r LOOP
    IF cle NOT IN ('enonce', 'perimetre', 'population', 'limites') THEN
      RAISE EXCEPTION 'version de % refusée : rubrique « % » hors de la liste fermée.', NEW.position_id, cle;
    END IF;
    IF jsonb_typeof(valeur) <> 'string' OR NOT ((valeur #>> '{}') ~ '\S') THEN
      RAISE EXCEPTION 'version de % refusée : la rubrique « % » doit être un texte non vide.', NEW.position_id, cle;
    END IF;
  END LOOP;
  IF NOT (NEW.contenu ?& ARRAY['enonce', 'perimetre', 'population', 'limites']) THEN
    RAISE EXCEPTION 'version de % refusée : énoncé, périmètre, population et limites sont tous requis.', NEW.position_id;
  END IF;

  -- 2. Les claims d'appui : format et unicité. Leur présence (au moins un,
  -- sans NULL) est au CHECK, qui passe après ce trigger : un tableau NULL ou
  -- vide traverse cette boucle sans refus et s'y fait refuser.
  IF NEW.claims_appui IS NOT NULL THEN
    FOREACH appui IN ARRAY NEW.claims_appui LOOP
      IF appui IS NOT NULL AND appui !~ '^WN-CL-[0-9]{4}-[0-9]{3}@v?[0-9]+\.[0-9]+$' THEN
        RAISE EXCEPTION 'version de % refusée : claim d''appui « % » mal formé (identifiant@version attendu).', NEW.position_id, appui;
      END IF;
    END LOOP;
    IF cardinality(NEW.claims_appui) <> (SELECT count(DISTINCT a) FROM unnest(NEW.claims_appui) a WHERE a IS NOT NULL)
       AND array_position(NEW.claims_appui, NULL) IS NULL THEN
      RAISE EXCEPTION 'version de % refusée : un claim d''appui est cité deux fois.', NEW.position_id;
    END IF;
  END IF;

  -- 3 et 4. La révision, sous le verrou de la position.
  PERFORM pg_advisory_xact_lock(439, hashtext('pe|' || NEW.position_id));

  SELECT v.id, v.version, v.dossier INTO courante_id, courante_version, courante_dossier
  FROM public.positions_expert_versions v
  WHERE v.position_id = NEW.position_id
    AND NOT EXISTS (
      SELECT 1 FROM public.positions_expert_versions s
      WHERE s.id_version_revisee = v.id
    )
  ORDER BY v.cree_le DESC, v.id DESC
  LIMIT 1;

  IF courante_id IS NULL THEN
    IF NEW.id_version_revisee IS NOT NULL THEN
      RAISE EXCEPTION 'version de % refusée : la position n''a pas de version ; une première version ne révise rien.', NEW.position_id;
    END IF;
  ELSE
    IF NEW.id_version_revisee IS DISTINCT FROM courante_id THEN
      RAISE EXCEPTION 'version de % refusée : elle doit réviser la version courante (%), elle seule.', NEW.position_id, courante_version;
    END IF;
    IF NEW.dossier IS DISTINCT FROM courante_dossier THEN
      RAISE EXCEPTION 'version de % refusée : une révision reste dans le dossier de preuve de la position (%).', NEW.position_id, courante_dossier;
    END IF;
    -- Un numéro mal formé passe ici sans refus : le CHECK de format le
    -- refuse ensuite.
    IF NEW.version ~ '^v[0-9]{1,4}\.[0-9]{1,4}$' THEN
      n_neuf := split_part(substr(NEW.version, 2), '.', 1)::integer;
      m_neuf := split_part(substr(NEW.version, 2), '.', 2)::integer;
      n_cour := split_part(substr(courante_version, 2), '.', 1)::integer;
      m_cour := split_part(substr(courante_version, 2), '.', 2)::integer;
      IF (n_neuf, m_neuf) <= (n_cour, m_cour) THEN
        RAISE EXCEPTION 'version de % refusée : % ne suit pas la version courante %.', NEW.position_id, NEW.version, courante_version;
      END IF;
    END IF;
  END IF;

  NEW.cree_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER positions_expert_versions_avant_insertion
  BEFORE INSERT ON public.positions_expert_versions
  FOR EACH ROW EXECUTE FUNCTION public.positions_expert_versions_avant_insertion();

-- ── L'ACTE, À L'INSERTION ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.positions_expert_actes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  cible_position text;
  cible_contenu jsonb;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'acte de position refusé en REPEATABLE READ : la version courante exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  SELECT v.position_id INTO cible_position
  FROM public.positions_expert_versions v
  WHERE v.id = NEW.id_version;
  -- Le trigger passe avant la FK : une cible inconnue se dit telle.
  IF cible_position IS NULL THEN
    RAISE EXCEPTION 'acte refusé : version % inconnue.', NEW.id_version;
  END IF;

  PERFORM pg_advisory_xact_lock(439, hashtext('pe|' || cible_position));

  IF EXISTS (
    SELECT 1 FROM public.positions_expert_versions s
    WHERE s.id_version_revisee = NEW.id_version
  ) THEN
    RAISE EXCEPTION 'acte refusé : la version % a été révisée ; seule la version courante de % reçoit un acte.', NEW.id_version, cible_position;
  END IF;

  SELECT v.contenu INTO cible_contenu
  FROM public.positions_expert_versions v
  WHERE v.id = NEW.id_version;
  IF public.positions_expert_empreinte_contenu(cible_contenu) IS DISTINCT FROM NEW.empreinte THEN
    RAISE EXCEPTION 'acte refusé : l''empreinte recopiée ne correspond pas au contenu de la version %.', NEW.id_version;
  END IF;

  NEW.le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.positions_expert_actes', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER positions_expert_actes_avant_insertion
  BEFORE INSERT ON public.positions_expert_actes
  FOR EACH ROW EXECUTE FUNCTION public.positions_expert_actes_avant_insertion();

-- ── L'ARBITRAGE, À L'INSERTION ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.arbitrages_conflits_sources_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  tete text;
  retenue_position text;
  dernier_acte text;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'arbitrage refusé en REPEATABLE READ : la tête d''un couple exige READ COMMITTED ou SERIALIZABLE.';
  END IF;

  -- Les verrous (en-tête, « Les verrous ») : le couple, puis la position.
  PERFORM pg_advisory_xact_lock(439, hashtext('cs|' || NEW.conflit_id || '|' || NEW.fiche_id));

  -- 7. La tête : la pose de ce couple que rien ne vise. `ordre` départage si
  -- un état antérieur en laissait deux, sans échec.
  SELECT a.id INTO tete
  FROM public.arbitrages_conflits_sources a
  WHERE a.conflit_id = NEW.conflit_id
    AND a.fiche_id = NEW.fiche_id
    AND a.acte = 'pose'
    AND NOT EXISTS (
      SELECT 1 FROM public.arbitrages_conflits_sources s
      WHERE s.id_arbitrage_remplace = a.id
    )
  ORDER BY a.ordre DESC
  LIMIT 1;

  IF NEW.acte = 'pose' THEN
    IF tete IS NULL AND NEW.id_arbitrage_remplace IS NOT NULL THEN
      RAISE EXCEPTION 'arbitrage refusé : le couple %, % n''est pas arbitré ; une pose neuve ne remplace rien.', NEW.conflit_id, NEW.fiche_id;
    ELSIF tete IS NOT NULL AND NEW.id_arbitrage_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'arbitrage refusé : le couple %, % porte un arbitrage en vigueur (%) ; une pose doit le remplacer, lui seul.', NEW.conflit_id, NEW.fiche_id, tete;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    IF tete IS NULL OR NEW.id_arbitrage_remplace IS DISTINCT FROM tete THEN
      RAISE EXCEPTION 'révocation refusée : seul l''arbitrage en vigueur du couple %, % se révoque.', NEW.conflit_id, NEW.fiche_id;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK le refuse ensuite.

  -- 8. La position retenue est en vigueur : version courante, dernier acte
  -- `signee` au sens d'`ordre`.
  IF NEW.id_position_version IS NOT NULL THEN
    SELECT v.position_id INTO retenue_position
    FROM public.positions_expert_versions v
    WHERE v.id = NEW.id_position_version;
    IF retenue_position IS NULL THEN
      RAISE EXCEPTION 'arbitrage refusé : version de position % inconnue.', NEW.id_position_version;
    END IF;
    PERFORM pg_advisory_xact_lock(439, hashtext('pe|' || retenue_position));
    IF EXISTS (
      SELECT 1 FROM public.positions_expert_versions s
      WHERE s.id_version_revisee = NEW.id_position_version
    ) THEN
      RAISE EXCEPTION 'arbitrage refusé : la version retenue de % a été révisée ; seule une position en vigueur se retient.', retenue_position;
    END IF;
    SELECT a.acte INTO dernier_acte
    FROM public.positions_expert_actes a
    WHERE a.id_version = NEW.id_position_version
    ORDER BY a.ordre DESC
    LIMIT 1;
    IF dernier_acte IS DISTINCT FROM 'signee' THEN
      RAISE EXCEPTION 'arbitrage refusé : la position % n''est pas signée en vigueur ; seule une position en vigueur se retient.', retenue_position;
    END IF;
  END IF;

  NEW.le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.arbitrages_conflits_sources', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER arbitrages_conflits_sources_avant_insertion
  BEFORE INSERT ON public.arbitrages_conflits_sources
  FOR EACH ROW EXECUTE FUNCTION public.arbitrages_conflits_sources_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.positions_expert_append_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.positions_expert_empreinte_contenu(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.positions_expert_versions_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.positions_expert_actes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.arbitrages_conflits_sources_avant_insertion() FROM PUBLIC;

DO $$
DECLARE
  role_nom text;
BEGIN
  FOREACH role_nom IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_nom) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.positions_expert_append_only() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.positions_expert_empreinte_contenu(jsonb) FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.positions_expert_versions_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.positions_expert_actes_avant_insertion() FROM %I', role_nom);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.arbitrages_conflits_sources_avant_insertion() FROM %I', role_nom);
    END IF;
  END LOOP;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."positions_expert_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."positions_expert_actes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."arbitrages_conflits_sources" ENABLE ROW LEVEL SECURITY;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Déployer d'abord le code sans les modèles
-- `PositionExpertVersion`, `PositionExpertActe` et `ArbitrageConflitSource` ;
-- puis DROP TABLE "arbitrages_conflits_sources", "positions_expert_actes",
-- "positions_expert_versions" (dans cet ordre) et DROP FUNCTION des cinq
-- fonctions ci-dessus. Aucune donnée patient n'y vit ; après le premier
-- versement, le DROP efface des actes du responsable : le retour arrière
-- devient une décision.
