-- Contraintes de lignée sur clinical_rules (campagne C4, LOT-03b suite —
-- prérequis d'activation issu de la revue adversariale de #338). Les invariants
-- de lignée d'une règle clinique ne reposaient sur aucune contrainte base :
-- sous concurrence (READ COMMITTED), un double-clic pouvait créer deux v1, deux
-- brouillons N+1, voire deux versions validées actives. Ces index rendent ces
-- invariants atomiques ; les routes traduisent P2002 en 409.
--
-- ADDITIVE : trois colonnes nullables + trois index + un CHECK sur une table
-- EXISTANTE mais NON SEEDÉE (zéro ligne en production) — le CHECK passe donc
-- sans backfill. Aucun DROP, aucun renommage. Rollback = abandon des ajouts.

-- AddColumn — traçabilité durable de la désactivation (R-1, décision n°3).
ALTER TABLE "clinical_rules" ADD COLUMN "raison_desactivation" TEXT;
ALTER TABLE "clinical_rules" ADD COLUMN "desactive_par" TEXT;
ALTER TABLE "clinical_rules" ADD COLUMN "desactive_le" TIMESTAMP(3);

-- Une règle désactivée porte sa raison et son signataire (jamais silencieux).
-- clinical_rules est non seedée : le CHECK est satisfait par vacuité en prod.
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_desactivation_tracee_check"
    CHECK ("actif" OR ("raison_desactivation" IS NOT NULL AND "desactive_par" IS NOT NULL));

-- CreateIndex — une seule ligne par (lignée, version) : tue la collision de
-- version. Exprimable dans schema.prisma (@@unique).
CREATE UNIQUE INDEX "clinical_rules_lignee_version_key"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle", "version_regle");

-- CreateIndex — un seul brouillon actif par lignée (valide_par NULL = brouillon).
-- Index partiel : non exprimable dans schema.prisma, SQL-seul (comme l'index
-- partiel du catalogue, vérifié sans dérive par le banc B-1).
CREATE UNIQUE INDEX "clinical_rules_un_brouillon_actif_par_lignee"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle")
    WHERE "actif" AND "valide_par" IS NULL;

-- CreateIndex — une seule version validée active par lignée. Index partiel,
-- SQL-seul.
CREATE UNIQUE INDEX "clinical_rules_une_validee_active_par_lignee"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle")
    WHERE "actif" AND "valide_par" IS NOT NULL;
