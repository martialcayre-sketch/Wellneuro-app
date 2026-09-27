-- FICHES D'ASSIETTE — LES REMISES AU PATIENT, ET L'ESPÈCE DE LECTURE
-- ([[D-251]], lot 7).
--
-- Migration autorisée explicitement par le responsable le 2026-09-26 (M2 des
-- deux migrations du chantier). MIGRATION SEULE ([[D-087]]) : aucun code n'écrit
-- encore de remise. La remise au clic « Valider pour diffusion » (lot 8) ne
-- viendra qu'après l'application constatée par conteneur. Le seul code qui
-- l'accompagne est l'effacement nommé du dossier (`patient/effacement.ts`) :
-- une table qui porte `id_patient` sans y figurer ferait rougir sa garde de
-- complétude, et laisserait de la donnée derrière un dossier « effacé ».
--
-- ── UNE REMISE, C'EST QUOI ─────────────────────────────────────────────────
--
-- La trace qu'une VERSION de fiche a été remise à UN patient, par UN clic
-- « Valider pour diffusion » (l'approbation), au titre d'UNE action
-- Alimentation. Le texte n'est pas recopié : la version est immuable (M1), la
-- remise la désigne et recopie son empreinte. « Avec la version remise
-- figée » ([[D-251]] §7) : une remise ne se réécrit pas.
--
-- ── LA REMISE EN COURS : LA DERNIÈRE, PAR `ordre` ──────────────────────────
--
-- Arbitrage du responsable du 2026-09-28 (amendement de [[D-251]]). Pour un
-- patient et une fiche, la remise EN COURS est la dernière, au sens d'`ordre`
-- — clé posée par la base, comme celle des actes de M1, et pour la même
-- raison : `now()` est figé par transaction, deux remises y seraient ex æquo.
--
--  - UN CLIC QUI NE CHANGE RIEN NE REMET RIEN. Si la remise en cours de cette
--    fiche porte déjà cette version, l'insertion est ANNULÉE sans erreur (le
--    trigger rend NULL) : un clic rejoué, ou la même assiette posée sur deux
--    actions, ne crée rien. C'est l'idempotence du §7, tenue par la base.
--  - UNE VERSION DÉJÀ REMISE SE REMET, SI UNE AUTRE L'A REMPLACÉE DEPUIS. Le
--    patient a reçu la v1, puis la v2 ; la v2 est retirée, la v1 redevient la
--    référence (amendement du 2026-09-27, point 2). Le patient voit la v2 avec
--    sa mention de retrait, et c'est le CLIC SUIVANT qui lui remet la v1.
--    Jamais de retour en arrière sans clic : c'est la règle « ne rien servir,
--    et le dire » (point 3), appliquée à ce que le patient a déjà reçu.
--
-- Il n'y a donc PAS d'unicité (patient, version) : elle interdisait
-- précisément ce second cas.
--
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
-- Quatre refus par trigger, parce qu'une route se contourne et qu'une remise
-- fautive est un texte non validé, ou étranger, devant un patient (`DC-16`) :
--
--  1. L'APPROBATION PORTE SUR CE DOSSIER.
--  2. L'EMPREINTE RECOPIÉE EST CELLE DE LA VERSION : on ne remet pas un texte
--     pour en tracer un autre.
--  3. L'ACTION EXISTE DANS LE PROTOCOLE APPROUVÉ ET PORTE L'ASSIETTE DE CETTE
--     FICHE (`actions[].recommendedPlateRef.plateCode` du payload, [[D-249]]).
--     La fiche remise est celle de l'assiette que le praticien a choisie, et
--     aucune autre. Ce refus ne juge PAS la politique de remise — action
--     « ferme » ([[D-056]]), contrat servi, dossier en suivi — qui appartient
--     au lot 8 ; ni la fraîcheur de l'approbation, que le lot 8 crée dans la
--     même transaction que ses remises.
--  4. LA VERSION EST LA VERSION DE RÉFÉRENCE DE SA FICHE : la plus haute dont
--     le dernier acte, lu par `ordre`, est une validation — la règle de
--     `etat.ts` (`derniereVersionValidee`), rejouée en base. Ce seul refus en
--     porte deux : un brouillon ou une version retirée ne part jamais, et
--     aucune version plus ancienne n'est remise à la place de la référence
--     (point 3 : jamais de repli).
--
-- ── AUCUNE COURSE AVEC LA DÉCISION ─────────────────────────────────────────
--
-- Le trigger prend, avant de lire la référence, LE MÊME verrou par fiche que
-- la décision du responsable (`decision.ts` : `fiches_assiette_actes:` + la
-- fiche). Une validation ou un retrait de cette fiche et une remise passent
-- donc l'un après l'autre : ni la remise d'une version qu'on retire, ni celle
-- d'une version qu'une validation concurrente vient de dépasser. Le verrou
-- sérialise aussi deux clics concurrents sur la même fiche, ce qui rend exacte
-- la lecture de « la remise en cours ». Les lectures suivent le verrou dans la
-- fonction : en READ COMMITTED, chacune voit ce qui a été commité avant.
-- CONSÉQUENCE POUR LE LOT 8 : une transaction qui remet plusieurs fiches les
-- insère dans un ordre STABLE de fiche, sinon deux clics croisés
-- s'interbloquent.
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, et c'est
-- l'écart assumé avec M1 : M1 ne porte aucune donnée patient, ici chaque ligne
-- en est une. L'effacement d'un dossier la supprime NOMMÉMENT, comme toutes
-- les tables liées au patient — et aucune de ces tables ne refuse le DELETE.
-- Qu'aucun AUTRE code ne supprime une remise est tenu par un banc du dépôt
-- (`remises.guard.test.ts`), pas par la base.
--
-- ── L'ESPÈCE DE LECTURE `fiche_assiette` ───────────────────────────────────
--
-- `portail_lectures_patient` ferme son espèce par un CHECK : ce qui compte
-- comme une lecture du patient est un arbitrage, « ajouter une espèce demande
-- une migration, donc une relecture » (LOT-08). Celle-ci est la sienne :
-- [[D-251]] §8 ajoute la lecture d'une fiche remise. `id_objet` y porte
-- l'identifiant de la REMISE — polymorphe, donc sans clé étrangère, comme pour
-- les deux espèces existantes. Une remise neuve est un objet neuf : la v1
-- remise à nouveau redevient « à lire ». Aucune colonne ne s'ajoute, et
-- toujours aucune date : « quand le patient a-t-il lu sa fiche » reste sans
-- réponse.

