-- Contrat des colonnes de provenance de l'objectif (Alliance 6.0-B, `D-167`).
-- Pendant des contrats de 6.0-A et de `fins_objectif` : ce qui a été prouvé
-- là-bas ne se re-prouve pas ici, ce qui est NEUF est prouvé ici.
--
-- Les huit colonnes promettent six choses, et ce fichier les éprouve TOUTES :
--   1. l'écriture SANS AUCUNE PROVENANCE reste acceptée. C'est le cas le plus
--      important du fichier : c'est lui qui prouve que la migration peut partir
--      AVANT son code (`D-087`). S'il tombait, la production casserait à la
--      première écriture du code actuel ;
--   2. l'écriture AVEC provenance complète est acceptée — sans ce cas positif,
--      un CHECK devenu trop serré passerait vert et la route casserait ensuite ;
--   3. les natures sont des listes FERMÉES, une par champ (23514) ;
--   4. une source et son identifiant vont ENSEMBLE, dans les DEUX sens : une
--      source sans identifiant ne se rejoue pas, un identifiant sans source est
--      un pointeur que rien ne qualifie ;
--   5. une priorité proposée exige sa synthèse, son dépôt ET son prompt — une
--      proposition irrejouable n'est plus une provenance, c'est une étiquette,
--      et depuis l'arbitrage du 2026-09-10 au soir la parole du patient est une
--      CONDITION de l'appel, pas un complément (`D-167` §3 amendé) ;
--   6. PAS DE PROVENANCE SANS TEXTE : déclarer d'où vient un champ vide
--      décrirait l'origine de rien, et laisserait croire en relecture qu'un
--      texte a existé puis disparu.
--
-- LA LISTE BLANCHE DES COLONNES N'EST PAS ICI, et c'est délibéré : elle vit
-- dans `alli_dossier_deux_voix_v1_negatif.sql`, qui l'a toujours portée pour
-- cette table. Deux listes sur un même objet divergeraient au premier ajout, et
-- une liste divergée est pire qu'absente — elle passe au vert en prétendant
-- garder. Ce contrat-ci a d'ailleurs été écrit avec sa propre copie, et c'est
-- l'autre contrat qui l'a attrapé : la mécanique fonctionne, on ne la double pas.
--
-- La RLS deny-all, en revanche, est re-vérifiée plutôt que supposée : un
-- `ADD COLUMN` ne la touche pas, mais rien ne le prouve sans l'assertionner.
--
-- CE QUE CE CONTRAT NE PROUVE PAS, ET QUI APPARTIENT À LA ROUTE. Que la
-- synthèse citée soit `Validee_Praticien`, que le dépôt visé appartienne au
-- dossier, que le texte pré-rempli soit VRAIMENT celui de la source : les
-- références sont SOUPLES, sans FK, et la base ne lit pas les autres tables.
--
-- Fixtures posées et transaction annulée : rien ne persiste.

BEGIN;

