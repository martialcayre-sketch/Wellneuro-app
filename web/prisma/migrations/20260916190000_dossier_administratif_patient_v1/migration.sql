-- Le rayon Patients — LES QUATRE RENSEIGNEMENTS QUI N'EXISTAIENT NULLE PART :
-- adresse postale, NIR, nom et coordonnées du médecin traitant.
--
-- Demande explicite du responsable, formulée en session le 2026-09-16 :
-- « pouvoir modifier toutes les données écrites lors de la création d'une
-- nouvelle fiche patient […] ajouter adresse, NIR sécurité sociale, nom et
-- coordonnées du médecin traitant ». Gate humain : revue + go avant merge,
-- puis `release-db` approuvée et CONSTATÉE par conteneur — `D-087`. Aucun code
-- consommateur ne part avec elle.
--
-- ADDITIVE UNIQUEMENT : quatre colonnes nullables, quatre contraintes. Aucun
-- DROP, aucun renommage, aucun backfill, aucune colonne existante modifiée.
-- Les lignes de production les portent toutes à NULL et satisfont les quatre.
--
-- LE SEUL MÉDECIN DU SCHÉMA ÉTAIT JUSQU'ICI `correspondances_medecin.
-- medecin_libelle` — un texte libre PAR LETTRE, saisi à chaque courrier, et
-- jamais un médecin attaché au dossier. Deux courriers au même patient
-- pouvaient nommer deux médecins sans que rien ne les distingue. Ces deux
-- colonnes-ci portent le médecin TRAITANT, une propriété du dossier.
--
-- CE QUE CETTE MIGRATION N'EST PAS. Elle ne qualifie pas le NIR au titre de
-- l'article 9 du RGPD : cette qualification appartient au responsable de
-- traitement, et `docs/DOSSIER_RGPD.md` refuse explicitement de la poser dans
-- le code. La rubrique 5 est mise à jour dans la même PR pour DÉCLARER les
-- trois catégories nouvelles et dire que la qualification reste due.
--
-- AUCUN CHIFFREMENT APPLICATIF, et c'est un choix, pas un oubli (arbitrage du
-- responsable, 2026-09-16). Le dépôt n'en porte aucun ; en introduire un pour
-- un seul champ créerait une gestion de clés sans précédent, et rendrait le
-- NIR ni recherchable ni récupérable en cas de perte de clé. Ce qui protège
-- ces colonnes est ce qui protège déjà tout le dossier : base HDS, RLS
-- deny-all, garde d'appartenance applicative, journal des accès praticien.

ALTER TABLE "patients"
  ADD COLUMN "adresse" TEXT,
  ADD COLUMN "nir" TEXT,
  ADD COLUMN "medecin_traitant_nom" TEXT,
  ADD COLUMN "medecin_traitant_coordonnees" TEXT;

-- LA FORME DU NIR, ET ELLE SEULE. Quinze caractères :
--   sexe (1) · année (2) · mois (2) · département (2) · commune (3) ·
--   ordre (3) · clé (2)
-- Le département admet `2A` et `2B` — la Corse, seul endroit où le NIR porte
-- une lettre. Sans cette alternative, un assuré corse serait refusé par la
-- base, et le refus serait incompréhensible côté écran.
--
-- LA CLÉ DE CONTRÔLE NE SE VÉRIFIE PAS ICI. Elle vaut `97 − (n mod 97)`, avec
-- `2A` → 19 et `2B` → 18 par substitution : un calcul modulaire en contrainte
-- SQL serait illisible, non testable unitairement, et impossible à faire
-- évoluer sans migration. Il vit côté application, où un banc l'éprouve — et
-- le refus y est explicite plutôt que rendu comme une violation de contrainte.
--
-- CETTE COLONNE N'EST PAS UNIQUE, et ce n'est pas un oubli : deux dossiers
-- créés par erreur pour la même personne doivent pouvoir coexister le temps
-- qu'on les réconcilie. Un index unique transformerait cette erreur de saisie
-- en 23505 opaque au milieu d'un formulaire.
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_nir_forme"
    CHECK ("nir" IS NULL OR "nir" ~ '^[0-9]{5}(2[AB]|[0-9]{2})[0-9]{8}$');

-- NI VIDE, NI DÉMESURÉE. `btrim/2` et non `btrim/1` : le second ne retire que
-- l'espace ASCII, et une tabulation seule passerait pour une adresse.
-- Une colonne nullable dont la valeur peut être `'   '` offre DEUX façons de
-- dire « rien », et l'écran ne saurait pas laquelle lire.
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_adresse_non_vide"
    CHECK (
      "adresse" IS NULL
      OR (btrim("adresse", E' \t\r\n') <> '' AND char_length("adresse") <= 500)
    );

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_medecin_traitant_nom_non_vide"
    CHECK (
      "medecin_traitant_nom" IS NULL
      OR (btrim("medecin_traitant_nom", E' \t\r\n') <> '' AND char_length("medecin_traitant_nom") <= 200)
    );

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_medecin_traitant_coordonnees_non_vide"
    CHECK (
      "medecin_traitant_coordonnees" IS NULL
      OR (
        btrim("medecin_traitant_coordonnees", E' \t\r\n') <> ''
        AND char_length("medecin_traitant_coordonnees") <= 500
      )
    );
