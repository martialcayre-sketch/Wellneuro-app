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
-- ── LES SIX CONTRÔLES DUS À LA ROUTE ───────────────────────────────────────
--
-- Écrits ICI, et pas seulement promis : le précédent [[D-124]] inscrit ses
-- « contrôles dus » au Done de son lot, et une obligation qui ne vit dans aucun
-- fichier n'est pas une obligation. Les contraintes ci-dessous ferment tout ce
-- qu'une contrainte de base PEUT fermer ; ces six-là ne le sont pas, et ce sont
-- elles seules qui empêchent deux têtes de chaîne sur une même cible.
--
--   1. `regles_au_geste` contient des identifiants de RÈGLES, jamais de cibles.
--      Aucune contrainte ne le sait, et la distinction porte tout l'arbitrage
--      ([[D-053]] arbitrage 3).
--   2. `supersedes_ecartement_id` non nul DOIT désigner une ligne EXISTANTE.
--      Référence souple, sans clé étrangère (patron des chaînes `supersedes_*`
--      du dépôt) : un id inventé est accepté par la base, et la cible n'a alors
--      plus aucune tête.
--   3. …de la MÊME cible. Un chaînage cross-cible donne à la cible visée sa
--      racine PLUS cette ligne : deux têtes non supplantées.
--   4. …et du MÊME dossier. Sans ce contrôle, l'effacement IDP2 du dossier visé
--      laisse une chaîne orpheline dont la racine a disparu, sans que rien ne
--      rougisse.
--   5. …et qui est la TÊTE COURANTE de ce fil. Chaîner sur une ligne déjà
--      supplantée est refusé par l'unicité de `supersedes_ecartement_id`, mais
--      l'erreur rendue serait un 23505 opaque : la route doit le dire.
--   6. L'ALTERNANCE DES ESPÈCES. Une `reprise` en racine, ou un `ecartement`
--      supplantant un `ecartement`, sont représentables et n'ont aucun sens.
--
-- LA LECTURE DE LA TÊTE SE FAIT PAR LA CHAÎNE, jamais par `max(fait_le)`.
-- `fait_le` vaut `CURRENT_TIMESTAMP` — horodatage de TRANSACTION — sur une
-- colonne `TIMESTAMP(3)` : deux lignes écrites dans la même transaction portent
-- la même valeur, et deux transactions rapprochées peuvent partager la
-- milliseconde. La tête est la ligne qu'aucune autre ne supplante
-- (`NOT EXISTS (… WHERE supersedes_ecartement_id = e.id)`), et la marche doit
-- être BORNÉE EN PROFONDEUR : le CHECK non réflexif ferme `A→A`, mais un cycle
-- de longueur 2 (`A→B, B→A`) reste représentable — il produit des lignes qu'aucune
-- racine n'atteint, pas deux têtes, et une récursion sans borne y boucle.
--
-- ── L'ORTHOGRAPHE DE LA CIBLE, ET LE PIÈGE QU'ELLE TEND ────────────────────
--
-- Le CHECK fige `questionnaire:<id>` / `pack:<id>`. Le moteur, lui, porte DÉJÀ
-- une clé de cible — `cleCible` dans `orientationEngine.ts` — et elle s'écrit
-- `q:<qid>` / `p:<packId>`. Les deux ne sont pas interchangeables, et la route
-- qui passerait la sortie de `cleCible()` directement en `cible_id` se ferait
-- refuser par un 23514 opaque.
--
-- La forme LONGUE est canonique EN BASE, et c'est délibéré : `cleCible` est une
-- clé de déduplication interne au moteur, jamais persistée ni relue par un
-- humain ; `cible_id` est un enregistrement durable qu'un audit lit des mois
-- plus tard. La conversion est donc explicite, et elle appartient à la route.
--
-- ── CE QUE LE SCHÉMA NE PEUT PAS TENIR ─────────────────────────────────────
--
-- Le contrat négatif `orientation_ecartement_v1_negatif.sql` tient la régression
-- de tout ce qui EST exprimable ici — la forme de la cible, l'espèce fermée, le
-- motif non vide (tabulations comprises), l'auteur lisible, les règles exigées
-- et non nulles, la non-réflexivité, la linéarité du fil, l'unicité de la racine.

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
--
-- `btrim` REÇOIT SA LISTE DE CARACTÈRES, et c'est une correction de revue. Une
-- première rédaction écrivait `btrim("motif")` : `btrim/1` ne retire que l'espace
-- ASCII, si bien qu'un motif réduit à des TABULATIONS passait — exactement
-- l'écartement sans motif écrit que cette table existe pour refuser (`DC-30`).
-- Le piège est documenté depuis [[D-127]] (`c1_selection_priorite_praticien`,
-- en-tête du CHECK de `rationale`), et il a été reproduit ici avant d'être vu.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_motif_check"
  CHECK (btrim("motif", E' \t\r\n') <> '' AND char_length("motif") <= 2000);

