-- Unicité d'une assignation OUVERTE par couple (patient, questionnaire).
--
-- POURQUOI UN INDEX ALORS QUE LE CODE GARDE DÉJÀ. Le lot précédent (#588) a posé
-- la vérification sur les quatre chemins d'écriture, sous verrou de la ligne
-- patient. Elle tient — mais elle tient parce que quatre appelants pensent à la
-- prendre, et rien ne le rappellera au cinquième. L'index déplace la garantie
-- du côté qui ne s'oublie pas : une insertion en double échoue, quel que soit le
-- chemin, y compris un `psql` d'exploitation ou un script d'import.
--
-- POURQUOI PARTIEL, ET PAS UNE CONTRAINTE UNIQUE ORDINAIRE. Une unicité globale
-- sur (id_patient, id_questionnaire) interdirait de RÉASSIGNER un instrument
-- déjà complété — la repassation en réévaluation, qui est un geste du produit.
-- Le prédicat exclut donc les états terminaux : une assignation complétée ou
-- annulée n'empêche jamais d'en créer une nouvelle.
--
-- LE PRÉDICAT EST LE MÊME QUE CELUI DU CODE, mot pour mot :
-- `STATUTS_ASSIGNATION_TERMINAL = ['Complété', 'Annulée']`
-- (`web/src/lib/assignations/dedup.ts`). Deux définitions de « ouvert » qui
-- divergeraient donneraient une base qui refuse ce que le code accepte, ou
-- l'inverse — l'un des deux mentirait au praticien. Le contrat SQL
-- `prisma/checks/assignations_unicite_ouverte_v1.sql` et le banc
-- `web/src/lib/assignations/dedup.migration.test.ts` rendent cet alignement
-- exécutable, au lieu de le laisser à ce commentaire.
--
-- L'INDEX NE DÉRIVE PAS DU SCHÉMA. Prisma ne sait pas déclarer d'index partiel,
-- il vit donc en SQL brut ici. Un commentaire du dépôt affirmait depuis le
-- 2026-07-23 qu'un tel index « ferait dériver le contrôle schéma ↔ migrations »,
-- et un lot y avait renoncé pour cette raison. C'était une prudence, jamais une
-- mesure : le palier complet a été joué dans un worktree avec cette migration
-- appliquée (50 migrations, dont celle-ci), et l'étape « Dérive schéma ↔
-- migrations » est verte. `migrate diff` compare les colonnes et les contraintes
-- déclaratives ; un index supplémentaire n'en est pas une.

-- ── 1. RATTACHEMENT DES DONNÉES — avant toute annulation ───────────────────
--
-- MESURE DU 2026-08-05 : 7 couples (patient, questionnaire) portent plus d'une
-- assignation ouverte, sur 3 patients, pour 14 lignes. Douze de ces lignes sont
-- vides. Les deux autres ne le sont pas, et c'est ce qui a fait réécrire ce
-- backfill : PAT017 porte deux assignations ouvertes du même agenda de sommeil,
-- et le patient a saisi une nuit sur CHACUNE — le 29 juillet sur l'une, le 30
-- sur l'autre. Il a alterné entre les deux exemplaires, ce qui est exactement le
-- symptôme du défaut que ce lot referme.
--
-- Une première rédaction annulait « tout sauf la plus ancienne » en affirmant
-- qu'« aucune réponse n'est touchée, ces lignes n'ayant jamais été complétées ».
-- L'équivalence est fausse : « pas complétée » n'est pas « vide ». Un agenda
-- reste `En attente` PENDANT TOUT LE RECUEIL (`api/praticien/agenda-sommeil/
-- suivi`), donc une assignation ouverte peut porter des semaines de saisie. La
-- nuit du 29 juillet serait devenue illisible de toutes les surfaces — le
-- portail, le suivi praticien et l'écran alimentaire excluent tous une
-- assignation annulée — sans disparaître de la base : perdue sans trace.
--
-- On déplace donc les données vers la ligne conservée AVANT de l'annuler. Aucune
-- de ces trois tables ne porte de contrainte d'unicité sur (id_assignation,
-- date) : le déplacement ne peut pas échouer techniquement.
UPDATE "questionnaire_reponses" r
SET "id_assignation" = g."id_assignation"
FROM "assignations" a, "assignations" g
WHERE r."id_assignation" = a."id_assignation"
  AND a."statut" NOT IN ('Complété', 'Annulée')
  AND g."id_patient" = a."id_patient"
  AND g."id_questionnaire" = a."id_questionnaire"
  AND g."statut" NOT IN ('Complété', 'Annulée')
  AND (g."date_assignation" < a."date_assignation"
       OR (g."date_assignation" = a."date_assignation" AND g."id" < a."id"))
  AND NOT EXISTS (
    SELECT 1 FROM "assignations" x
    WHERE x."id_patient" = a."id_patient" AND x."id_questionnaire" = a."id_questionnaire"
      AND x."statut" NOT IN ('Complété', 'Annulée')
      AND (x."date_assignation" < g."date_assignation"
           OR (x."date_assignation" = g."date_assignation" AND x."id" < g."id"))
  );

