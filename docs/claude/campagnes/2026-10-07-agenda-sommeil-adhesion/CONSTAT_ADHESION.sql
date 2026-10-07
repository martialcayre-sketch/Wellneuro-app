-- Agenda du sommeil (Q_SOM_09) : constat d'adhésion, LECTURE SEULE, agrégats seuls (aucun identifiant, nom, e-mail).
-- Usage : depuis un conteneur `scalingo run -d`, encodé en base64 puis passé à `psql -f -` (--file est refusé en détaché).
-- Fenêtre d'un agenda = 21 nuits à partir de la PREMIÈRE nuit saisie (lib/agenda-sommeil/fenetre.ts).
-- Saisie possible pour aujourd'hui ou la veille seulement (estDateSaisissable) : au-delà, la nuit est perdue.
BEGIN READ ONLY;
\pset format aligned
\pset null '(null)'
SELECT 'horloge_base' AS libelle, now() AS valeur;

-- 01 assignations Q_SOM_09 par statut
SELECT '01_assignations_par_statut' AS libelle, statut, count(*) AS valeur
FROM assignations WHERE id_questionnaire = 'Q_SOM_09' GROUP BY statut ORDER BY statut;

-- Une ligne par assignation, nuits ACTIVES = dates distinctes (une correction ne crée pas de nuit).
-- Une transaction READ ONLY refuse tout CREATE, vues temporaires comprises : le CTE est porté par une variable psql.
-- `attendues` = nuits écoulées depuis la première saisie (plafond 21) ; `fenetre_echue` = 21 nuits écoulées.
\set A 'n AS (SELECT id_assignation, count(*) AS lignes, count(DISTINCT date_nuit) AS nuits, min(date_nuit)::date AS premiere, max(date_nuit)::date AS derniere, min(soumis_le) AS premiere_saisie FROM agenda_sommeil_nuits GROUP BY id_assignation), a AS (SELECT s.statut, s.date_assignation, coalesce(n.lignes, 0) AS lignes, coalesce(n.nuits, 0) AS nuits, n.premiere, n.derniere, n.premiere_saisie, CASE WHEN n.premiere IS NULL THEN NULL ELSE least(21, (current_date - n.premiere) + 1) END AS attendues, (n.premiere IS NOT NULL AND current_date >= n.premiere + 20) AS fenetre_echue FROM assignations s LEFT JOIN n ON n.id_assignation = s.id_assignation WHERE s.id_questionnaire = \'Q_SOM_09\' AND s.statut <> \'Annulée\')'


-- 02 entonnoir : assigné → commencé → ≥7 / ≥14 / ≥21 nuits → transmis (Complété)
WITH :A
SELECT '02_entonnoir' AS libelle,
       count(*)                                        AS assignes,
       count(*) FILTER (WHERE nuits >= 1)              AS commences,
       count(*) FILTER (WHERE nuits >= 7)              AS au_moins_7,
       count(*) FILTER (WHERE nuits >= 14)             AS au_moins_14,
       count(*) FILTER (WHERE nuits >= 21)             AS au_moins_21,
       count(*) FILTER (WHERE statut = 'Complété')     AS transmis
FROM a;

-- 03 assignations jamais commencées, par ancienneté (exclut le délai de grâce de 2 jours)
WITH :A
SELECT '03_jamais_commences_par_anciennete' AS libelle,
       CASE WHEN current_date - date_assignation::date <= 2 THEN 'a_0_2j'
            WHEN current_date - date_assignation::date <= 7 THEN 'b_3_7j'
            WHEN current_date - date_assignation::date <= 21 THEN 'c_8_21j'
            ELSE 'd_plus_21j' END AS anciennete,
       count(*) AS valeur
FROM a WHERE nuits = 0 GROUP BY 2 ORDER BY 2;