-- UN ÉCARTEMENT SANS AUTEUR LISIBLE N'EST PAS ATTRIBUABLE. Même patron et même
-- borne que `decision_priority_selections.selected_by_check` — omis en première
-- rédaction, relevé en revue.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_par_email_check"
  CHECK (btrim("par_email", E' \t\r\n') <> '' AND char_length("par_email") <= 320);

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

-- ET AUCUN ÉLÉMENT VIDE NI NUL DANS LA LISTE — seconde moitié de la même garde,
-- relevée en revue. `array_length(ARRAY[NULL]::text[], 1)` vaut 1 : le CHECK
-- ci-dessus était satisfait par une liste qui ne contient AUCUNE règle réelle.
-- La direction du défaut dépendait alors du futur lecteur, et c'est ce qui le rend
-- grave : un lecteur SQL écrivant `NOT (regle = ANY(regles_au_geste))` obtient
-- NULL dès qu'un élément est nul — la ligne est filtrée, l'écartement ne se
-- réveille JAMAIS, et c'est la chute silencieuse de `DC-30` que la colonne existe
-- pour empêcher. Un lecteur JavaScript faillirait dans l'autre sens.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_regles_non_vides"
  CHECK (
    array_position("regles_au_geste", NULL) IS NULL
    AND NOT ('' = ANY("regles_au_geste"))
  );

-- ON DELETE RESTRICT, comme toutes ses sœurs : l'effacement d'un dossier est une
-- suppression NOMMÉE dans `patient/effacement.ts`. En CASCADE, ces lignes
-- deviendraient du code mort en silence, et le banc de complétude ne le verrait
-- pas.
ALTER TABLE "orientation_ecartements" ADD CONSTRAINT "orientation_ecartements_id_patient_fkey"
  FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- UNE LIGNE NE SE SUPPLANTE PAS ELLE-MÊME — et sans ce CHECK, l'index partiel de
-- racine ci-dessous ne gardait RIEN.
--
-- LE DÉFAUT, EN DEUX INSERT, tel que la revue l'a construit. Une ligne portant
-- `supersedes_ecartement_id = id` a un `supersedes` NON NUL : elle est donc HORS
-- de l'index partiel de racine. Le créneau racine de sa cible reste libre, une
-- seconde ligne s'y installe, et la cible porte DEUX fils. Selon la lecture
-- choisie, soit le premier geste et son motif disparaissent sans trace, soit il
-- faut départager — ce que la table prétend justement ne jamais avoir à faire.
--
-- Le précédent le dit en clair, et il a été manqué ici : « une ligne au
-- `supersedes` non nul est hors index par construction, si bien qu'un
-- `supersedes` accepté sans contrôle contournerait la garde anti-doublon autant
-- de fois qu'on veut » (`cb_resultat_correction_chainee`). [[D-127]] porte le même
-- CHECK, et son contrat l'éprouve.
ALTER TABLE "orientation_ecartements"
  ADD CONSTRAINT "orientation_ecartements_supersedes_non_reflexif"
  CHECK ("supersedes_ecartement_id" IS NULL OR "supersedes_ecartement_id" <> "id");

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
