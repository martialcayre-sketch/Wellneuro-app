-- Alliance 6.0-B LOT-01 — l'objectif à trois voix (trois tables événement +
-- une colonne de liaison). Migration confirmée explicitement par le
-- responsable le 2026-08-23 (gate ouvert en session ; gate humain =
-- approbation release-db avant application).
--
-- ADDITIVE UNIQUEMENT : trois tables nouvelles et UNE colonne nullable
-- ajoutée à `objectifs_negocies` — aucune table modifiée dans sa forme
-- existante, aucun DROP, aucun renommage, aucun backfill. `source_proposition_id`
-- naît NULLE sur toutes les lignes et le reste : un objectif rédigé de la
-- main du praticien n'a pas de proposition source, et fabriquer un lien
-- serait fabriquer une histoire (DC-17). Rollback = abandon des trois tables
-- et de la colonne ; rien d'existant n'en dépend.
--
-- DEUX DATES, jamais confondues (patron 6.0-A) : `assemblee_le`,
-- `dispose_le`, `exprime_le` sont des DONNÉES, nullables ; `cree_le` est le
-- moment de l'écriture, posé par la base (DEFAULT CURRENT_TIMESTAMP), jamais
-- par l'appelant — inantidatable.
--
-- APPEND-ONLY PAR CONVENTION : aucune route d'update ; les références
-- (`id_proposition`, `id_objectif`, `source_proposition_id`) sont SOUPLES,
-- sans FK — existence et appartenance vérifiées aux routes des lots 02/03/04.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE NI RANG : D-094 §3 interdit jusqu'à
-- la numérotation des propositions — l'ordre des candidats n'est couvert par
-- aucune ligne signée (D-093) et ne doit pas se lire comme un classement.
-- L'ordre d'affichage se décide au rendu, il ne se persiste jamais.
-- L'interdit de forme est tenu par la liste blanche de colonnes du contrat
-- `prisma/checks/alli_objectif_trois_voix_v1_negatif.sql`.

-- CreateTable — la PROPOSITION : un assemblage de fragments sourcés
-- (D-094 §1, liste fermée à trois sources) ; `hash_sources` porte la
-- caducité (patron proposalHash du cockpit).
CREATE TABLE "propositions_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "fragments" JSONB NOT NULL,
    "hash_sources" TEXT NOT NULL,
    "assemblee_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propositions_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable — ce que le PRATICIEN fait d'une proposition : reprise ou
-- écart motivé. Événement, jamais un update sur la proposition.
CREATE TABLE "dispositions_proposition" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_proposition" TEXT NOT NULL,
    "praticien_email" TEXT NOT NULL,
    "geste" TEXT NOT NULL,
    "motif" TEXT,
    "dispose_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositions_proposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable — l'AMENDEMENT du patient (« le dire autrement », D-094 §2) :
-- table propre et non un `sens` de plus sur la ratification. Parole de
-- patient : pas de praticien_email.
CREATE TABLE "amendements_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_objectif" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "exprime_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amendements_objectif_pkey" PRIMARY KEY ("id")
);

