-- COURRIER COMPLÉMENT — LA LISTE DE CHAQUE COURRIER, SES REMISES AU PATIENT, ET
-- L'ESPÈCE DE LECTURE
-- ([[D-345]] §4-§5, J3-12h, lot 2 — pièce G5 de la fiche
-- `docs/claude/propositions/2026-10-22-j3-12h-garde-complement-cible/README.md`).
--
-- Migration demandée explicitement par le responsable le 2026-10-23 (« lot 2 =
-- G5, MIGRATION SEULE »). MIGRATION SEULE ([[D-087]]) : aucun code n'écrit ni
-- ne lit encore de remise. Le courrier, sa remise au clic « Valider pour
-- diffusion » et le refus (lot 3, sous drapeau éteint) ne viendront qu'après
-- l'application constatée par conteneur. Le seul code qui l'accompagne est
-- l'effacement nommé du dossier (`patient/effacement.ts`).
--
-- ── UNE REMISE, C'EST QUOI ─────────────────────────────────────────────────
--
-- La trace qu'UN courrier au médecin a été mis à disposition d'UN patient, par
-- UN clic « Valider pour diffusion » (l'approbation) d'un protocole qui porte
-- au moins une intention de complément marquée « ciblé » ([[D-345]] §1). Le
-- texte est RECOPIÉ avec son empreinte, comme la lettre d'adressage
-- ([[D-262]]) : `correspondances_medecin` n'est pas figée, la remise l'est.
--
-- ── CE QU'UN COURRIER COUVRE ([[D-345]] §5) ────────────────────────────────
--
-- La remise retient la LISTE des compléments ciblés couverts, et son
-- empreinte : un complément ciblé ajouté exige un courrier neuf. Un élément de
-- la liste désigne une action `supplement_exploration` marquée « ciblé » du
-- protocole approuvé (arbitrage du responsable du 2026-10-23) :
--
--   <actionId>:<sha256(title)>                        sans référence catalogue
--   <actionId>:<sha256(title)>:<sha256(ingredientId)> avec référence catalogue
--
-- Renommer l'action ou changer d'ingrédient en fait un AUTRE complément ;
-- retoucher une dose, une durée ou un plan, non. Empreintes en hexadécimal du
-- texte en UTF-8, et `actionId` restreint à `[A-Za-z0-9_-]` : l'élément est
-- ASCII, sans « : » parasite, et se trie à l'identique en SQL (`COLLATE "C"`)
-- et en TypeScript. Éléments distincts, triés ; l'empreinte de la liste est le
-- sha-256 des éléments joints par un saut de ligne.
--
-- ── CE QUE LA BASE REFUSE ──────────────────────────────────────────────────
--
-- Une route se contourne, et une remise fautive est un document de santé
-- étranger, ou une couverture qui n'a pas été donnée :
--
--  1. L'APPROBATION, ET LE PROTOCOLE QU'ELLE APPROUVE, PORTENT SUR CE DOSSIER.
--  2. LA LISTE EST CELLE DU PROTOCOLE APPROUVÉ, recalculée ici depuis son
--     payload : ni élément manquant, ni élément en trop, ni désordre. Un
--     protocole sans complément ciblé ne demande aucun courrier : refusé. Une
--     intention ciblée mal formée (identifiant hors format, intitulé vide,
--     référence sans ingrédient) : refusée. Seul un protocole au contrat V4
--     porte la nature du complément : un autre contrat est refusé.
--  3. LE COURRIER EST UN COURRIER COMPLÉMENT DE CE DOSSIER : sortant, ancré
--     sur une version `complement-cible-…` (celle du générateur du lot 3). Une
--     lettre saisie à la main, d'adressage ou de biologie ne couvre rien.
--  4. LE COURRIER A ÉTÉ ÉCRIT POUR CETTE LISTE : la liste retenue à sa
--     consignation (`courriers_complement_listes`, ci-dessous) est celle de la
--     remise. Un courrier écrit pour {magnésium} ne couvre pas {fer,
--     magnésium} ; un courrier sans liste consignée ne se remet pas.
--  5. LE TEXTE RECOPIÉ EST CELUI DU COURRIER, et son empreinte est la sienne
--     (CHECK).
--
-- ── LA LISTE D'UN COURRIER, RETENUE À SA CONSIGNATION ──────────────────────
--
-- Sans elle, ni la base ni le lot 3 ne sauraient pour quelle liste un courrier
-- consigné a été écrit, sauf à relire son texte (contre-revue `wn-reviewer` du
-- 2026-10-24, P1-1 ; table annexe retenue par le responsable le même jour). Le
-- générateur du lot 3 l'écrit dans la transaction qui consigne le courrier :
-- une ligne par courrier (clé primaire), figée, liste au même format que la
-- remise, éléments distincts et triés, vérifiés par la base. Aucune colonne
-- n'est ajoutée à `correspondances_medecin` : Prisma lit toutes les colonnes
-- d'un modèle, et une colonne déclarée avant la release-db mettrait cette
-- table en panne pendant la fenêtre.
--
-- ── UN COURRIER, UNE REMISE ; UN CLIC REJOUÉ NE REMET RIEN ─────────────────
--
-- Un courrier déjà remis : l'insertion est ANNULÉE sans erreur (le trigger
-- rend NULL ; sa liste, fixée à la consignation, est forcément la même).
-- L'émetteur du lot 3 insère donc par `createMany` (qui rend un compte) ou en
-- SQL, jamais par `create`. L'index UNIQUE sur le courrier est le filet : sous
-- une isolation plus stricte que READ COMMITTED (défaut du clic), un clic
-- rejoué concurrent heurte cet index (23505) au lieu de rendre NULL — refus
-- sûr, que l'émetteur doit lire comme « déjà remis ».
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE refusés. DELETE admis : chaque ligne est une donnée de
-- santé du patient, que l'effacement nommé du dossier supprime. Qu'aucun autre
-- code ne la supprime est tenu par une garde du dépôt.
--
-- ── L'ESPÈCE DE LECTURE `courrier_complement` ──────────────────────────────
--
-- `portail_lectures_patient` ferme son espèce par un CHECK : l'ajouter ici
-- laisse le lot 3 sans migration. `id_objet` portera l'identifiant de la
-- REMISE.

