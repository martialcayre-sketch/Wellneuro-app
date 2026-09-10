-- Alliance 6.0-B — la provenance des trois textes de l'objectif (`D-167`).
-- Migration confirmée explicitement par le responsable le 2026-09-10 (feu vert
-- rendu en session : « go pour migration » ; gate humain = revue + go explicite
-- avant merge, puis `release-db` approuvée et CONSTATÉE par conteneur —
-- `D-087`).
--
-- ADDITIVE UNIQUEMENT : huit colonnes NULLABLES sur une table existante. Aucun
-- DROP, aucun renommage, aucun backfill, aucune valeur par défaut. Les 1 ligne
-- de production et toutes les futures écritures du code ACTUEL restent valides
-- sans rien connaître de ces colonnes — c'est la condition pour que la
-- migration parte SEULE, avant son code (`D-087`).
--
-- NULL VEUT DIRE « SES MOTS », PAS « ON NE SAIT PAS ». Un objectif rédigé
-- entièrement de la main du praticien — l'immense majorité à ce jour, et le
-- cas de l'unique ligne en production — les laisse toutes nulles. Ce n'est
-- jamais un défaut à combler, et aucun backfill ne doit venir « réparer »
-- l'existant : on ne connaît pas la provenance de ce qui a été écrit avant que
-- la question soit posée, et l'inventer serait pire que l'ignorer (`DC-24`).
--
-- PORTÉES PAR LA VERSION, PAS PAR LA CHAÎNE. Chaque ligne d'`objectifs_negocies`
-- est une version immuable ; sa provenance est une propriété de cette
-- version-là. Une révision qui reprend un texte à la main porte `null` même si
-- la version précédente était citée : c'est ce que « la marque tombe à la
-- réécriture » signifie en base (`D-167` §6).
--
-- TROIS CHAMPS, TROIS PROVENANCES INDÉPENDANTES. L'énoncé et la reformulation
-- se CITENT — une source, un identifiant. La priorité, seule des trois, vient
-- d'un APPEL : aucune source ne tient dans ses 200 caractères (`D-167` §3,
-- mesuré — `resume_praticien` va de 682 à 2 282 caractères en production). Elle
-- garde donc ses DEUX entrées et la version de son prompt : ce que le patient
-- lit sous « Priorité retenue » doit pouvoir se rejouer.
--
-- RÉFÉRENCES SOUPLES, SANS FK (patron `supersedes_objectif_id`, toute la
-- campagne) : existence et appartenance se vérifient à la route. L'unique FK
-- auto-référente du dépôt a compliqué le restore HDS, et on ne la reproduit pas.
--
-- AUCUNE COLONNE DE SCORE, DE RANG NI DE SEUIL, et l'interdit est tenu par la
-- liste blanche du contrat `prisma/checks/alli_objectif_provenance_v1_negatif.sql`.
-- `priorite_source` nomme une NATURE, jamais une position : `D-094` §3 interdit
-- jusqu'à la numérotation, et une colonne d'ordre rouvrirait `D-093`.
--
-- RLS : `objectifs_negocies` porte déjà `ENABLE ROW LEVEL SECURITY` en deny-all
-- depuis `alliance_dossier_deux_voix_v1`. Un `ADD COLUMN` ne la touche pas ; le
-- contrat le re-vérifie plutôt que de le supposer.

-- AlterTable — d'où vient chacun des trois textes.
ALTER TABLE "objectifs_negocies"
    ADD COLUMN "enonce_source"                 TEXT,
    ADD COLUMN "enonce_source_id"              TEXT,
    ADD COLUMN "reformulation_source"          TEXT,
    ADD COLUMN "reformulation_source_id"       TEXT,
    ADD COLUMN "priorite_source"               TEXT,
    ADD COLUMN "priorite_source_synthese_id"   TEXT,
    ADD COLUMN "priorite_source_depot_id"      TEXT,
    ADD COLUMN "priorite_prompt"               TEXT;

-- Natures admissibles — listes FERMÉES, une par champ. Étendre l'une d'elles
-- est une décision `D-xxx` neuve, pas une valeur de plus : chaque nature
-- désigne un chemin de code et une garde.
ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_enonce_source_valide"
    CHECK ("enonce_source" IS NULL OR "enonce_source" IN ('ce_qui_compte'));

ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_reformulation_source_valide"
    CHECK ("reformulation_source" IS NULL OR "reformulation_source" IN ('synthese_ia'));

ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_priorite_source_valide"
    CHECK ("priorite_source" IS NULL OR "priorite_source" IN ('proposition_ia'));

-- Une provenance et son identifiant vont ENSEMBLE, dans les deux sens. Une
-- source sans identifiant ne se rejoue pas ; un identifiant sans source est un
-- pointeur que rien ne qualifie.
ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_enonce_source_complete"
    CHECK (("enonce_source" IS NULL) = ("enonce_source_id" IS NULL));

ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_reformulation_source_complete"
    CHECK (("reformulation_source" IS NULL) = ("reformulation_source_id" IS NULL));

-- La priorité proposée exige sa synthèse ET son prompt : sans l'un ou l'autre,
-- l'appel n'est pas rejouable, et une proposition irrejouable n'est plus une
-- provenance, c'est une étiquette.
ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_priorite_source_complete"
    CHECK (
        "priorite_source" IS NOT NULL
        OR ("priorite_source_synthese_id" IS NULL
            AND "priorite_source_depot_id" IS NULL
            AND "priorite_prompt" IS NULL)
    );

ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_priorite_source_rejouable"
    CHECK (
        "priorite_source" IS NULL
        OR ("priorite_source_synthese_id" IS NOT NULL AND "priorite_prompt" IS NOT NULL)
    );

-- PAS DE PROVENANCE SANS TEXTE. Déclarer d'où vient un champ vide décrirait
-- l'origine de rien — et laisserait croire, en relecture, qu'un texte a existé
-- puis disparu. Le champ `enonce_patient` étant NOT NULL, seuls les deux
-- facultatifs ont besoin de la clause.
ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_reformulation_source_sans_texte"
    CHECK ("reformulation_source" IS NULL OR "reformulation_praticien" IS NOT NULL);

ALTER TABLE "objectifs_negocies"
    ADD CONSTRAINT "alli_objectif_priorite_source_sans_texte"
    CHECK ("priorite_source" IS NULL OR "priorite" IS NOT NULL);