-- AlterTable — la liaison reprise : l'objectif négocié dit de quelle
-- proposition il procède, s'il en procède d'une. NULLABLE et sans DEFAULT.
ALTER TABLE "objectifs_negocies" ADD COLUMN "source_proposition_id" TEXT;

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- par table (patron 6.0-A).
CREATE INDEX "alli_proposition_objectif_patient_idx" ON "propositions_objectif"("id_patient", "cree_le");
CREATE INDEX "alli_disposition_proposition_patient_idx" ON "dispositions_proposition"("id_patient", "cree_le");
CREATE INDEX "alli_amendement_objectif_patient_idx" ON "amendements_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est
-- un geste NOMMÉ (`effacerDossier`, garde de complétude d'effacement.test.ts),
-- pas un effet de bord de FK. Une FK en CASCADE rendrait ce code mort en
-- silence (volet FK du contrat négatif).
ALTER TABLE "propositions_objectif" ADD CONSTRAINT "propositions_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispositions_proposition" ADD CONSTRAINT "dispositions_proposition_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "amendements_objectif" ADD CONSTRAINT "amendements_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
--
-- L'e-mail praticien est l'e-mail de session, posé côté serveur : un geste
-- sans auteur lisible n'est pas attribuable. 320 = longueur maximale d'une
-- adresse e-mail (RFC 5321), borne PUREMENT TECHNIQUE.
ALTER TABLE "dispositions_proposition"
  ADD CONSTRAINT "dispositions_proposition_praticien_email_check"
    CHECK (btrim("praticien_email") <> '' AND char_length("praticien_email") <= 320);

-- Les textes porteurs ne sont pas des chaînes vides. L'amendement est le
-- cas le plus net : un amendement sans mots n'est pas un amendement, c'est
-- une contestation — et celle-là a déjà son objet (`ratifications_objectif`,
-- sens `conteste`, dont le texte reste facultatif).
ALTER TABLE "amendements_objectif"
  ADD CONSTRAINT "amendements_objectif_texte_check"
    CHECK (btrim("texte") <> '');

-- `hash_sources` non vide : sans lui, la caducité ne se calcule plus et une
-- proposition assise sur des données périmées resterait servable.
ALTER TABLE "propositions_objectif"
  ADD CONSTRAINT "propositions_objectif_hash_sources_check"
    CHECK (btrim("hash_sources") <> '');

-- `fragments` : un TABLEAU NON VIDE. Une proposition sans fragment n'est pas
-- une proposition — et c'est ici que se tient, au niveau le plus bas,
-- l'invariant de D-094 : la machine assemble des citations, elle ne produit
-- pas du vide qu'on remplirait ensuite. La FORME de chaque fragment
-- (`{texte, source}`, source dans la liste fermée) est gardée au module et
-- au contrat : un CHECK ne doit pas devenir un second schéma, qui divergerait
-- du premier.
ALTER TABLE "propositions_objectif"
  ADD CONSTRAINT "propositions_objectif_fragments_check"
    CHECK (jsonb_typeof("fragments") = 'array' AND jsonb_array_length("fragments") > 0);

-- `geste` : taxonomie de GESTE (deux valeurs), aucune sémantique clinique.
-- `caduque` n'y figure pas et c'est délibéré : la caducité se DÉRIVE de
-- `hash_sources`, personne ne l'a décidée — l'inscrire comme geste
-- attribuerait à un praticien une décision qu'il n'a pas prise.
ALTER TABLE "dispositions_proposition"
  ADD CONSTRAINT "dispositions_proposition_geste_check"
    CHECK ("geste" IN ('reprise', 'ecartee'));

-- L'ÉCART EXIGE SON MOTIF, la reprise n'en veut pas. Le motif d'écart est le
-- matériau du LOT-06 : c'est lui qui dira si le classement des candidats
-- mérite d'être signé (D-093). Une proposition écartée sans raison ne dit
-- rien. Réciproquement, un motif sur une reprise laisserait croire qu'on
-- reprend « pour une raison » consignée quelque part — la reprise se lit
-- dans l'objectif produit, pas dans un commentaire.
ALTER TABLE "dispositions_proposition"
  ADD CONSTRAINT "dispositions_proposition_motif_check"
    CHECK (
      ("geste" = 'ecartee' AND "motif" IS NOT NULL AND btrim("motif") <> '')
      OR ("geste" = 'reprise' AND "motif" IS NULL)
    );

-- Pas de CHECK « date non future » : Postgres refuse `now()` dans un CHECK
-- (fonction non immutable). Cette borne se garde côté route (lots 02/03/04),
-- dette nommée aux fichiers de lot — reconduite de 6.0-A.

-- Sécurité : deny-all RLS par défaut — défense en profondeur (posture
-- D-005), cohérente avec toutes les tables patient du schéma et assertée par
-- le contrat négatif. Ces trois tables portent une parole de patient
-- (amendement), une citation de sa parole (proposition) et un jugement
-- praticien sur elle (disposition) : le contenu le plus nominatif du
-- dossier, au même titre que les cinq tables de 6.0-A.
ALTER TABLE "public"."propositions_objectif" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dispositions_proposition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."amendements_objectif" ENABLE ROW LEVEL SECURITY;