-- ═══ LA LISTE D'UN COURRIER, À SA CONSIGNATION ═════════════════════════════

-- CreateTable
CREATE TABLE "courriers_complement_listes" (
    "id_correspondance" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "complements" TEXT[],
    "complements_sha256" TEXT NOT NULL,
    "consigne_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courriers_complement_listes_pkey" PRIMARY KEY ("id_correspondance")
);

-- CreateIndex
-- Vérification de la clé étrangère quand l'effacement supprime le patient.
CREATE INDEX "courriers_complement_listes_patient_idx" ON "courriers_complement_listes"("id_patient");

-- AddForeignKey
-- ON DELETE RESTRICT : supprimée par l'effacement nommé, après les remises et
-- avant les correspondances et le patient.
ALTER TABLE "courriers_complement_listes" ADD CONSTRAINT "courriers_complement_listes_id_correspondance_fkey" FOREIGN KEY ("id_correspondance") REFERENCES "correspondances_medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers_complement_listes" ADD CONSTRAINT "courriers_complement_listes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courriers_complement_listes"
  ADD CONSTRAINT "courriers_complement_listes_complements_non_vide" CHECK (
    "complements" IS NOT NULL
    AND array_ndims("complements") = 1
    AND cardinality("complements") >= 1
    AND array_position("complements", NULL) IS NULL
  ),
  ADD CONSTRAINT "courriers_complement_listes_complements_sha256" CHECK (
    "complements_sha256" = encode(sha256(convert_to(array_to_string("complements", E'\n'), 'UTF8')), 'hex')
  );

CREATE OR REPLACE FUNCTION public.courriers_complement_listes_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une liste consignée est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER courriers_complement_listes_no_update
  BEFORE UPDATE ON public.courriers_complement_listes
  FOR EACH ROW EXECUTE FUNCTION public.courriers_complement_listes_figee();

