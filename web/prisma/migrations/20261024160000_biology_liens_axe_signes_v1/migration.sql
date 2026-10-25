-- F79, second temps — les dix-sept liens analyte-axe signés (D-351 §4-§5).
--
-- Trois gestes, dans cet ordre :
--   1. `niveau_preuve` devient nullable (D-351 §4). Nul signifie « non
--      gradé » : aucun des dix-sept claims n'écrit de niveau, et en inscrire
--      un serait l'inventer. Le CHECK A-D reste tel quel : un CHECK évalué à
--      NULL passe, il ne juge donc que les valeurs non nulles ;
--   2. un trigger refuse le double lien nutriment/axe sur un même analyte
--      (D-348 §5, arbitrage du responsable du 2026-10-24) : un CHECK ne
--      compare pas deux lignes ;
--   3. les dix-sept liens du §2, en un seul bloc, donc tout ou rien.
--
-- RELU EN PRODUCTION LE 2026-10-24 (conteneur one-off-8486, lecture seule) :
-- 0 ligne dans la table ; les seize analytes présents et actifs ; les seize
-- claims distincts (WN-CL-0294-004 porte les liens 8 et 9) `VALIDE`, actifs,
-- non supplantés, en v1.0.
--
-- CORPUS VIDE = AUCUN LIEN (arbitrage du responsable du 2026-10-24). La base
-- du CI et les bases locales sont construites par `migrate deploy` seul et ne
-- portent aucun claim : la migration n'y écrit rien et le dit en NOTICE. Dès
-- qu'un corpus existe, c'est dix-sept liens ou l'échec de la migration
-- entière. Le chemin d'insertion est éprouvé avant la production par
-- `scripts/banc-rejeu-liens-axe-f79.test.mjs`, qui rejoue ce fichier sur des
-- claims de fixture dans une transaction annulée.
--
-- `schema.prisma` ne change que pour `niveauPreuve` (D-351 §4 vaut demande
-- explicite). Le trigger n'est pas modélisé par Prisma ; il est éprouvé par
-- `prisma/checks/biology_liens_axe_v1_negatif.sql`, et la liste exacte par
-- `prisma/checks/biology_liens_axe_v1.sql`.

-- ── 1. Niveau de preuve facultatif ─────────────────────────────────────────
ALTER TABLE "biology_analyte_links" ALTER COLUMN "niveau_preuve" DROP NOT NULL;

-- ── 2. Pas de double lien nutriment/axe (D-348 §5) ─────────────────────────
-- Seuls les liens actifs comptent : un lien désactivé ne sert plus. Le
-- verrou par analyte (ou par rapport) range l'un derrière l'autre deux
-- écrivains simultanés, qui sans lui passeraient tous deux le contrôle.
-- Le verrou ne suffit qu'en READ COMMITTED, où chaque instruction relit les
-- lignes validées : sous REPEATABLE READ ou SERIALIZABLE, l'instantané de la
-- seconde transaction précède la validation de la première, et le double
-- lien passerait (passe Codex de #1687). Ces isolations sont donc refusées
-- pour une écriture active nutriment ou axe (arbitrage du responsable du
-- 2026-10-24). Le refus et la sérialisation sont éprouvés à deux sessions
-- par `scripts/banc-rejeu-liens-axe-f79.test.mjs`.
CREATE OR REPLACE FUNCTION public.biology_analyte_links_nutriment_axe_exclusifs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.actif AND NEW.cible_type IN ('nutriment', 'axe') THEN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
      RAISE EXCEPTION 'D-348 §5 : lien % refusé sous l''isolation % — seule READ COMMITTED garantit l''exclusion nutriment/axe.',
        NEW.cible_type, current_setting('transaction_isolation');
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext(
      'biology_analyte_links:' || COALESCE(NEW.analyte_code, NEW.ratio_code)));
    IF EXISTS (
      SELECT 1 FROM public.biology_analyte_links l
      WHERE l.id <> NEW.id
        AND l.actif
        AND l.cible_type IN ('nutriment', 'axe')
        AND l.cible_type <> NEW.cible_type
        AND (l.analyte_code = NEW.analyte_code OR l.ratio_code = NEW.ratio_code)
    ) THEN
      RAISE EXCEPTION 'D-348 §5 : % porte déjà un lien actif de l''autre cible (nutriment/axe), lien % refusé.',
        COALESCE(NEW.analyte_code, NEW.ratio_code), NEW.cible_type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER biology_analyte_links_nutriment_axe_exclusifs
  BEFORE INSERT OR UPDATE OF analyte_code, ratio_code, cible_type, actif
  ON public.biology_analyte_links
  FOR EACH ROW EXECUTE FUNCTION public.biology_analyte_links_nutriment_axe_exclusifs();

