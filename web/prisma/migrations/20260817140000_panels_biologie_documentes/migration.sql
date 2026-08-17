-- LOT-06 : panels biologiques documentés hors outil.
--
-- Le praticien déclare qu'un panel a DÉJÀ été exploré, et à quelle date. Le
-- moteur de statuts s'en sert pour ne pas reproposer un bilan récent
-- (`deja_documente`) ou pour le proposer à nouveau passé le délai de
-- répétition de la règle (`a_repeter`) — deux statuts inatteignables tant que
-- cette table n'existe pas.
--
-- SANS VALEURS (verrou HDS) : existence et date d'un bilan revenu sur papier,
-- jamais un résultat d'analyse. Aucune colonne de valeur — vérifié par
-- `prisma/checks/cb_panels_documentes_v1_negatif.sql`.
--
-- Une seule déclaration par panel et par patient : re-déclarer met la date à
-- jour, le moteur ne lisant qu'une date par panel.

-- CreateTable
CREATE TABLE "panels_biologie_documentes" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "panel_code" TEXT NOT NULL,
    "documente_le" TIMESTAMP(3) NOT NULL,
    "declare_par" TEXT NOT NULL,
    "declare_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "panels_biologie_documentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- L'unicité commence par `id_patient` : elle sert aussi d'index pour la
-- lecture du dossier, qui filtre sur ce seul terme. Pas de second index.
CREATE UNIQUE INDEX "cb_panel_documente_unique" ON "panels_biologie_documentes"("id_patient", "panel_code");

-- AddForeignKey
ALTER TABLE "panels_biologie_documentes" ADD CONSTRAINT "panels_biologie_documentes_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Un panel déclaré documenté doit exister au catalogue : RESTRICT interdit de
-- retirer un panel encore cité par un dossier.
ALTER TABLE "panels_biologie_documentes" ADD CONSTRAINT "panels_biologie_documentes_panel_code_fkey" FOREIGN KEY ("panel_code") REFERENCES "biology_panels"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.
--
-- `declare_par` est l'e-mail de session, posé côté serveur : une déclaration
-- sans auteur lisible n'est pas attribuable, donc pas relisible.
ALTER TABLE "panels_biologie_documentes"
  ADD CONSTRAINT "panels_biologie_documentes_declare_par_check"
    CHECK (btrim("declare_par") <> '');

-- 320 est la longueur maximale d'une adresse e-mail (RFC 5321, 64 + @ + 255) —
-- borne PUREMENT TECHNIQUE, aucune sémantique clinique.
ALTER TABLE "panels_biologie_documentes"
  ADD CONSTRAINT "panels_biologie_documentes_declare_par_longueur_check"
    CHECK (char_length("declare_par") <= 320);

-- Pas de CHECK « date non future » : Postgres refuse `now()` dans un CHECK
-- (fonction non immutable). Cette borne se garde côté route, à la déclaration.

-- Sécurité : deny-all RLS par défaut (posture D-005). Sans lui, une table
-- neuve du schéma `public` rejoint le périmètre Supabase Data API, et cette
-- table-ci porte un lien NOMINATIF — quel dossier a fait explorer quel panel,
-- à quelle date, déclaré par quel praticien. L'application accède en
-- connexion Postgres directe via Prisma ; aucun accès Data API n'est requis.
ALTER TABLE "public"."panels_biologie_documentes" ENABLE ROW LEVEL SECURITY;
