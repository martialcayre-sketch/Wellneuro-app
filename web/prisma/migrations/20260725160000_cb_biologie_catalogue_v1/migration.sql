-- Catalogue de biologie fonctionnelle CB-A (campagne CB, LOT CB-01).
-- Cadrage : docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/
-- Audit de la source : .../AUDIT-SOURCE-NABM.md
-- Revue adversariale du 2026-07-25 : B1-B4 corrigés ici (voir en regard).
--
-- ADDITIVE UNIQUEMENT : onze tables nouvelles, aucune table existante
-- modifiée, aucun DROP, aucun renommage, aucun backfill. L'absence de ligne
-- signifie « catalogue vide », qui est l'état actuel et l'état attendu à la
-- sortie de ce lot : CB-01 ne remplit rien, il ouvre la place. Rollback =
-- abandon des onze tables.
--
-- VERROU HDS — CE QUE CES TABLES NE PEUVENT PAS PORTER : aucune valeur
-- biologique patient, aucun identifiant patient. Pas une seule colonne de ce
-- lot ne référence `patients`. L'étage 2 (résultats réels) est un lot distinct
-- (CB-09), gardé par un second flag WN_CB_RESULTS_ENABLED et conditionné à
-- l'attestation HDS. Ce n'est plus « la revue doit l'attraper » : le contrat
-- `prisma/checks/cb_biologie_catalogue_v1.sql`, exécuté en CI, échoue si une
-- colonne `biology_*` prend un nom de donnée patient ou une FK vers `patients`.
--
-- SÉPARATION CENTRALE (conséquence de l'audit) : la nomenclature n'est pas
-- l'ossature du catalogue. `biology_nabm_actes` reçoit les actes verbatim —
-- matière administrative, sans aucune donnée clinique, la source n'en portant
-- aucune. `biology_analytes` est le pivot clinique, alimenté par le praticien
-- et le corpus. Le rapprochement entre les deux est MANUEL et SIGNÉ : le
-- filtre de la source rend des faux négatifs silencieux (« PEROXYDASE » ne
-- trouve pas l'acte 1487 qui existe), un rapprochement par libellé produirait
-- un catalogue faux sans le signaler.
--
-- VOCABULAIRE D'UNITÉS : défini une fois, appliqué TROIS fois — sur l'analyte
-- et sur les DEUX tables de plages. Le poser sur le seul analyte laissait les
-- plages libres alors que ce sont elles qui se comparent entre elles (défaut
-- B4 de la revue) : une plage labo en 'ng/mL' et une plage fonctionnelle en
-- 'µg/L' s'afficheraient côte à côte, chiffres bruts, sans rien signaler.

-- ─── Pivot clinique ────────────────────────────────────────────────────────
CREATE TABLE "biology_analytes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelle_patient" TEXT,
    "unite" TEXT,
    "type_prelevement" TEXT NOT NULL,
    "delai_rendu_indicatif" TEXT,
    "source_provenance" TEXT NOT NULL,
    "source_identifiant" TEXT,
    "statut_fiche" TEXT NOT NULL DEFAULT 'importee',
    "niveau_completude" TEXT NOT NULL,
    "contenu_sha256" TEXT,
    "donnees_manquantes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incertitudes" TEXT,
    "verifie_par" TEXT,
    "verifie_le" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biology_analytes_pkey" PRIMARY KEY ("id"),
    -- Forme du code imposée : sans elle, 'FERRITINE' et 'ferritine' sont deux
    -- pivots distincts, chacun avec ses plages et ses correspondances — deux
    -- fiches concurrentes sans aucun signal (Y2 de la revue).
    CONSTRAINT "biology_analytes_code_format_check"
        CHECK ("code" ~ '^BIO_[A-Z0-9_]{2,60}$'),
    CONSTRAINT "biology_analytes_statut_fiche_check"
        CHECK ("statut_fiche" IN ('importee', 'verifiee', 'inactive')),
    CONSTRAINT "biology_analytes_niveau_completude_check"
        CHECK ("niveau_completude" IN ('bien_documentee', 'partielle', 'lacunaire')),
    -- Vocabulaire fermé de provenance (patron C4 R-5). Une nouvelle source =
    -- une migration additive élargissant ce CHECK. `nabm_smt_ans` et non
    -- `nabm_ameli` : la source retenue est le Serveur Multi-Terminologies de
    -- l'ANS, seul à publier des conditions de réutilisation (Licence Ouverte
    -- v2) ; le portail ameli n'en affiche aucune.
    CONSTRAINT "biology_analytes_source_provenance_check"
        CHECK ("source_provenance" IN ('nabm_smt_ans', 'labo', 'saisie_praticien')),
    CONSTRAINT "biology_analytes_type_prelevement_check"
        CHECK ("type_prelevement" IN ('sang', 'urine', 'selles', 'salive',
                                      'cheveux', 'souffle', 'autre')),
    -- NULLABLE à dessein — la nomenclature ne porte AUCUNE unité (audit §4) :
    -- un analyte importé arrive sans unité et l'annonce par
    -- `donnees_manquantes`, plutôt que d'en inventer une.
    CONSTRAINT "biology_analytes_unite_check"
        CHECK ("unite" IS NULL OR "unite" IN (
            'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
            'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
            'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
            'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g',
            '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score')),
    CONSTRAINT "biology_analytes_contenu_sha256_check"
        CHECK ("contenu_sha256" IS NULL OR "contenu_sha256" ~ '^[a-f0-9]{64}$'),
    -- Une fiche vérifiée porte obligatoirement signataire et date (même motif
    -- que valide_signe sur rag_corpus_claims et fiche_verifiee_signee sur C4).
    CONSTRAINT "biology_analytes_fiche_verifiee_signee_check"
        CHECK ("statut_fiche" <> 'verifiee'
               OR ("verifie_par" IS NOT NULL AND "verifie_le" IS NOT NULL))
);