CREATE TRIGGER courriers_complement_listes_no_truncate
  BEFORE TRUNCATE ON public.courriers_complement_listes
  FOR EACH STATEMENT EXECUTE FUNCTION public.courriers_complement_listes_figee();

CREATE OR REPLACE FUNCTION public.courriers_complement_listes_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  courrier_patient text;
  courrier_sens text;
  courrier_ancrage text;
BEGIN
  -- Le courrier est un courrier complément de ce dossier.
  SELECT c.id_patient, c.sens, c.ancrage_version
    INTO courrier_patient, courrier_sens, courrier_ancrage
  FROM public.correspondances_medecin c
  WHERE c.id = NEW.id_correspondance;
  IF courrier_patient IS DISTINCT FROM NEW.id_patient
     OR courrier_sens IS DISTINCT FROM 'sortant'
     OR courrier_ancrage IS NULL
     OR courrier_ancrage NOT LIKE 'complement-cible-%' THEN
    RAISE EXCEPTION 'liste refusée : % n''est pas un courrier complément de ce dossier.', NEW.id_correspondance;
  END IF;

  -- Une liste nulle, vide, à élément nul ou à deux dimensions : le CHECK la
  -- refuse, après ce trigger. Ici, le format des éléments puis l'ordre.
  IF cardinality(NEW.complements) >= 1 AND array_ndims(NEW.complements) = 1 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.complements) AS e
      WHERE e IS NOT NULL AND e !~ '^[A-Za-z0-9_-]+:[0-9a-f]{64}(:[0-9a-f]{64})?$'
    ) THEN
      RAISE EXCEPTION 'liste refusée : un élément de la liste du courrier % est hors format.', NEW.id_correspondance;
    END IF;
    IF NEW.complements IS DISTINCT FROM (
      SELECT array_agg(s.e ORDER BY s.e COLLATE "C")
      FROM (SELECT DISTINCT e FROM unnest(NEW.complements) AS e) AS s
    ) AND array_position(NEW.complements, NULL) IS NULL THEN
      RAISE EXCEPTION 'liste refusée : la liste du courrier % n''est pas distincte et triée.', NEW.id_correspondance;
    END IF;
  END IF;

  -- L'instant en UTC, quel que soit le fuseau de la session.
  NEW.consigne_le := clock_timestamp() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

CREATE TRIGGER courriers_complement_listes_avant_insertion
  BEFORE INSERT ON public.courriers_complement_listes
  FOR EACH ROW EXECUTE FUNCTION public.courriers_complement_listes_avant_insertion();

-- ═══ LES REMISES ═══════════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "courriers_complement_remises" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_approbation" TEXT NOT NULL,
    "id_correspondance" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "texte_sha256" TEXT NOT NULL,
    "complements" TEXT[],
    "complements_sha256" TEXT NOT NULL,
    "remise_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courriers_complement_remises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courriers_complement_remises_ordre_key" ON "courriers_complement_remises"("ordre");

-- CreateIndex
-- Un courrier, une remise : la couverture d'un courrier ne se redéfinit pas.
CREATE UNIQUE INDEX "courriers_complement_remises_id_correspondance_key" ON "courriers_complement_remises"("id_correspondance");

-- CreateIndex
-- « Les remises de ce patient » (la garde du clic, le portail).
CREATE INDEX "courriers_complement_remises_patient_ordre_idx" ON "courriers_complement_remises"("id_patient", "ordre");

-- CreateIndex
-- Vérification de la clé étrangère quand l'effacement supprime les approbations.
CREATE INDEX "courriers_complement_remises_approbation_idx" ON "courriers_complement_remises"("id_approbation");

