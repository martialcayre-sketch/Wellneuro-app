-- BP-10 : constat d'usage de l'acte de lecture, LECTURE SEULE, agrégats seuls (aucun identifiant, nom, e-mail).
-- Usage : depuis un conteneur `scalingo run -d`, encodé en base64 dans la commande puis passé à `psql -f -` (--file est refusé en détaché).
BEGIN READ ONLY;
\pset format aligned
\pset null '(null)'
SELECT 'horloge_base' AS libelle, now() AS valeur;
-- 01 imports par statut
SELECT 'imports_par_statut' AS libelle, statut, count(*) AS valeur FROM imports_biologiques GROUP BY statut ORDER BY statut;
-- 02 imports validés au sens de D-268 (>=1 validee, 0 proposee) / à décider / sans ligne validée
WITH i AS (
  SELECT im.id,
         count(*) FILTER (WHERE l.statut='validee')  AS v,
         count(*) FILTER (WHERE l.statut='proposee') AS p
  FROM imports_biologiques im LEFT JOIN lignes_biologiques_candidates l ON l.id_import = im.id
  GROUP BY im.id)
SELECT 'imports_par_etat_decision' AS libelle,
       CASE WHEN v>0 AND p=0 THEN 'valide' WHEN p>0 THEN 'a_decider' ELSE 'sans_ligne_validee' END AS etat,
       count(*) AS valeur FROM i GROUP BY 2 ORDER BY 2;
-- 03 actes par nature
SELECT 'actes_par_nature' AS libelle, acte, count(*) AS valeur FROM lectures_imports_biologiques GROUP BY acte ORDER BY acte;
-- 04 révocations par code
SELECT 'revocations_par_code' AS libelle, code_revocation, count(*) AS valeur
FROM lectures_imports_biologiques WHERE acte='revocation' GROUP BY code_revocation ORDER BY 2;
-- 05 lectures actives (non révoquées), imports et dossiers distincts
SELECT 'lectures_actives' AS libelle, count(*) AS lectures, count(DISTINCT id_import) AS imports, count(DISTINCT id_patient) AS dossiers
FROM lectures_imports_biologiques l
WHERE l.acte='lecture' AND NOT EXISTS (SELECT 1 FROM lectures_imports_biologiques r WHERE r.id_lecture_revoquee = l.id);
-- 06 imports validés sans lecture active (ce que la carte du Fil signale)
WITH i AS (
  SELECT im.id FROM imports_biologiques im
  WHERE EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import=im.id AND l.statut='validee')
    AND NOT EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import=im.id AND l.statut='proposee'))
SELECT 'imports_valides_sans_lecture_active' AS libelle, count(*) AS valeur FROM i
WHERE NOT EXISTS (SELECT 1 FROM lectures_imports_biologiques l WHERE l.id_import=i.id AND l.acte='lecture'
  AND NOT EXISTS (SELECT 1 FROM lectures_imports_biologiques r WHERE r.id_lecture_revoquee = l.id));
-- 07 bornes temporelles des actes, à la journée (UTC)
SELECT 'actes_premier_dernier_jour' AS libelle, min(acte_le)::date AS premier, max(acte_le)::date AS dernier FROM lectures_imports_biologiques;
-- 08 contexte : lignes par statut, comptes rendus purgés ou non
SELECT 'lignes_par_statut' AS libelle, statut, count(*) AS valeur FROM lignes_biologiques_candidates GROUP BY statut ORDER BY statut;
SELECT 'comptes_rendus' AS libelle, coalesce(motif_purge,'non_purge') AS etat, count(*) AS valeur FROM comptes_rendus_biologiques GROUP BY 2 ORDER BY 2;
SELECT 'resultats_par_source' AS libelle, source, count(*) AS valeur FROM resultats_biologiques GROUP BY source ORDER BY source;
ROLLBACK;
