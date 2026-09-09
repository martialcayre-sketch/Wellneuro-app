-- Alliance 6.0-B — la fin d'une chaîne d'objectif (une table événement).
-- Migration confirmée explicitement par le responsable le 2026-09-10 (feu vert
-- rendu en session sur le schéma ; gate humain = revue + go explicite avant
-- merge, puis `release-db` approuvée et CONSTATÉE par conteneur — `D-087`).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill — l'absence de ligne signifie
-- « aucune chaîne d'objectif n'a encore été close », ce qui est l'état actuel
-- de tous les dossiers. Rollback = abandon de la table ; rien d'existant n'en
-- dépend, le code consommateur n'arrivant qu'après application.
--
-- DEUX DATES, jamais confondues (patron relecture_notes) : `exprime_le` est la
-- date d'ÉVÉNEMENT — quand la parole a été dite —, c'est une DONNÉE, nullable ;
-- `cree_le` est le moment de l'écriture, posé par la base
-- (DEFAULT CURRENT_TIMESTAMP), jamais par l'appelant — inantidatable.
--
-- APPEND-ONLY PAR CONVENTION (patron supersedes_note_id) : aucune route
-- d'update, aucune contrainte d'UNICITÉ — se raviser fait UNE LIGNE DE PLUS, et
-- un UNIQUE transformerait un second geste en erreur technique ou pousserait à
-- l'upsert. `racine_objectif_id` et `remplace_par_racine_id` sont des
-- références SOUPLES, sans FK — existence, appartenance au dossier et qualité
-- de RACINE (`supersedes_objectif_id IS NULL`) sont vérifiées à la route.
--
-- LA RACINE, JAMAIS LA TÊTE, et ce n'est pas un détail d'implémentation : la
-- racine ne bouge jamais, donc une fin qui s'y attache survit à toute révision
-- et ne peut pas devenir orpheline. Une fin attachée à une tête serait perdue à
-- la reformulation suivante — exactement le défaut de `negocie_le`.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE, RANG NI TAUX D'ATTEINTE : l'interdit
-- de forme est tenu par la liste blanche de colonnes du contrat
-- `prisma/checks/alli_fin_objectif_v1_negatif.sql`.

-- CreateTable — pourquoi une chaîne d'objectif cesse d'être ce sur quoi on
-- travaille, et par quelle voix.
CREATE TABLE "fins_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "racine_objectif_id" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "voix" TEXT NOT NULL,
    "consignee_par" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "praticien_email" TEXT,
    "motif_texte" TEXT,
    "remplace_par_racine_id" TEXT,
    "exprime_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fins_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- (patron de la campagne).
CREATE INDEX "alli_fin_objectif_patient_idx" ON "fins_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`effacerDossier`, garde de complétude), pas un effet de bord de
-- FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "fins_objectif" ADD CONSTRAINT "fins_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- `motif` : taxonomie de GESTE (trois valeurs), aucune sémantique clinique.
-- `atteint` ne dit RIEN d'une cause — l'objectif n'est plus ce sur quoi on
-- travaille, jamais qu'une intervention l'a produit (`DC-27`).
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_motif_check"
    CHECK ("motif" IN ('atteint', 'abandonne', 'remplace'));

-- `voix` : taxonomie de GESTE (deux valeurs), aucune sémantique clinique. Elle
-- dit DE QUI EST LA PAROLE, pas qui a tapé.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_voix_check"
    CHECK ("voix" IN ('praticien', 'patient'));

-- `consignee_par` : taxonomie de GESTE (deux valeurs), aucune sémantique
-- clinique. Elle dit QUI A ÉCRIT LA LIGNE.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_consignee_par_check"
    CHECK ("consignee_par" IN ('praticien', 'patient'));

-- `sens` : taxonomie de GESTE (trois valeurs), aucune sémantique clinique.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_sens_check"
    CHECK ("sens" IN ('declare', 'confirme', 'refuse'));

-- UN PATIENT NE CONSIGNE JAMAIS LA VOIX DU PRATICIEN. L'inverse est permis et
-- porte un nom : le praticien qui atteste ce que le patient a dit en
-- consultation (`voix = patient, consignee_par = praticien`) est un TÉMOIGNAGE,
-- distinct du geste que le patient pose lui-même au portail, qui est une
-- PREUVE (`D-161` §2). Que le témoignage cède à la preuve est une règle de
-- LECTURE : elle appartient au module, pas à la base, qui ne connaît pas
-- l'ordre des paroles.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_consignation_check"
    CHECK ("consignee_par" = 'praticien' OR "voix" = 'patient');

-- L'e-mail du praticien est présent EXACTEMENT quand c'est lui qui consigne :
-- une ligne écrite au portail n'en porte pas, une ligne écrite au cockpit ne
-- peut pas s'en passer.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_praticien_email_check"
    CHECK (("consignee_par" = 'praticien') = ("praticien_email" IS NOT NULL));

-- SEUL `atteint` SE NÉGOCIE. Une réussite ne se constate pas seul : elle se
-- déclare puis se confirme ou se refuse. Le renoncement et le remplacement,
-- eux, sont unilatéraux — exiger deux voix pour abandonner condamnerait à
-- l'inachèvement toute chaîne dont le patient ne répond plus.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_negociation_check"
    CHECK ("sens" = 'declare' OR "motif" = 'atteint');

-- `abandonne` : unilatéral, voix du praticien, ET SON MOTIF EST ÉCRIT. C'est
-- `non_traite_motif` promu de la version à la chaîne : renoncer sans dire
-- pourquoi laisserait une chaîne close sans raison lisible.
-- `btrim(motif_texte, E' \t\r\n')` ET NON `btrim(motif_texte)`, et l'écart n'est
-- pas cosmétique : `btrim/1` ne retire QUE L'ESPACE ASCII, si bien qu'un motif
-- fait d'une seule tabulation passerait.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_abandon_check"
    CHECK ("motif" <> 'abandonne' OR (
      "voix" = 'praticien'
      AND "sens" = 'declare'
      AND "motif_texte" IS NOT NULL
      AND btrim("motif_texte", E' \t\r\n') <> ''
    ));

-- `remplace` : unilatéral, voix du praticien, et il PORTE la racine qui prend
-- la suite — sans quoi on saurait qu'une chaîne s'arrête sans savoir au profit
-- de quoi. C'est ce motif qui départage deux têtes concurrentes ; une chaîne ne
-- peut pas se remplacer elle-même.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_remplacement_check"
    CHECK ("motif" <> 'remplace' OR (
      "voix" = 'praticien'
      AND "sens" = 'declare'
      AND "remplace_par_racine_id" IS NOT NULL
      AND "remplace_par_racine_id" <> "racine_objectif_id"
    ));

-- `atteint` ne porte NI motif écrit NI racine de remplacement : les colonnes
-- des deux autres motifs restent vides, faute de quoi une même ligne dirait
-- deux fins à la fois.
ALTER TABLE "fins_objectif"
  ADD CONSTRAINT "fins_objectif_atteint_check"
    CHECK ("motif" <> 'atteint' OR (
      "motif_texte" IS NULL AND "remplace_par_racine_id" IS NULL
    ));

-- PAS DE CHECK « date non future » sur `exprime_le` : Postgres refuse `now()`
-- dans une contrainte (fonction non immutable). La garde se pose à la route,
-- comme pour `negocie_le`, `geste_le` et `exprime_le` des lots précédents —
-- dette nommée, reconduite ici telle quelle.

ALTER TABLE "public"."fins_objectif" ENABLE ROW LEVEL SECURITY;
