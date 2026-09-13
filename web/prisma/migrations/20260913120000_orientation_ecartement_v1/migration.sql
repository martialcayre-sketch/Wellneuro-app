-- ÉCARTEMENT PRATICIEN D'UNE PROPOSITION D'ORIENTATION — le geste qui manquait.
--
-- Migration demandée explicitement par le responsable le 2026-09-13, après que
-- la contrainte a été posée devant lui : les recommandations sont RECALCULÉES à
-- chaque lecture depuis la table signée, aucune ligne ne porte l'état d'une
-- proposition, et « je ne veux plus voir celle-ci » n'était pas exprimable.
--
-- ── POURQUOI UNE TABLE, ET PAS UN ÉTAT D'ÉCRAN ─────────────────────────────
--
-- Un écartement non tracé était le seul à refuser. Faire disparaître une
-- proposition motivée par un claim, sans auteur, sans date et sans motif écrit,
-- c'est la suppression silencieuse d'une discordance que DC-30 interdit. Un
-- écartement de session, lui, ne tient pas d'une consultation à l'autre — donc
-- ne répond pas au besoin.
--
-- ── APPEND-ONLY, ET LA REPRISE EST UNE ESPÈCE ──────────────────────────────
--
-- Reprendre une proposition écartée n'est pas l'effacement de l'écartement :
-- c'est un SECOND GESTE, avec son auteur, sa date et son motif. Une paire
-- `repris_le`/`repris_par` aurait écrit en place et perdu le premier motif.
-- L'état courant est la TÊTE de chaîne : `espece = 'ecartement'` → la cible est
-- écartée ; `espece = 'reprise'` → elle est revenue. Écarter, reprendre, écarter
-- de nouveau : trois lignes, un seul fil.
--
-- ── CE QUE `regles_au_geste` TIENT, ET CE N'EST PAS DÉCORATIF ──────────────
--
-- L'écartement porte sur la CIBLE — le geste que le praticien fait réellement.
-- Pris seul, ce choix ferait taire un axe qui n'a rien demandé : le Cungi
-- (`Q_STR_03`) est proposé par `R2-STR-02` depuis l'axe stress ET par
-- `R-SOM-01` depuis l'axe sommeil, et c'est l'objection exacte qui fait
-- renoncer à éteindre par cible dans `stopRulesV1.ts` (D-053 arbitrage 3).
--
-- D'où cette colonne : elle fige les règles qui motivaient la ligne à l'instant
-- du geste. Le lecteur RÉVEILLE la proposition dès qu'une règle ABSENTE de
-- cette liste vient la motiver — la ligne revient alors avec son nouveau motif.
-- Le geste reste simple, et une raison cliniquement neuve n'est jamais tue.
--
-- ── CE QUE LE SCHÉMA NE PEUT PAS TENIR ─────────────────────────────────────
--
-- Que la liste des règles soit une liste de RÈGLES et non de cibles : aucune
-- contrainte de base ne le sait. C'est la route qui le garde, et le contrat
-- négatif `orientation_ecartement_v1_negatif.sql` qui tient la régression de
-- tout ce qui EST exprimable ici — la forme de la cible, l'espèce fermée, le
-- motif non vide, la linéarité du fil, l'unicité de la racine.

CREATE TABLE "orientation_ecartements" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "cible_id" TEXT NOT NULL,
    "espece" TEXT NOT NULL,
    "regles_au_geste" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "motif" TEXT NOT NULL,
    "par_email" TEXT NOT NULL,
    "fait_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedes_ecartement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orientation_ecartements_pkey" PRIMARY KEY ("id")
);

-- LES DEUX ESPACES DE NOMS QUE LA CIBLE DISTINGUE, et rien d'autre. Préfixé
-- plutôt que scindé en deux colonnes nullables : un couple (type, id)
-- autoriserait une ligne sans type.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_cible_format"
  CHECK ("cible_id" ~ '^(questionnaire|pack):[A-Za-z0-9_]+$');

-- ESPÈCE FERMÉE. Ce qui compte comme un geste sur une proposition est un
-- arbitrage : en ajouter une demande une migration, donc une relecture.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_espece_check"
  CHECK ("espece" IN ('ecartement', 'reprise'));

-- LE MOTIF EST LA DÉCISION, pas une note facultative. Borne haute alignée sur
-- `decision_priority_selections.rationale` et `arbitrages_biologiques.note_courte`
-- — même nature d'objet, même borne.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_motif_check"
  CHECK (length(btrim("motif")) > 0 AND length("motif") <= 2000);

-- LES RÈGLES SONT EXIGÉES SUR UN ÉCARTEMENT, INTERDITES SUR UNE REPRISE. Sans
-- la première moitié, un écartement sans règles ne se réveillerait JAMAIS sur un
-- motif neuf — la garde de DC-30 tomberait en silence. Sans la seconde, une
-- reprise porterait une liste qui ne veut rien dire.
--
-- `COALESCE` DES DEUX CÔTÉS, ET CE N'EST PAS UNE PRÉCAUTION DE STYLE. Une
-- première rédaction écrivait `array_length(...) >= 1` à sec. Sur un tableau
-- VIDE, `array_length` rend NULL et non zéro : la condition valait NULL, et un
-- CHECK qui évalue à NULL PASSE — seul FALSE refuse. La garde centrale de cette
-- table ne mordait donc pas, et rien ne l'aurait dit sans le cas correspondant
-- du contrat négatif, qui l'a refusée avant tout déploiement.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_regles_par_espece"
  CHECK (
    ("espece" = 'ecartement' AND COALESCE(array_length("regles_au_geste", 1), 0) >= 1)
    OR ("espece" = 'reprise' AND COALESCE(array_length("regles_au_geste", 1), 0) = 0)
  );

-- ON DELETE RESTRICT, comme toutes ses sœurs : l'effacement d'un dossier est une
-- suppression NOMMÉE dans `patient/effacement.ts`. En CASCADE, ces lignes
-- deviendraient du code mort en silence, et le banc de complétude ne le verrait
-- pas.
ALTER TABLE "orientation_ecartements" ADD CONSTRAINT "orientation_ecartements_id_patient_fkey"
  FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LE FIL EST STRICTEMENT LINÉAIRE. Deux gestes chaînant sur la même ligne
-- seraient deux praticiens croyant chacun avoir tranché : la base refuse plutôt
-- que d'élire à la lecture.
CREATE UNIQUE INDEX "orientation_ecartement_supersedes_unique"
  ON "orientation_ecartements"("supersedes_ecartement_id");

-- UNE SEULE RACINE PAR (DOSSIER, CIBLE) — index PARTIEL, que Prisma ne sait pas
-- déclarer. Un index TOTAL sur (patient, cible) interdirait toute reprise, qui
-- est par construction une seconde ligne sur la même cible.
CREATE UNIQUE INDEX "orientation_ecartement_racine_unique"
  ON "orientation_ecartements"("id_patient", "cible_id")
  WHERE "supersedes_ecartement_id" IS NULL;

-- Lecture de service : « le fil de cette cible pour ce dossier », du plus
-- ancien au plus récent.
CREATE INDEX "orientation_ecartement_cible_idx"
  ON "orientation_ecartements"("id_patient", "cible_id", "fait_le");

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."orientation_ecartements" ENABLE ROW LEVEL SECURITY;