-- ─── Nomenclature importée (destination de l'import CB-02a) ────────────────
CREATE TABLE "biology_nabm_actes" (
    "id" TEXT NOT NULL,
    "code_acte" TEXT NOT NULL,
    "version_source" TEXT NOT NULL,
    "version_publiee_le" TIMESTAMP(3),
    "libelle" TEXT NOT NULL,
    "coefficient_b" INTEGER,
    "code_parent" TEXT,
    "entente_prealable" BOOLEAN,
    "examen_sanguin" BOOLEAN,
    "indication_medicale" BOOLEAN,
    "nombre_max_par_facturation" INTEGER,
    "initiative_biologiste_possible" BOOLEAN,
    "rmo" BOOLEAN,
    "remboursement_total" BOOLEAN,
    "acte_reserve" BOOLEAN,
    "inactif" BOOLEAN NOT NULL DEFAULT false,
    "contenu_sha256" TEXT,
    "importe_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biology_nabm_actes_pkey" PRIMARY KEY ("id"),
    -- LE GARDE-FOU DE L'AUDIT §2, CORRIGÉ PAR LA MESURE DU 2026-07-25.
    -- La source rend 1050 concepts : 18 chapitres (codes à 1-2 chiffres),
    -- 33 sous-chapitres (forme 'CC-NN'), 11 nœuds de règle (noms), 987 actes
    -- (QUATRE CHIFFRES, zéro-paddés) — et le nœud racine « NABM », qui compte
    -- lui aussi quatre caractères. Un CHECK en '^[0-9A-Z]{4}$' laissait donc
    -- entrer la racine de la nomenclature comme s'il s'agissait d'une analyse :
    -- exactement la fiche fantôme que cette contrainte doit interdire.
    -- Mesure sur les 1050 concepts : les 987 actes sont TOUS purement
    -- numériques, aucun ne serait rejeté par ce motif.
    CONSTRAINT "biology_nabm_actes_code_acte_check"
        CHECK ("code_acte" ~ '^[0-9]{4}$'),
    -- Le code reste une CHAÎNE en base : le zéro de tête est signifiant
    -- ('0552' ≠ 552) et la source le publie comme tel.
    -- `coefficient_b` en INTEGER : la source le publie en `valueString`, mais
    -- la mesure des 987 actes ne rend aucune valeur non entière ni négative.
    -- L'import caste explicitement ; une valeur non entière doit le faire
    -- échouer bruyamment plutôt que d'être arrondie.
    CONSTRAINT "biology_nabm_actes_coefficient_b_check"
        CHECK ("coefficient_b" IS NULL OR "coefficient_b" >= 0),
    CONSTRAINT "biology_nabm_actes_nombre_max_check"
        CHECK ("nombre_max_par_facturation" IS NULL
               OR "nombre_max_par_facturation" >= 1),
    CONSTRAINT "biology_nabm_actes_contenu_sha256_check"
        CHECK ("contenu_sha256" IS NULL OR "contenu_sha256" ~ '^[a-f0-9]{64}$')
);

-- ─── Correspondance analyte ↔ acte, plusieurs-à-plusieurs et signée ────────
CREATE TABLE "biology_analyte_nabm" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "code_acte" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "commentaire" TEXT,
    "verifie_par" TEXT,
    "verifie_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_analyte_nabm_pkey" PRIMARY KEY ("id"),
    -- ANCRAGE SUR LE CODE D'ACTE, PAS SUR LA LIGNE DE MILLÉSIME (B2 de la
    -- revue). `biology_nabm_actes` porte une ligne par (code, version) : lier
    -- la correspondance à cette ligne aurait attaché la signature du praticien
    -- à V105. Au millésime suivant, ou bien la jointure naïve continuait de
    -- lire l'`inactif` périmé de V105, ou bien la jointure sur le pointeur de
    -- version ne trouvait plus rien et TOUT le catalogue basculait « non
    -- remboursé » — ce qui, via le §4 du cadrage, change le document que le
    -- patient reçoit. La signature porte donc sur le code, qui traverse les
    -- versions ; l'acte se résout au millésime courant. Conséquence assumée :
    -- pas de clé étrangère (le code seul n'est pas unique dans la table des
    -- actes, seul l'est le couple code+version) — le contrat SQL vérifie à la
    -- place que toute correspondance se résout dans la version courante.
    CONSTRAINT "biology_analyte_nabm_code_acte_check"
        CHECK ("code_acte" ~ '^[0-9]{4}$'),
    -- TROIS natures et non deux (B3 de la revue) : « groupe » confondait deux
    -- situations que l'audit §7 sépare, et dont la conséquence sur le
    -- remboursable est opposée.
    --   isole     : l'acte cote ce seul analyte (1208 = TSH).
    --   groupe_et : l'acte cote un ENSEMBLE, tous les analytes doivent être
    --               demandés ensemble (1211 = TSH + T4 libre). Proposer un seul
    --               membre ne rend pas l'acte cotable.
    --   groupe_ou : l'acte couvre un CHOIX, chaque analyte est individuellement
    --               couvert (1387 = folates sériques OU érythrocytaires).
    CONSTRAINT "biology_analyte_nabm_nature_check"
        CHECK ("nature" IN ('isole', 'groupe_et', 'groupe_ou')),
    -- Signature tout-ou-rien. Une ligne SANS signature est une PROPOSITION de
    -- rapprochement, pas une correspondance : le caractère remboursable d'un
    -- analyte se dérive des seules lignes signées. C'est pourquoi il n'existe
    -- pas de colonne `remboursable` sur l'analyte — un booléen stocké
    -- divergerait de la correspondance qui le fonde. La dérivation est écrite
    -- une seule fois, dans `web/src/lib/biology-library/remboursable.ts`.
    CONSTRAINT "biology_analyte_nabm_signature_check"
        CHECK (("verifie_par" IS NULL) = ("verifie_le" IS NULL))
);