-- 04 TAUX DE RÉPONSE (complétude) sur les fenêtres ÉCHUES : nuits saisies / 21
WITH :A
SELECT '04_completude_fenetres_echues' AS libelle,
       count(*) AS agendas,
       round(avg(nuits::numeric / 21) * 100, 1)                         AS completude_moy_pct,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY nuits)               AS nuits_mediane,
       sum(nuits) AS nuits_saisies, count(*) * 21 AS nuits_attendues,
       round(sum(nuits)::numeric / nullif(count(*) * 21, 0) * 100, 1)   AS completude_globale_pct
FROM a WHERE fenetre_echue;

-- 05 TAUX DE RÉPONSE sur les fenêtres EN COURS : nuits saisies / nuits écoulées
WITH :A
SELECT '05_completude_fenetres_en_cours' AS libelle,
       count(*) AS agendas,
       sum(nuits) AS nuits_saisies, sum(attendues) AS nuits_attendues,
       round(sum(nuits)::numeric / nullif(sum(attendues), 0) * 100, 1) AS completude_pct
FROM a WHERE nuits >= 1 AND NOT fenetre_echue;

-- 06 distribution des nuits saisies (histogramme par tranche)
WITH :A
SELECT '06_distribution_nuits' AS libelle,
       CASE WHEN nuits = 0 THEN '00' WHEN nuits <= 3 THEN '01_03' WHEN nuits <= 7 THEN '04_07'
            WHEN nuits <= 14 THEN '08_14' WHEN nuits <= 20 THEN '15_20' ELSE '21' END AS tranche,
       count(*) AS valeur
FROM a GROUP BY 2 ORDER BY 2;

-- 07 décrochage : position de la dernière nuit saisie dans la fenêtre (agendas commencés, échus, non complets)
WITH :A
SELECT '07_decrochage_jour_derniere_nuit' AS libelle,
       CASE WHEN (derniere - premiere) + 1 <= 1 THEN 'j01'
            WHEN (derniere - premiere) + 1 <= 3 THEN 'j02_03'
            WHEN (derniere - premiere) + 1 <= 7 THEN 'j04_07'
            WHEN (derniere - premiere) + 1 <= 14 THEN 'j08_14'
            ELSE 'j15_21' END AS jour,
       count(*) AS valeur
FROM a WHERE nuits >= 1 AND fenetre_echue AND nuits < 21 GROUP BY 2 ORDER BY 2;

-- 08 délai assignation → première saisie (jours)
WITH :A
SELECT '08_delai_premiere_saisie_j' AS libelle,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY premiere_saisie::date - date_assignation::date) AS mediane,
       max(premiere_saisie::date - date_assignation::date) AS maxi, count(*) AS agendas
FROM a WHERE premiere_saisie IS NOT NULL;

-- 09 friction : taux de correction (lignes − nuits) et part des nuits saisies en rattrapage J-1
SELECT '09_corrections_et_rattrapage' AS libelle,
       count(*) AS lignes,
       count(*) - count(DISTINCT (id_assignation, date_nuit))                     AS corrections,
       count(*) FILTER (WHERE (soumis_le AT TIME ZONE 'Europe/Paris')::date > date_nuit::date) AS saisies_le_lendemain
FROM agenda_sommeil_nuits;

-- 10 heure de saisie (Paris) : le geste est-il fait le matin ?
SELECT '10_heure_saisie_paris' AS libelle,
       extract(hour FROM soumis_le AT TIME ZONE 'Europe/Paris')::int AS heure, count(*) AS valeur
FROM agenda_sommeil_nuits GROUP BY 2 ORDER BY 2;

-- 11 version du contrat et branches conditionnelles (charge réelle du formulaire)
SELECT '11_contrat_et_branches' AS libelle,
       reponses->>'contractVersion' AS contrat,
       count(*) AS nuits,
       count(*) FILTER (WHERE (reponses->>'extinctionImmediate')::boolean IS FALSE) AS mise_au_lit_differee,
       count(*) FILTER (WHERE (reponses->>'leverImmediat')::boolean IS FALSE)       AS lever_differe,
       count(*) FILTER (WHERE reponses ? 'facteurs')                                 AS details_ouverts
FROM agenda_sommeil_nuits GROUP BY 2 ORDER BY 2;
ROLLBACK;
