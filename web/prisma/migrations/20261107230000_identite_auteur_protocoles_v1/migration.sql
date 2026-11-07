-- Identité d'auteur des protocoles (BP-14, LOT-14, fiche F10 ; D-459).
--
-- La base sait qu'« un praticien » a validé une version pour diffusion
-- (`approved_by = 'practitioner'`), pas lequel, ni qui a créé la version.
-- Cette migration pose deux colonnes FACULTATIVES, sans défaut :
--   - `protocol_drafts.cree_par`, l'e-mail de session de qui a créé la
--     version ;
--   - `protocol_diffusion_approvals.valide_par`, celui de qui a cliqué
--     « Valider pour diffusion ».
-- Une ligne nulle se lit « auteur non consigné », jamais comme un auteur.
-- `approved_by` ne change pas : même colonne, même valeur, mêmes lecteurs.
-- Aucun code ne lit ni n'écrit ces colonnes dans ce lot (D-459 §7, §8) : les
-- écritures côté serveur viennent dans la PR suivante, après le constat de
-- cette release-db.
--
-- ═══ La reprise de l'historique (D-459 §4) ══════════════════════════════════
--
-- Les lignes existantes reçoivent un auteur DÉDUIT : la migration joint chaque
-- ligne au dossier qu'elle désigne et recopie `lower(patients.praticien_email)`.
-- Ce fichier n'écrit aucun e-mail.
--   - Remplies : les versions au statut `practitioner_reviewed`, et toutes les
--     approbations — une route praticien les a forcément créées.
--   - Laissées nulles : les versions au statut `draft` (instantanés JA). Un
--     brouillon déposé depuis le portail n'a pas d'auteur praticien (§3).
--   - `updated_at` n'est pas touché : la reprise n'est pas une révision.
--   - Un `praticien_email` blanc ne donne pas d'auteur : la ligne reste nulle
--     plutôt que de porter une chaîne vide lue comme un auteur.
--
-- La jointure ne dit juste que s'il n'a existé qu'un praticien. La garde
-- d'appartenance (`appartenance.ts`, depuis #155) fait de l'auteur d'un geste
-- le praticien du dossier À L'INSTANT du geste ; une ligne antérieure à la
-- garde, ou un dossier qui a changé de praticien depuis, rendraient la
-- jointure fausse. Aucun des deux n'a d'effet tant qu'un seul praticien a
-- existé.
--
-- REFUS S'IL Y EN A PLUS D'UN (`20261107-2113-c`). AVANT TOUTE ÉCRITURE, la
-- migration compte les e-mails praticien distincts, sans tenir compte de la
-- casse, dans `patients.praticien_email` et `journal_acces_dossiers.praticien_email`.
-- S'il y en a plus d'un, elle échoue et rien n'est écrit : ni colonne, ni
-- valeur. La release-db est alors rouge, et sa sortie est un arbitrage du
-- responsable (`pr-revue-et-release-db.md` §5, piège 5). Même patron que
-- `20261019190000_patients_retrait_nir_v1`.
--
-- PORTÉE DE CE CONTRÔLE (précision du responsable, 2026-11-07) : il porte sur
-- les praticiens que ces deux sources laissent voir. Le journal d'accès est
-- purgé après douze mois et peut perdre une trace sans bloquer l'accès : le
-- contrôle ne garantit pas l'exhaustivité historique. Les auteurs repris
-- restent DÉDUITS ; ils ne prouvent pas qui a historiquement agi (D-459 §5).
--
-- PROVENANCE PAR LA DATE (D-459 §5) : aucune colonne de provenance. La date
-- seuil est `_prisma_migrations.finished_at` de CETTE migration, constatée au
-- constat de la release-db et inscrite au journal de F10 et à la fin de D-459.
--
-- ═══ Le critère est une FONCTION, pas un bloc anonyme ═══════════════════════
--
-- La base du CI est construite vide par `migrate deploy` : la reprise y est un
-- no-op. Pour que le contrat `prisma/checks/identite_auteur_protocoles_v1_negatif.sql`
-- éprouve la reprise ELLE-MÊME — et non une copie de son prédicat —, la garde
-- et la reprise sont des fonctions, que la migration appelle et que le contrat
-- rappelle sur ses fixtures (patron de `20260728090000_rag_claim_reprise_bornes_signees`).
-- Elles restent en base pour cela, EXECUTE retiré à PUBLIC.
--
-- AUCUNE SECONDE REPRISE (D-459 §5 : « un nul ne se complète jamais après
-- coup ») : la fonction de reprise refuse de s'exécuter dès qu'une seule ligne
-- porte déjà un auteur. Après cette release, la production en porte : un rejeu
-- échoue, il ne complète rien.

