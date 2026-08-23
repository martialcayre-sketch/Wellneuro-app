-- LOT-05 « Doctrine exécutable » : l'effet indésirable reçoit son association
-- à une intervention ([[D-101]], `DC-42`).
--
-- CE QUE LA MIGRATION RÉPARE. `DC-42` interdit d'augmenter ou de poursuivre
-- automatiquement quand un symptôme est « temporellement associé à une
-- intervention ». La capture existait depuis le 2026-07-16 et elle est
-- complète — produit, dose, symptômes, sévérité, action prise —, mais
-- l'ASSOCIATION n'y était pas : `produit_libelle` est du texte libre saisi par
-- le patient, `debut_prise` et `debut_symptomes` sont des TEXT que rien ne
-- contraint à être des dates. La règle n'était pas « non appliquée », elle
-- était INAPPLICABLE : aucune requête ne pouvait établir ce qu'elle exige.
--
-- POURQUOI DES COLONNES PLUTÔT QU'UNE ANALYSE DU TEXTE LIBRE. Rapprocher
-- « Magnésium bisglycinate » d'une ligne de protocole par similarité de
-- libellé serait une DÉDUCTION, et l'interdit du lot la nomme : l'association
-- se déclare, elle ne s'infère pas. Le patient désigne le protocole qu'il
-- suit ; la machine ne devine pas lequel.
--
-- TROIS COLONNES NULLABLES, ET AUCUNE SUPPRESSION. `debut_prise` et
-- `debut_symptomes` RESTENT : ce sont les mots du patient, et un signalement
-- déjà déposé n'a pas à perdre les siens parce qu'une colonne typée arrive
-- après lui. Les signalements antérieurs portent donc `NULL` sur les trois
-- colonnes neuves — et `NULL` se lit « je ne sais pas si c'est associé »,
-- jamais « ce n'est pas associé » (`DC-24`). Un `DEFAULT` ici, sous quelque
-- forme que ce soit, serait une affirmation clinique que personne n'a
-- prononcée.
ALTER TABLE "trust_adverse_effect_reports"
  ADD COLUMN "protocol_draft_id" TEXT,
  ADD COLUMN "debut_prise_le" TIMESTAMP(3),
  ADD COLUMN "debut_symptomes_le" TIMESTAMP(3);

-- L'association pointe une ligne RÉELLE. `ON DELETE SET NULL` plutôt que
-- `CASCADE` : un protocole supprimé ne doit pas emporter le signalement du
-- patient — le signalement est SA parole, elle survit à l'objet qu'elle vise.
-- Le rattachement se perd, le fait déclaré demeure.
-- Nom de contrainte à la convention Prisma (`<table>_<colonne>_fkey`) : c'est
-- celui que `migrate diff` attend, et un nom abrégé ferait rougir la garde de
-- dérive schéma ↔ migrations sans rien changer au comportement.
ALTER TABLE "trust_adverse_effect_reports"
  ADD CONSTRAINT "trust_adverse_effect_reports_protocol_draft_id_fkey"
    FOREIGN KEY ("protocol_draft_id") REFERENCES "protocol_drafts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- LA COHÉRENCE TEMPORELLE EST UNE CONTRAINTE, PAS UN CONTRÔLE DE FORMULAIRE.
-- Un symptôme déclaré ANTÉRIEUR au début de la prise ne peut pas être
-- « temporellement associé » à elle au sens de `DC-42` : la ligne serait un
-- fait que la règle lirait à l'envers. Le CHECK ne s'applique que lorsque les
-- DEUX dates existent — il ne force personne à les renseigner.
--
-- Aucune borne de durée n'est posée : « combien de jours après la prise un
-- symptôme reste associé » est un seuil clinique, et aucune source du dépôt ne
-- le fixe (`DC-19`). La contrainte dit l'ordre, jamais l'écart.
ALTER TABLE "trust_adverse_effect_reports"
  ADD CONSTRAINT "trust_aer_chronologie_check"
    CHECK (
      "debut_prise_le" IS NULL
      OR "debut_symptomes_le" IS NULL
      OR "debut_symptomes_le" >= "debut_prise_le"
    );

-- Index de lecture du chemin d'interruption : la chaîne C1 demande « ce dossier
-- porte-t-il un signalement non clos ? » à chaque construction de carte.
CREATE INDEX IF NOT EXISTS "trust_aer_patient_statut_idx"
  ON "trust_adverse_effect_reports" ("id_patient", "statut_traitement");
