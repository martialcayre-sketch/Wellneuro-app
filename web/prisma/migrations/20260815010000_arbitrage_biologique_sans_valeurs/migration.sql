-- LOT-06 (D-059) : arbitrage biologique sans valeurs.
-- Consigne un verdict praticien (confirme | infirme | sans_objet) sur une
-- intention `conditionnelle_biologie` d'un protocole — jamais de valeur
-- biologique (verrou HDS). Append-only : une ligne par intention et par
-- version de protocole (unicité protocol_draft_id + intention_id).

-- CreateTable
CREATE TABLE "arbitrages_biologiques" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "protocol_draft_id" TEXT NOT NULL,
    "intention_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "note_courte" TEXT,
    "arbitre_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arbitre_par" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbitrages_biologiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cb_arbitrage_patient_idx" ON "arbitrages_biologiques"("id_patient", "arbitre_le");

-- CreateIndex
CREATE UNIQUE INDEX "cb_arbitrage_intention_unique" ON "arbitrages_biologiques"("protocol_draft_id", "intention_id");

-- AddForeignKey
ALTER TABLE "arbitrages_biologiques" ADD CONSTRAINT "arbitrages_biologiques_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrages_biologiques" ADD CONSTRAINT "arbitrages_biologiques_protocol_draft_id_fkey" FOREIGN KEY ("protocol_draft_id") REFERENCES "protocol_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier (D-059) — hors périmètre Prisma, portées par le SQL seul.
ALTER TABLE "arbitrages_biologiques"
  ADD CONSTRAINT "arbitrages_biologiques_verdict_check"
    CHECK ("verdict" IN ('confirme', 'infirme', 'sans_objet'));

-- Un verdict `infirme` exige une note motivée non vide.
ALTER TABLE "arbitrages_biologiques"
  ADD CONSTRAINT "arbitrages_biologiques_note_infirme_check"
    CHECK ("verdict" <> 'infirme' OR (("note_courte" IS NOT NULL) AND btrim("note_courte") <> ''));

ALTER TABLE "arbitrages_biologiques"
  ADD CONSTRAINT "arbitrages_biologiques_note_longueur_check"
    CHECK ("note_courte" IS NULL OR char_length("note_courte") <= 2000);
