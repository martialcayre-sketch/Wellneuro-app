-- Index sur questionnaire_reponses.id_assignation — le report nommé au LOT-07
-- de la campagne agenda alimentaire (2026-08-05) : « une PR de migration
-- distincte, avec confirmation explicite, avant que la table ne grossisse ».
--
-- ADDITIF UNIQUEMENT : un index, aucune colonne, aucune ligne modifiée. Le
-- client Prisma ne sélectionne rien de neuf : le code lit la table à
-- l'identique, avec ou sans l'index, quel que soit l'ordre dans lequel code
-- et migration atteignent la production (D-087).
--
-- POURQUOI : un lien souple sans index, lu par égalité ou par IN sur
-- id_assignation — par GET /api/praticien/patients
-- (idsAssignationsAvecPassation), par le comptage de
-- web/src/app/api/praticien/assignations/annulation/route.ts, et par la
-- clôture des deux agendas (agenda-sommeil/cloture.ts,
-- agenda-alimentaire/cloture.ts), dans la transaction, sous le verrou
-- FOR UPDATE posé sur la ligne d'assignations. id_questionnaire et
-- supersedes_reponse_id restent sans index propre : hors de ce report.
--
-- CONSTATÉ EN PRODUCTION AVANT ÉCRITURE (2026-09-26, conteneur, lecture
-- seule) : 221 lignes ; trois index sur la table (clé primaire,
-- questionnaire_reponses_id_reponse_key, questionnaire_reponses_patient_validite_idx) ;
-- le nom posé ici est libre dans tout le schéma (to_regclass NULL) ;
-- id_assignation mesure au plus 28 octets. Un CREATE INDEX simple (non UNIQUE) n'échoue pas
-- sur des identifiants de cette taille ; sur 221 lignes, le verrou SHARE qu'il
-- prend (écritures suspendues, lectures libres) dure quelques millisecondes :
-- CONCURRENTLY n'aurait aucun objet.

-- CreateIndex
CREATE INDEX "questionnaire_reponses_id_assignation_idx"
    ON "questionnaire_reponses"("id_assignation");
