-- Tests NÉGATIFS de la cohérence packs ↔ miroir relationnel (LOT-03, dette 4).
--
-- `packs_registre_coherence_v1.sql` vérifie que l'invariant TIENT. Ce fichier
-- vérifie qu'il MORD. Il est nécessaire, et pas décoratif : la base du CI est
-- construite par `migrate deploy` SEUL, donc VIDE — les trois assertions du
-- contrat y sont vacues et resteraient vertes même vidées de leur substance.
-- Sans ce fichier, « contrat vert en CI » ne prouverait rien du tout.
--
-- NEUF CAS. Huit formes de dérive doivent lever ; le neuvième porte QUATRE
-- états sains qui ne doivent jamais lever.
--
-- LES DEUX MOITIÉS SONT AUSSI NÉCESSAIRES L'UNE QUE L'AUTRE, et pour des
-- raisons opposées. Les huit premiers cas interdisent un prédicat trop
-- permissif ; le neuvième interdit un prédicat trop strict — qui, sur un
-- préflight fail-closed, **bloquerait une release sur une base parfaitement
-- saine**. Chacun de ses quatre états tue une réécriture plausible : pack
-- cohérent, pack SANS miroir (tout pack neuf, entre sa création et sa première
-- synchro), doublon dans `packs.qids`, miroir inséré dans l'ordre inverse. Un
-- contrat qui rougirait sur l'un d'eux recevrait tôt ou tard une exception, et
-- une exception creusée pour un cas légitime sert au défaut.
--
-- Les huit premiers ne sont pas non plus de la même forme, et c'est délibéré :
-- quatre disent « miroir plus pauvre », un « substitution à cardinal égal »
-- (tue l'écriture par CARDINAUX), un « miroir plus riche » (tue l'écriture par
-- INCLUSION), et DEUX « pack inactif » — un par assertion, parce que restreindre
-- l'assertion 2 à `p.actif` survit au cas de l'assertion 1.
--
-- On exige le BON motif, jamais un rejet quelconque : un prédicat remplacé par
-- un `RAISE EXCEPTION` inconditionnel passerait les huit premiers cas. Chaque
-- cas contrôle la sous-chaîne distinctive de SON assertion.
--
-- UNE SEULE ÉCRITURE DU PRÉDICAT DANS CE FICHIER. Il est posé une fois dans une
-- fonction temporaire, appelée par les neuf cas — sans quoi ce fichier
-- éprouverait neuf réécritures, dont aucune ne serait celle qui garde la
-- production. Le bloc encadré par les marqueurs `PREDICAT_COHERENCE_PACKS` est
-- repris MOT POUR MOT du contrat, et `packsRegistreCoherence.guard.test.ts`
-- refuse que les deux divergent.
--
-- Transaction annulée à la fin : aucune écriture ne survit. À ne JAMAIS jouer
-- contre la production — ce fichier ÉCRIT, même s'il défait. Le contrat de
-- production est l'autre, en `BEGIN READ ONLY`.
BEGIN;

