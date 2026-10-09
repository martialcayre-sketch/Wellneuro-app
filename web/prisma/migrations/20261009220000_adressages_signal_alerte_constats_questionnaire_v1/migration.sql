-- SIGNAL D'ALERTE ADRESSÉ — UNE LETTRE COUVRE AUSSI LES CONSTATS DE
-- QUESTIONNAIRE ([[D-275]] §2, LOT-2 de la précision de mise en œuvre).
--
-- Migration demandée explicitement par le responsable le 2026-10-09 (LOT-2 du
-- plan de D-275 §2-§3). MIGRATION SEULE ([[D-087]]) : aucun code ne produit
-- encore de constat de questionnaire, aucun code n'en couvre. Le producteur,
-- sa table signée et la lettre étendue (LOT-3) ne viendront qu'après
-- l'application CONSTATÉE par conteneur.
--
-- ── POURQUOI AVANT LE PRODUCTEUR ───────────────────────────────────────────
--
-- La levée est allumée en production (`WN_LEVEE_ADRESSAGE`), et [[D-257]] A7
-- fait de la lettre la SEULE levée d'un constat `adressage`. Le trigger de
-- `adressages_signal_alerte_v1` n'accepte que `safety:anamnese:` : un constat
-- de questionnaire actif avant cette migration bloquerait un dossier qu'aucune
-- lettre ne pourrait plus débloquer.
--
-- ── CE QUI CHANGE ──────────────────────────────────────────────────────────
--
-- Reprise de la fonction de `adressages_signal_alerte_v1`. Deux changements,
-- rien d'autre :
--
--  1. LE PRÉFIXE : `safety:questionnaire:` + 16 hexadécimaux rejoint
--     `safety:anamnese:`. La forme reste aussi stricte (minuscules, longueur
--     exacte, ancrée aux deux bouts). Un constat d'EFFET INDÉSIRABLE reste
--     refusé ([[D-257]] §7) : sa levée n'est pas une lettre.
--  2. LE TRI DE LA PORTEUSE devient total : `k.id DESC` en troisième terme,
--     comme `ORDRE_CONSULTATION_PORTEUSE` depuis la revue Codex de #1373.
--     Deux consultations aux deux mêmes dates laissaient le trigger retenir
--     une autre porteuse que l'application, et refuser la lettre que la
--     route venait de consigner. Seul ce cas d'égalité change de résultat.
--
-- Le message du refus de forme garde son début (« n'est pas un constat de
-- signal d'anamnèse ») : le contrat v1 le cherche par sous-chaîne et reste
-- valable tel quel.
--
-- Le trigger `adressages_signal_alerte_avant_insertion` reste branché sur la
-- fonction remplacée ; ses droits révoqués sont conservés par CREATE OR
-- REPLACE (contrat v1, promesse 17).

CREATE OR REPLACE FUNCTION public.adressages_signal_alerte_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  lettre_patient text;
  lettre_sens text;
  lettre_ancrage text;
  lettre_xmin text;
  porteuse text;
  cible_patient text;
  cible_acte text;
  constat text;
BEGIN
  IF NEW.acte = 'adressage' THEN
    SELECT c.id_patient, c.sens, c.ancrage_version, c.xmin::text
      INTO lettre_patient, lettre_sens, lettre_ancrage, lettre_xmin
    FROM public.correspondances_medecin c
    WHERE c.id = NEW.id_correspondance;
    IF lettre_patient IS DISTINCT FROM NEW.id_patient
       OR lettre_sens IS DISTINCT FROM 'sortant'
       OR lettre_ancrage IS NULL
       OR lettre_ancrage NOT LIKE 'safety-signals-%' THEN
      RAISE EXCEPTION 'adressage refusé : la correspondance % n''est pas une lettre d''adressage de ce dossier.', NEW.id_correspondance;
    END IF;

    -- `txid_current()` porte l'époque : ses 32 bits bas sont l'identifiant
    -- de la transaction de haut niveau, celui que porte `xmin`.
    IF lettre_xmin IS DISTINCT FROM (txid_current() % 4294967296)::text THEN
      RAISE EXCEPTION 'adressage refusé : la lettre % n''a pas été consignée dans cette transaction.', NEW.id_correspondance;
    END IF;

    SELECT k.id INTO porteuse
    FROM public.consultations k
    WHERE k.id_patient = NEW.id_patient
      AND k.statut = 'validee'
      AND k.anamnese IS NOT NULL
    ORDER BY k.date_validation DESC, k.created_at DESC, k.id DESC
    LIMIT 1;
    IF porteuse IS DISTINCT FROM NEW.id_consultation THEN
      RAISE EXCEPTION 'adressage refusé : la consultation % n''est pas la consultation porteuse de ce dossier.', NEW.id_consultation;
    END IF;

    -- Une couverture absente, vide ou multidimensionnelle est refusée par le
    -- CHECK `forme_adressage` ; elle ne se parcourt pas ici, où FOREACH
    -- échouerait sur un message qui ne dit rien du refus.
    IF NEW.finding_ids IS NOT NULL AND array_ndims(NEW.finding_ids) = 1 THEN
      IF array_position(NEW.finding_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'adressage refusé : un constat couvert est vide.';
      END IF;
      FOREACH constat IN ARRAY NEW.finding_ids LOOP
        IF constat !~ '^safety:(anamnese|questionnaire):[0-9a-f]{16}$' THEN
          RAISE EXCEPTION 'adressage refusé : % n''est pas un constat de signal d''anamnèse ou de questionnaire.', constat;
        END IF;
      END LOOP;
      IF (SELECT count(DISTINCT x) FROM unnest(NEW.finding_ids) AS x) <> cardinality(NEW.finding_ids) THEN
        RAISE EXCEPTION 'adressage refusé : un constat est couvert deux fois.';
      END IF;
    END IF;
  ELSIF NEW.acte = 'revocation' THEN
    SELECT a.id_patient, a.acte INTO cible_patient, cible_acte
    FROM public.adressages_signal_alerte a
    WHERE a.id = NEW.id_adressage_revoque;
    IF cible_patient IS DISTINCT FROM NEW.id_patient
       OR cible_acte IS DISTINCT FROM 'adressage' THEN
      RAISE EXCEPTION 'révocation refusée : % n''est pas un adressage de ce dossier.', NEW.id_adressage_revoque;
    END IF;
  END IF;
  -- Un acte inconnu passe ici sans refus : le CHECK `acte_check` le refuse
  -- ensuite. Le trigger ne double pas une garde déclarative.

  NEW.acte_le := clock_timestamp() AT TIME ZONE 'UTC';
  NEW.ordre := nextval(pg_get_serial_sequence('public.adressages_signal_alerte', 'ordre'));
  RETURN NEW;
END;
$$;

-- RETOUR ARRIÈRE : par une migration compensatrice relue et approuvée
-- (`release-db`), jamais à la main, et dans cet ordre :
--  1. retirer d'abord le producteur de constats de questionnaire (LOT-3) s'il
--     est livré — sinon le retour recrée le blocage sans issue que cette
--     migration ferme ;
--  2. ne restaurer QUE la regex `^safety:anamnese:[0-9a-f]{16}$` : rejouer la
--     fonction v1 telle quelle retirerait aussi `k.id DESC` et rouvrirait
--     l'écart avec `ORDRE_CONSULTATION_PORTEUSE`.
-- Une couverture de questionnaire déjà écrite resterait en place : l'ancienne
-- fonction ne juge que l'insertion.