-- ─── Référentiel 1/2 : valeurs de référence laboratoire ────────────────────
-- Porte SOIT un analyte SOIT un ratio (B1 de la revue) : le cadrage §3 exige
-- « mêmes deux référentiels de valeurs séparés » pour les ratios, et les
-- quatre exemples nommés (HOMA, ω6/ω3, Cu/Zn, saturation de la transferrine)
-- ont tous une plage. Les câbler plus tard aurait coûté une migration.
CREATE TABLE "biology_reference_ranges" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT,
    "ratio_code" TEXT,
    "borne_min" DOUBLE PRECISION,
    "borne_max" DOUBLE PRECISION,
    "unite" TEXT NOT NULL,
    "population" TEXT NOT NULL DEFAULT 'adulte_tout_venant',
    "source_libelle" TEXT NOT NULL,
    "source_url" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_reference_ranges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_reference_ranges_cible_unique_check"
        CHECK (("analyte_code" IS NOT NULL)::int + ("ratio_code" IS NOT NULL)::int = 1),
    -- Une plage sans aucune borne ne dit rien : au moins l'une des deux.
    CONSTRAINT "biology_reference_ranges_borne_presente_check"
        CHECK ("borne_min" IS NOT NULL OR "borne_max" IS NOT NULL),
    CONSTRAINT "biology_reference_ranges_borne_ordre_check"
        CHECK ("borne_min" IS NULL OR "borne_max" IS NULL
               OR "borne_min" <= "borne_max"),
    CONSTRAINT "biology_reference_ranges_population_check"
        CHECK ("population" IN ('adulte_tout_venant', 'femme', 'homme',
                                'enfant', 'grossesse', 'senior')),
    CONSTRAINT "biology_reference_ranges_unite_check"
        CHECK ("unite" IN (
            'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
            'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
            'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
            'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g',
            '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score'))
);