CREATE FUNCTION pg_temp.predicat_coherence_packs() RETURNS void AS $fonction$
BEGIN
-- >>> PREDICAT_COHERENCE_PACKS
  -- 1. LA CAUSE. `syncPackToRegistry` jetait silencieusement tout qid sans
  --    `QuestionnaireDefinition` : c'est ainsi que la dérive du 2026-08-05 est
  --    née (la définition de `Q_SOM_09` n'a été créée que le 2026-08-06 14:59).
  --    Un pack miroité dont un qid n'a pas de définition est un miroir qui ne
  --    PEUT PAS être fidèle.
  IF EXISTS (
    SELECT 1
    FROM packs p
    JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
    CROSS JOIN LATERAL unnest(p.qids) AS q
    WHERE NOT EXISTS (SELECT 1 FROM questionnaires d WHERE d.questionnaire_id = q)
  ) THEN
    RAISE EXCEPTION
      'packs/registre — qid sans definition : % (pack, qid). Le miroir ne peut pas etre fidele. Remede : creer la definition manquante (backfill) — retirer le qid depuis l''ecran ne marche que si le catalogue d''affichage le porte.',
      (SELECT string_agg(p.id_pack || '/' || coalesce(q, '<null>'), ', ' ORDER BY p.id_pack, q)
         FROM packs p
         JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
         CROSS JOIN LATERAL unnest(p.qids) AS q
        WHERE NOT EXISTS (SELECT 1 FROM questionnaires d WHERE d.questionnaire_id = q));
  END IF;

  -- 2. LA DÉRIVE. Comparaison d'ENSEMBLES, pas de cardinal ni d'ordre — c'est
  --    exactement ce que fait `resolveQidsLogic` avant d'accorder sa confiance
  --    au miroir. Un miroir présent mais vide face à un pack non vide tombe
  --    ici : `{}` diffère de `{…}`.
  IF EXISTS (
    SELECT 1
    FROM packs p
    JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
    WHERE coalesce((SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(p.qids) AS x), ARRAY[]::text[])
      IS DISTINCT FROM
          coalesce((SELECT array_agg(DISTINCT d.questionnaire_id ORDER BY d.questionnaire_id)
                      FROM pack_questionnaires pq
                      JOIN questionnaires d ON d.id = pq.questionnaire_id
                     WHERE pq.pack_id = qp.id), ARRAY[]::text[])
  ) THEN
    RAISE EXCEPTION
      'packs/registre — derive : pack(s) % dont packs.qids et le miroir relationnel decrivent des ensembles differents. Correction = re-enregistrer le pack depuis l''ecran praticien.',
      (SELECT string_agg(p.id_pack, ', ' ORDER BY p.id_pack)
         FROM packs p
         JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
        WHERE coalesce((SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(p.qids) AS x), ARRAY[]::text[])
          IS DISTINCT FROM
              coalesce((SELECT array_agg(DISTINCT d.questionnaire_id ORDER BY d.questionnaire_id)
                          FROM pack_questionnaires pq
                          JOIN questionnaires d ON d.id = pq.questionnaire_id
                         WHERE pq.pack_id = qp.id), ARRAY[]::text[]));
  END IF;

  -- 3. L'ORPHELIN. Un miroir dont le pack legacy a disparu : plus personne ne
  --    le resynchronisera jamais, et il porte un `pack_id` qu'une création
  --    future pourrait réutiliser.
  IF EXISTS (
    SELECT 1 FROM questionnaire_packs qp
    WHERE NOT EXISTS (SELECT 1 FROM packs p WHERE p.id_pack = qp.pack_id)
  ) THEN
    RAISE EXCEPTION
      'packs/registre — miroir orphelin : % sans pack legacy correspondant.',
      (SELECT string_agg(qp.pack_id, ', ' ORDER BY qp.pack_id)
         FROM questionnaire_packs qp
        WHERE NOT EXISTS (SELECT 1 FROM packs p WHERE p.id_pack = qp.pack_id));
  END IF;
-- <<< PREDICAT_COHERENCE_PACKS
END;
$fonction$ LANGUAGE plpgsql;

DO $$
DECLARE
  a_leve boolean;
  msg text;
BEGIN
  -- ── Décor commun : une catégorie et deux définitions de questionnaire ─────
  INSERT INTO questionnaire_categories (id, code, label_fr, ordre_affichage, actif, created_at, updated_at)
  VALUES ('neg_cat', 'NEG_CAT', 'Catégorie de banc', 0, true, now(), now());

  INSERT INTO questionnaires
    (id, questionnaire_id, slug, titre, categorie_principale_id, niveau, public_cible,
     version_patient, version_pro, conversion_json, actif, created_at, updated_at)
  VALUES
    ('neg_def_a', 'NEG_Q_A', 'neg-q-a', 'Questionnaire de banc A', 'neg_cat', 'socle', 'adulte',
     true, true, true, true, now(), now()),
    ('neg_def_b', 'NEG_Q_B', 'neg-q-b', 'Questionnaire de banc B', 'neg_cat', 'socle', 'adulte',
     true, true, true, true, now(), now()),
    ('neg_def_c', 'NEG_Q_C', 'neg-q-c', 'Questionnaire de banc C', 'neg_cat', 'socle', 'adulte',
     true, true, true, true, now(), now());

  -- Le décor seul ne doit rien déclencher : sans cette vérification, les cas
  -- ci-dessous pourraient lever pour une raison qui n'est pas la leur.
  PERFORM pg_temp.predicat_coherence_packs();

  -- ── N1 — un qid sans définition, sur un pack MIROITÉ ──────────────────────
  -- La CAUSE historique : `Q_SOM_09` était au pack de base le 2026-08-05, sa
  -- définition n'a été créée que le lendemain.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p1', 'NEG_PACK_1', 'Pack de banc 1', ARRAY['NEG_Q_A', 'NEG_Q_INCONNU'], true, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m1', 'NEG_PACK_1', 'Pack de banc 1', 'socle', 0, true, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i1', 'neg_m1', 'neg_def_a', 0, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve THEN
    RAISE EXCEPTION 'negatif N1: un qid sans definition sur un pack miroite a ete ACCEPTE.';
  END IF;
  IF position('qid sans definition' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N1: rejete pour le mauvais motif — %', msg;
  END IF;

  -- ── N2 — la dérive elle-même : un item de moins au miroir ─────────────────
  -- La forme exacte du 2026-08-05 : 5 qids côté legacy, 4 au miroir.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p2', 'NEG_PACK_2', 'Pack de banc 2', ARRAY['NEG_Q_A', 'NEG_Q_B'], true, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m2', 'NEG_PACK_2', 'Pack de banc 2', 'socle', 0, true, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i2', 'neg_m2', 'neg_def_a', 0, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('packs/registre — derive' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N2: la derive d''ensembles n''a pas ete detectee — %', msg;
  END IF;

  -- ── N3 — un miroir PRÉSENT mais VIDE face à un pack non vide ──────────────
  -- Le code appelle ce cas `registre_vide` et le traite comme bénin À LA
  -- LECTURE (le repli legacy protège l'assignation). Il n'est pas bénin pour un
  -- AUDIT : c'est la dérive maximale, et elle serait muette sans ce cas.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p3', 'NEG_PACK_3', 'Pack de banc 3', ARRAY['NEG_Q_A'], true, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m3', 'NEG_PACK_3', 'Pack de banc 3', 'socle', 0, true, now(), now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('packs/registre — derive' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N3: un miroir vide face a un pack non vide n''a pas ete detecte — %', msg;
  END IF;

  -- ── N4 — un miroir orphelin ───────────────────────────────────────────────
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m4', 'NEG_PACK_ORPHELIN', 'Miroir sans legacy', 'socle', 0, true, now(), now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('miroir orphelin' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N4: le miroir orphelin n''a pas ete detecte — %', msg;
  END IF;

  -- ── N5 — SUBSTITUTION À CARDINAL ÉGAL ─────────────────────────────────────
  -- legacy {A,B}, miroir {A,C} : autant d'éléments de part et d'autre. Un
  -- prédicat écrit sur les CARDINAUX (`count(DISTINCT …)`) au lieu des
  -- ENSEMBLES ne verrait rien — et l'en-tête du contrat promet les ensembles.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p5', 'NEG_PACK_5', 'Pack de banc 5', ARRAY['NEG_Q_A', 'NEG_Q_B'], true, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m5', 'NEG_PACK_5', 'Pack de banc 5', 'socle', 0, true, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i5a', 'neg_m5', 'neg_def_a', 0, true, now()),
           ('neg_i5c', 'neg_m5', 'neg_def_c', 1, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('packs/registre — derive' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N5: une substitution a cardinal egal n''a pas ete detectee — %', msg;
  END IF;

  -- ── N6 — MIROIR PLUS RICHE QUE LE LEGACY ──────────────────────────────────
  -- legacy {A}, miroir {A,B}. Les quatre premiers cas sont tous de la forme
  -- « miroir plus pauvre » : sans celui-ci, un prédicat écrit en INCLUSION
  -- (`legacy <@ miroir`) plutôt qu'en ÉGALITÉ resterait vert, et un
  -- questionnaire fantôme partirait au patient si le miroir devenait autorité.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p6', 'NEG_PACK_6', 'Pack de banc 6', ARRAY['NEG_Q_A'], true, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m6', 'NEG_PACK_6', 'Pack de banc 6', 'socle', 0, true, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i6a', 'neg_m6', 'neg_def_a', 0, true, now()),
           ('neg_i6b', 'neg_m6', 'neg_def_b', 1, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('packs/registre — derive' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N6: un miroir PLUS RICHE que le legacy n''a pas ete detecte — %', msg;
  END IF;

  -- ── N7 — LA DÉRIVE SUR UN PACK INACTIF COMPTE AUSSI ───────────────────────
  -- Un pack désactivé peut être réactivé, et sept des huit packs de production
  -- sont inactifs. Restreindre une assertion à `p.actif` rendrait la dérive
  -- invisible là où elle est la plus probable.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p7', 'NEG_PACK_7', 'Pack de banc 7 (inactif)', ARRAY['NEG_Q_A', 'NEG_Q_INCONNU'], false, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m7', 'NEG_PACK_7', 'Pack de banc 7', 'socle', 0, false, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i7', 'neg_m7', 'neg_def_a', 0, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('qid sans definition' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N7: la derive sur un pack INACTIF n''a pas ete detectee — %', msg;
  END IF;

  -- ── N7 bis — LA DÉRIVE D'ENSEMBLES AUSSI, SUR UN PACK INACTIF ─────────────
  -- N7 ci-dessus tue la restriction à `p.actif` sur l'assertion 1 seulement :
  -- sa fixture porte un qid inconnu, donc l'assertion 1 mord et le motif exigé
  -- est le sien. Restreindre l'assertion 2 (la DÉRIVE) à `p.actif` passerait
  -- sans ce cas-ci — mesuré. Les deux gardes ne se recouvrent qu'ici.
  a_leve := false; msg := '';
  BEGIN
    INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
    VALUES ('neg_p7b', 'NEG_PACK_7B', 'Pack de banc 7 bis (inactif)', ARRAY['NEG_Q_A', 'NEG_Q_B'], false, false, now(), now());
    INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
    VALUES ('neg_m7b', 'NEG_PACK_7B', 'Pack de banc 7 bis', 'socle', 0, false, now(), now());
    INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
    VALUES ('neg_i7b', 'neg_m7b', 'neg_def_a', 0, true, now());
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('packs/registre — derive' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N7 bis: la derive d''ensembles sur un pack INACTIF n''a pas ete detectee — %', msg;
  END IF;

  -- ── N8 — CONTRÔLE : QUATRE états SAINS ne lèvent pas ──────────────────────
  -- Sans ce bloc, un prédicat toujours-rouge passerait les sept précédents. Et
  -- ses quatre états ne sont pas décoratifs : chacun tue une écriture du
  -- prédicat qui bloquerait une release sur une base parfaitement saine.
  --   (a) pack cohérent ;
  --   (b) pack SANS miroir portant même un qid inconnu — tout pack neuf, entre
  --       sa création et sa première synchro ;
  --   (c) DOUBLON dans `packs.qids` face à un miroir dédupliqué : un prédicat
  --       qui perdrait le `DISTINCT` côté legacy y verrait une dérive ;
  --   (d) miroir inséré dans l'ORDRE INVERSE : un prédicat devenu sensible à
  --       l'ordre y verrait une dérive.
  INSERT INTO packs (id, id_pack, nom, qids, actif, par_defaut, created_at, updated_at)
  VALUES ('neg_p8a', 'NEG_PACK_8A', 'Pack coherent', ARRAY['NEG_Q_A', 'NEG_Q_B'], true, false, now(), now()),
         ('neg_p8b', 'NEG_PACK_8B', 'Pack jamais synchronise', ARRAY['NEG_Q_A', 'NEG_Q_INCONNU'], true, false, now(), now()),
         ('neg_p8c', 'NEG_PACK_8C', 'Pack a doublon', ARRAY['NEG_Q_A', 'NEG_Q_A', 'NEG_Q_B'], true, false, now(), now()),
         ('neg_p8d', 'NEG_PACK_8D', 'Pack a miroir inverse', ARRAY['NEG_Q_A', 'NEG_Q_B'], true, false, now(), now());
  INSERT INTO questionnaire_packs (id, pack_id, titre, niveau, ordre_affichage, actif, created_at, updated_at)
  VALUES ('neg_m8a', 'NEG_PACK_8A', 'Pack coherent', 'socle', 0, true, now(), now()),
         ('neg_m8c', 'NEG_PACK_8C', 'Pack a doublon', 'socle', 0, true, now(), now()),
         ('neg_m8d', 'NEG_PACK_8D', 'Pack a miroir inverse', 'socle', 0, true, now(), now());
  INSERT INTO pack_questionnaires (id, pack_id, questionnaire_id, ordre, obligatoire, created_at)
  VALUES ('neg_i8a1', 'neg_m8a', 'neg_def_a', 0, true, now()),
         ('neg_i8a2', 'neg_m8a', 'neg_def_b', 1, true, now()),
         ('neg_i8c1', 'neg_m8c', 'neg_def_a', 0, true, now()),
         ('neg_i8c2', 'neg_m8c', 'neg_def_b', 1, true, now()),
         ('neg_i8d1', 'neg_m8d', 'neg_def_b', 0, true, now()),
         ('neg_i8d2', 'neg_m8d', 'neg_def_a', 1, true, now());

  a_leve := false; msg := '';
  BEGIN
    PERFORM pg_temp.predicat_coherence_packs();
  EXCEPTION WHEN raise_exception THEN a_leve := true; msg := SQLERRM;
  END;
  IF a_leve THEN
    RAISE EXCEPTION 'negatif N8: un etat SAIN a ete declare en derive (coherent / sans miroir / doublon legacy / miroir en ordre inverse) — %', msg;
  END IF;

  RAISE NOTICE 'packs/registre negatif: 8 formes de derive detectees, 4 etats sains laisses passer.';
END $$;

ROLLBACK;