-- ── 1. La garde, avant toute écriture ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.identite_auteur_praticiens_distincts()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT count(DISTINCT e)::integer
  FROM (
    SELECT lower("praticien_email") AS e FROM public."patients"
    UNION ALL
    SELECT lower("praticien_email") AS e FROM public."journal_acces_dossiers"
  ) s
  WHERE btrim(e, E' \t\r\n') <> '';
$$;

COMMENT ON FUNCTION public.identite_auteur_praticiens_distincts() IS
  'Nombre d''e-mails praticien distincts (sans casse) dans patients et journal_acces_dossiers. Garde de la reprise de l''auteur (D-459 §4) : au-delà d''un, la reprise refuse.';

DO $$
DECLARE
  nb integer := public.identite_auteur_praticiens_distincts();
BEGIN
  IF nb > 1 THEN
    RAISE EXCEPTION 'Reprise de l''auteur des protocoles refusée : % e-mails praticien distincts dans les dossiers et le journal d''accès. L''auteur déduit du dossier ne serait plus sûr ; la reprise revient en arbitrage (D-459 §4).', nb
      USING ERRCODE = 'WN459';
  END IF;
END $$;

-- ── 2. Les deux colonnes, facultatives, sans défaut ─────────────────────────
ALTER TABLE "protocol_drafts" ADD COLUMN "cree_par" TEXT;
ALTER TABLE "protocol_diffusion_approvals" ADD COLUMN "valide_par" TEXT;

-- ── 3. La reprise ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.identite_auteur_protocoles_reprise()
RETURNS TABLE (versions_remplies integer, approbations_remplies integer)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  nb integer;
  v integer;
  a integer;
BEGIN
  -- La garde d'abord, encore : la fonction ne s'appuie pas sur le bloc
  -- précédent, pour que le contrat éprouve le refus là où il écrit.
  nb := public.identite_auteur_praticiens_distincts();
  IF nb > 1 THEN
    RAISE EXCEPTION 'Reprise de l''auteur des protocoles refusée : % e-mails praticien distincts dans les dossiers et le journal d''accès. L''auteur déduit du dossier ne serait plus sûr ; la reprise revient en arbitrage (D-459 §4).', nb
      USING ERRCODE = 'WN459';
  END IF;

  IF EXISTS (SELECT 1 FROM public."protocol_drafts" WHERE "cree_par" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public."protocol_diffusion_approvals" WHERE "valide_par" IS NOT NULL) THEN
    RAISE EXCEPTION 'Reprise de l''auteur des protocoles refusée : des auteurs sont déjà posés. Un auteur nul ne se complète jamais après coup (D-459 §5).'
      USING ERRCODE = 'WN459';
  END IF;

  UPDATE public."protocol_drafts" d
  SET "cree_par" = lower(p."praticien_email")
  FROM public."patients" p
  WHERE p."id_patient" = d."id_patient"
    AND d."status" = 'practitioner_reviewed'
    AND btrim(p."praticien_email", E' \t\r\n') <> '';
  GET DIAGNOSTICS v = ROW_COUNT;

  UPDATE public."protocol_diffusion_approvals" ap
  SET "valide_par" = lower(p."praticien_email")
  FROM public."patients" p
  WHERE p."id_patient" = ap."id_patient"
    AND btrim(p."praticien_email", E' \t\r\n') <> '';
  GET DIAGNOSTICS a = ROW_COUNT;

  RETURN QUERY SELECT v, a;
END;
$$;

COMMENT ON FUNCTION public.identite_auteur_protocoles_reprise() IS
  'Reprise unique de l''auteur déduit des versions relues et des approbations (migration 20261107230000, D-459 §4). Refuse au-delà d''un praticien, et dès qu''un auteur est posé : aucune seconde reprise. Conservée pour que son contrat puisse l''éprouver.';

-- Doctrine du dépôt : révoquer PUBLIC, puis nommément les rôles qui
-- existeraient (inerte sur la base du CI et sur Scalingo, où ils n'existent pas).
REVOKE EXECUTE ON FUNCTION public.identite_auteur_praticiens_distincts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.identite_auteur_protocoles_reprise() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.identite_auteur_praticiens_distincts() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.identite_auteur_protocoles_reprise() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.identite_auteur_praticiens_distincts() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.identite_auteur_protocoles_reprise() FROM authenticated;
  END IF;
END $$;

-- ── 4. Application ──────────────────────────────────────────────────────────
-- Les comptes rendus ne sont pas épinglés : ils se relisent en agrégats au
-- constat de la release-db (le 2026-11-07, 10 versions relues et 9
-- approbations, one-off-5223).
DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.identite_auteur_protocoles_reprise();
  RAISE NOTICE 'Reprise de l''auteur : % version(s) relue(s), % approbation(s).',
    r.versions_remplies, r.approbations_remplies;
END $$;