UPDATE "agenda_sommeil_nuits" n
SET "id_assignation" = g."id_assignation"
FROM "assignations" a, "assignations" g
WHERE n."id_assignation" = a."id_assignation"
  AND a."statut" NOT IN ('Complété', 'Annulée')
  AND g."id_patient" = a."id_patient"
  AND g."id_questionnaire" = a."id_questionnaire"
  AND g."statut" NOT IN ('Complété', 'Annulée')
  AND (g."date_assignation" < a."date_assignation"
       OR (g."date_assignation" = a."date_assignation" AND g."id" < a."id"))
  AND NOT EXISTS (
    SELECT 1 FROM "assignations" x
    WHERE x."id_patient" = a."id_patient" AND x."id_questionnaire" = a."id_questionnaire"
      AND x."statut" NOT IN ('Complété', 'Annulée')
      AND (x."date_assignation" < g."date_assignation"
           OR (x."date_assignation" = g."date_assignation" AND x."id" < g."id"))
  );

UPDATE "agenda_alimentaire_jours" j
SET "id_assignation" = g."id_assignation"
FROM "assignations" a, "assignations" g
WHERE j."id_assignation" = a."id_assignation"
  AND a."statut" NOT IN ('Complété', 'Annulée')
  AND g."id_patient" = a."id_patient"
  AND g."id_questionnaire" = a."id_questionnaire"
  AND g."statut" NOT IN ('Complété', 'Annulée')
  AND (g."date_assignation" < a."date_assignation"
       OR (g."date_assignation" = a."date_assignation" AND g."id" < a."id"))
  AND NOT EXISTS (
    SELECT 1 FROM "assignations" x
    WHERE x."id_patient" = a."id_patient" AND x."id_questionnaire" = a."id_questionnaire"
      AND x."statut" NOT IN ('Complété', 'Annulée')
      AND (x."date_assignation" < g."date_assignation"
           OR (x."date_assignation" = g."date_assignation" AND x."id" < g."id"))
  );

