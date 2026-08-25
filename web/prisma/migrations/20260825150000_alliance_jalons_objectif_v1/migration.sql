-- Alliance 6.0-B LOT-05 — la réponse d'étape du patient (UNE table événement).
-- Migration confirmée explicitement par le responsable le 2026-08-25 (gate
-- ouvert en session ; gate humain = approbation release-db avant application).
--
-- ADDITIVE UNIQUEMENT : une table nouvelle, aucune table existante modifiée,
-- aucun DROP, aucun renommage, aucun backfill. Rollback = abandon de la table ;
-- rien d'existant n'en dépend.
--
-- POURQUOI UNE TABLE PROPRE PLUTÔT QU'UN ÉLARGISSEMENT DE `protocol_checkins`.
-- Celle-ci est ancrée à un PROTOCOLE : `protocol_draft_id` et `id_assignation`
-- sont NOT NULL, si bien qu'une réponse d'étape portant sur un OBJECTIF — qui
-- n'a ni protocole ni assignation — y serait inécrivable sans relâcher deux
-- colonnes porteuses. Et sa taxonomie de point d'étape est J7/J14/J21, quand
-- les jalons de l'objectif sont ceux de `JOURS_JALON` (J21/J42/J90) : la
-- fusionner l'aurait rendue bilingue sur ses DEUX axes. C'est le raisonnement
-- de `D-094` §2 pour l'amendement, appliqué au même endroit.
--
-- DEUX DATES, jamais confondues (patron de toute la campagne) : `repondu_le`
-- est une DONNÉE, nullable — la colonne de DÉCLARATION, sœur d'`exprime_le` et
-- de `geste_le`, qui reste nulle tant que personne ne déclare de date ;
-- `cree_le` est le moment de l'écriture, posé par la base (DEFAULT
-- CURRENT_TIMESTAMP), jamais par l'appelant — inantidatable.
--
-- APPEND-ONLY PAR CONVENTION : aucune route d'update. `id_objectif` est une
-- référence SOUPLE, sans FK — existence, appartenance au dossier et ancrage à
-- la version exacte sont vérifiés à la route du LOT-05, comme pour la
-- ratification et l'amendement.
--
-- AUCUNE COLONNE DE SCORE, SEUIL, BANDE, RANG NI TAUX D'ATTEINTE. L'interdit
-- de forme est tenu par la liste blanche de colonnes du contrat
-- `prisma/checks/alli_jalons_objectif_v1_negatif.sql`. Toute colonne future
-- doit modifier CE contrat.

