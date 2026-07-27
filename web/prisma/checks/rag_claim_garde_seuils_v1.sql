-- Contrat de la migration 20260727140000_rag_claim_garde_seuils_v1.
-- Exécuté après `prisma migrate deploy` ; toutes les fixtures sont annulées.
--
-- Ce banc épingle le MOTIF lui-même. Sans lui, « rappel 55/55, précision 65 % »
-- est une mesure faite une fois en production et jamais rejouable : une
-- alternative supprimée par mégarde rouvrirait la voie rapide à des plages de
-- référence sans qu'aucun test ne bronche.
--
-- Les vingt-huit cas ci-dessous sont des textes RÉELS, repris des claims du
-- corpus (identifiants en commentaire) — pas des chaînes inventées pour faire
-- passer le motif. Les positifs viennent des 55 de l'audit du 2026-07-27 ; les
-- négatifs sont ses faux positifs écartés et des claims de contrôle, dont ceux
-- qui ont motivé le resserrement de deux alternatives.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

DO $$
DECLARE
  attendu boolean;
  obtenu boolean;
  texte text;
  cas record;
  echecs text := '';
BEGIN
  -- Structurel : la fonction existe, elle est IMMUTABLE (c'est ce qui autorise
  -- son appel dans un prédicat de trigger), et elle rend un booléen.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rag_claim_porte_seuil'
      AND p.provolatile = 'i'
      AND p.prorettype = 'boolean'::regtype
  ) THEN
    RAISE EXCEPTION 'garde seuils: rag_claim_porte_seuil absente, non IMMUTABLE ou de mauvais type'
      USING ERRCODE = 'WN001';
  END IF;

  -- NULL et chaîne vide ne portent aucune borne, et ne doivent pas exploser.
  IF public.rag_claim_porte_seuil(NULL) IS NOT FALSE
     OR public.rag_claim_porte_seuil('') IS NOT FALSE THEN
    RAISE EXCEPTION 'garde seuils: NULL ou chaîne vide mal traités' USING ERRCODE = 'WN001';
  END IF;

  FOR cas IN
    SELECT * FROM (VALUES
      -- ═══ POSITIFS — doivent partir en revue individuelle ═══════════════

      -- Plages de référence de laboratoire (famille « unité biologique »).
      (true,  'WN-CL-0041-066', 'Le glutamate est un marqueur de l''activation neuronale sur les récepteurs NMDA, avec des valeurs de référence de 50-77 μmol/L.'),
      (true,  'WN-CL-0041-067', 'Le GABA est le principal neurotransmetteur du système nerveux central, avec des valeurs de référence de 0.40-0.85 µmol/L.'),
      (true,  'WN-CL-0041-065', 'Le dosage sanguin du ratio Kynurénine/Tryptophane renseigne sur l''activation des IDO, avec des valeurs normales comprises entre 21 et 36 µmol/mmol.'),
      (true,  'WN-CL-0041-069', 'L''excrétion urinaire totale de mélatonine (6-SMLT) renseigne sur la production nocturne avec une valeur normale de 10-45 µg/24 heures.'),
      (true,  'WN-CL-0044-020', 'Le dosage de la vitamine E rapportée au cholestérol total a une valeur normale de 5,4-9,2 mg/g cholestérol.'),
      (true,  'WN-CL-0044-022', 'Les valeurs normales des vitamines B1, B2, B3 et B6 sont respectivement 84-200 nmol/l, 175-475 nmol/l, 17-85 µg/l et 88-456 nmol/l.'),

      -- Seuils cliniques du cœur de la biologie fonctionnelle.
      (true,  'WN-CL-0043-013', 'Les valeurs normales d''homocystéine sont inférieures à 5 à 8 μmol/l.'),
      (true,  'WN-CL-0043-015', 'Une hyperhomocystéinémie constituant un facteur de risque vasculaire correspond à une homocystéine supérieure à 15 μmol/l.'),
      (true,  'WN-CL-0044-003', 'Le statut en ferritine se classe ainsi : carence profonde < 10 ng/ml, déficience < 30 ng/ml, déficit/statut suboptimal < 50 ng/ml, zone de confort entre 50 et 80 ng/ml, zone élevée > 80 ng/ml'),
      (true,  'WN-CL-0044-009', 'Le marqueur de référence du statut en magnésium est le magnésium érythrocytaire, avec des valeurs de référence de 4,4-5,8 mg/dL et des valeurs optimales > 5 mg/dL.'),
      (true,  'WN-CL-0044-013', 'Il n''y a pas de toxicité de l''iode en dessous de 300 µg/litre.'),

      -- Le seul des 55 qui ne tienne qu'au comparateur : aucun intervalle, aucune
      -- unité. C'est lui qui interdit de supprimer la famille « comparateur ».
      (true,  'WN-CL-0021-022', 'En biologie, le rapport T3 sur rT3 devrait être supérieur à 20.'),

      -- Plages de tolérance d'un profil urinaire (famille « vocabulaire »).
      (true,  'WN-CL-0041-019', 'Dans le profil urinaire présenté, le taux de sérotonine mesuré est de 65.5 µg/g créa., une valeur diminuée par rapport à la plage de tolérance de 140.0 à 230.0 µg/g créa.'),
      (true,  'WN-CL-0041-025', 'Dans le graphique NEUROTRANSMETTEURS, la concentration de DOPA mesurée est de 304.75 µg/g créatinine, supérieure à la référence maximale de 230.00 µg/g créatinine.'),

      -- Bandes d'interprétation de scores : ni unité, ni vocabulaire de seuil.
      -- Seule la famille « intervalle numérique » les attrape.
      (true,  'WN-CL-0047-022', 'Un score de HAD compris entre 0 et 7 est interprété comme normal.'),
      (true,  'WN-CL-0047-025', 'Un score de HAD compris entre 15 et 21 correspond à un niveau sévère.'),
      (true,  'WN-CL-0048-008', 'Un score d''hyperexcitabilité de 11 à 30 est un score faible indiquant un syndrome d''hyperexcitabilité possible.'),
      (true,  'WN-CL-0047-027', 'Pour la dépression, l''échelle DASS21 définit les seuils suivants : normal 0-4, léger 5-6, modéré 7-10, sévère 11-13, très sévère >14.'),
      (true,  'WN-CL-0046-026', 'Un score supérieur à 15 au questionnaire abrégé de Conners est prédictif d''un syndrome d''hyperactivité.'),

      -- ═══ NÉGATIFS — la voie rapide leur reste ouverte ══════════════════

      -- Faux positifs écartés à la main lors de l'audit : « cible » est
      -- délibérément absent du motif, et « seuil » physiologique reste capturé
      -- (sur-capture assumée, cf. le cas suivant).
      (false, 'WN-CL-0025-006', 'Les effets de l''insuline résultent de sa liaison à un récepteur membranaire spécifique exprimé en priorité sur trois tissus cibles : le foie, le muscle et le tissu adipeux.'),
      (false, 'WN-CL-0029-023', 'Les gènes cibles activés par Nrf2 incluent ceux impliqués dans la synthèse du glutathion (Gclc, Gclm) et l''élimination des ROS (Txnrd1, Prdx1).'),

      -- Ce que le resserrement de « en de.. » vers « en de(ssous|çà) » a gagné :
      -- ces trois textes ne portent aucune borne et n'ont plus à être relus.
      (false, 'contrôle-dehors',  'Les perturbateurs endocriniens agissent en dehors des voies hormonales classiques.'),
      (false, 'contrôle-deux',    'Le déséquilibre acido-basique se caractérise par un excès d''ions H+ en deux temps.'),
      (false, 'contrôle-demande', 'La lecture du profil se fait en demandant au patient son ressenti.'),

      -- Mécanismes, prévalences et tailles d'effet : des chiffres, aucune borne.
      (false, 'WN-CL-0027-013', 'Il existe une interdépendance entre le microbiote et la mitochondrie.'),
      (false, 'WN-CL-0021-008', 'La T3 active est produite à 80% par le foie et le rein, et à 20% par la thyroïde.'),
      (false, 'WN-CL-0029-001', 'En situation physiologique normale, la respiration mitochondriale produit des radicaux libres de manière contrôlée à hauteur d''environ 2%.'),

      -- Le claim nominal du contrat du journal : il DOIT rester signable par lot,
      -- sans quoi le cas 9 de rag_claim_decisions_journal_v1.sql casse.
      (false, 'fixture-journal', 'claim de contrat, non prescriptif'),

      -- ═══ COUVERTURE PAR FAMILLE ════════════════════════════════════════
      -- Les six positifs « plage de laboratoire » ci-dessus matchent tous par
      -- au moins DEUX familles : supprimer entièrement la famille 1 ne ferait
      -- tomber aucun d'eux. Les trois cas suivants n'ont qu'une seule porte
      -- d'entrée chacun — ils rendent les familles 1, 3 et 5 individuellement
      -- indispensables.
      (true,  'famille-1-seule', 'Le sélénium plasmatique se situe à 80 µg/l chez l''adulte.'),
      (true,  'famille-1-ascii', 'Le zinc plasmatique se situe à 800 ug/L chez l''adulte.'),
      (true,  'famille-3-collée', 'Les poissons gras (>2% de lipides totaux) ont une forte teneur en oméga 3.'),

      -- La frontière de la famille 1, et elle est volontaire : sa première
      -- alternative exige un CHIFFRE devant l''unité. Une unité nue n''est pas
      -- une borne — « s''exprime en µg/l » ne dit aucun seuil. C''est ce cas qui
      -- a pris en défaut la première rédaction de ce banc.
      (false, 'unité-sans-nombre', 'Le dosage du sélénium plasmatique s''exprime en µg/l chez l''adulte.'),

      -- Le `[^p]` de la famille 3 écarte les p-values : une significativité
      -- statistique n'est pas une borne de décision. Sept claims du corpus sont
      -- dans ce cas.
      (false, 'p-value', 'Les niveaux de bêta-cryptoxanthine sont plus bas chez les participants dépressifs, avec p<0,0001.')
    ) AS t(attendu, ref, texte)
  LOOP
    obtenu := public.rag_claim_porte_seuil(cas.texte);
    IF obtenu IS DISTINCT FROM cas.attendu THEN
      echecs := echecs || format('%s (attendu %s, obtenu %s) ; ', cas.ref, cas.attendu, obtenu);
    END IF;
  END LOOP;

  IF echecs <> '' THEN
    RAISE EXCEPTION 'garde seuils: le motif a changé de comportement — %', echecs
      USING ERRCODE = 'WN001';
  END IF;