-- ── 3. Les dix-sept liens (D-351 §2) ───────────────────────────────────────
-- Un seul bloc, donc une seule instruction : si le compte n'est pas atteint,
-- aucune ligne ne reste. Un lien n'entre que si son claim est `VALIDE`, actif,
-- non supplanté, en v1.0 (D-351 §1 et §5). Le texte des claims reste au
-- Claude Doc privé ; seuls les identifiants sont ici.
DO $$
DECLARE
  corpus_present boolean;
  nb integer;
BEGIN
  IF EXISTS (SELECT 1 FROM biology_analyte_links WHERE cible_type = 'axe') THEN
    RAISE EXCEPTION 'D-351 §5 : la table porte déjà des liens d''axe — la liste signée ne s''écrit que sur une cible vide.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM rag_corpus_claims) INTO corpus_present;

  INSERT INTO biology_analyte_links
      (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, niveau_preuve)
  SELECT l.id, l.analyte_code, 'axe', l.cible_code, l.direction, l.claim_id, 'v1.0', NULL
  FROM (VALUES
      ('bal_f79_01', 'BIO_HOMOCYSTEINE',     'methylation',               'WN-CL-0043-014', 'haut_evocateur'),
      ('bal_f79_02', 'BIO_CRP_US',           'inflammation',              'WN-CL-0125-047', 'haut_evocateur'),
      ('bal_f79_03', 'BIO_RATIO_KYN_TRP',    'inflammation',              'WN-CL-0293-013', 'haut_evocateur'),
      ('bal_f79_04', 'BIO_ANTI_LDL_OXYDE',   'stress_oxydant',            'WN-CL-0161-070', 'haut_evocateur'),
      ('bal_f79_05', 'BIO_COENZYME_Q10',     'energie_mitochondriale',    'WN-CL-0161-081', 'bas_evocateur'),
      ('bal_f79_06', 'BIO_RATIO_HOMA',       'regulation_glycemique',     'WN-CL-0390-010', 'haut_evocateur'),
      ('bal_f79_07', 'BIO_GLYCEMIE_JEUN',    'regulation_glycemique',     'WN-CL-0025-010', 'haut_evocateur'),
      ('bal_f79_08', 'BIO_INDEX_OMEGA3',     'acides_gras_polyinsatures', 'WN-CL-0294-004', 'bas_evocateur'),
      ('bal_f79_09', 'BIO_RATIO_AA_EPA',     'acides_gras_polyinsatures', 'WN-CL-0294-004', 'haut_evocateur'),
      ('bal_f79_10', 'BIO_TSH_US',           'thyreotrope',               'WN-CL-0110-012', 'haut_evocateur'),
      ('bal_f79_11', 'BIO_CAR',              'corticotrope',              'WN-CL-0107-031', 'hors_plage_evocateur'),
      ('bal_f79_12', 'BIO_CORTISOL_8H_20H',  'corticotrope',              'WN-CL-0107-033', 'haut_evocateur'),
      ('bal_f79_13', 'BIO_ALPHA_AMYLASE',    'corticotrope',              'WN-CL-0042-005', 'hors_plage_evocateur'),
      ('bal_f79_14', 'BIO_LBP',              'barriere_intestinale',      'WN-CL-0125-046', 'haut_evocateur'),
      ('bal_f79_15', 'BIO_BETA_DEFENSINE_2', 'barriere_intestinale',      'WN-CL-0043-030', 'haut_evocateur'),
      ('bal_f79_16', 'BIO_RATIO_KYN_TRP',    'microbiote_cerveau',        'WN-CL-0041-061', 'haut_evocateur'),
      ('bal_f79_17', 'BIO_AGCC_FECAUX',      'microbiote_cerveau',        'WN-CL-0291-015', 'hors_plage_evocateur')
  ) AS l(id, analyte_code, cible_code, claim_id, direction)
  WHERE EXISTS (
      SELECT 1 FROM rag_corpus_claims c
      WHERE c.claim_id = l.claim_id
        AND c.version_claim = 'v1.0'
        AND c.statut = 'VALIDE'
        AND c.active
        AND c.superseded_at IS NULL);

  GET DIAGNOSTICS nb = ROW_COUNT;

  IF corpus_present AND nb <> 17 THEN
    RAISE EXCEPTION 'D-351 §5 : % lien(s) sur 17 — un claim n''est plus VALIDE, actif, non supplanté en v1.0 ; aucun lien n''est écrit.', nb;
  END IF;

  RAISE NOTICE 'D-351 : % lien(s) analyte-axe inséré(s) sur 17 attendus en production (0 attendu sur une base sans corpus).', nb;
END $$;
