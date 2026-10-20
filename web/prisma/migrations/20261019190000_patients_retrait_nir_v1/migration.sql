-- Dossier administratif : retrait de la colonne `nir` (dette t03, H26 (g), D-284).
--
-- Le NIR déclaré n'a plus de lecteur : l'écran ne le saisit plus, l'export a
-- cessé de le lire (#1567), et aucune ligne de production ne le porte (constat
-- par conteneur en lecture seule, 2026-10-19, refait avant la release). La
-- colonne retirée, il n'y a plus de numéro de sécurité sociale à protéger,
-- exporter ou effacer dans `patients`.
--
-- La contrainte de forme `patients_nir_forme` part avec la colonne (Postgres
-- retire les CHECK qui ne portent que sur elle). Les trois autres colonnes du
-- dossier administratif et la RLS de `patients` ne bougent pas.
--
-- LE CONSTAT DEVIENT UNE GARANTIE : la suppression est irréversible, et elle
-- ne s'appuyait que sur un re-constat manuel. Si une ligne porte encore un NIR
-- au moment de l'application, la migration échoue et rien n'est supprimé
-- (revue `wn-reviewer`, P2-1).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "patients" WHERE "nir" IS NOT NULL) THEN
    RAISE EXCEPTION 'Retrait du NIR refusé : au moins un dossier porte encore un NIR.';
  END IF;
END $$;

ALTER TABLE "patients" DROP COLUMN "nir";
