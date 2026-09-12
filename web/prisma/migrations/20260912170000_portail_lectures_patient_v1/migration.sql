-- CE QUE LE PATIENT A DÉJÀ LU — un accusé par VERSION remise, et rien d'autre.
--
-- Campagne « la vie du portail patient », LOT-08. Migration demandée
-- explicitement par le responsable le 2026-09-12, après que la contrainte a
-- été posée devant lui : le fil du jour doit porter les LECTURES (un nouveau
-- bilan, une nouvelle synthèse) et elles doivent DISPARAÎTRE une fois lues.
--
-- ── POURQUOI LE REPÈRE EXISTANT NE POUVAIT PAS LE FAIRE ────────────────────
--
-- `portail_journal_reperes` porte UN SEUL instant par dossier (`id_patient` en
-- clé primaire). Il répond à « jusqu'où ce patient a vu », jamais à « a-t-il
-- ouvert CELUI-CI ». S'en servir pour les lectures aurait imposé de lister du
-- plus ancien au plus récent et d'avancer le repère à la date ouverte : lire le
-- plus RÉCENT d'abord aurait fait disparaître les précédents, sans que le
-- patient l'ait demandé ni su. Un document remis qui s'efface tout seul est
-- exactement ce qu'un dossier de santé ne doit pas faire.
--
-- ── CE QUE CETTE TABLE PEUT DEVENIR, ET IL FAUT LE DIRE ────────────────────
--
-- LE REPÈRE RENDAIT UN DÉCOMPTE IMPOSSIBLE. CELLE-CI NE LE REND PAS, et
-- prétendre le contraire serait faux : plusieurs lignes par dossier,
-- `count(*)` répond. Ce qui est vrai, et ce qui borne le risque :
--
--   1. Le compte est BORNÉ PAR CE QUE LE CABINET A REMIS. Il ne peut pas
--      dépasser le nombre de documents transmis. Il ne dit rien des
--      connexions, ni de leur fréquence, ni de leur durée — c'était tout le
--      danger du décompte d'assiduité que `portail_journal_reperes` ferme.
--   2. AUCUN INSTANT N'EST CONSERVÉ. Trois colonnes, aucune date : « quand le
--      patient a-t-il ouvert son bilan » est STRUCTURELLEMENT sans réponse.
--      C'est la seule impossibilité que cette table offre, et elle est choisie.
--      Une colonne `lu_le` n'aurait servi à rien au fil du jour — qui ne
--      consulte que l'EXISTENCE de la ligne — et aurait servi à autre chose.
--   3. Elle alimente L'ÉCRAN DU PATIENT, et lui seul. Aucune surface praticien
--      ne la lit. Ce point n'est pas tenu par le schéma — il ne peut pas
--      l'être — mais par un banc de garde du dépôt
--      (`portailLecturesPatient.guard.test.ts`), qui refuse toute référence
--      depuis `api/praticien/` ou `patient-cockpit/`. C'est une garde de
--      dépôt, pas une contrainte de base : il faut la lire comme telle.
--
-- ── POURQUOI PAS DE COLONNE DE VERSION ─────────────────────────────────────
--
-- Parce que l'identifiant EST déjà celui de la version, et c'est vérifié :
-- `syntheses_comprehension` ne connaît que `create` — une republication est une
-- LIGNE NEUVE portant `supersedes_synthese_id`, jamais un `publiee_le` réécrit.
-- `booklet_envois` de même : chaque envoi est une ligne. Une version remplacée
-- porte donc un autre `id_objet`, la lecture ancienne ne l'acquitte pas, et la
-- tâche reparaît au fil du jour. Si un jour une publication se faisait EN
-- PLACE, cette table mentirait en silence — d'où le banc qui épingle l'absence
-- d'`update` sur ces deux modèles.
--
-- ── L'ESPÈCE EST FERMÉE, ET C'EST VOULU ────────────────────────────────────
--
-- `CHECK (espece IN ('bilan','synthese'))`. Ce qui compte comme une LECTURE du
-- patient est un arbitrage, pas un champ libre : ajouter une espèce demande une
-- migration, donc une relecture. Sans la contrainte, une surface pourrait
-- inscrire « objectif », « questionnaire », « connexion » — et la table
-- deviendrait le journal de présence que la campagne s'interdit.

CREATE TABLE "portail_lectures_patient" (
    "id_patient" TEXT NOT NULL,
    "espece" TEXT NOT NULL,
    "id_objet" TEXT NOT NULL,

    CONSTRAINT "portail_lectures_patient_pkey" PRIMARY KEY ("id_patient", "espece", "id_objet")
);

ALTER TABLE "portail_lectures_patient"
  ADD CONSTRAINT "portail_lectures_patient_espece_check"
  CHECK ("espece" IN ('bilan', 'synthese'));

-- ON DELETE RESTRICT, comme toutes ses sœurs : l'effacement d'un dossier est
-- une suppression NOMMÉE dans `patient/effacement.ts`. En CASCADE, ces lignes
-- deviendraient du code mort en silence.
ALTER TABLE "portail_lectures_patient" ADD CONSTRAINT "portail_lectures_patient_id_patient_fkey"
  FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PAS D'INDEX SUPPLÉMENTAIRE. La seule lecture du fil est « toutes les lectures
-- de CE patient », et l'index de la clé primaire la sert déjà par son préfixe
-- `id_patient`. Un index de plus ne servirait qu'une requête transverse — du
-- type « qui n'a pas ouvert son bilan » — que rien ne doit poser.

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."portail_lectures_patient" ENABLE ROW LEVEL SECURITY;