-- AddForeignKey
-- ON DELETE RESTRICT partout : l'effacement d'un dossier est une suppression
-- NOMMÉE, qui passe par les remises avant les approbations, les correspondances
-- et le patient.
ALTER TABLE "courriers_complement_remises" ADD CONSTRAINT "courriers_complement_remises_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers_complement_remises" ADD CONSTRAINT "courriers_complement_remises_id_approbation_fkey" FOREIGN KEY ("id_approbation") REFERENCES "protocol_diffusion_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers_complement_remises" ADD CONSTRAINT "courriers_complement_remises_id_correspondance_fkey" FOREIGN KEY ("id_correspondance") REFERENCES "correspondances_medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- « Une remise a sa liste », structurel en plus du trigger : la liste d'un
-- courrier remis ne s'efface pas avant sa remise (seconde passe `wn-reviewer`
-- du 2026-10-24, P2-1).
ALTER TABLE "courriers_complement_remises" ADD CONSTRAINT "courriers_complement_remises_liste_fkey" FOREIGN KEY ("id_correspondance") REFERENCES "courriers_complement_listes"("id_correspondance") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK ──────────────────────────────────────────────────────────────
--
-- `complements` est nullable au type (Prisma décrit `String[]` sans NOT NULL) ;
-- le CHECK l'exige non nul, à une dimension, non vide et sans élément NULL.

ALTER TABLE "courriers_complement_remises"
  ADD CONSTRAINT "courriers_complement_remises_texte_non_vide" CHECK ("texte" ~ '\S'),
  ADD CONSTRAINT "courriers_complement_remises_texte_sha256" CHECK (
    "texte_sha256" = encode(sha256(convert_to("texte", 'UTF8')), 'hex')
  ),
  ADD CONSTRAINT "courriers_complement_remises_complements_non_vide" CHECK (
    "complements" IS NOT NULL
    AND array_ndims("complements") = 1
    AND cardinality("complements") >= 1
    AND array_position("complements", NULL) IS NULL
  ),
  ADD CONSTRAINT "courriers_complement_remises_complements_sha256" CHECK (
    "complements_sha256" = encode(sha256(convert_to(array_to_string("complements", E'\n'), 'UTF8')), 'hex')
  );

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.courriers_complement_remises_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une remise est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER courriers_complement_remises_no_update
  BEFORE UPDATE ON public.courriers_complement_remises
  FOR EACH ROW EXECUTE FUNCTION public.courriers_complement_remises_figee();

CREATE TRIGGER courriers_complement_remises_no_truncate
  BEFORE TRUNCATE ON public.courriers_complement_remises
  FOR EACH STATEMENT EXECUTE FUNCTION public.courriers_complement_remises_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.courriers_complement_remises_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  patient_approbation text;
  patient_protocole text;
  contrat text;
  charge jsonb;
  actions jsonb;
  attendue text[];
  courrier_patient text;
  courrier_sens text;
  courrier_ancrage text;
  courrier_texte text;
  liste_consignee text[];
  liste_patient text;
  deja_remis boolean;
