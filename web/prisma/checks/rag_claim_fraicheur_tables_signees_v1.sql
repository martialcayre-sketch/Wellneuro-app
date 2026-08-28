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
-- CI est construite par `migrate deploy` seul, donc VIDE : les 24 claims y sont
-- tous absents et ce contrat y rougirait à chaque exécution. Il n'a de sens que
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
-- au nom d'un registre qui ne produit rien. La liste en compte donc 42.
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
    ('WN-CL-0387-013', 'v1.0', 'conflits_sources', false)
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
