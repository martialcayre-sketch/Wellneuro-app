-- Contrat de fraîcheur des claims épinglés par les tables de règles SIGNÉES
-- (LOT-01 de la campagne chaîne T0 — [[D-042]], précisé par [[D-044]]).
--
-- CE QU'IL GARDE. Une table de règles signée cite des claims du corpus par
-- paire `(claim_id, version_claim)`. La signature dit qu'un humain les a relus
-- ce jour-là ; elle ne dit rien de ce que le corpus est devenu depuis. Un claim
-- rejeté, désactivé, remplacé ou dépouillé de son caractère prescriptif laisse
-- la table intacte et sa signature muette. Ce contrat est le seul endroit où
-- cet écart se voit.
--
-- TROIS PROPRIÉTÉS POUR TOUS, UNE QUATRIÈME POUR CEUX QUI PRESCRIVENT.
-- `statut = 'VALIDE'`, `active = true`, pas de `superseded_at` valent pour tout
-- claim épinglé. `prescriptif = true` ne vaut que pour les tables qui
-- PRESCRIVENT — c'est le jeu que la relecture du 2026-08-06 a effectivement
-- contrôlé avant de re-signer la table d'orientation (`orientationRulesV1.ts`,
-- en-tête d'`ORIENTATION_METADATA`), dont chaque règle suggère une exploration.
-- [[D-046]] : une règle de contradiction CONSTATE au lieu de prescrire, et son
-- claim fondateur est descriptif.
--
-- L'EXIGENCE EST PORTÉE PAR CHAQUE LIGNE (`exige_prescriptif`), jamais déduite
-- du nom de la table. Un prédicat qui aurait testé `table_signee = 'orientation'`
-- aurait dispensé toute table FUTURE — celle des parcours (D-045), qui prescrit
-- pourtant — par le seul fait de ne pas porter ce nom. Fail-open, et silencieux.
--
-- POURQUOI CE FICHIER NE TOURNE PAS EN CI, ET CE N'EST PAS UN OUBLI. La base du
-- CI est construite par `migrate deploy` seul, donc VIDE : les claims épinglés y
-- sont tous absents et ce contrat y rougirait à chaque exécution. (Le nombre
-- n'est plus écrit ici : il disait « 24 » quand la liste en portait 53.) Il n'a de sens que
-- contre un corpus réel, donc contre la PRODUCTION, en préflight de
-- `release-db.yml`. Ce qui éprouve qu'il MORD est
-- `rag_claim_fraicheur_tables_signees_v1_negatif.sql`, qui pose ses propres
-- fixtures et tourne, lui, en CI ([[D-012]], [[D-015]] : un banc vacué est un
-- banc qui ment).
--
-- FAIL-CLOSED ASSUMÉ. Une release ne part pas sur une base où une table signée
-- s'appuie sur un claim que le corpus ne soutient plus. La correction est un
-- ARBITRAGE CLINIQUE — re-signer la table sans le claim, ou rétablir le claim
-- par le chemin du corpus — jamais un `UPDATE` à la main sur `statut` ou
-- `active` pour faire verdir un préflight.
--
-- Vérifié conforme sur la production le 2026-08-11 avant ce câblage : 24 paires
-- épinglées, 24 lignes trouvées, aucune violation (les quatre propriétés pour les
-- 23 claims d.orientation, les trois autres pour celui des contradictions).
-- Les CINQ PAIRES `arret` ajoutées le 2026-08-12 ([[D-053]]) ont été relues le
-- même jour, sur la production : toutes VALIDE, actives, non remplacées, en
-- v1.0. La liste en comptait alors 29.
-- Les ONZE PAIRES `priorites` ajoutées le 2026-08-12 ([[D-054]]) ont été relues
-- le même jour, sur la production : toutes VALIDE, actives, non remplacées, en
-- v1.0, et toutes `prescriptif = false` — d'où `exige_prescriptif = false` pour
-- cette table. La liste en comptait alors 40.
-- Les DEUX PAIRES `conflits_sources` ajoutées le 2026-08-24 ([[D-103]]) ont été
-- relues le même jour, sur la production (conteneur `one-off-6148`, lecture
-- seule) : `WN-CL-0312-018` et `WN-CL-0387-013`, toutes deux VALIDE, actives,
-- non remplacées, en v1.0. Elles sont l'une et l'autre `prescriptif = true`, ce
-- qui ne change rien : `exige_prescriptif = false` dit ce qu'on EXIGE, et un
-- conflit peut légitimement opposer deux claims descriptifs. **La relecture
-- n'était pas une formalité** : `WN-CL-0387-013` n'était jusqu'ici cité que
-- dans un COMMENTAIRE d'`indicationsBiologieV1.ts`, donc gardé par rien — s'il
-- n'avait pas été conforme, ce préflight aurait bloqué toute release de base
-- au nom d'un registre qui ne produit rien. La liste en comptait alors 42.
-- Les DEUX PAIRES `conduites` ajoutées le 2026-09-17 ([[D-224]]) ont été relues
-- le même jour, sur la production (conteneur détaché, lecture seule) :
-- `WN-CL-0320-003` et `WN-CL-0318-020`, toutes deux VALIDE, actives, non
-- remplacées, en v1.0, et toutes deux `prescriptif = true` — ce qui ne change
-- rien ici non plus. **La relecture a RÉFUTÉ une désignation** : la surface
-- proposait `WN-CL-0320-002` en claim d'instrument, or ce claim fonde le HAD
-- quand la ligne signée se déclenche sur l'IRLS. Il n'entre donc pas, et le
-- champ reste vide. La liste en comptait alors 53.
-- Les DOUZE PAIRES `conduites` ajoutées le 2026-09-17 au soir ([[D-227]]) ont
-- été relues le même soir, sur la production (conteneur détaché, lecture
-- seule) : toutes VALIDE, actives, non remplacées, en v1.0 ; sept
-- `prescriptif = true`, cinq `false`, dont `WN-CL-0320-002` qui entre enfin —
-- les deux lignes qu'il instrumente sont arrivées. **La relecture a cette fois
-- COMPLÉTÉ des désignations au lieu d'en réfuter une** : la surface proposait
-- six claims pour ces deux lignes, la lecture des sources ENTIÈRES en a trouvé
-- six de plus, dont une interdiction explicite et la levée partielle d'une
-- interdiction que désigner seule aurait tronquée. Ni le sha ni ce contrat
-- n'atteignent cette classe d'erreur : ils gardent ce qui est épinglé, jamais
-- ce qui manque. La liste en compte 65.
--
-- Les VINGT-NEUF PAIRES `indications_biologie` ajoutées le 2026-11-01
-- ([[D-419]]) ont été relues le même jour, sur la production (conteneur
-- détaché, lecture seule) : toutes VALIDE, actives, non remplacées, en v1.0 ;
-- vingt-sept `prescriptif = true`, deux `false` (`WN-CL-0106-027`,
-- `WN-CL-0107-012`), d'où `exige_prescriptif = false`. La table était signée
-- depuis le 2026-09-16 hors de toute garde de fraîcheur : son fichier vit hors
-- de `clinical/`, que le banc balayait seul (revue de #1816).
--
-- UN ÉCART DE JOURNAL, CONSTATÉ LE 2026-09-17 ET NON RÉÉCRIT. Les entrées
-- ci-dessus annoncent ONZE paires `priorites` ; la liste en porte VINGT. Neuf
-- ont donc été ajoutées sans entrée. Le journal n'est gardé par aucun banc — il
-- se tient à la main, et il a lâché une fois. Constaté ici plutôt que corrigé
-- en silence : réécrire une entrée datée serait réinterpréter ce qu'un lot passé
-- a relu.
--
-- `BEGIN READ ONLY … ROLLBACK` : aucune écriture, rejouable sans risque.
-- ERRCODE sentinelle WN001, jamais intercepté ici.
BEGIN READ ONLY;

DO $$
DECLARE
  detail text;
BEGIN
-- >>> PREDICAT_FRAICHEUR_CLAIMS_EPINGLES
  -- La liste ci-dessous est la copie SQL de ce que les tables signées déclarent
  -- en TypeScript. `claimsEpinglesFraicheur.guard.test.ts` refuse que les deux
  -- divergent : c'est lui — et lui seul — qui force l'entrée d'une table signée
  -- neuve dans ce contrat. Sans ce banc, une table pourrait épingler des claims
  -- que rien ne contrôlerait jamais, ce qui est exactement le trou de l'audit
  -- §E que ce lot existe pour ne pas recopier.
  -- `prescriptif` N'EST EXIGÉ QUE DES TABLES QUI PRESCRIVENT — [[D-046]]. Les
  -- quatre propriétés de D-044 sont le jeu que la relecture du 2026-08-06 avait
  -- contrôlé SUR LA TABLE D'ORIENTATION, dont chaque règle suggère une
  -- exploration. Une règle de contradiction ne prescrit rien : elle CONSTATE
  -- que deux instruments ne disent pas la même chose, et ce constat se fonde
  -- sur un fait descriptif. Exiger `prescriptif` d'un claim descriptif est une
  -- erreur de catégorie — elle aurait forcé à épingler un claim voisin qui ne
  -- dit pas la règle (`DC-14`), ou à bloquer toutes les releases.
  SELECT string_agg(
           format('%s@%s [%s] (%s)', e.claim_id, e.version_claim, e.table_signee,
                  CASE
                    WHEN c.claim_id IS NULL THEN 'absent du corpus'
                    WHEN c.statut IS DISTINCT FROM 'VALIDE' THEN 'statut ' || coalesce(c.statut, '?')
                    WHEN c.active IS NOT TRUE THEN 'active = false'
                    WHEN c.superseded_at IS NOT NULL THEN 'remplacé (superseded_at)'
                    ELSE 'non prescriptif'
                  END),
           ', ' ORDER BY e.claim_id)
    INTO detail
  FROM (VALUES
    ('WN-CL-0047-008', 'v1.0', 'orientation', true),
    ('WN-CL-0105-001', 'v1.0', 'orientation', true),
    ('WN-CL-0136-003', 'v1.0', 'orientation', true),
    ('WN-CL-0136-004', 'v1.0', 'orientation', true),
    ('WN-CL-0154-013', 'v1.0', 'orientation', true),
    ('WN-CL-0178-017', 'v1.0', 'orientation', true),
    ('WN-CL-0228-009', 'v1.0', 'orientation', true),
    ('WN-CL-0228-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-011', 'v1.0', 'orientation', true),
    ('WN-CL-0243-005', 'v1.0', 'orientation', true),
    ('WN-CL-0287-009', 'v1.0', 'orientation', true),
    ('WN-CL-0312-021', 'v1.0', 'orientation', true),
    ('WN-CL-0314-008', 'v1.0', 'orientation', true),
    ('WN-CL-0314-012', 'v1.0', 'orientation', true),
    ('WN-CL-0315-007', 'v1.0', 'orientation', true),
    ('WN-CL-0319-010', 'v1.0', 'orientation', true),
    ('WN-CL-0323-001', 'v1.0', 'orientation', true),
    ('WN-CL-0323-013', 'v1.0', 'orientation', true),
    ('WN-CL-0323-023', 'v1.0', 'orientation', true),
    ('WN-CL-0323-025', 'v1.0', 'orientation', true),
    ('WN-CL-0339-010', 'v1.0', 'orientation', true),
    ('WN-CL-0359-025', 'v1.0', 'orientation', true),
    ('WN-CL-0238-002', 'v1.0', 'contradictions', false),
    -- Table des règles d'arrêt ([[D-053]]). `exige_prescriptif = false` : une
    -- règle d'arrêt ne prescrit pas une exploration, elle en retient une, et ce
    -- qu'elle épingle sont les bandes publiées des instruments qui doivent être
    -- rassurants. L'un de ces claims EST prescriptif (`WN-CL-0051-033`, la
    -- conduite attachée à la bande basse) : la colonne dit ce qu'on EXIGE, pas
    -- ce qu'on interdit.
    ('WN-CL-0051-019', 'v1.0', 'arret', false),
    ('WN-CL-0051-030', 'v1.0', 'arret', false),
    ('WN-CL-0051-033', 'v1.0', 'arret', false),
    ('WN-CL-0127-029', 'v1.0', 'arret', false),
    ('WN-CL-0127-030', 'v1.0', 'arret', false),
    -- Table des priorités d'intervention ([[D-054]]). `exige_prescriptif =
    -- false` : une priorité candidate est une PROPOSITION hiérarchisée soumise
    -- au praticien, pas une prescription — à la différence d'une extinction, qui
    -- agit sur ce que le praticien ne verra pas. Les onze claims sont
    -- descriptifs (relus sur la production le 2026-08-12, tous `prescriptif =
    -- false`) : ils décrivent des mécanismes — fonctions intestinales,
    -- dysfonction de barrière, insulino-résistance — et ne recommandent aucune
    -- conduite. Exiger `prescriptif` d'eux serait l'erreur de catégorie que
    -- [[D-046]] nomme. Ce que la règle ajoute vient de la SIGNATURE praticien.
    ('WN-CL-0022-005', 'v1.0', 'priorites', false),
    ('WN-CL-0022-007', 'v1.0', 'priorites', false),
    ('WN-CL-0022-010', 'v1.0', 'priorites', false),
    ('WN-CL-0022-012', 'v1.0', 'priorites', false),
    ('WN-CL-0022-013', 'v1.0', 'priorites', false),
    ('WN-CL-0023-003', 'v1.0', 'priorites', false),
    ('WN-CL-0025-009', 'v1.0', 'priorites', false),
    ('WN-CL-0025-010', 'v1.0', 'priorites', false),
    ('WN-CL-0025-014', 'v1.0', 'priorites', false),
    ('WN-CL-0025-015', 'v1.0', 'priorites', false),
    ('WN-CL-0025-016', 'v1.0', 'priorites', false),
    -- `PRIO-SOM-01` (2026-08-28, [[D-116]]) — mécanismes de l'axe sommeil et
    -- du rythme circadien. `exige_prescriptif = false`, comme les autres claims
    -- de cette table : ils DÉCRIVENT des mécanismes et ne recommandent aucune
    -- conduite, ce que la règle dit elle-même dans ses `limitations`.
    ('WN-CL-0086-001', 'v1.0', 'priorites', false),
    ('WN-CL-0017-015', 'v1.0', 'priorites', false),
    ('WN-CL-0025-047', 'v1.0', 'priorites', false),
    ('WN-CL-0006-021', 'v1.0', 'priorites', false),
    ('WN-CL-0003-013', 'v1.0', 'priorites', false),
    -- `PRIO-DOU-01` (2026-08-28, [[D-117]]) — mécanismes de la perception
    -- douloureuse. `exige_prescriptif = false` : ils décrivent, ils ne
    -- prescrivent pas, et la règle le dit dans ses `limitations`.
    ('WN-CL-0026-012', 'v1.0', 'priorites', false),
    ('WN-CL-0161-035', 'v1.0', 'priorites', false),
    ('WN-CL-0163-002', 'v1.0', 'priorites', false),
    ('WN-CL-0162-007', 'v1.0', 'priorites', false),
    -- Registre des conflits de sources déclarés ([[D-103]]). `exige_prescriptif
    -- = false` : un conflit déclaré CONSTATE que deux claims du corpus ne
    -- disent pas la même chose, il ne prescrit rien — même catégorie que la
    -- table de contradictions. Les deux claims de `CS-BIO-01` sont pourtant
    -- prescriptifs en production, et c'est sans rapport : la colonne dit ce
    -- qu'on EXIGE, pas ce qu'on interdit. L'exiger ici serait pire qu'inutile,
    -- puisqu'un conflit peut légitimement opposer deux claims DESCRIPTIFS —
    -- l'exigence rejetterait alors une déclaration valide (`DC-14`, [[D-046]]).
    ('WN-CL-0312-018', 'v1.0', 'conflits_sources', false),
    ('WN-CL-0387-013', 'v1.0', 'conflits_sources', false),
    -- Catalogue de conduites ([[D-206]] LOT-01), QUATORZE paires en deux
    -- signatures du même jour : les deux premières le 2026-09-17 au matin
    -- ([[D-224]], ligne `insomnie_jambes_sans_repos`), les douze suivantes le
    -- même soir ([[D-227]], lignes `insomnie_depression` et `insomnie_anxiete`).
    -- La table était enrôlée au balayage depuis sa pose et ne contribuait aucune
    -- paire tant qu'aucune ligne ne citait de claim.
    --
    -- `exige_prescriptif = false`, et l'intuition va dans l'autre sens : une
    -- conduite prescrit PLUS fort qu'une exploration, dont la table vaut `true`.
    -- Le motif est celui de `conflits_sources` juste au-dessus. Cette table
    -- range ses claims en TROIS catégories, et `claimsInstrument` fonde
    -- l'INSTRUMENT dont le déclencheur lit le score — « tel questionnaire
    -- explore telle chose » décrit, et ne prescrit rien.
    --
    -- L'ARBITRAGE DU MATIN EST MAINTENANT VÉRIFIÉ, ET NON PLUS SUPPOSÉ. Il
    -- reposait sur une prévision : `WN-CL-0320-002` serait cité en instrument
    -- par les deux lignes encore retenues, et il est `prescriptif = false`. Les
    -- deux lignes sont arrivées, elles le citent bien, et il est bien
    -- `prescriptif = false` — relu en production le 2026-09-17 au soir. Une
    -- exigence à `true` rejetterait donc aujourd'hui, pour de bon, deux
    -- désignations valides (`DC-14`, [[D-046]]).
    --
    -- Les douze paires du soir ont été relues le même soir, sur la production
    -- (conteneur détaché, lecture seule) : toutes VALIDE, actives, non
    -- remplacées, en v1.0. Sept sont `prescriptif = true`, cinq `false` — et ce
    -- mélange, dans une seule table, est exactement ce que l'exigence uniforme
    -- par table ne saurait pas accommoder.
    ('WN-CL-0320-003', 'v1.0', 'conduites', false),
    ('WN-CL-0318-020', 'v1.0', 'conduites', false),
    -- `insomnie_depression` ([[D-227]]) : deux descriptifs pour le QUAND, un
    -- prescriptif qui nomme le tableau, l'instrument, puis DEUX règles de
    -- sécurité dont l'interdiction explicite que la surface ne proposait pas.
    ('WN-CL-0315-001', 'v1.0', 'conduites', false),
    ('WN-CL-0315-002', 'v1.0', 'conduites', false),
    ('WN-CL-0318-023', 'v1.0', 'conduites', false),
    ('WN-CL-0320-002', 'v1.0', 'conduites', false),
    ('WN-CL-0315-006', 'v1.0', 'conduites', false),
    ('WN-CL-0315-004', 'v1.0', 'conduites', false),
    -- `insomnie_anxiete` ([[D-227]]) : même composition, et TROIS règles de
    -- sécurité — la règle d'ordre cadrée sur le tableau, l'interdiction de
    -- prescription, et sa levée partielle. Épingler l'interdiction sans sa levée
    -- aurait gardé une moitié de règle.
    ('WN-CL-0316-001', 'v1.0', 'conduites', false),
    ('WN-CL-0316-002', 'v1.0', 'conduites', false),
    ('WN-CL-0318-018', 'v1.0', 'conduites', false),
    ('WN-CL-0316-016', 'v1.0', 'conduites', false),
    ('WN-CL-0316-006', 'v1.0', 'conduites', false),
    ('WN-CL-0316-029', 'v1.0', 'conduites', false),
    -- INDICATIONS D'ASSIETTE ([[D-236]], première signature, 2026-09-19) — onze
    -- lignes, vingt claims, `exige_prescriptif` à `false` pour le motif écrit
    -- dans `TABLE_EXIGE_PRESCRIPTIF`. Les quatre lignes en BROUILLON sont
    -- épinglées comme les sept publiées : elles sont dans le périmètre haché,
    -- donc dans ce que la signature couvre. Hors du service n'est pas hors du
    -- périmètre.
    ('WN-CL-0285-001', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0285-002', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0285-005', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0285-006', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0285-010', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0285-012', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0286-006', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0287-008', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0287-009', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0288-011', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0288-012', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0288-013', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0288-014', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0289-004', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0290-005', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0291-011', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0292-003', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0293-009', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0293-011', 'v1.0', 'indications_assiettes', false),
    ('WN-CL-0294-002', 'v1.0', 'indications_assiettes', false),
    -- PORTES BIOLOGIQUES DES ASSIETTES ([[D-245]], premier étage documentaire) —
    -- cinq lignes, huit claims, `exige_prescriptif` à `false` pour le motif écrit
    -- dans `TABLE_EXIGE_PRESCRIPTIF`. Épinglés dès le fichier POSÉ, signature ou
    -- non : ils sont dans le périmètre haché.
    ('WN-CL-0043-013', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0043-014', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0043-015', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0289-005', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0290-007', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0293-013', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0294-004', 'v1.0', 'portes_biologiques', false),
    ('WN-CL-0294-005', 'v1.0', 'portes_biologiques', false),
    -- TABLE DES INDICATIONS DE BIOLOGIE ([[D-069]], signée le 2026-09-16) —
    -- quinze règles, vingt-neuf claims distincts (`claimsSource`),
    -- `exige_prescriptif` à `false` (régime arbitré le 2026-11-01, [[D-419]] :
    -- deux claims de `BIO-STR-01` donnent la lecture d'un seuil, pas une
    -- conduite). Entrée au contrat le 2026-11-01, relue le même jour en
    -- production : 29/29 VALIDE, actifs, non remplacés, v1.0.
    ('WN-CL-0042-007', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0042-008', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0106-027', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0107-012', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0107-032', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0112-012', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0125-045', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0167-022', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0167-023', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0178-053', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0178-054', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0178-055', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0242-007', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-013', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-014', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-015', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-016', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-017', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0282-018', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0312-018', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0318-020', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0320-003', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0323-011', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0333-020', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0334-005', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0348-013', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0361-009', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0388-008', 'v1.0', 'indications_biologie', false),
    ('WN-CL-0389-004', 'v1.0', 'indications_biologie', false),
    -- STRUCTURE DES FICHES D'USAGE DU BESOIN 2 ([[D-314]] §5) — trente fiches,
    -- 277 claims distincts, `exige_prescriptif` à `false` (régime arbitré,
    -- [[D-314]] §9). Épinglés dès la structure ÉCRITE, signature ou non : ils
    -- sont dans le périmètre haché. Relus en production le 2026-11-01 (VALIDE,
    -- actifs, non remplacés, v1.0).
    ('WN-CL-0020-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0031-052', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0032-019', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0032-023', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0044-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0044-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0044-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0044-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0048-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0054-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0054-021', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0057-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0057-019', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0057-022', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0057-023', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-019', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-024', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-026', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-027', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-028', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-032', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-033', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-037', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-038', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0061-039', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0062-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0062-023', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0062-024', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0063-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0064-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0065-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0065-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0070-015', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0071-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0076-034', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0105-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0105-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0105-028', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0107-015', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0107-016', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0107-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0123-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0123-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-032', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-034', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0125-045', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0130-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0139-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-035', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-036', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-037', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-038', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0150-039', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0152-043', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0152-044', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0154-051', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0154-054', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0158-048', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0158-049', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0161-031', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0161-033', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0161-048', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0161-060', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0164-044', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0166-033', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0167-022', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0167-033', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0167-034', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0169-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0171-043', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0172-034', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0172-035', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0172-037', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0172-038', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0172-039', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0174-041', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0178-053', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0178-054', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0178-072', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0197-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0200-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0206-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0228-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0234-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0234-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0235-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0235-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0235-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0235-014', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0235-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0236-026', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0237-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0238-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0239-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0239-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0239-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0240-015', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0241-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0241-020', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0241-021', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0241-022', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0242-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0242-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0242-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0242-014', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0242-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0245-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0245-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0266-064', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0282-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0282-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0282-014', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0312-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0312-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0312-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0313-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0313-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0313-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0314-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0314-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0315-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0315-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0315-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0316-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0316-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0316-023', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0317-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0319-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0323-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0323-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0326-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0327-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0327-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0328-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0329-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0330-027', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0330-028', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0333-017', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0333-020', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0334-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0335-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0336-024', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0340-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0344-026', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0354-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0366-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0367-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0369-014', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0376-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0376-016', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0377-015', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0378-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0379-014', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0386-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0386-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0386-025', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0386-039', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0387-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0388-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0388-015', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0390-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0391-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0391-019', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0508-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-018', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-021', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-022', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-023', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-024', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-025', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0512-026', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0513-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0513-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0513-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0513-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0513-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0514-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0514-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0515-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0515-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0515-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0515-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-012', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0516-013', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0517-011', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0518-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0518-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0518-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0518-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0519-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0520-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0521-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0522-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0522-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0522-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0523-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0523-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0523-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0523-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0523-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0524-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0524-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0524-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-006', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-007', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-008', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-009', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0571-010', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0572-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0572-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0572-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0572-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0572-005', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0573-001', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0573-002', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0573-003', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0573-004', 'v1.0', 'fiches_usage', false),
    ('WN-CL-0573-005', 'v1.0', 'fiches_usage', false)
  ) AS e(claim_id, version_claim, table_signee, exige_prescriptif)
  -- La jointure porte sur LA PAIRE. Joindre sur `claim_id` seul laisserait une
  -- table signée s'appuyer sur une version du claim qui n'est pas celle qu'elle
  -- a relue — c'est le cas `N6` du fichier négatif.
  LEFT JOIN public.rag_corpus_claims c
    ON c.claim_id = e.claim_id AND c.version_claim = e.version_claim
  WHERE c.claim_id IS NULL
     OR c.statut IS DISTINCT FROM 'VALIDE'
     OR c.active IS NOT TRUE
     OR c.superseded_at IS NOT NULL
     OR (e.exige_prescriptif AND c.prescriptif IS NOT TRUE);

  IF detail IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format(
        'claims épinglés — fraîcheur rompue : %s. Une table de règles signée cite un claim que le corpus ne soutient plus. Correction = arbitrage clinique (re-signer la table sans ce claim, ou rétablir le claim par le chemin du corpus), jamais une écriture à la main sur le corpus pour faire verdir ce préflight.',
        detail);
  END IF;
-- <<< PREDICAT_FRAICHEUR_CLAIMS_EPINGLES
END $$;

ROLLBACK;