BEGIN
  -- 1. L'approbation et le protocole qu'elle approuve.
  SELECT a.id_patient, d.id_patient, d.contract_version, d.payload
    INTO patient_approbation, patient_protocole, contrat, charge
  FROM public.protocol_diffusion_approvals a
  JOIN public.protocol_drafts d ON d.id = a.protocol_draft_id
  WHERE a.id = NEW.id_approbation;
  IF patient_approbation IS DISTINCT FROM NEW.id_patient
     OR patient_protocole IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'remise refusée : l''approbation % ou son protocole ne porte pas sur ce dossier.', NEW.id_approbation;
  END IF;

  -- 2. La liste des compléments ciblés du protocole approuvé — au contrat V4
  -- seul, le seul qui porte la nature du complément (`protocol/versioning.ts`
  -- pose `contract_version` = version du payload).
  IF contrat IS DISTINCT FROM 'c1-protocol-draft-v4' THEN
    RAISE EXCEPTION 'remise refusée : le protocole approuvé % n''est pas au contrat V4.', NEW.id_approbation;
  END IF;
  actions := CASE WHEN jsonb_typeof(charge -> 'actions') = 'array' THEN charge -> 'actions' ELSE '[]'::jsonb END;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(actions) AS x(action)
    WHERE jsonb_typeof(x.action) = 'object'
      AND x.action ->> 'type' = 'supplement_exploration'
      AND x.action ->> 'natureComplement' = 'cible'
      AND (
        jsonb_typeof(x.action -> 'actionId') IS DISTINCT FROM 'string'
        OR (x.action ->> 'actionId') !~ '^[A-Za-z0-9_-]+$'
        OR jsonb_typeof(x.action -> 'title') IS DISTINCT FROM 'string'
        OR (x.action ->> 'title') !~ '\S'
        OR (x.action ? 'supplementCatalogRef' AND (
          jsonb_typeof(x.action -> 'supplementCatalogRef' -> 'ingredientId') IS DISTINCT FROM 'string'
          OR (x.action -> 'supplementCatalogRef' ->> 'ingredientId') !~ '\S'
        ))
      )
  ) THEN
    RAISE EXCEPTION 'remise refusée : une intention de complément ciblé du protocole approuvé % est mal formée.', NEW.id_approbation;
  END IF;

  SELECT array_agg(s.element ORDER BY s.element COLLATE "C")
    INTO attendue
  FROM (
    SELECT DISTINCT
      (x.action ->> 'actionId')
        || ':' || encode(sha256(convert_to(x.action ->> 'title', 'UTF8')), 'hex')
        || CASE WHEN x.action ? 'supplementCatalogRef'
             THEN ':' || encode(sha256(convert_to(x.action -> 'supplementCatalogRef' ->> 'ingredientId', 'UTF8')), 'hex')
             ELSE '' END AS element
    FROM jsonb_array_elements(actions) AS x(action)
    WHERE jsonb_typeof(x.action) = 'object'
      AND x.action ->> 'type' = 'supplement_exploration'
      AND x.action ->> 'natureComplement' = 'cible'
  ) AS s;
  IF attendue IS NULL THEN
    RAISE EXCEPTION 'remise refusée : le protocole approuvé % ne porte aucun complément ciblé.', NEW.id_approbation;
  END IF;
  IF NEW.complements IS DISTINCT FROM attendue THEN
    RAISE EXCEPTION 'remise refusée : la liste des compléments couverts n''est pas celle du protocole approuvé %.', NEW.id_approbation;
  END IF;

  -- 3. Le courrier est un courrier complément de ce dossier.
  SELECT c.id_patient, c.sens, c.ancrage_version, c.texte
    INTO courrier_patient, courrier_sens, courrier_ancrage, courrier_texte
  FROM public.correspondances_medecin c
  WHERE c.id = NEW.id_correspondance;
  IF courrier_patient IS DISTINCT FROM NEW.id_patient
     OR courrier_sens IS DISTINCT FROM 'sortant'
     OR courrier_ancrage IS NULL
     OR courrier_ancrage NOT LIKE 'complement-cible-%' THEN
    RAISE EXCEPTION 'remise refusée : % n''est pas un courrier complément de ce dossier.', NEW.id_correspondance;
  END IF;

  -- 4. Le courrier a été écrit pour cette liste, consignée dans ce dossier.
  -- Le dossier de la liste est relu : un courrier déplacé d'un dossier à
  -- l'autre après sa consignation (aucun code ne le fait) ne se remet pas
  -- sous la liste de l'ancien (revue CodeRabbit de #1679).
  SELECT l.complements, l.id_patient INTO liste_consignee, liste_patient
  FROM public.courriers_complement_listes l
  WHERE l.id_correspondance = NEW.id_correspondance;
  IF liste_consignee IS NULL THEN
    RAISE EXCEPTION 'remise refusée : le courrier % n''a aucune liste consignée.', NEW.id_correspondance;
  END IF;
  IF liste_patient IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'remise refusée : la liste du courrier % n''a pas été consignée dans ce dossier.', NEW.id_correspondance;
  END IF;
  IF liste_consignee IS DISTINCT FROM NEW.complements THEN
    RAISE EXCEPTION 'remise refusée : le courrier % n''a pas été écrit pour cette liste ; un complément ajouté exige un courrier neuf.', NEW.id_correspondance;
  END IF;

  -- 5. Le texte recopié est celui du courrier (l'empreinte est tenue par le CHECK).
  IF courrier_texte IS DISTINCT FROM NEW.texte THEN
    RAISE EXCEPTION 'remise refusée : le texte recopié n''est pas celui du courrier %.', NEW.id_correspondance;
  END IF;

  -- Un patient à la fois : la lecture des remises et l'`ordre` suivent.
  PERFORM pg_advisory_xact_lock(hashtext('courriers_complement_remises:' || NEW.id_patient));

  -- Un courrier, une remise : un clic rejoué ne remet rien (sa liste, fixée à
  -- la consignation, est forcément la même).
  SELECT EXISTS (
    SELECT 1 FROM public.courriers_complement_remises r
    WHERE r.id_correspondance = NEW.id_correspondance
  ) INTO deja_remis;
  IF deja_remis THEN
    RETURN NULL;
  END IF;

  -- EN DERNIER, SOUS LE VERROU. L'instant en UTC, quel que soit le fuseau de
  -- la session : la colonne est sans fuseau, et Prisma la lit comme UTC.
  NEW.remise_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.courriers_complement_remises', 'ordre'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER courriers_complement_remises_avant_insertion
  BEFORE INSERT ON public.courriers_complement_remises
  FOR EACH ROW EXECUTE FUNCTION public.courriers_complement_remises_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_avant_insertion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_avant_insertion() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_listes_avant_insertion() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.courriers_complement_remises_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."courriers_complement_listes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."courriers_complement_remises" ENABLE ROW LEVEL SECURITY;

-- ── L'ESPÈCE DE LECTURE ────────────────────────────────────────────────────
--
-- Une seule instruction : la contrainte n'est jamais absente. La nouvelle liste
-- contient l'ancienne (`20261016080000_portail_lectures_protocole_v1`).
ALTER TABLE "portail_lectures_patient"
  DROP CONSTRAINT "portail_lectures_patient_espece_check",
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese', 'fiche_assiette', 'lettre_adressage', 'protocole', 'courrier_complement'));

-- CE QUE LA BASE NE DIT PAS, À LA CHARGE DU LOT 3 :
--  — l'ACCORD de partage avec le médecin traitant ([[D-345]] §6) : la garde le
--    relit à chaque clic ; une remise prouve la remise, jamais l'accord ;
--  — « déjà tracé pour ces compléments » ([[D-345]] §4) : la garde compare la
--    liste de la version à celles des remises du dossier ; la base ne dit pas
--    si une liste plus courte est couverte par une plus longue ;
--  — le verrou sérialise les remises d'un patient, pas la consignation d'un
--    courrier ni l'écriture d'une version du protocole, qui ne le prennent pas ;
--  — qu'un courrier complément consigné porte sa liste : le générateur écrit
--    les deux dans une transaction ; un courrier sans liste ne se remet pas ;
--  — que l'approbation soit celle du clic en cours : toute approbation du
--    dossier dont la version porte la liste est admise (comme le patron) ;
--  — le format d'`actionId` (`[A-Za-z0-9_-]`) et le refus d'une
--    `supplementCatalogRef` nulle ne vivent qu'ici : le lot 3 les vérifie
--    avant d'insérer, pour rendre un refus en clair plutôt qu'une erreur, et
--    calcule la liste depuis le payload PERSISTÉ de la version approuvée.
--
-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main — `migrate resolve --rolled-back` ne vise
-- que les migrations échouées (précédent BIO-INGEST, P3012). Tant qu'aucune
-- remise, aucune liste ni aucune lecture `courrier_complement` n'existe :
-- déployer d'abord le code sans l'effacement de ces deux tables et sans les
-- modèles `CourrierComplementRemise` et `CourrierComplementListe`, puis
-- supprimer les deux tables et leurs quatre fonctions, et rétablir le CHECK
-- `espece IN ('bilan', 'synthese', 'fiche_assiette', 'lettre_adressage',
-- 'protocole')`.
