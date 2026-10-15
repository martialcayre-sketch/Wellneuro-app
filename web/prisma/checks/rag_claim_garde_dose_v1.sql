-- Contrat de la migration 20261015140000_rag_claim_garde_dose_v1 (D-304,
-- lettre n, EF-3b). Exécuté après `prisma migrate deploy` ; aucune écriture.
--
-- Ce banc épingle la SIXIÈME famille du garde : la dose écrite en nombre,
-- unité et fréquence, dans les deux ordres (6a : fréquence après l'unité ;
-- 6b : fréquence avant le nombre, amendement du 2026-10-15). Les cinq
-- familles d'origine restent épinglées par
-- rag_claim_garde_seuils_v1.sql, joué lui aussi : ses négatifs prouvent que la
-- famille dose n'a rien fermé de ce qu'ils laissent ouvert.
--
-- Deux natures de cas, comme dans le banc des seuils : ceux portant un
-- identifiant `WN-CL-…` sont des textes RÉELS du corpus, validés
-- individuellement, que les familles 1 à 5 laissaient passer (relevé par
-- conteneur du 2026-10-15) ; les autres sont des SONDES construites, une par
-- unité et par fréquence, pour que retirer une alternative fasse rougir le
-- banc.
--
-- ERRCODE sentinelle WN001, jamais intercepté.
BEGIN;

DO $$
DECLARE
  obtenu boolean;
  cas record;
  role_supabase text;
  echecs text := '';
