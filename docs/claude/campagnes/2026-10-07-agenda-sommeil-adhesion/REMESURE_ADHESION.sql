-- Agenda du sommeil (Q_SOM_09) : RE-MESURE d'adhésion par cohortes (LOT-02), LECTURE SEULE, agrégats seuls
-- (aucun identifiant, nom, e-mail). Même usage que CONSTAT_ADHESION.sql : depuis un conteneur `scalingo run -d`,
-- encodé en base64 puis passé à `psql -f -`.
--
-- COHORTES. Les changements d'interface sont arrivés en deux temps : LOT-01 le 2026-10-07, puis LOT-03, LOT-05 et
-- LOT-04 (contrat v4) le 2026-10-08. Un agenda est rangé selon ce que le patient a VU pendant sa fenêtre :
--   a_avant      — fenêtre entièrement close avant `av` (aucun changement vu) : c'est la mesure de référence,
--                  reconstituée après coup puisque les nuits sont en base (le LOT-00 n'a pas été joué à temps) ;
--   c_apres      — première nuit le `ap` ou après (tout vu, depuis la première nuit) ;
--   b_transition — le reste : une fenêtre à cheval, exposée aux deux interfaces. Comptée, jamais mêlée aux deux autres.
-- Les bornes se surchargent : `psql -v av=2026-10-07 -v ap=2026-10-09 -f -`.
--
-- HEURES. `soumis_le` et `date_assignation` sont des TIMESTAMP SANS fuseau qui portent l'heure UTC (Prisma) : une
-- date ou une heure de Paris s'en tire par `(x AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris'`. Un seul
-- `AT TIME ZONE 'Europe/Paris'` lirait l'heure UTC comme une heure de Paris et décalerait tout de deux heures.
--
-- LECTURE. Les effectifs sont petits : ce script rend des COMPTES et des taux descriptifs, aucun test ni seuil.
-- Un écart entre cohortes se lit avec son effectif, et ne s'attribue pas à un lot plutôt qu'à un autre
-- (arbitrage du 2026-10-07 : LOT-01 et LOT-03 indiscernables, accepté).
\if :{?av}
\else
\set av 2026-10-07
\endif
\if :{?ap}
\else
\set ap 2026-10-09
\endif
BEGIN READ ONLY;
\pset format aligned
\pset null '(null)'
SELECT 'horloge_base' AS libelle, now() AS valeur, :'av'::date AS borne_avant, :'ap'::date AS borne_apres;

-- Une ligne par assignation (hors annulées). Nuits ACTIVES = dates distinctes. `cohorte_fenetre` range un agenda
-- commencé ; `cohorte_assignation` range toute assignation par sa date (Paris), pour l'entonnoir et le délai.
\set A 'n AS (SELECT id_assignation, count(*) AS lignes, count(DISTINCT date_nuit) AS nuits, min(date_nuit)::date AS premiere, max(date_nuit)::date AS derniere, min(soumis_le) AS premiere_saisie FROM agenda_sommeil_nuits GROUP BY id_assignation), a AS (SELECT s.statut, ((s.date_assignation AT TIME ZONE \'UTC\') AT TIME ZONE \'Europe/Paris\')::date AS assigne_le, coalesce(n.nuits, 0) AS nuits, n.premiere, n.derniere, ((n.premiere_saisie AT TIME ZONE \'UTC\') AT TIME ZONE \'Europe/Paris\')::date AS premiere_saisie_le, CASE WHEN n.premiere IS NULL THEN NULL ELSE least(21, (current_date - n.premiere) + 1) END AS attendues, (n.premiere IS NOT NULL AND current_date >= n.premiere + 20) AS fenetre_echue FROM assignations s LEFT JOIN n ON n.id_assignation = s.id_assignation WHERE s.id_questionnaire = \'Q_SOM_09\' AND s.statut <> \'Annulée\'), c AS (SELECT a.*, CASE WHEN premiere IS NULL THEN NULL WHEN premiere + 20 < :\'av\'::date THEN \'a_avant\' WHEN premiere >= :\'ap\'::date THEN \'c_apres\' ELSE \'b_transition\' END AS cohorte_fenetre, CASE WHEN assigne_le < :\'av\'::date THEN \'a_avant\' WHEN assigne_le >= :\'ap\'::date THEN \'c_apres\' ELSE \'b_transition\' END AS cohorte_assignation FROM a)'

-- R01 entonnoir par cohorte d'ASSIGNATION. `assignes_7j` : assignations d'au moins 7 jours, seules à avoir eu le
-- temps de commencer — c'est sur elles que se lit le taux de démarrage.
WITH :A
SELECT 'R01_entonnoir_par_cohorte_assignation' AS libelle, cohorte_assignation AS cohorte,
       count(*)                                                   AS assignes,
       count(*) FILTER (WHERE current_date - assigne_le >= 7)     AS assignes_7j,
       count(*) FILTER (WHERE current_date - assigne_le >= 7 AND nuits >= 1) AS commences_parmi_7j,
       count(*) FILTER (WHERE nuits >= 7)                         AS au_moins_7,
       count(*) FILTER (WHERE nuits >= 14)                        AS au_moins_14,
       count(*) FILTER (WHERE nuits >= 21)                        AS au_moins_21,
       count(*) FILTER (WHERE statut = 'Complété')                AS transmis
FROM c GROUP BY 2 ORDER BY 2;

-- R02 TAUX DE RÉPONSE sur les fenêtres ÉCHUES, par cohorte de FENÊTRE : nuits saisies / 21.
WITH :A
SELECT 'R02_completude_fenetres_echues' AS libelle, cohorte_fenetre AS cohorte,
       count(*) AS agendas,
       sum(nuits) AS nuits_saisies, count(*) * 21 AS nuits_attendues,
       round(sum(nuits)::numeric / nullif(count(*) * 21, 0) * 100, 1) AS completude_pct,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY nuits)             AS nuits_mediane,
       count(*) FILTER (WHERE nuits >= 14)                            AS au_moins_14
FROM c WHERE fenetre_echue GROUP BY 2 ORDER BY 2;

-- R03 TAUX DE RÉPONSE sur les fenêtres EN COURS : nuits saisies / nuits écoulées.
WITH :A
SELECT 'R03_completude_fenetres_en_cours' AS libelle, cohorte_fenetre AS cohorte,
       count(*) AS agendas,
       sum(nuits) AS nuits_saisies, sum(attendues) AS nuits_attendues,
       round(sum(nuits)::numeric / nullif(sum(attendues), 0) * 100, 1) AS completude_pct
FROM c WHERE nuits >= 1 AND NOT fenetre_echue GROUP BY 2 ORDER BY 2;

-- R04 décrochage : position de la dernière nuit saisie (fenêtres échues, incomplètes).
WITH :A
SELECT 'R04_decrochage_jour_derniere_nuit' AS libelle, cohorte_fenetre AS cohorte,
       CASE WHEN (derniere - premiere) + 1 <= 1 THEN 'j01'
            WHEN (derniere - premiere) + 1 <= 3 THEN 'j02_03'
            WHEN (derniere - premiere) + 1 <= 7 THEN 'j04_07'
            WHEN (derniere - premiere) + 1 <= 14 THEN 'j08_14'
            ELSE 'j15_21' END AS jour,
       count(*) AS valeur
FROM c WHERE nuits >= 1 AND fenetre_echue AND nuits < 21 GROUP BY 2, 3 ORDER BY 2, 3;

-- R05 délai assignation → première saisie (jours, Paris), par cohorte d'assignation.
WITH :A
SELECT 'R05_delai_premiere_saisie_j' AS libelle, cohorte_assignation AS cohorte,
       count(*) AS agendas,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY premiere_saisie_le - assigne_le) AS mediane,
       max(premiere_saisie_le - assigne_le) AS maxi
FROM c WHERE premiere_saisie_le IS NOT NULL GROUP BY 2 ORDER BY 2;

-- R06 friction par cohorte de fenêtre : corrections (lignes − dates) et saisies le lendemain (rattrapage J-1).
\set N 'l AS (SELECT x.id_assignation, x.date_nuit, ((x.soumis_le AT TIME ZONE \'UTC\') AT TIME ZONE \'Europe/Paris\') AS soumis_paris, x.reponses FROM agenda_sommeil_nuits x), f AS (SELECT n.id_assignation, CASE WHEN min(n.date_nuit)::date + 20 < :\'av\'::date THEN \'a_avant\' WHEN min(n.date_nuit)::date >= :\'ap\'::date THEN \'c_apres\' ELSE \'b_transition\' END AS cohorte FROM agenda_sommeil_nuits n GROUP BY n.id_assignation)'
WITH :N
SELECT 'R06_corrections_et_rattrapage' AS libelle, f.cohorte,
       count(*) AS lignes,
       count(*) - count(DISTINCT (l.id_assignation, l.date_nuit))       AS corrections,
       count(*) FILTER (WHERE l.soumis_paris::date > l.date_nuit::date) AS saisies_le_lendemain
FROM l JOIN f USING (id_assignation) GROUP BY 2 ORDER BY 2;

-- R07 contrat écrit par cohorte : une cohorte « après » doit être en v4, une « avant » ne peut pas l'être. Un écart
-- signale une borne mal placée, pas un résultat.
WITH :N
SELECT 'R07_contrat_par_cohorte' AS libelle, f.cohorte, l.reponses->>'contractVersion' AS contrat, count(*) AS lignes
FROM l JOIN f USING (id_assignation) GROUP BY 2, 3 ORDER BY 2, 3;

-- R08 « je ne sais pas » (v4, D-271) : part des nuits v4 qui l'emploient, question par question.
SELECT 'R08_je_ne_sais_pas_v4' AS libelle,
       count(*) AS lignes_v4,
       count(*) FILTER (WHERE reponses->>'latence' = 'inconnu')                 AS latence_inconnue,
       count(*) FILTER (WHERE reponses->'reveils'->>'dureeTotale' = 'inconnu')  AS eveil_inconnu,
       count(*) FILTER (WHERE reponses->>'latence' = 'inconnu'
                          AND reponses->'reveils'->>'dureeTotale' = 'inconnu')  AS les_deux
FROM agenda_sommeil_nuits WHERE reponses->>'contractVersion' = 'agenda-sommeil-v4';

-- R09 heure de saisie (Paris), par cohorte : le geste est-il fait le matin, et le rappel du matin (LOT-05) le
-- déplace-t-il ? Le rappel ne laisse aucune trace serveur : seule l'heure de saisie peut en porter l'écho.
WITH :N
SELECT 'R09_heure_saisie_paris' AS libelle, f.cohorte, extract(hour FROM l.soumis_paris)::int AS heure, count(*) AS valeur
FROM l JOIN f USING (id_assignation) GROUP BY 2, 3 ORDER BY 2, 3;
ROLLBACK;
