-- Contrat du compteur de « Voir les sources et limites » ([[D-191]]).
--
-- CE FICHIER GARDE UNE ABSENCE, ET C'EST INHABITUEL. Les autres contrats de ce
-- répertoire éprouvent ce qu'une table PROMET. Celui-ci éprouve surtout ce
-- qu'elle s'interdit de POUVOIR DIRE : la décision affirme que « ce praticien
-- n'ouvre jamais les limitations » est une phrase que le dépôt est incapable de
-- produire, et cette affirmation ne tient que par la FORME de la table.
--
-- Sans le cas 1 ci-dessous, une migration future ajouterait `id_patient` ou
-- `praticien_email` sans qu'aucun banc ne bronche, et `D-191` deviendrait faux
-- en silence — exactement ce qui est arrivé à `D-185`, dont l'affirmation
-- centrale a vécu une journée sur `main` sans être vraie.
--
-- Six choses éprouvées :
--   1. la table porte EXACTEMENT trois colonnes, liste blanche — une colonne
--      identifiante arrivée sans arbitrage se verrait ICI et nulle part ailleurs ;
--   2. l'espèce est FERMÉE : ce qui compte comme un geste mesuré est un
--      arbitrage, pas un champ libre. Sans le CHECK, une surface pourrait
--      inscrire « connexion » ou « duree », et la table deviendrait le journal
--      de présence que la décision s'interdit ;
--   3. le compte ne DESCEND pas. La table ne garde aucun événement qui
--      permettrait de reconstituer un décrément fautif : il doit être refusé,
--      pas rattrapé ;
--   4. l'incrément concurrent est ATOMIQUE — deux `ON CONFLICT DO UPDATE` sur
--      la même clé donnent 2, jamais 1. Un compteur qui sous-compte en silence
--      est pire qu'un compteur absent : il a l'air de fonctionner ;
--   5. la clé primaire est bien `(jour, espece)` : une seconde ligne sur le même
--      couple est REFUSÉE. Sans elle, la table s'empilerait, et empiler
--      FABRIQUERAIT la granularité par événement que la décision refuse ;
--   6. la RLS deny-all est active et sans policy (posture `D-005`).
--
-- PAS DE CLÉ ÉTRANGÈRE À ÉPROUVER, et c'est la conséquence directe du cas 1 :
-- la table ne référence aucun dossier, donc `patient/effacement.ts` n'a rien à
-- y faire. Le cas 1 garde aussi cette absence-là.
--
-- Tout se déroule dans une transaction annulée à la fin : rien ne survit.

BEGIN;

DO $$
DECLARE
  colonnes text[];
  refuse boolean;
  valeur integer;
  nb integer;
BEGIN
  -- ── 1. LISTE BLANCHE DE COLONNES — le cas central ────────────────────────
  SELECT array_agg(column_name::text ORDER BY column_name)
    INTO colonnes
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'compteur_ouverture_sources';

  IF colonnes IS DISTINCT FROM ARRAY['compte','espece','jour'] THEN
    RAISE EXCEPTION
      'compteur_ouverture_sources porte % au lieu des trois colonnes déclarées. '
      'Une colonne identifiante (id_patient, praticien_email, un instant) rendrait '
      'FAUSSE l''affirmation centrale de D-191 : que cette table est structurellement '
      'incapable de dire QUI a ouvert QUOI et QUAND. Toute colonne neuve est un arbitrage.',
      colonnes;
  END IF;

  -- ── 2. L'ESPÈCE EST FERMÉE ───────────────────────────────────────────────
  BEGIN
    INSERT INTO compteur_ouverture_sources (jour, espece, compte)
    VALUES (DATE '2026-09-15', 'connexion', 1);
    refuse := false;
  EXCEPTION WHEN check_violation THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'l''espèce « connexion » a été ACCEPTÉE : la table peut devenir un journal de présence.';
  END IF;

  -- Les deux espèces légitimes passent — sans ce contrôle, un CHECK trop
  -- strict rendrait le cas précédent vert pour la mauvaise raison.
  INSERT INTO compteur_ouverture_sources (jour, espece, compte) VALUES (DATE '2026-09-15', 'affichage', 1);
  INSERT INTO compteur_ouverture_sources (jour, espece, compte) VALUES (DATE '2026-09-15', 'ouverture', 1);

  -- ── 3. LE COMPTE NE DESCEND PAS ──────────────────────────────────────────
  BEGIN
    UPDATE compteur_ouverture_sources SET compte = -1
     WHERE jour = DATE '2026-09-15' AND espece = 'affichage';
    refuse := false;
  EXCEPTION WHEN check_violation THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'un compte négatif a été ACCEPTÉ : aucun événement conservé ne permettrait de le reconstituer.';
  END IF;

  -- ── 4. L'INCRÉMENT EST ATOMIQUE ──────────────────────────────────────────
  INSERT INTO compteur_ouverture_sources (jour, espece, compte) VALUES (DATE '2026-09-16', 'ouverture', 1)
    ON CONFLICT (jour, espece) DO UPDATE SET compte = compteur_ouverture_sources.compte + 1;
  INSERT INTO compteur_ouverture_sources (jour, espece, compte) VALUES (DATE '2026-09-16', 'ouverture', 1)
    ON CONFLICT (jour, espece) DO UPDATE SET compte = compteur_ouverture_sources.compte + 1;

  SELECT compte INTO valeur FROM compteur_ouverture_sources
   WHERE jour = DATE '2026-09-16' AND espece = 'ouverture';
  IF valeur IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'deux incréments ont donné % au lieu de 2 : le compteur sous-compte en silence.', valeur;
  END IF;

  -- ── 5. LA CLÉ PRIMAIRE EMPÊCHE D'EMPILER ─────────────────────────────────
  BEGIN
    INSERT INTO compteur_ouverture_sources (jour, espece, compte) VALUES (DATE '2026-09-15', 'affichage', 1);
    refuse := false;
  EXCEPTION WHEN unique_violation THEN
    refuse := true;
  END;
  IF NOT refuse THEN
    RAISE EXCEPTION 'une SECONDE ligne (jour, espece) a été acceptée : la table s''empile, donc elle redevient un journal par événement.';
  END IF;

  -- ── 6. RLS DENY-ALL, SANS POLICY ─────────────────────────────────────────
  SELECT count(*) INTO nb FROM pg_class
   WHERE relname = 'compteur_ouverture_sources' AND relnamespace = 'public'::regnamespace AND relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'RLS non activée sur compteur_ouverture_sources (posture D-005).';
  END IF;

  SELECT count(*) INTO nb FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'compteur_ouverture_sources';
  IF nb <> 0 THEN
    RAISE EXCEPTION '% policy(ies) sur compteur_ouverture_sources : la posture D-005 est deny-all SANS policy.', nb;
  END IF;
END $$;

ROLLBACK;