BEGIN
  -- Droits : la redéfinition ne doit rendre l'exécution ni à anon ni à
  -- authenticated (inerte sur la base du CI, qui n'a ni l'un ni l'autre).
  FOREACH role_supabase IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_supabase)
       AND has_function_privilege(role_supabase, 'public.rag_claim_porte_seuil(text)', 'EXECUTE')
    THEN
      RAISE EXCEPTION 'garde dose: le rôle % peut exécuter le garde', role_supabase
        USING ERRCODE = 'WN001';
    END IF;
  END LOOP;

  -- Structurel : la définition en place est celle de cette migration (son
  -- commentaire nomme D-304), toujours IMMUTABLE et booléenne.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rag_claim_porte_seuil'
      AND p.provolatile = 'i'
      AND p.prorettype = 'boolean'::regtype
      AND obj_description(p.oid, 'pg_proc') LIKE '%D-304%'
  ) THEN
    RAISE EXCEPTION 'garde dose: rag_claim_porte_seuil absente, non IMMUTABLE, de mauvais type ou antérieure à D-304'
      USING ERRCODE = 'WN001';
  END IF;

  FOR cas IN
    SELECT * FROM (VALUES
      -- ═══ POSITIFS — doivent partir en revue individuelle ═══════════════

      -- Textes réels : une dose que les familles 1 à 5 laissaient signer par lot.
      -- La fréquence peut suivre l'unité de loin (la substance entre les deux).
      (true,  'WN-CL-0092-009', 'Une dose de 200 mg d''extraits de ginseng par jour, titrés en principe actif, est efficace.'),
      (true,  'WN-CL-0003-007', 'Le fer est un cofacteur d''énergie et des neurotransmetteurs, avec un besoin de 15 mg par jour.'),
      (true,  'WN-CL-0163-032', 'Il est recommandé de prendre 2 mg de mélatonine le soir au coucher.'),
      (true,  'WN-CL-0061-034', 'Chez l''adulte, le bisglycinate de fer se donne à 14 mg par prise, une ou deux fois par jour.'),
      (true,  'WN-CL-0153-002', 'La L. Tyrosine est efficace à 1000 mg/prise.'),
      (true,  'WN-CL-0095-042', 'Le besoin nutritionnel quotidien en L-tryptophane est modeste, de l''ordre de 5 mg/kg.'),
      -- La virgule ne coupe pas la fenêtre : seules `.`, `;` et `:` la coupent.
      (true,  'WN-CL-0315-008', 'Il est recommandé de prendre 200 µg de méthylfolates, à raison d''un par jour.'),

      -- Sondes : une par unité.
      (true,  'unité-g',        'Les fibres sont apportées à 30 g par jour.'),
      (true,  'unité-micro-b5', 'Le sélénium se donne à 50 µg par jour.'),          -- U+00B5
      (true,  'unité-micro-3bc','Le sélénium se donne à 50 μg par jour.'),          -- U+03BC
      (true,  'unité-ug',       'Le sélénium se donne à 50 ug par jour.'),
      (true,  'unité-mcg',      'La vitamine B12 se donne à 500 mcg par jour.'),
      (true,  'unité-ui',       'La vitamine D se donne à 1000 UI par jour en hiver.'),
      (true,  'unité-iu',       'La vitamine E se donne à 400 IU par jour.'),
      (true,  'unité-ml',       'Le sirop se donne à 5 ml par jour.'),
      (true,  'unité-unités',   'La vitamine D se donne à 2000 unités par jour en hiver.'),
      (true,  'nombre-décimal', 'Les protéines sont apportées à 1,2 g par kilo de poids.'),

      -- Sondes : une par fréquence ou poids.
      (true,  'fréq-par-j',      'Le magnésium se donne à 300 mg par j au long cours.'),
      (true,  'fréq-quotidien',  'Le magnésium est apporté à 300 mg en apport quotidien.'),
      (true,  'fréq-matin',      'La tyrosine se prend à 500 mg le matin.'),
      (true,  'fréq-par-kg',     'La glutamine se donne à 0,3 g par kg de poids.'),
      (true,  'fréq-par-prise',  'Le tryptophane se donne à 400 mg par prise.'),
      -- `/ ?24 ?h` : pour mg, µg et mcg, la famille 1 le couvre déjà
      -- (`g ?/ ?24 ?h`) ; pour UI et ml, la famille 6 est seule.
      (true,  'fréq-24h-ui',     'La vitamine D se donne à 1000 UI/24 h.'),
      (true,  'fréq-24h-ml',     'Le sirop se donne à 5 ml/24h.'),
      -- La borne de la fenêtre, au caractère près : quarante entre l'unité et
      -- la fréquence passent (le négatif à quarante et un est plus bas).
      (true,  'fenêtre-40',      'Le zinc est dosé à 15 mg associée à la vitamine C, et au cuivre par jour.'),

      -- Amendement du 2026-10-15 : les fréquences et poids ajoutés au §2.
      (true,  'fréq-par-kilogramme', 'La glutamine se donne à 0,3 g par kilogramme de poids.'),
      (true,  'fréq-par-semaine',    'La vitamine D se donne à 1000 UI par semaine.'),
      (true,  'fréq-par-mois',       'La vitamine D se donne à 50 000 UI par mois.'),
      (true,  'fréq-par-24h',        'Le sirop se donne à 5 ml par 24 h.'),
      (true,  'fréq-journalier',     'Le magnésium se donne à 300 mg en apport journalier.'),
      (true,  'fréq-hebdomadaire',   'La vitamine D se donne à 25000 UI en prise hebdomadaire.'),
      (true,  'fréq-mensuel',        'La vitamine D se donne à 100000 UI en dose mensuelle.'),
      (true,  'fréq-chaque-jour',    'Le magnésium se donne à 300 mg chaque jour.'),
      (true,  'fréq-coucher',        'Le 5-HTP se donne à 200 mg au coucher.'),

      -- Amendement du 2026-10-15, §2 bis : la fréquence AVANT la dose (6b).
      -- Aucune de ces sondes n'a de fréquence après l'unité : 6b est leur seule
      -- porte d'entrée.
      (true,  'avant-chaque-jour',   'Chaque jour, 200 mg de magnésium sont recommandés.'),
      (true,  'avant-quotidien',     'Un apport quotidien de 250 mg d''EPA est recommandé.'),
      (true,  'avant-par-semaine',   'Par semaine, 25000 UI de vitamine D suffisent.'),
      (true,  'avant-soir',          'Le soir, 2 mg de mélatonine aident à l''endormissement.'),
      (true,  'avant-fenêtre-40',    'Chaque jour, associé à la vitamine C et au cuivre, 5 mg de zinc suffisent.'),

      -- ═══ NÉGATIFS — la voie rapide leur reste ouverte ══════════════════

      -- D-304 §3 : les posologies sans nombre ne sont pas visées.
      (false, 'sans-nombre-gélule',  'Une gélule matin et soir, au cours des repas.'),
      (false, 'sans-nombre-cuillère','Une cuillère à soupe d''huile de colza par jour.'),
      -- Le `\M` ferme l'unité sur une fin de mot : « 2 gélules » n'est pas
      -- « 2 g ». Une gélule n'est pas une unité de dose au sens de D-304 §2.
      (false, 'frontière-gélules',   'Prendre 2 gélules par jour au cours du repas.'),
      -- Une dose sans fréquence ni poids : D-304 §2 exige les deux.
      (false, 'sans-fréquence',      'Le comprimé de zinc est dosé à 15 mg.'),
      -- La fenêtre ne franchit pas une fin de phrase.
      (false, 'fin-de-phrase',       'Le comprimé contient 20 mg. Il se prend le matin.'),
      -- Ni plus de quarante caractères entre l'unité et la fréquence.
      (false, 'fenêtre-dépassée',    'Le zinc est dosé à 15 mg, associé à de la vitamine C, du cuivre et du sélénium organique, par jour.'),
      (false, 'fenêtre-41',          'Le zinc est dosé à 15 mg associée à la vitamine C, et au cuivre, par jour.'),
      -- `;` et `:` coupent la fenêtre comme le point.
      (false, 'point-virgule',       'Le comprimé contient 20 mg ; il se prend le matin.'),
      (false, 'deux-points',         'Le comprimé contient 20 mg : il se prend le matin.'),
      -- 6b tient les mêmes frontières : nombre, fenêtre, fin de phrase.
      (false, 'avant-sans-nombre',   'Chaque jour, une gélule au cours du repas.'),
      (false, 'avant-unité-nue',     'Chaque jour, la dose s''exprime en mg sur l''étiquette.'),
      (false, 'avant-fenêtre-41',    'Chaque jour, associés à la vitamine C et au cuivre, 5 mg de zinc suffisent.'),
      (false, 'avant-fin-de-phrase', 'Chaque jour compte. Le comprimé contient 20 mg.'),
      -- Un poids corporel n'est pas une unité de dose.
      (false, 'poids-corporel',      'Un adulte de 70 kg pratique une marche le matin.')
    ) AS t(attendu, ref, texte)
  LOOP
    obtenu := public.rag_claim_porte_seuil(cas.texte);
    IF obtenu IS DISTINCT FROM cas.attendu THEN
      echecs := echecs || format('%s (attendu %s, obtenu %s) ; ', cas.ref, cas.attendu, obtenu);
    END IF;
  END LOOP;

  IF echecs <> '' THEN
    RAISE EXCEPTION 'garde dose: le motif a changé de comportement — %', echecs
      USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
