-- F79, renvoi du dossier polyphénols et antioxydants — le marqueur
-- `BIO_ANTI_LDL_OXYDE` sort du lien d'axe et des panels (D-465).
--
-- Deux gestes de données, dans un seul bloc, donc tout ou rien :
--   1. le lien `bal_f79_04` (`BIO_ANTI_LDL_OXYDE` → `stress_oxydant`,
--      WN-CL-0161-070) passe à `actif = false` (D-465 §1). La ligne reste :
--      son historique se conserve, et le code ne lit que les liens actifs
--      (`catalogue.ts`). Les seize autres liens de D-351 §2 ne bougent pas ;
--   2. le marqueur sort des deux panels qui le portent (D-465 §2) :
--      `PANEL_NEURODEG_1` (rang 5) et `PANEL_METABOLIQUE_1` (rang 7). Les
--      autres items gardent leur rang ; un trou de rang ne change pas l'ordre.
--
-- RELU EN PRODUCTION LE 2026-11-08 (conteneur one-off, lecture seule) : 17
-- liens d'axe, tous actifs, dont `bal_f79_04` ; le marqueur dans ces deux
-- panels seulement ; aucun résultat saisi pour lui.
--
-- CORPUS VIDE = AUCUN LIEN (D-351 §6). Sur une base sans corpus (CI, bases
-- locales), la cible `axe` est vide : le geste 1 n'a rien à faire et la
-- migration le dit en NOTICE. Dès qu'un lien d'axe existe, `bal_f79_04` doit
-- être là, actif et conforme, ou la migration entière échoue. Le chemin est
-- éprouvé par `scripts/banc-rejeu-liens-axe-f79.test.mjs`, qui rejoue les deux
-- migrations sur des claims de fixture.
--
-- Le lien se compare sur TOUTES ses colonnes de contenu (niveau de preuve nul
-- compris, D-351 §4). Les items de panel n'ont pas de colonne `actif` : ils
-- se suppriment par identifiant ET contenu complet (panel, analyte, ratio nul,
-- rang), et le compte doit être exactement deux — un item déplacé arrête tout
-- (contre-revue Codex F79, P1-1). Les
-- documents patient et courriers déjà émis gardent leur texte (append-only,
-- D-465 §2). Le rejet de WN-CL-0161-070 n'est PAS écrit ici : c'est un acte
-- du responsable dans l'atelier, après la release (D-465 §4).
--
-- Aucun changement de `schema.prisma`. Contrats : `biology_liens_axe_v1.sql`
-- (liste exacte, à double état selon cette migration) et
-- `cb_catalogue_niveau_1_donnees.sql` (76 items).
DO $$
DECLARE
  nb integer;
BEGIN
  -- ── 1. Le lien d'axe du marqueur (D-465 §1) ─────────────────────────────
  UPDATE biology_analyte_links
  SET actif = false
  WHERE id = 'bal_f79_04'
    AND analyte_code = 'BIO_ANTI_LDL_OXYDE'
    AND ratio_code IS NULL
    AND cible_type = 'axe'
    AND cible_code = 'stress_oxydant'
    AND direction = 'haut_evocateur'
    AND claim_id = 'WN-CL-0161-070'
    AND version_claim = 'v1.0'
    AND niveau_preuve IS NULL
    AND actif;

  GET DIAGNOSTICS nb = ROW_COUNT;

  IF EXISTS (SELECT 1 FROM biology_analyte_links WHERE cible_type = 'axe') THEN
    IF nb <> 1 THEN
      RAISE EXCEPTION 'D-465 §1 : % lien(s) désactivé(s) au lieu de 1 — bal_f79_04 absent, déjà inactif ou modifié ; rien n''est écrit.', nb;
    END IF;
    IF EXISTS (
      SELECT 1 FROM biology_analyte_links
      WHERE analyte_code = 'BIO_ANTI_LDL_OXYDE' AND actif) THEN
      RAISE EXCEPTION 'D-465 §1 : le marqueur porte encore un lien actif ; rien n''est écrit.';
    END IF;
  ELSE
    RAISE NOTICE 'D-465 : base sans lien d''axe, aucun lien à désactiver (attendu sans corpus).';
  END IF;

  -- ── 2. Le marqueur sort des deux panels (D-465 §2) ──────────────────────
  DELETE FROM biology_panel_items
  WHERE (id, panel_code, analyte_code, position) IN (
      ('biopi_neurodeg_1_05',    'PANEL_NEURODEG_1',    'BIO_ANTI_LDL_OXYDE', 5),
      ('biopi_metabolique_1_07', 'PANEL_METABOLIQUE_1', 'BIO_ANTI_LDL_OXYDE', 7))
    AND ratio_code IS NULL;

  GET DIAGNOSTICS nb = ROW_COUNT;

  IF nb <> 2 THEN
    RAISE EXCEPTION 'D-465 §2 : % item(s) de panel retiré(s) au lieu de 2 ; rien n''est écrit.', nb;
  END IF;

  IF EXISTS (SELECT 1 FROM biology_panel_items WHERE analyte_code = 'BIO_ANTI_LDL_OXYDE') THEN
    RAISE EXCEPTION 'D-465 §2 : le marqueur figure encore dans un panel ; rien n''est écrit.';
  END IF;

  RAISE NOTICE 'D-465 : marqueur retiré des deux panels ; lien d''axe désactivé s''il existait.';
END $$;