-- ─── Référentiel 2/2 : plages fonctionnelles, adossées à un claim validé ───
CREATE TABLE "biology_functional_ranges" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT,
    "ratio_code" TEXT,
    "borne_min" DOUBLE PRECISION,
    "borne_max" DOUBLE PRECISION,
    "unite" TEXT NOT NULL,
    "population" TEXT NOT NULL DEFAULT 'adulte_tout_venant',
    "claim_id" TEXT NOT NULL,
    "version_claim" TEXT NOT NULL,
    "niveau_preuve" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_functional_ranges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_functional_ranges_cible_unique_check"
        CHECK (("analyte_code" IS NOT NULL)::int + ("ratio_code" IS NOT NULL)::int = 1),
    -- INVARIANT MIROIR DE L'ORIENTATION. `claim_id` NOT NULL et non vide est
    -- la traduction en base de « une plage fonctionnelle sans claim validé
    -- n'est jamais servie » : la ligne ne peut pas exister sans sa source.
    -- CE QUE LA BASE NE PEUT PAS GARANTIR (M1 de la revue) : que le claim soit
    -- VALIDE, actif et toujours dans la version pointée. `rag_corpus_claims`
    -- est une table SQL-brut hors schema.prisma (prisma.config.ts) : aucune FK
    -- n'est possible, et `version_claim` fige une version qui peut être
    -- révisée ensuite. La réconciliation est donc un contrat exécuté en CI
    -- (`prisma/checks/cb_biologie_catalogue_v1.sql`), pas une promesse.
    CONSTRAINT "biology_functional_ranges_claim_non_vide_check"
        CHECK (btrim("claim_id") <> ''),
    CONSTRAINT "biology_functional_ranges_borne_presente_check"
        CHECK ("borne_min" IS NOT NULL OR "borne_max" IS NOT NULL),
    CONSTRAINT "biology_functional_ranges_borne_ordre_check"
        CHECK ("borne_min" IS NULL OR "borne_max" IS NULL
               OR "borne_min" <= "borne_max"),
    CONSTRAINT "biology_functional_ranges_population_check"
        CHECK ("population" IN ('adulte_tout_venant', 'femme', 'homme',
                                'enfant', 'grossesse', 'senior')),
    CONSTRAINT "biology_functional_ranges_unite_check"
        CHECK ("unite" IN (
            'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
            'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
            'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
            'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g',
            '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score')),
    -- Niveau de preuve WellNeuro. C = « biologie fonctionnelle
    -- interprétative », niveau attendu de la majorité de ces plages : il doit
    -- rester lisible en surface, jamais lissé en « norme ».
    CONSTRAINT "biology_functional_ranges_niveau_preuve_check"
        CHECK ("niveau_preuve" IN ('A', 'B', 'C', 'D')),
    -- Même format que `rag_corpus_claims.version_claim` (« v1.0 ») : la clé
    -- métier d'un claim est le COUPLE (claim_id, version_claim), tous deux en
    -- texte. Une version stockée en entier ici n'aurait jamais pu se joindre
    -- au corpus — la référence aurait été inexploitable dès la première
    -- lecture, sans que rien ne le signale à l'écriture.
    CONSTRAINT "biology_functional_ranges_version_claim_check"
        CHECK ("version_claim" ~ '^v?[0-9]+\.[0-9]+$')
);

