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
-- ── CE QUE LA BASE REFUSE, ET POURQUOI ICI PLUTÔT QUE DANS LA ROUTE ────────
--
-- Trois refus sont posés par trigger, parce qu'une route se contourne et
-- qu'une remise fautive est un texte non validé devant un patient (`DC-16`) :
--
--  1. UNE VERSION QUI N'EST PAS LA VERSION DE RÉFÉRENCE DE SA FICHE N'EST PAS
--     REMISE. La référence est la plus haute version dont le dernier acte, lu
--     par `ordre`, est une validation — la règle de `etat.ts`
--     (`derniereVersionValidee`), rejouée en base. Ce seul refus en porte
--     deux : un brouillon ou une version retirée ne part jamais, et AUCUNE
--     version plus ancienne n'est remise à la place de la référence
--     (amendement du 2026-09-27, point 3 : « ne rien servir, et le dire »,
--     jamais de repli). La référence d'après un retrait est bien la
--     précédente validée (point 2) : la même requête la trouve.
--  2. L'EMPREINTE RECOPIÉE EST CELLE DE LA VERSION. Sans cela, on remettrait
--     un texte et on en tracerait un autre.
--  3. L'APPROBATION PORTE SUR CE DOSSIER. Une remise rattachée au clic posé
--     sur un autre patient serait une provenance fausse.
--
-- La lecture est faite à l'insertion, en READ COMMITTED. Un retrait validé
-- pendant qu'une remise s'insère peut donc laisser une remise d'une version
-- que l'on vient de retirer. C'est sans danger, et c'est le régime voulu :
-- « retirer une version cesse d'en servir le texte, mais l'entrée reste, avec
-- une mention » (§7) — le service (lot 9) lit l'état AU MOMENT DE SERVIR.
--
-- ── UNE VERSION N'EST REMISE QU'UNE FOIS À UN PATIENT ─────────────────────
--
-- UNIQUE (id_patient, id_version). C'est l'idempotence du §7 : un second clic
-- qui ne change rien ne remet rien, et un clic rejoué par le réseau non plus.
-- Un nouveau clic ne remet que ce qui a été validé DEPUIS — une version neuve
-- est une autre ligne. Une même assiette posée sur deux actions d'un même
-- protocole ne fait qu'une remise. La lecture ([[D-175]]) s'accuse par
-- remise : une version déjà remise, et déjà lue, ne redevient pas « à lire ».
--
-- ── FIGÉE, MAIS EFFAÇABLE ──────────────────────────────────────────────────
--
-- UPDATE et TRUNCATE sont refusés par trigger. DELETE ne l'est PAS, et c'est
-- l'écart assumé avec M1 : M1 ne porte aucune donnée patient, ici chaque ligne
-- en est une. L'effacement d'un dossier la supprime NOMMÉMENT, comme toutes
-- les tables liées au patient — et aucune de ces tables ne refuse le DELETE.
-- La FK vers `patients` est en RESTRICT : sans l'effacement nommé, la
-- suppression du patient échoue, elle ne laisse rien derrière elle.
--
-- ── L'ESPÈCE DE LECTURE `fiche_assiette` ───────────────────────────────────
--
-- `portail_lectures_patient` ferme son espèce par un CHECK : ce qui compte
-- comme une lecture du patient est un arbitrage, « ajouter une espèce demande
-- une migration, donc une relecture » (LOT-08). Celle-ci est la sienne :
-- [[D-251]] §8 ajoute la lecture d'une fiche remise. `id_objet` y porte
-- l'identifiant de la REMISE — polymorphe, donc sans clé étrangère, comme pour
-- les deux espèces existantes. Aucune colonne ne s'ajoute, et toujours aucune
-- date : « quand le patient a-t-il lu sa fiche » reste sans réponse.

-- CreateTable
CREATE TABLE "fiches_assiette_remises" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_approbation" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "id_version" TEXT NOT NULL,
    "contenu_sha256" TEXT NOT NULL,
    "remise_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_assiette_remises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Sert aussi « les remises de ce dossier », par son préfixe `id_patient` : le
-- service patient (lot 9) n'a pas besoin d'un index de plus.
CREATE UNIQUE INDEX "fiches_assiette_remises_patient_version_key" ON "fiches_assiette_remises"("id_patient", "id_version");

-- CreateIndex
-- « Ce que ce clic a remis » (l'aperçu et l'idempotence du lot 8), et la
-- vérification de la FK quand l'effacement supprime les approbations.
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
-- « Non vide » s'écrit `~ '\S'`, jamais avec `btrim` à un argument.

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

-- ── COHÉRENCE AU MOMENT DE L'INSERTION ─────────────────────────────────────
--
-- L'instant est posé par la base, comme en M1 : une remise antidatable n'est
-- pas une preuve. Puis les trois refus décrits en tête, dans l'ordre où leur
-- message est le plus utile : le dossier, le texte, la référence.

CREATE OR REPLACE FUNCTION public.fiches_assiette_remises_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  patient_approbation text;
  empreinte text;
  fiche text;
  reference text;
BEGIN
  NEW.remise_le := now();

  SELECT a.id_patient INTO patient_approbation
  FROM public.protocol_diffusion_approvals a
  WHERE a.id = NEW.id_approbation;
  IF patient_approbation IS DISTINCT FROM NEW.id_patient THEN
    RAISE EXCEPTION 'remise refusée : l''approbation % ne porte pas sur ce dossier.', NEW.id_approbation;
  END IF;

  SELECT v.contenu_sha256, v.source_id INTO empreinte, fiche
  FROM public.fiches_assiette_versions v
  WHERE v.id = NEW.id_version;
  IF empreinte IS DISTINCT FROM NEW.contenu_sha256 THEN
    RAISE EXCEPTION 'remise refusée : l''empreinte recopiée ne correspond pas au texte de la version %.', NEW.id_version;
  END IF;

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
-- Les lignes existantes (`bilan`, `synthese`) satisfont la nouvelle liste.
ALTER TABLE "portail_lectures_patient"
  DROP CONSTRAINT "portail_lectures_patient_espece_check",
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese', 'fiche_assiette'));

-- ROLLBACK (manuel, si jamais, et seulement tant qu'aucune remise ni aucune
-- lecture `fiche_assiette` n'existe) : DROP TABLE "fiches_assiette_remises";
-- DROP FUNCTION des deux fonctions ci-dessus ; puis rétablir le CHECK
-- `espece IN ('bilan', 'synthese')`.
