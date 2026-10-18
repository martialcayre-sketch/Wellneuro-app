-- ai, lecture datée ([[D-297]] §1-§3, §6 ; fiche H51).
--
-- Une colonne de type date, VIDE PAR DÉFAUT, sur `portail_lectures_patient` :
-- le jour (heure de Paris) de la première ouverture d'une version remise.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS, ET POURQUOI :
--  — AUCUN `DEFAULT`. Un défaut en base daterait chaque lecture dès
--    l'application, avant que la phrase « Votre lecture est datée » ne soit
--    servie : [[D-297]] §4 l'interdit (« aucune date ne s'écrit depuis une page
--    qui ne sert pas cette phrase ; le texte et l'écriture de la date sont
--    livrés ensemble »). C'est le code de la seconde PR qui DEMANDE un jour ;
--    le trigger d'insertion, ici, en fixe la valeur (§2).
--  — AUCUN RATTRAPAGE. Les lectures existantes gardent une date vide ; le
--    praticien y lira « Lu, date non enregistrée » (§3). Sans `DEFAULT`,
--    `ADD COLUMN` ne remplit aucune ligne.
--  — Aucune ligne écrite, aucune contrainte touchée, aucune RLS changée (la
--    table porte déjà la sienne). Deux triggers, ci-dessous, sans effet sur
--    les lignes existantes.
ALTER TABLE "portail_lectures_patient" ADD COLUMN "lu_le" DATE;

-- ── LA BASE CHOISIT LE JOUR, LE CODE CHOISIT SEULEMENT S'IL DATE ────────────
-- (arbitrage du responsable du 2026-10-18, sur la revue de cette migration).
-- Les invariants de [[D-297]] — jour posé par l'horloge de la base (§2), jamais
-- mis à jour (§1), aucun rattrapage (§3) — sont gravés ici plutôt que confiés
-- au seul code. Toujours SANS défaut : une ligne écrite sans jour reste sans
-- jour (§4).

-- À l'insertion : toute date fournie est REMPLACÉE par le jour de Paris de
-- l'horloge de la base. Un appelant ne peut ni antidater ni postdater.
CREATE OR REPLACE FUNCTION public.portail_lectures_patient_lu_le_par_la_base()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.lu_le IS NOT NULL THEN
    NEW.lu_le := (clock_timestamp() AT TIME ZONE 'Europe/Paris')::date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER portail_lectures_patient_lu_le_insertion
  BEFORE INSERT ON public.portail_lectures_patient
  FOR EACH ROW EXECUTE FUNCTION public.portail_lectures_patient_lu_le_par_la_base();

-- À la mise à jour : le jour ne change JAMAIS — ni corrigé, ni posé après coup
-- sur une lecture antérieure (aucun rattrapage), ni effacé.
CREATE OR REPLACE FUNCTION public.portail_lectures_patient_lu_le_fige()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.lu_le IS DISTINCT FROM OLD.lu_le THEN
    RAISE EXCEPTION '% : le jour de première lecture ne se modifie pas (D-297 §1, §3).', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER portail_lectures_patient_lu_le_fige
  BEFORE UPDATE ON public.portail_lectures_patient
  FOR EACH ROW EXECUTE FUNCTION public.portail_lectures_patient_lu_le_fige();

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main. Tant que le code qui écrit le jour n'est pas
-- déployé, la colonne est vide partout : déployer d'abord un code qui ne la
-- sélectionne plus, puis supprimer les deux triggers et leurs fonctions, puis
-- `ALTER TABLE "portail_lectures_patient" DROP COLUMN "lu_le";`. Une fois des jours écrits, le retour exige d'abord une décision sur
-- eux (donnée déclarée au registre RGPD, [[D-297]] §6).