-- ─── Conditions préanalytiques ─────────────────────────────────────────────
CREATE TABLE "biology_preanalytics" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT NOT NULL,
    "type_condition" TEXT NOT NULL,
    "consigne" TEXT NOT NULL,
    "claim_id" TEXT,
    "version_claim" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_preanalytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_preanalytics_type_condition_check"
        CHECK ("type_condition" IN ('jeune', 'moment_journee',
                                    'delai_apres_prise', 'arret_supplementation',
                                    'cycle_menstruel', 'contenant', 'transport')),
    -- Claim tout-ou-rien : une consigne issue du corpus porte sa source
    -- complète, une consigne purement logistique (tube, acheminement) n'en
    -- demande pas. Ce qui est interdit, c'est la demi-source.
    CONSTRAINT "biology_preanalytics_claim_paire_check"
        CHECK (("claim_id" IS NULL) = ("version_claim" IS NULL)),
    CONSTRAINT "biology_preanalytics_claim_non_vide_check"
        CHECK ("claim_id" IS NULL OR btrim("claim_id") <> ''),
    CONSTRAINT "biology_preanalytics_version_claim_check"
        CHECK ("version_claim" IS NULL OR "version_claim" ~ '^v?[0-9]+\.[0-9]+$')
);

-- ─── Ratios : spécification structurée, jamais d'expression exécutable ─────
CREATE TABLE "biology_ratios" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "analyte_a_code" TEXT NOT NULL,
    "analyte_b_code" TEXT NOT NULL,
    "constante" DOUBLE PRECISION,
    "unite_resultat" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_ratios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_ratios_code_format_check"
        CHECK ("code" ~ '^BIO_RATIO_[A-Z0-9_]{2,60}$'),
    -- Trois formes closes couvrant les ratios visés, et RIEN d'autre :
    --   rapport               → a / b            (ω6/ω3, Cu/Zn)
    --   produit_sur_constante → (a × b) / k      (HOMA, k = 22,5)
    --   pourcentage           → (a / b) × 100    (saturation de la transferrine)
    -- Aucune colonne ne contient de formule textuelle : rien n'est jamais
    -- évalué depuis du texte (patron ScoringSpecification de la certification).
    -- Une quatrième forme = une migration additive, relue.
    CONSTRAINT "biology_ratios_operation_check"
        CHECK ("operation" IN ('rapport', 'produit_sur_constante', 'pourcentage')),
    -- La constante n'existe que pour la forme qui en a besoin : ni constante
    -- orpheline, ni division par une constante absente.
    CONSTRAINT "biology_ratios_constante_check"
        CHECK (("operation" = 'produit_sur_constante') = ("constante" IS NOT NULL)),
    CONSTRAINT "biology_ratios_constante_non_nulle_check"
        CHECK ("constante" IS NULL OR "constante" <> 0),
    CONSTRAINT "biology_ratios_operandes_distincts_check"
        CHECK ("analyte_a_code" <> "analyte_b_code"),
    CONSTRAINT "biology_ratios_unite_resultat_check"
        CHECK ("unite_resultat" IS NULL OR "unite_resultat" IN ('%', 'ratio', 'score'))
);

-- ─── Bilans hiérarchisés ───────────────────────────────────────────────────
CREATE TABLE "biology_panels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "objectif" TEXT,
    "besoins" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biology_panels_pkey" PRIMARY KEY ("id"),
    -- Mêmes niveaux que les explorations du moteur d'orientation NNPP2 : le
    -- rayon biologie étend ce moteur (décision B), il n'en invente pas un autre.
    CONSTRAINT "biology_panels_niveau_check"
        CHECK ("niveau" IN ('socle', 'approfondissement', 'specialise')),
    -- Les besoins sont numérotés 1 à 12 et pas autrement : `ARRAY[47]` passait
    -- silencieusement et produisait un bilan ciblant un besoin inexistant
    -- (Y4 de la revue).
    CONSTRAINT "biology_panels_besoins_bornes_check"
        CHECK ("besoins" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12])
);