END $$;

-- Comportemental : le garde ferme la signature par lot, jamais la validation
-- individuelle ni la lecture. Un claim porteur d'une borne reste un claim
-- ordinaire — il attend seulement un œil humain.
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, embedding_model, embedding_dimensions, embedding)
VALUES
  ('__seuil_borne__', 'WN-CL-7777-001', 'WN-SRC-7777', 'v1.0',
   'Les valeurs normales d''homocystéine sont inférieures à 5 à 8 μmol/l.',
   repeat('e', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector),
  ('__seuil_libre__', 'WN-CL-7777-002', 'WN-SRC-7777', 'v1.0',
   'claim de contrat, non prescriptif',
   repeat('f', 64), 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'contrat', 1536,
   ('[' || repeat('0,', 1535) || '0]')::extensions.vector);

DO $$
DECLARE
  tirage bigint;
BEGIN
  -- Le prédicat d'éligibilité de la lib : le claim à borne en est exclu, l'autre
  -- non. C'est le MÊME prédicat qu'appliquent les cinq requêtes de revue.ts.
  IF EXISTS (
    SELECT 1 FROM public.rag_corpus_claims c
    WHERE c.source_id = 'WN-SRC-7777'
      AND c.statut = 'EN_ATTENTE_VALIDATION'
      AND c.active = true
      AND c.prescriptif = false
      AND c.typologie_lecture IN ('déclaré', 'observé')
      AND NOT public.rag_claim_porte_seuil(c.texte_normalise)
      AND c.id = '__seuil_borne__'
  ) THEN
    RAISE EXCEPTION 'garde seuils: un claim à borne reste éligible à la voie rapide'
      USING ERRCODE = 'WN001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rag_corpus_claims c
    WHERE c.source_id = 'WN-SRC-7777'
      AND c.statut = 'EN_ATTENTE_VALIDATION'
      AND c.active = true
      AND c.prescriptif = false
      AND c.typologie_lecture IN ('déclaré', 'observé')
      AND NOT public.rag_claim_porte_seuil(c.texte_normalise)
      AND c.id = '__seuil_libre__'
  ) THEN
    RAISE EXCEPTION 'garde seuils: le garde a fermé la voie rapide à un claim sans borne'
      USING ERRCODE = 'WN001';
  END IF;

  -- Le trigger du journal porte le même critère : une signature de lot couvrant
  -- le claim à borne est refusée EN BASE, pas seulement par l'application.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, validateur, source_id, echantillon)
  VALUES ('tirage_echantillon', 'contrat@wellneuro.fr', 'WN-SRC-7777',
          '{"seed":1,"tires":[],"eligibles":[]}')
  RETURNING id INTO tirage;

  BEGIN
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
    VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-7777', tirage,
            '{"seed":1,"verdicts":[]}', '{"questions":[]}',
            '[{"id":"__seuil_borne__","claimId":"WN-CL-7777-001","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
    RAISE EXCEPTION 'garde seuils: claim à borne signé par lot (trigger muet)'
      USING ERRCODE = 'WN001';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- Symétrie : le trigger laisse bien passer un lot sans borne. Un garde qui
  -- refuserait tout ne garderait rien.
  INSERT INTO public.rag_corpus_claim_decisions
    (type_acte, decision, validateur, source_id, tirage_id, echantillon, questionnaire, claims)
  VALUES ('decision_lot', 'VALIDE', 'contrat@wellneuro.fr', 'WN-SRC-7777', tirage,
          '{"seed":1,"verdicts":[]}', '{"questions":[]}',
          '[{"id":"__seuil_libre__","claimId":"WN-CL-7777-002","versionClaim":"v1.0","statutAvant":"EN_ATTENTE_VALIDATION","statutApres":"VALIDE"}]');
END $$;

ROLLBACK;
