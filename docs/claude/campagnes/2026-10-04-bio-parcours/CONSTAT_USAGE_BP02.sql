-- BP-02 : constat d'usage, LECTURE SEULE, agrégats seuls (aucun identifiant, nom, e-mail).
-- Usage : depuis un conteneur `scalingo run -d`, psql "$SCALINGO_POSTGRESQL_URL" -f CONSTAT_USAGE_BP02.sql
BEGIN READ ONLY;
\pset format aligned
\pset null '(null)'

-- 01 resultats_biologiques par source (toutes lignes, corrections comprises)
SELECT 'resultats_par_source' AS libelle, source, count(*) AS valeur
FROM resultats_biologiques GROUP BY source ORDER BY source;

-- 02 resultats_biologiques : têtes de série (hors corrections) vs corrections
SELECT 'resultats_tetes_vs_corrections' AS libelle,
       CASE WHEN supersedes_resultat_id IS NULL THEN 'saisie_neuve' ELSE 'correction' END AS nature,
       count(*) AS valeur
FROM resultats_biologiques GROUP BY 2 ORDER BY 2;

-- 03 resultats_biologiques : dossiers distincts concernés (agrégat)
SELECT 'dossiers_avec_resultat' AS libelle, count(DISTINCT id_patient) AS valeur FROM resultats_biologiques;

-- 04 lignes_biologiques_candidates par statut
SELECT 'lignes_par_statut' AS libelle, statut, count(*) AS valeur
FROM lignes_biologiques_candidates GROUP BY statut ORDER BY statut;

-- 05 lignes_biologiques_candidates par statut et statut_mapping
SELECT 'lignes_par_statut_mapping' AS libelle, statut, statut_mapping, count(*) AS valeur
FROM lignes_biologiques_candidates GROUP BY statut, statut_mapping ORDER BY statut, statut_mapping;

