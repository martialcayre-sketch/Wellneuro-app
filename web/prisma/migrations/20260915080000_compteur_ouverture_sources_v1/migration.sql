-- COMBIEN DE FOIS « VOIR LES SOURCES ET LIMITES » EST OUVERT — et rien d'autre.
--
-- Campagne « identité et cycle de vie des éléments d'un brouillon », suite des
-- trois travaux nommés par le responsable. Le panneau porte la provenance des
-- candidats (`DC-34`) et les limitations servies (`DC-35`) : c'est la surface
-- d'explicabilité de la carte de décision. Rien ne dit aujourd'hui si elle est
-- ouverte, ni si elle l'est une fois sur deux ou une fois sur cent.
--
-- ── DEUX ESPÈCES, PARCE QU'UN COMPTE D'OUVERTURES SEUL NE VEUT RIEN DIRE ───
--
-- « 40 ouvertures » est un nombre qui se lit comme un résultat et n'en est pas.
-- Sans son DÉNOMINATEUR — combien de fois le panneau a été AFFICHÉ — il ne
-- distingue pas une surface consultée systématiquement d'une surface ignorée
-- quatre-vingt-dix-neuf fois sur cent. C'est le défaut que cette campagne
-- poursuit depuis son premier lot, et l'inscrire ici serait le refaire.
--
-- `affichage` compte les montages de la carte, `ouverture` les dépliements.
-- Le taux est leur quotient, et il ne se calcule pas autrement.
--
-- ── CE QUE SA FORME TIENT, ET CE QU'ELLE NE TIENT PAS ─────────────────────
--
-- Le dépôt a déjà tranché ce cas exact sur `portail_lectures_patient`, qui se
-- prive de toute colonne de date pour que « quand le patient a-t-il ouvert son
-- bilan » reste STRUCTURELLEMENT sans réponse. Le danger est ici le même, et il
-- vise le praticien : un journal de qui a ouvert quel dossier et quand serait
-- une surveillance de l'exercice, et un second registre d'accès sur les
-- patients par-dessus `journal_acces_dossiers`.
--
-- Quatre absences, toutes choisies :
--
--   1. AUCUN `id_patient`. Le quotient ne le demande pas. Avec lui, la table
--      répondrait à « sur quels dossiers le panneau reste fermé », qui est une
--      autre question et qui n'a pas été posée.
--   2. AUCUNE IDENTITÉ DE PRATICIEN. Mesurer une surface n'est pas mesurer
--      quelqu'un. « Ce praticien n'ouvre jamais les limitations » est une phrase
--      que cette table doit être incapable de produire.
--   3. AUCUN INSTANT, seulement un JOUR. La granularité utile à un taux est la
--      journée ; l'heure ne sert qu'à recouper avec autre chose.
--   4. AUCUNE LIGNE PAR ÉVÉNEMENT. Un agrégat, pas un journal : il n'existe pas
--      de rang à ré-identifier.
--
-- CE QUE CETTE FORME NE TIENT PAS, dit plutôt que laissé croire. Elle n'anonymise
-- rien : un jour où un seul praticien est actif, ses ouvertures lui sont
-- attribuables par croisement avec `journal_acces_dossiers`, qui conserve
-- praticien, dossier et horodatage. Aucune colonne supplémentaire n'est
-- nécessaire. Le risque est borné par le volume d'activité, et maximal
-- aujourd'hui. Ce qui reste vrai, et c'est ce qui est garanti : cette table
-- N'AJOUTE AUCUN IDENTIFIANT que le dossier ne détienne déjà.
--
-- C'est pourquoi cette table s'INCRÉMENTE au lieu de s'empiler, et c'est le seul
-- endroit du dépôt où un `UPDATE` vaut mieux qu'un `append`. Ailleurs l'ajout
-- seul protège une trace clinique contestable ; ici, empiler FABRIQUERAIT la
-- granularité qu'on vient de refuser.
--
-- ── L'ESPÈCE EST FERMÉE ────────────────────────────────────────────────────
--
-- `CHECK (espece IN ('affichage','ouverture'))`, même raison que sa sœur du
-- portail : ce qui compte comme un geste mesuré est un arbitrage, pas un champ
-- libre. Ajouter une espèce demande une migration, donc une relecture.

CREATE TABLE "compteur_ouverture_sources" (
    "jour"   DATE    NOT NULL,
    "espece" TEXT    NOT NULL,
    "compte" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "compteur_ouverture_sources_pkey" PRIMARY KEY ("jour", "espece")
);

ALTER TABLE "compteur_ouverture_sources"
  ADD CONSTRAINT "compteur_ouverture_sources_espece_check"
  CHECK ("espece" IN ('affichage', 'ouverture'));

-- UN COMPTE N'EST JAMAIS NÉGATIF — et la promesse s'arrête là, il faut le dire.
-- Ce CHECK accepte `2 -> 1` : la MONOTONIE N'EST PAS TENUE par le schéma. Ce qui
-- la tient est la route, seul écrivain, et son `increment`. La table ne gardant
-- aucun événement, un décrément fautif ne serait pas reconstituable — d'où le
-- garde-fou minimal ici, et la mention explicite de ce qu'il ne couvre pas.
ALTER TABLE "compteur_ouverture_sources"
  ADD CONSTRAINT "compteur_ouverture_sources_compte_positif"
  CHECK ("compte" >= 0);

-- PAS D'INDEX SUPPLÉMENTAIRE. La seule lecture est « les compteurs sur une
-- période », que le préfixe `jour` de la clé primaire sert déjà.

-- PAS DE CLÉ ÉTRANGÈRE, et c'est la conséquence directe du point 1 : cette table
-- ne référence aucun dossier. L'effacement d'un patient (`patient/effacement.ts`)
-- n'a donc rien à y faire — il n'y a rien qui le concerne.

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."compteur_ouverture_sources" ENABLE ROW LEVEL SECURITY;