-- CreateTable — où le patient en est PAR RAPPORT À SON OBJECTIF, à un jalon.
CREATE TABLE "reponses_jalon_objectif" (
    "id" TEXT NOT NULL,
    "id_patient" TEXT NOT NULL,
    "id_objectif" TEXT NOT NULL,
    "jalon" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "eva" INTEGER,
    "repondu_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reponses_jalon_objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex — lecture du dossier : (id_patient, cree_le), un seul index
-- (patron de la campagne).
CREATE INDEX "alli_reponse_jalon_patient_idx" ON "reponses_jalon_objectif"("id_patient", "cree_le");

-- AddForeignKey — RESTRICT et jamais CASCADE : l'effacement d'un dossier est un
-- geste NOMMÉ (`effacerDossier`, garde de complétude), pas un effet de bord de
-- FK. Une FK en CASCADE rendrait ce code mort en silence.
ALTER TABLE "reponses_jalon_objectif" ADD CONSTRAINT "reponses_jalon_objectif_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier — hors périmètre Prisma, portées par le SQL seul.

-- Le texte n'est pas une chaîne vide : une réponse d'étape sans mots n'est pas
-- une réponse. C'est le même invariant que celui de l'amendement, et il compte
-- davantage ici — l'EVA étant facultative, une ligne au texte vide serait un
-- chiffre nu déposé dans un dossier, exactement ce que ce lot refuse de
-- produire.
--
-- `btrim(texte, E' \t\r\n')` ET NON `btrim(texte)`, et l'écart n'est pas
-- cosmétique : `btrim/1` ne retire QUE L'ESPACE ASCII. Un texte fait d'une
-- tabulation et d'un retour ligne passait donc la contrainte — mesuré, pas
-- supposé (revue du lot). La ligne écrite aurait été exactement le « chiffre nu
-- déposé dans un dossier » que ce CHECK prétend interdire.
--
-- LE PRÉCÉDENT PORTE LE MÊME TROU : `amendements_objectif_texte_check`
-- (LOT-01) et les CHECK de texte de 6.0-A emploient `btrim/1`. Ils sont
-- APPLIQUÉS EN PRODUCTION — les resserrer est une migration à part, avec son
-- arbitrage : dette nommée au fichier de lot, pas corrigée en passant.
ALTER TABLE "reponses_jalon_objectif"
  ADD CONSTRAINT "reponses_jalon_objectif_texte_check"
    CHECK (btrim("texte", E' \t\r\n') <> '');

-- TAXONOMIE DE JALON — trois valeurs, et `T0` N'EN FAIT PAS PARTIE.
--
-- Ce n'est pas un oubli : `T0` est l'ANCRE des fenêtres, le moment où
-- l'objectif se pose. Demander à cet instant « où en êtes-vous par rapport à
-- votre objectif » n'aurait pas de sens — il n'y a encore rien derrière soi.
-- Les trois valeurs sont celles de `JOURS_JALON` moins son ancre ; toute autre
-- est refusée en base comme elle l'est à la route.
ALTER TABLE "reponses_jalon_objectif"
  ADD CONSTRAINT "reponses_jalon_objectif_jalon_check"
    CHECK ("jalon" IN ('J21', 'J42', 'J90'));

-- L'EVA — BORNE PUREMENT TECHNIQUE DE SAISIE, identifiée comme telle
-- (`DC-19`/`DC-20`), et c'est tout ce que ce CHECK dit.
--
-- Il ne pose AUCUN seuil, AUCUNE bande, AUCUNE direction : rien dans le dépôt
-- ne lit cette valeur pour en conclure quoi que ce soit, aucune moyenne ni
-- courbe n'en est tirée, et elle n'entre dans aucun moteur. Elle est RESTITUÉE
-- BRUTE au praticien, qui l'interprète avec son patient — c'est le régime que
-- `D-088` a établi pour l'EVA sans interprétation, appliqué ici sans l'élargir.
--
-- 0-10 est l'échelle de SAISIE retenue, pas une grille : si un instrument
-- publié (Goal Attainment Scaling ou autre) devait un jour structurer cette
-- mesure, ce serait une décision de PROVENANCE dédiée, hors de ce lot.
ALTER TABLE "reponses_jalon_objectif"
  ADD CONSTRAINT "reponses_jalon_objectif_eva_check"
    CHECK ("eva" IS NULL OR ("eva" >= 0 AND "eva" <= 10));

-- Pas de CHECK « date non future » : Postgres refuse `now()` dans un CHECK
-- (fonction non immutable). Cette borne se garde côté route — dette nommée au
-- fichier de lot, reconduite de 6.0-A et de 6.0-B LOT-01.
--
-- Pas de contrainte d'UNICITÉ (id_patient, id_objectif, jalon) non plus, et
-- c'est délibéré : répondre deux fois au même jalon fait DEUX lignes, comme une
-- ratification et un amendement. Se raviser se dit en le disant ; la lecture
-- retient la plus récente. Un UNIQUE transformerait un second geste en erreur
-- technique, ou pousserait à l'upsert — c'est-à-dire à écraser ce que le
-- patient avait écrit.

-- Sécurité : deny-all RLS par défaut — défense en profondeur (posture D-005),
-- cohérente avec toutes les tables patient du schéma et assertée par le contrat
-- négatif. Cette table porte une parole de patient sur lui-même : le contenu le
-- plus nominatif du dossier, au même titre que les huit tables de la campagne.
ALTER TABLE "public"."reponses_jalon_objectif" ENABLE ROW LEVEL SECURITY;