-- 06 lignes candidates par statut et version de procédé (modèle + version_prompt de l'import)
SELECT 'lignes_par_statut_procede' AS libelle, i.modele, i.version_prompt, l.statut, count(*) AS valeur
FROM lignes_biologiques_candidates l
JOIN imports_biologiques i ON i.id = l.id_import
GROUP BY i.modele, i.version_prompt, l.statut ORDER BY i.modele, i.version_prompt, l.statut;

-- 07 lignes écartées par motif (motif_ecart ; 'unite_divergente' = refus d'unité persisté)
SELECT 'lignes_ecartees_par_motif' AS libelle, motif_ecart, count(*) AS valeur
FROM lignes_biologiques_candidates WHERE statut = 'ecartee' GROUP BY motif_ecart ORDER BY motif_ecart;

-- 08 écart textuel d'unité (proxy, pas un refus) : unité lue ≠ unité du catalogue.
--    Lignes validées : analyte RETENU par le praticien (id_resultat → resultats_biologiques.analyte_code),
--    qui peut différer de analyte_propose (decisions.ts). Autres statuts : analyte proposé.
SELECT 'lignes_unite_lue_differe_catalogue' AS libelle, l.statut, count(*) AS valeur
FROM lignes_biologiques_candidates l
LEFT JOIN resultats_biologiques r ON r.id = l.id_resultat AND l.statut = 'validee'
JOIN biology_analytes a ON a.code = CASE WHEN l.statut = 'validee' THEN r.analyte_code ELSE l.analyte_propose END
WHERE l.unite_lue IS DISTINCT FROM a.unite
GROUP BY l.statut ORDER BY l.statut;

-- 09 imports par statut
SELECT 'imports_par_statut' AS libelle, statut, count(*) AS valeur
FROM imports_biologiques GROUP BY statut ORDER BY statut;

-- 10 imports échec par motif (code fermé)
SELECT 'imports_echec_par_motif' AS libelle, motif_echec, count(*) AS valeur
FROM imports_biologiques WHERE statut = 'echec' GROUP BY motif_echec ORDER BY motif_echec;

-- 11 imports non décidés (au moins une ligne encore 'proposee')
SELECT 'imports_non_decides' AS libelle, count(*) AS valeur
FROM imports_biologiques i
WHERE EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import = i.id AND l.statut = 'proposee');

-- 12 lignes proposées non décidées (total) et ancienneté max en jours de leur import
SELECT 'lignes_proposees_non_decidees' AS libelle, count(*) AS valeur,
       max(floor(extract(epoch FROM (now() - i.lance_le)) / 86400))::int AS anciennete_max_jours
FROM lignes_biologiques_candidates l JOIN imports_biologiques i ON i.id = l.id_import
WHERE l.statut = 'proposee';

-- 13 comptes rendus biologiques : déposés / purgés / non purgés, par motif de purge
SELECT 'comptes_rendus' AS libelle,
       count(*) AS deposes,
       count(*) FILTER (WHERE purge_le IS NOT NULL) AS purges,
       count(*) FILTER (WHERE purge_le IS NULL) AS non_purges,
       count(*) FILTER (WHERE contenu IS NOT NULL) AS contenu_present
FROM comptes_rendus_biologiques;
SELECT 'comptes_rendus_purges_par_motif' AS libelle, motif_purge, count(*) AS valeur
FROM comptes_rendus_biologiques WHERE purge_le IS NOT NULL GROUP BY motif_purge ORDER BY motif_purge;
SELECT 'comptes_rendus_par_type_mime' AS libelle, type_mime, count(*) AS valeur
FROM comptes_rendus_biologiques GROUP BY type_mime ORDER BY type_mime;

-- 14 véhicule 1 : intentions conditionnelle_biologie dans protocol_drafts.payload->'actions' (toutes versions)
SELECT 'v1_drafts_intentions_cond_bio' AS libelle, d.contract_version, d.status,
       count(DISTINCT d.id) AS drafts, count(*) AS intentions
FROM protocol_drafts d,
     jsonb_array_elements(CASE WHEN jsonb_typeof(d.payload->'actions') = 'array' THEN d.payload->'actions' ELSE '[]'::jsonb END) AS act
WHERE act->>'interventionStatus' = 'conditionnelle_biologie'
GROUP BY d.contract_version, d.status ORDER BY 2, 3;

-- 15 véhicule 1 : statut d'intervention de toutes les actions (V4) pour situer la proportion
SELECT 'v1_actions_par_interventionStatus' AS libelle, act->>'interventionStatus' AS statut_intervention, count(*) AS valeur
FROM protocol_drafts d,
     jsonb_array_elements(CASE WHEN jsonb_typeof(d.payload->'actions') = 'array' THEN d.payload->'actions' ELSE '[]'::jsonb END) AS act
GROUP BY 2 ORDER BY 2;

-- 16 véhicule 1 : intentions conditionnelle_biologie sur la VERSION ACTIVE, une par (dossier, carte de décision),
--    comme resolveActiveVersion (versioning.ts) : têtes non supplantées, puis created_at puis id décroissants.
WITH tetes AS (
  SELECT d.* FROM protocol_drafts d
  WHERE NOT EXISTS (SELECT 1 FROM protocol_drafts s WHERE s.supersedes_draft_id = d.id
                      AND s.id_patient = d.id_patient AND s.decision_card_id = d.decision_card_id)
), actives AS (
  SELECT DISTINCT ON (id_patient, decision_card_id) *
  FROM tetes ORDER BY id_patient, decision_card_id, created_at DESC, id DESC
)
SELECT 'v1_cond_bio_sur_version_active' AS libelle, count(DISTINCT d.id) AS drafts, count(*) AS intentions
FROM actives d,
     jsonb_array_elements(CASE WHEN jsonb_typeof(d.payload->'actions') = 'array' THEN d.payload->'actions' ELSE '[]'::jsonb END) AS act
WHERE act->>'interventionStatus' = 'conditionnelle_biologie';

-- 17 véhicule 1 : arbitrages biologiques rendus, par verdict
SELECT 'arbitrages_par_verdict' AS libelle, verdict, count(*) AS valeur
FROM arbitrages_biologiques GROUP BY verdict ORDER BY verdict;

-- 18 véhicule 2 : clinical_rules portant une condition biologique (colonne condition_biologie)
SELECT 'v2_clinical_rules_condition_biologie' AS libelle, actif, count(*) AS valeur
FROM clinical_rules WHERE condition_biologie IS NOT NULL GROUP BY actif ORDER BY actif;

-- 19 clinical_rules : total, actives
SELECT 'clinical_rules_total' AS libelle, count(*) AS total, count(*) FILTER (WHERE actif) AS actives FROM clinical_rules;

-- 20 biology_analyte_links : total, actifs
SELECT 'biology_analyte_links_total' AS libelle, count(*) AS total, count(*) FILTER (WHERE actif) AS actifs FROM biology_analyte_links;

-- 21 diffusions de protocole (approbations) : total, dossiers distincts, drafts distincts
SELECT 'diffusions_protocole' AS libelle, count(*) AS total,
       count(DISTINCT id_patient) AS dossiers, count(DISTINCT protocol_draft_id) AS drafts
FROM protocol_diffusion_approvals;

-- 22 diffusions de protocole par version de contrat du draft diffusé
SELECT 'diffusions_par_contract_version' AS libelle, d.contract_version, count(*) AS valeur
FROM protocol_diffusion_approvals a JOIN protocol_drafts d ON d.id = a.protocol_draft_id
GROUP BY d.contract_version ORDER BY d.contract_version;

-- 23 check-ins par point d'étape et dossiers distincts
SELECT 'checkins_par_point' AS libelle, point_etape, count(*) AS valeur, count(DISTINCT id_patient) AS dossiers
FROM protocol_checkins GROUP BY point_etape ORDER BY point_etape;
SELECT 'checkins_total' AS libelle, count(*) AS valeur FROM protocol_checkins;

-- 24 versions de protocole 21 jours : protocol_drafts par version de contrat (V1..V4) et statut
SELECT 'drafts_par_contract_version' AS libelle, contract_version, status, count(*) AS valeur
FROM protocol_drafts GROUP BY contract_version, status ORDER BY contract_version, status;

-- 25 drafts : version déclarée dans le payload (contrôle de cohérence avec contract_version)
SELECT 'drafts_par_payload_version' AS libelle, payload->>'version' AS version_payload, count(*) AS valeur
FROM protocol_drafts GROUP BY 2 ORDER BY 2;

-- 26 drafts : dossiers distincts, drafts avec au moins une diffusion, drafts avec au moins un check-in
SELECT 'drafts_synthese' AS libelle, count(*) AS drafts, count(DISTINCT id_patient) AS dossiers,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM protocol_diffusion_approvals a WHERE a.protocol_draft_id = d.id)) AS diffuses,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM protocol_checkins c WHERE c.protocol_draft_id = d.id)) AS avec_checkin
FROM protocol_drafts d;