-- CreateTable
CREATE TABLE "fiches_assiette_remises" (
    "id" TEXT NOT NULL,
    "ordre" BIGSERIAL NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_approbation" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "id_version" TEXT NOT NULL,
    "contenu_sha256" TEXT NOT NULL,
    "remise_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_assiette_remises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiches_assiette_remises_ordre_key" ON "fiches_assiette_remises"("ordre");

-- CreateIndex
-- « La remise en cours de cette fiche pour ce patient » (le trigger), et « les
-- remises de ce dossier » (le service patient, lot 9) : les deux parcourent
-- les remises d'un dossier dans l'ordre.
CREATE INDEX "fiches_assiette_remises_patient_ordre_idx" ON "fiches_assiette_remises"("id_patient", "ordre");

-- CreateIndex
-- « Ce que ce clic a remis » (l'aperçu du lot 8), et la vérification de la FK
-- quand l'effacement supprime les approbations.
CREATE INDEX "fiches_assiette_remises_approbation_idx" ON "fiches_assiette_remises"("id_approbation");

-- AddForeignKey
-- ON DELETE RESTRICT sur les trois : l'effacement d'un dossier est une
-- suppression NOMMÉE (`patient/effacement.ts`), qui passe par les remises avant
-- les approbations et le patient. En CASCADE, elles partiraient en silence.
ALTER TABLE "fiches_assiette_remises" ADD CONSTRAINT "fiches_assiette_remises_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_assiette_remises" ADD CONSTRAINT "fiches_assiette_remises_id_approbation_fkey" FOREIGN KEY ("id_approbation") REFERENCES "protocol_diffusion_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_assiette_remises" ADD CONSTRAINT "fiches_assiette_remises_id_version_fkey" FOREIGN KEY ("id_version") REFERENCES "fiches_assiette_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LES CHECK — ce que Prisma ne modélise pas ──────────────────────────────
--
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument. Le trigger
-- refuse avant eux une action ou une empreinte étrangère : ces deux CHECK sont
-- la garde qui reste si le trigger tombait.

ALTER TABLE "fiches_assiette_remises"
  ADD CONSTRAINT "fiches_assiette_remises_action_non_vide" CHECK ("action_id" ~ '\S'),
  ADD CONSTRAINT "fiches_assiette_remises_contenu_sha256_format" CHECK ("contenu_sha256" ~ '^[0-9a-f]{64}$');

-- ── FIGÉE : NI UPDATE NI TRUNCATE ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fiches_assiette_remises_figee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION '% : une remise est figée (% refusé) ; seul l''effacement du dossier la supprime.', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER fiches_assiette_remises_no_update
  BEFORE UPDATE ON public.fiches_assiette_remises
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_remises_figee();

CREATE TRIGGER fiches_assiette_remises_no_truncate
  BEFORE TRUNCATE ON public.fiches_assiette_remises
  FOR EACH STATEMENT EXECUTE FUNCTION public.fiches_assiette_remises_figee();

-- ── AU MOMENT DE L'INSERTION ───────────────────────────────────────────────
--
-- L'instant et l'`ordre` sont posés par la base, comme en M1 : une remise
-- antidatable, ou qui choisirait son rang, n'est pas une preuve. Puis les
-- quatre refus décrits en tête, et enfin l'idempotence.

CREATE OR REPLACE FUNCTION public.fiches_assiette_remises_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  patient_approbation text;
  empreinte text;
  fiche text;
  assiette text;
  reference text;
  en_cours text;
BEGIN
  NEW.remise_le := now();
  NEW.ordre := nextval(pg_get_serial_sequence('public.fiches_assiette_remises', 'ordre'));

  SELECT a.id_patient INTO patient_approbation
  FROM public.protocol_diffusion_approvals a
  WHERE a.id = NEW.id_approbation;
  IF patient_approbation IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'remise refusée : l''approbation % ne porte pas sur ce dossier.', NEW.id_approbation;
  END IF;

  SELECT v.contenu_sha256, v.source_id, v.plate_code INTO empreinte, fiche, assiette
  FROM public.fiches_assiette_versions v
  WHERE v.id = NEW.id_version;
  IF empreinte IS DISTINCT FROM NEW.contenu_sha256 THEN
    RAISE EXCEPTION 'remise refusée : l''empreinte recopiée ne correspond pas au texte de la version %.', NEW.id_version;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.protocol_diffusion_approvals a
    JOIN public.protocol_drafts d ON d.id = a.protocol_draft_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(d.payload -> 'actions') = 'array' THEN d.payload -> 'actions' ELSE '[]'::jsonb END
    ) AS act
    WHERE a.id = NEW.id_approbation
      AND act ->> 'actionId' = NEW.action_id
      AND act -> 'recommendedPlateRef' ->> 'plateCode' = assiette
  ) THEN
    RAISE EXCEPTION 'remise refusée : l''action % du protocole approuvé ne porte pas l''assiette de cette fiche.', NEW.action_id;
  END IF;

  -- Le verrou de la décision, avant toute lecture d'état (voir en tête).
  PERFORM pg_advisory_xact_lock(hashtext('fiches_assiette_actes:' || fiche));

  SELECT v.id INTO reference
  FROM public.fiches_assiette_versions v
  WHERE v.source_id = fiche
    AND (
      SELECT a.acte
      FROM public.fiches_assiette_actes a
      WHERE a.id_version = v.id
      ORDER BY a.ordre DESC
      LIMIT 1
    ) = 'validee'
  ORDER BY v.numero DESC
  LIMIT 1;
  IF reference IS DISTINCT FROM NEW.id_version THEN
    RAISE EXCEPTION 'remise refusée : la version % n''est pas la version de référence de sa fiche.', NEW.id_version;
  END IF;

  SELECT r.id_version INTO en_cours
  FROM public.fiches_assiette_remises r
  JOIN public.fiches_assiette_versions v ON v.id = r.id_version
  WHERE r.id_patient = NEW.id_patient
    AND v.source_id = fiche
  ORDER BY r.ordre DESC
  LIMIT 1;
  IF en_cours = NEW.id_version THEN
    -- Rien ne change pour ce patient : rien n'est remis.
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_assiette_remises_avant_insertion
  BEFORE INSERT ON public.fiches_assiette_remises
  FOR EACH ROW EXECUTE FUNCTION public.fiches_assiette_remises_avant_insertion();