-- ── 2. POURQUOI IL N'Y A PAS DE GARDE ICI ─────────────────────────────────
--
-- Le rattachement réunit sous une même assignation des saisies qui vivaient
-- sous deux. Une rédaction précédente interrompait la migration si une date se
-- retrouvait alors portée deux fois, au motif qu'« on ne saurait pas laquelle
-- fait foi ». Cette garde a été RETIRÉE : les deux prémisses étaient fausses.
--
-- 1. LE DOMAINE SAIT DÉJÀ TRANCHER. `resolveNuitsActives`
--    (`lib/agenda-sommeil/nuit.ts`) définit la nuit courante d'une date comme la
--    tête de chaîne, « la plus récente en cas d'égalité », et garantit « une
--    seule nuit active par date ». Deux lignes de même date ne sont donc pas une
--    ambiguïté : elles sont résolues par `soumis_le`, exactement comme
--    aujourd'hui quand un patient corrige une saisie.
--
-- 2. LE CAS EST NOMINAL, PAS EXCEPTIONNEL. Les deux agendas sont append-only
--    (« create SEUL — jamais d'update »), mais l'agenda du SOMMEIL ne chaîne pas
--    ses corrections : `AgendaSommeilJournal` poste sans `supersedesNuitId`, à la
--    différence de l'agenda alimentaire. Corriger une nuit produit donc deux
--    têtes non chaînées de même date — le geste patient le plus banal. C'est ce
--    qui explique la mesure du 2026-08-05 : 4 couples (assignation, date)
--    portent deux lignes, dont 3 non chaînés.
--
-- Une garde qui s'arme sur un geste ordinaire, pour un cas que le produit résout
-- déjà, n'est pas une sécurité : c'est un échec de `migrate deploy` en attente,
-- sur une base où rien n'est cassé. Le rattachement laisse au domaine ce qui lui
-- appartient.
--
-- CE QUE CELA IMPLIQUE, ET QUI EST ASSUMÉ : après fusion, une date portée par
-- les deux exemplaires n'affichera que la saisie la plus récemment soumise.
-- L'autre reste en base, jamais détruite. C'est le comportement déjà en vigueur
-- pour toute correction.

-- ── 3. BACKFILL — annuler les doublons désormais vides ─────────────────────
--
-- QUELLE LIGNE SURVIT : la plus ANCIENNE. C'est la première intention du
-- praticien, et c'est surtout ce que fait désormais le code, qui écarte les qids
-- déjà ouverts et conserve donc l'existant. Un backfill qui garderait la plus
-- récente contredirait la garde qu'il accompagne. Le choix ne coûte plus rien
-- aux données depuis l'étape 1 : elles ont rejoint la survivante.
--
-- DÉTERMINISTE MÊME À HORODATAGE ÉGAL : deux assignations d'un même pack
-- partagent `date_assignation` à la milliseconde (`packs/assign` et
-- `assignBasePack` calculent un seul instant pour toute la boucle). La
-- comparaison retombe alors sur `id`, unique — sans ce départage, l'`UPDATE`
-- pourrait annuler les deux lignes d'un couple, ou aucune. `(date, id)` est un
-- ordre total strict : le minimum n'a aucun témoin et survit, tout autre élément
-- a le minimum pour témoin et est annulé. Vrai à 2, 3 ou n lignes.
--
-- IDEMPOTENT : rejoué sur une base déjà nettoyée, il ne trouve plus aucune ligne
-- ayant une antérieure ouverte, et ne touche rien.
--
-- CE QUE CELA CHANGE POUR LE PATIENT, exactement : l'exemplaire en trop quitte
-- la liste de ses questionnaires à répondre et rejoint la section des
-- assignations closes, où le hub le badge « Expiré » (`lib/portail/
-- hubQuestionnaires.ts`). Le libellé est imparfait — la ligne n'a pas expiré,
-- elle a été retirée — mais il est celui qui existe, et l'exemplaire conservé
-- reste ouvert et répondable, avec les saisies des deux.
--
-- CE QUE CELA NE CHANGE PAS : les compteurs praticien. `metrics`, `fil` et
-- `instruments` comptent `statut != 'Complété'` ou `statutReponses !=
-- 'verrouille'` : une ligne annulée y reste comptée « en cours ». C'est
-- pré-existant et hors périmètre de cette migration, mais il ne faut pas
-- attendre de ce nettoyage qu'il fasse bouger un chiffre côté praticien.
UPDATE "assignations" a
SET "statut" = 'Annulée',
    "updated_at" = now()
WHERE a."statut" NOT IN ('Complété', 'Annulée')
  AND EXISTS (
    SELECT 1
    FROM "assignations" b
    WHERE b."id_patient" = a."id_patient"
      AND b."id_questionnaire" = a."id_questionnaire"
      AND b."statut" NOT IN ('Complété', 'Annulée')
      AND (
        b."date_assignation" < a."date_assignation"
        OR (b."date_assignation" = a."date_assignation" AND b."id" < a."id")
      )
  );

-- ── 4. L'INDEX ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "assignations_unicite_ouverte_idx"
  ON "assignations" ("id_patient", "id_questionnaire")
  WHERE "statut" NOT IN ('Complété', 'Annulée');