CREATE TABLE "biology_panel_items" (
    "id" TEXT NOT NULL,
    "panel_code" TEXT NOT NULL,
    "analyte_code" TEXT,
    "ratio_code" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_panel_items_pkey" PRIMARY KEY ("id"),
    -- Exactement une cible : ni item vide, ni item ambigu portant les deux.
    CONSTRAINT "biology_panel_items_cible_unique_check"
        CHECK (("analyte_code" IS NOT NULL)::int + ("ratio_code" IS NOT NULL)::int = 1)
);

-- ─── Liens cliniques (vides jusqu'à CB-02b) ────────────────────────────────
CREATE TABLE "biology_analyte_links" (
    "id" TEXT NOT NULL,
    "analyte_code" TEXT,
    "ratio_code" TEXT,
    "cible_type" TEXT NOT NULL,
    "cible_code" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "version_claim" TEXT NOT NULL,
    "niveau_preuve" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biology_analyte_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_analyte_links_cible_unique_check"
        CHECK (("analyte_code" IS NOT NULL)::int + ("ratio_code" IS NOT NULL)::int = 1),
    CONSTRAINT "biology_analyte_links_cible_type_check"
        CHECK ("cible_type" IN ('besoin', 'axe', 'nutriment')),
    -- Un besoin est un entier de 1 à 12 ; 'besion_3' ne doit pas produire une
    -- suggestion d'exploration sans cible et sans erreur (Y4 de la revue).
    CONSTRAINT "biology_analyte_links_cible_besoin_check"
        CHECK ("cible_type" <> 'besoin' OR "cible_code" ~ '^([1-9]|1[0-2])$'),
    -- Direction d'interprétation : dans quel sens l'écart est évocateur.
    CONSTRAINT "biology_analyte_links_direction_check"
        CHECK ("direction" IN ('bas_evocateur', 'haut_evocateur',
                               'hors_plage_evocateur')),
    CONSTRAINT "biology_analyte_links_niveau_preuve_check"
        CHECK ("niveau_preuve" IN ('A', 'B', 'C', 'D')),
    -- claim_id non nul ET non vide : aucune association biomarqueur ↔ besoin
    -- ne naît d'une intuition. Cette table reste VIDE jusqu'à CB-02b, et cela
    -- doit rester visible en surface plutôt que comblé par des bornes
    -- laboratoire.
    CONSTRAINT "biology_analyte_links_claim_non_vide_check"
        CHECK (btrim("claim_id") <> ''),
    CONSTRAINT "biology_analyte_links_version_claim_check"
        CHECK ("version_claim" ~ '^v?[0-9]+\.[0-9]+$')
);

-- ─── Pointeur de version courante par source (patron C4 R-2) ───────────────
CREATE TABLE "biology_catalog_versions_courantes" (
    "id" TEXT NOT NULL,
    "source_provenance" TEXT NOT NULL,
    "version_source" TEXT NOT NULL,
    "contenu_sha256" TEXT,
    "nombre_entrees" INTEGER NOT NULL DEFAULT 0,
    "importe_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biology_catalog_versions_courantes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "biology_catalog_versions_courantes_source_check"
        CHECK ("source_provenance" IN ('nabm_smt_ans', 'labo', 'saisie_praticien')),
    CONSTRAINT "biology_catalog_versions_courantes_sha256_check"
        CHECK ("contenu_sha256" IS NULL OR "contenu_sha256" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "biology_catalog_versions_courantes_nombre_check"
        CHECK ("nombre_entrees" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "biology_analytes_code_key" ON "biology_analytes"("code");
CREATE INDEX "biology_analytes_statut_idx" ON "biology_analytes"("statut_fiche", "actif");
CREATE INDEX "biology_analytes_prelevement_idx" ON "biology_analytes"("type_prelevement");

-- CreateIndex — un acte est unique DANS UN MILLÉSIME : la même clé revient à
-- chaque version de la nomenclature (V101 → V105 entre janvier et juin 2026),
-- avec un libellé ou un coefficient qui a pu changer.
CREATE UNIQUE INDEX "biology_nabm_actes_code_version_key"
    ON "biology_nabm_actes"("code_acte", "version_source");
CREATE INDEX "biology_nabm_actes_version_idx"
    ON "biology_nabm_actes"("version_source", "inactif");

-- CreateIndex
CREATE UNIQUE INDEX "biology_analyte_nabm_analyte_acte_key"
    ON "biology_analyte_nabm"("analyte_code", "code_acte");
CREATE INDEX "biology_analyte_nabm_code_acte_idx"
    ON "biology_analyte_nabm"("code_acte");

-- CreateIndex — une seule plage active par (cible, population) et par
-- référentiel (M5 de la revue). Sans cela deux plages contradictoires
-- coexistent, toutes deux actives, et « les deux référentiels côte à côte »
-- n'est plus défini : il n'existe ni version, ni priorité, ni tri déterministe.
CREATE UNIQUE INDEX "biology_reference_ranges_analyte_population_key"
    ON "biology_reference_ranges"("analyte_code", "population")
    WHERE "analyte_code" IS NOT NULL AND "actif";
CREATE UNIQUE INDEX "biology_reference_ranges_ratio_population_key"
    ON "biology_reference_ranges"("ratio_code", "population")
    WHERE "ratio_code" IS NOT NULL AND "actif";
CREATE INDEX "biology_reference_ranges_analyte_idx"
    ON "biology_reference_ranges"("analyte_code", "actif");
CREATE INDEX "biology_reference_ranges_ratio_idx"
    ON "biology_reference_ranges"("ratio_code", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "biology_functional_ranges_analyte_population_key"
    ON "biology_functional_ranges"("analyte_code", "population")
    WHERE "analyte_code" IS NOT NULL AND "actif";
CREATE UNIQUE INDEX "biology_functional_ranges_ratio_population_key"
    ON "biology_functional_ranges"("ratio_code", "population")
    WHERE "ratio_code" IS NOT NULL AND "actif";
CREATE INDEX "biology_functional_ranges_analyte_idx"
    ON "biology_functional_ranges"("analyte_code", "actif");
CREATE INDEX "biology_functional_ranges_ratio_idx"
    ON "biology_functional_ranges"("ratio_code", "actif");
CREATE INDEX "biology_functional_ranges_claim_idx"
    ON "biology_functional_ranges"("claim_id");

-- CreateIndex — une seule consigne active par (analyte, type) : sans elle,
-- « à jeun 12 h » et « jeûne non nécessaire » coexistent et s'impriment
-- toutes les deux (Y7 de la revue).
CREATE UNIQUE INDEX "biology_preanalytics_analyte_type_key"
    ON "biology_preanalytics"("analyte_code", "type_condition")
    WHERE "actif";
CREATE INDEX "biology_preanalytics_analyte_idx"
    ON "biology_preanalytics"("analyte_code", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "biology_ratios_code_key" ON "biology_ratios"("code");
-- Les deux opérandes portent une FK en ON UPDATE CASCADE : sans index, tout
-- renommage d'un code d'analyte déclenche un parcours séquentiel.
CREATE INDEX "biology_ratios_analyte_a_idx" ON "biology_ratios"("analyte_a_code");
CREATE INDEX "biology_ratios_analyte_b_idx" ON "biology_ratios"("analyte_b_code");

-- CreateIndex
CREATE UNIQUE INDEX "biology_panels_code_key" ON "biology_panels"("code");
CREATE INDEX "biology_panel_items_panel_idx"
    ON "biology_panel_items"("panel_code", "position");

-- CreateIndex — un analyte (ou un ratio) n'apparaît qu'une fois par bilan.
-- Deux index partiels et non un index composé : avec des colonnes NULL,
-- l'unicité composée laisserait passer les doublons (sémantique Postgres —
-- même piège que la forme NULL des compositions C4).
CREATE UNIQUE INDEX "biology_panel_items_panel_analyte_key"
    ON "biology_panel_items"("panel_code", "analyte_code")
    WHERE "analyte_code" IS NOT NULL;
CREATE UNIQUE INDEX "biology_panel_items_panel_ratio_key"
    ON "biology_panel_items"("panel_code", "ratio_code")
    WHERE "ratio_code" IS NOT NULL;

-- CreateIndex — un même claim peut fonder plusieurs liens (cible × besoin),
-- mais jamais deux fois le même lien. Index partiels pour la même raison
-- qu'au-dessus : la cible est polymorphe et l'une des deux colonnes est NULL.
CREATE UNIQUE INDEX "biology_analyte_links_analyte_cible_claim_key"
    ON "biology_analyte_links"("analyte_code", "cible_type", "cible_code", "claim_id")
    WHERE "analyte_code" IS NOT NULL;
CREATE UNIQUE INDEX "biology_analyte_links_ratio_cible_claim_key"
    ON "biology_analyte_links"("ratio_code", "cible_type", "cible_code", "claim_id")
    WHERE "ratio_code" IS NOT NULL;
CREATE INDEX "biology_analyte_links_cible_idx"
    ON "biology_analyte_links"("cible_type", "cible_code");

-- CreateIndex
CREATE UNIQUE INDEX "biology_catalog_versions_courantes_source_provenance_key"
    ON "biology_catalog_versions_courantes"("source_provenance");

-- AddForeignKey — toutes en RESTRICT : le catalogue est un référentiel, on ne
-- perd pas silencieusement un analyte encore référencé par une plage, un lien
-- ou un bilan. Une désactivation passe par `actif`/`statut_fiche`, pas par un
-- DELETE.
--
-- PAS DE FK SUR `biology_analyte_nabm.code_acte` : la cible n'est unique qu'en
-- couple avec sa version (voir le commentaire de la table). C'est le prix de
-- la portabilité de la signature d'un millésime au suivant ; le contrat SQL
-- vérifie à la place que toute correspondance se résout dans la version
-- courante.
ALTER TABLE "biology_analyte_nabm"
    ADD CONSTRAINT "biology_analyte_nabm_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_reference_ranges"
    ADD CONSTRAINT "biology_reference_ranges_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_reference_ranges"
    ADD CONSTRAINT "biology_reference_ranges_ratio_code_fkey"
    FOREIGN KEY ("ratio_code") REFERENCES "biology_ratios"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_functional_ranges"
    ADD CONSTRAINT "biology_functional_ranges_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_functional_ranges"
    ADD CONSTRAINT "biology_functional_ranges_ratio_code_fkey"
    FOREIGN KEY ("ratio_code") REFERENCES "biology_ratios"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_preanalytics"
    ADD CONSTRAINT "biology_preanalytics_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_ratios"
    ADD CONSTRAINT "biology_ratios_analyte_a_code_fkey"
    FOREIGN KEY ("analyte_a_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_ratios"
    ADD CONSTRAINT "biology_ratios_analyte_b_code_fkey"
    FOREIGN KEY ("analyte_b_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_panel_items"
    ADD CONSTRAINT "biology_panel_items_panel_code_fkey"
    FOREIGN KEY ("panel_code") REFERENCES "biology_panels"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- RESTRICT et non SET NULL sur les FK optionnelles polymorphes : perdre la
-- cible viderait la ligne sans la supprimer, et le CHECK `cible_unique`
-- basculerait une ligne valide en ligne interdite (écart assumé avec le
-- défaut Prisma des relations optionnelles — d'où l'annotation explicite
-- côté schema.prisma, sinon le banc de dérive le signale).
ALTER TABLE "biology_panel_items"
    ADD CONSTRAINT "biology_panel_items_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_panel_items"
    ADD CONSTRAINT "biology_panel_items_ratio_code_fkey"
    FOREIGN KEY ("ratio_code") REFERENCES "biology_ratios"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_analyte_links"
    ADD CONSTRAINT "biology_analyte_links_analyte_code_fkey"
    FOREIGN KEY ("analyte_code") REFERENCES "biology_analytes"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "biology_analyte_links"
    ADD CONSTRAINT "biology_analyte_links_ratio_code_fkey"
    FOREIGN KEY ("ratio_code") REFERENCES "biology_ratios"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sécurité : deny-all RLS par défaut (aucune policy volontairement ; l'app
-- accède via Prisma en connexion Postgres directe qui contourne RLS),
-- cohérent avec supplement_products, cabinet_instruments et les tables du
-- moteur d'intention.
ALTER TABLE "public"."biology_analytes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_nabm_actes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_analyte_nabm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_reference_ranges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_functional_ranges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_preanalytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_ratios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_panels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_panel_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_analyte_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."biology_catalog_versions_courantes" ENABLE ROW LEVEL SECURITY;