-- Hygiène d'exécution : ces fonctions ne servent qu'aux triggers.
REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_figee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_avant_insertion() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_figee() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_avant_insertion() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_figee() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.fiches_assiette_remises_avant_insertion() FROM authenticated;
  END IF;
END $$;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."fiches_assiette_remises" ENABLE ROW LEVEL SECURITY;

-- ── L'ESPÈCE DE LECTURE ────────────────────────────────────────────────────
--
-- Une seule instruction : la contrainte n'est jamais absente, même un instant.
-- La nouvelle liste contient l'ancienne : les lignes existantes (`bilan`,
-- `synthese`) la satisfont.
ALTER TABLE "portail_lectures_patient"
  DROP CONSTRAINT "portail_lectures_patient_espece_check",
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese', 'fiche_assiette'));

-- ROLLBACK (manuel, si jamais, et seulement tant qu'aucune remise ni aucune
-- lecture `fiche_assiette` n'existe), DANS CET ORDRE :
--  1. déployer d'abord le code sans l'effacement des remises
--     (`patient/effacement.ts`) et sans le modèle `FicheAssietteRemise` de
--     `schema.prisma` — sinon tout effacement de dossier échoue sur une table
--     absente ;
--  2. DROP TABLE "fiches_assiette_remises" ; DROP FUNCTION des deux fonctions
--     ci-dessus ;
--  3. rétablir le CHECK `espece IN ('bilan', 'synthese')` ;
--  4. `prisma migrate resolve --rolled-back 20260927190000_fiches_assiette_remises_v1`.