DO $$
DECLARE
  refuse boolean;


  cas CONSTANT text[][] := ARRAY[
    ['nature d''énoncé inconnue (la liste est FERMÉE : l''étendre est un D-xxx)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, enonce_source, enonce_source_id)
        VALUES ('p1', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'anamnese', 'ent_1')$q$],
    ['nature de reformulation inconnue',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, reformulation_praticien, reformulation_source, reformulation_source_id)
        VALUES ('p2', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil fragmenté', 'synthese_comprehension', 'SYN_1')$q$],
    ['nature de priorité inconnue (un autre moteur se glisserait ici)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite, priorite_source, priorite_source_synthese_id, priorite_prompt)
        VALUES ('p3', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil', 'scoring', 'SYN_1', 'priorite-v1')$q$],
    ['énoncé : source SANS identifiant (une citation qu''on ne peut pas retrouver)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, enonce_source)
        VALUES ('p4', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'ce_qui_compte')$q$],
    ['énoncé : identifiant SANS source (un pointeur que rien ne qualifie)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, enonce_source_id)
        VALUES ('p5', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'ent_1')$q$],
    ['reformulation : source SANS identifiant',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, reformulation_praticien, reformulation_source)
        VALUES ('p6', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil fragmenté', 'synthese_ia')$q$],
    ['reformulation : identifiant SANS source',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, reformulation_praticien, reformulation_source_id)
        VALUES ('p7', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil fragmenté', 'SYN_1')$q$],
    ['priorité proposée SANS prompt (l''appel ne se rejoue pas)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite, priorite_source, priorite_source_synthese_id)
        VALUES ('p8', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil', 'proposition_ia', 'SYN_1')$q$],
    ['priorité proposée SANS synthèse d''entrée',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite, priorite_source, priorite_prompt)
        VALUES ('p9', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil', 'proposition_ia', 'priorite-v1')$q$],
    ['priorité : entrées d''appel SANS source déclarée',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite, priorite_source_synthese_id, priorite_prompt)
        VALUES ('p10', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil', 'SYN_1', 'priorite-v1')$q$],
    ['reformulation : provenance déclarée sur un texte ABSENT',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, reformulation_source, reformulation_source_id)
        VALUES ('p11', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'synthese_ia', 'SYN_1')$q$],
    ['priorité : provenance déclarée sur un texte ABSENT',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite_source, priorite_source_synthese_id, priorite_prompt)
        VALUES ('p12', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'proposition_ia', 'SYN_1', 'priorite-v1')$q$],
    -- AJOUTÉ LE 2026-09-11 (`D-167` §3 amendé, contrainte
    -- `alli_objectif_priorite_source_depot_requis`) : ce cas était un POSITIF
    -- jusqu'à l'arbitrage du soir. Les deux pièces sont désormais exigées.
    ['priorité proposée SANS dépôt patient (la parole du patient est une condition)',
     $q$INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient, priorite, priorite_source, priorite_source_synthese_id, priorite_prompt)
        VALUES ('p13', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr', 'Dormir mieux', 'Sommeil', 'proposition_ia', 'SYN_1', 'priorite-v1')$q$]
  ];
BEGIN
  -- ── 0. Fixture — patient fictif autorisé (identité de fixture du dépôt) ──
  INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
  VALUES ('pat_contrat_prov', 'PAT_CONTRAT_PROV', 'jennifer.martin@example.test',
          'Jennifer', 'Martin', 'praticien@wellneuro.fr', CURRENT_TIMESTAMP);

  -- ── 1. Cas POSITIFS ──────────────────────────────────────────────────────
  BEGIN
    -- LE CAS QUI PROUVE QUE LA MIGRATION PEUT PARTIR SEULE. Le code ACTUEL
    -- n'écrit aucune de ces huit colonnes ; s'il devait, la production
    -- casserait entre l'application de la migration et le déploiement du code.
    INSERT INTO objectifs_negocies (id, id_patient, praticien_email, enonce_patient)
    VALUES ('obj_prov_nu', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Retrouver un sommeil continu');

    -- Provenance COMPLÈTE sur les trois champs — la forme que le code posera.
    INSERT INTO objectifs_negocies (
      id, id_patient, praticien_email, enonce_patient, reformulation_praticien, priorite,
      enonce_source, enonce_source_id,
      reformulation_source, reformulation_source_id,
      priorite_source, priorite_source_synthese_id, priorite_source_depot_id, priorite_prompt
    )
    VALUES ('obj_prov_complet', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Retrouver un sommeil continu', 'Sommeil fragmenté en seconde partie de nuit', 'Sommeil',
            'ce_qui_compte', 'ent_contrat_1',
            'synthese_ia', 'SYN_contrat_1',
            'proposition_ia', 'SYN_contrat_1', 'ent_contrat_1', 'priorite-v1');

    -- PROVENANCES INDÉPENDANTES : citer l'énoncé sans rien déclarer ailleurs
    -- doit passer. Un CHECK qui lierait les trois champs ferait de la citation
    -- un tout-ou-rien, alors que le praticien reprend ce qu'il veut.
    INSERT INTO objectifs_negocies (
      id, id_patient, praticien_email, enonce_patient, enonce_source, enonce_source_id
    )
    VALUES ('obj_prov_partiel', 'PAT_CONTRAT_PROV', 'praticien@wellneuro.fr',
            'Retrouver un sommeil continu', 'ce_qui_compte', 'ent_contrat_1');

    -- CE CAS A CHANGÉ DE CAMP LE 2026-09-11, ET IL EST DESCENDU EN NÉGATIF.
    -- Il affirmait ici que « le dépôt d'entrée de l'appel est facultatif », et
    -- avertissait que l'exiger « fermerait la fonction à tout dossier muet ».
    -- L'arbitrage du praticien du 2026-09-10 au soir a tranché l'inverse :
    -- les deux pièces sont EXIGÉES, la parole du patient est une condition et
    -- non un complément (`D-167` §3 amendé).
    --
    -- LA CONSÉQUENCE ANNONCÉE EST RÉELLE ET ASSUMÉE : un dossier dont le
    -- patient n'a jamais déposé n'aura pas de proposition de priorité. Elle est
    -- consignée là où elle avait été prévue, plutôt qu'effacée avec le cas.
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION
        'PROVENANCE OBJECTIF: une écriture VALIDE a été refusée (SQLSTATE %) — une contrainte est trop serrée. Si c''est le cas « nu », la migration ne peut PAS partir avant son code.',
        SQLSTATE;
  END;

  -- ── 2. Les CHECK mordent ─────────────────────────────────────────────────
  FOR i IN 1 .. array_length(cas, 1) LOOP
    refuse := false;
    BEGIN
      EXECUTE cas[i][2];
    EXCEPTION
      WHEN check_violation THEN
        refuse := true;
      WHEN others THEN
        RAISE EXCEPTION
          'PROVENANCE OBJECTIF test négatif: « % » rejeté pour le mauvais motif (SQLSTATE %, attendu 23514) — le CHECK visé a-t-il disparu ?',
          cas[i][1], SQLSTATE;
    END;
    IF NOT refuse THEN
      RAISE EXCEPTION
        'PROVENANCE OBJECTIF test négatif: « % » a été ACCEPTÉ — le CHECK correspondant manque.',
        cas[i][1];
    END IF;
  END LOOP;

  -- ── 3. Les huit colonnes sont NULLABLES ──────────────────────────────────
  -- Une seule d'entre elles passée NOT NULL casserait le code actuel et tout
  -- objectif écrit à la main.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'objectifs_negocies'
      AND is_nullable = 'NO'
      AND column_name IN ('enonce_source', 'enonce_source_id', 'reformulation_source',
                          'reformulation_source_id', 'priorite_source',
                          'priorite_source_synthese_id', 'priorite_source_depot_id',
                          'priorite_prompt')
  ) THEN
    RAISE EXCEPTION 'PROVENANCE OBJECTIF: une colonne de provenance est NOT NULL — le silence cesserait d''être permis.';
  END IF;

  -- ── 4. RLS deny-all, re-vérifiée plutôt que supposée (D-005) ─────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'objectifs_negocies' AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'PROVENANCE OBJECTIF: RLS DÉSACTIVÉE sur objectifs_negocies (posture D-005).';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objectifs_negocies') THEN
    RAISE EXCEPTION 'PROVENANCE OBJECTIF: une POLICY existe sur objectifs_negocies — la posture D-005 est deny-all SANS policy.';
  END IF;

  RAISE NOTICE 'OK — contrat de provenance de l''objectif vérifié (D-167).';
END $$;

ROLLBACK;