-- 27 comptes : patients (total / actifs) et praticiens distincts (pas de table praticien : praticien_email des dossiers, compté seulement)
SELECT 'patients' AS libelle, count(*) AS total, count(*) FILTER (WHERE actif) AS actifs,
       count(DISTINCT praticien_email) AS praticiens_distincts
FROM patients;

-- 28 dossiers « actifs » avec activité biologique / protocole (agrégats croisés)
SELECT 'dossiers_actifs_avec_bio_ou_protocole' AS libelle,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM resultats_biologiques r WHERE r.id_patient = p.id_patient)) AS avec_resultat,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM comptes_rendus_biologiques c WHERE c.id_patient = p.id_patient)) AS avec_compte_rendu,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM protocol_drafts d WHERE d.id_patient = p.id_patient)) AS avec_protocole
FROM patients p WHERE p.actif;

-- 29 SAF-EI-01 : signalements d'effet indésirable par statut de traitement
SELECT 'ei_par_statut_traitement' AS libelle, statut_traitement, count(*) AS valeur
FROM trust_adverse_effect_reports GROUP BY statut_traitement ORDER BY statut_traitement;

-- 30 SAF-EI-01 : par sévérité déclarée, orientation, règle et version de règle
SELECT 'ei_par_severite_orientation_regle' AS libelle, severite_declaree, orientation, regle_id, regle_version, count(*) AS valeur
FROM trust_adverse_effect_reports GROUP BY 2, 3, 4, 5 ORDER BY 2, 3, 4, 5;

-- 31 SAF-EI-01 : association à une intervention (colonnes D-101) et dossiers distincts
SELECT 'ei_association' AS libelle, count(*) AS total,
       count(*) FILTER (WHERE protocol_draft_id IS NOT NULL) AS avec_protocole,
       count(*) FILTER (WHERE debut_prise_le IS NOT NULL) AS avec_debut_prise_le,
       count(*) FILTER (WHERE debut_symptomes_le IS NOT NULL) AS avec_debut_symptomes_le,
       count(DISTINCT id_patient) AS dossiers,
       count(*) FILTER (WHERE statut_traitement IN ('recu','en_cours')) AS non_traites
FROM trust_adverse_effect_reports;

ROLLBACK;
