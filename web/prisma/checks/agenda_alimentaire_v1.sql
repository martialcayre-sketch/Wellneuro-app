-- Contrat de l'agenda alimentaire 21 jours (Q_ALI_09) — table
-- `agenda_alimentaire_jours`, migration `20260804120000_agenda_alimentaire_v1`.
--
-- ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
-- Le lot L3 a livré la table, le domaine et la persistance ; il a déclaré sa
-- propre réserve : `persistence.test.ts` mocke Prisma intégralement, aucune
-- route n'existait, et AUCUNE ligne n'avait jamais été écrite ni relue contre
-- une vraie base. Le drift check (`prisma migrate diff --exit-code`) atteste
-- l'équivalence schéma ↔ migrations, et rien de plus : il ne voit ni la RLS, ni
-- l'action référentielle d'une clé étrangère, ni l'unicité d'un index, ni ce
-- qu'une colonne SIGNIFIE. Tout ce qui suit lui est invisible — donc protégé
-- par ce fichier ou par rien.
--
-- ── CONVENTION D'ÉCRITURE ───────────────────────────────────────────────────
-- Bloc `DO` NU, sans enveloppe `BEGIN;`/`COMMIT;` (même convention que
-- `cb_biologie_structure_v1.sql` et `c4_referentiel_provenance_v1.sql`) : c'est
-- le `RAISE EXCEPTION` qui fait sortir `prisma db execute` en non-zéro, et
-- l'absence d'enveloppe rend le fichier rejouable DANS une transaction
-- appelante sans la committer prématurément. Aucune donnée n'est écrite ici :
-- il est sans effet de bord, donc rejouable à la main sur n'importe quelle base.
--
-- ── CE QUE LE CI ÉPROUVE, ET CE QU'IL N'ÉPROUVE PAS ─────────────────────────
-- La base du CI est construite par `migrate deploy` SEUL : elle est VIDE. Les
-- assertions 1 à 4 (structure) y mordent pleinement. Les assertions 4 bis, 5
-- et 6 (données) y renvoient 0 ligne PAR VACUITÉ et n'y prouvent rien — leur
-- valeur est d'être REJOUABLES À LA MAIN SUR LA PRODUCTION, en lecture seule
-- (outil MCP Supabase `execute_sql`), une fois que des journées existent. Les
-- écrire ici plutôt que dans un test les rend disponibles pour ce geste-là.
DO $$
DECLARE
  -- Les versions de contrat qu'on sait relire. RECOPIE MANUELLE de
  -- `AGENDA_ALI_CONTRACT_VERSIONS_LUES` (web/src/lib/agenda-alimentaire/types.ts) :
  -- SQL ne lit pas le TypeScript. Ajouter une version au contrat oblige donc à
  -- toucher les deux — l'oubli se manifeste ici, en refusant des lignes
  -- légitimes, plutôt qu'en les acceptant en silence.
  versions_lues CONSTANT text[] := ARRAY['agenda-alimentaire-v1'];
  cible text;
  -- Sert deux fois : nom de colonne (assertion 4), puis clé JSONB (4 bis).
  colonne_suspecte text;
  nb bigint;
BEGIN
  -- ── La table existe ──────────────────────────────────────────────────────
  -- Assérée d'abord, et nommément : sans cela, le premier `::regclass` lèverait
  -- une erreur de catalogue qui ne dirait pas de quel lot il s'agit.
  IF to_regclass('public.agenda_alimentaire_jours') IS NULL THEN
    RAISE EXCEPTION 'agenda alimentaire: table public.agenda_alimentaire_jours absente (migration 20260804120000_agenda_alimentaire_v1 non appliquée ?)';
  END IF;

  -- ── 1. RLS activée ───────────────────────────────────────────────────────
  -- Deny-all : RLS active, aucune policy — posture D-005 du dépôt. Prisma ne
  -- l'introspecte pas, donc une migration ultérieure pourrait la retirer sans
  -- qu'un seul test ne parle. La table porte de la donnée de santé nominative
  -- (21 jours de prises alimentaires rattachés à un id_patient) : c'est
  -- exactement la classe de table pour laquelle le deny-all a été posé.
  SELECT count(*) INTO nb
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'agenda_alimentaire_jours'
    AND c.relrowsecurity;
  IF nb <> 1 THEN
    RAISE EXCEPTION 'agenda alimentaire: RLS désactivée sur agenda_alimentaire_jours';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agenda_alimentaire_jours'
  ) THEN
    RAISE EXCEPTION 'agenda alimentaire: policy inattendue (deny-all attendu)';
  END IF;

  -- ── 2. Les deux clés étrangères sont en ON DELETE RESTRICT ───────────────
  -- `confdeltype = 'r'`. C'est ce RESTRICT qui rend PORTEUR l'ordre explicite
  -- de suppression de `web/src/lib/patient/effacement.ts` : l'agenda y est
  -- supprimé AVANT les assignations, et le déplacer ferait lever l'effacement
  -- RGPD sur la contrainte. Passées en CASCADE, cette suppression nommée
  -- deviendrait du CODE MORT — la base ferait le travail en silence, le test
  -- d'ordre resterait vert, et personne n'apprendrait que la garde ne garde
  -- plus rien. L'assertion porte donc sur l'action référentielle, invisible du
  -- drift check.
  FOREACH cible IN ARRAY ARRAY['patients', 'assignations'] LOOP
    SELECT count(*) INTO nb
    FROM pg_constraint con
    JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE con.conrelid = 'public.agenda_alimentaire_jours'::regclass
      AND con.contype = 'f'
      AND ref.relname = cible
      AND con.confdeltype = 'r';
    IF nb <> 1 THEN
      RAISE EXCEPTION
        'agenda alimentaire: la clé étrangère vers % n''est pas en ON DELETE RESTRICT (trouvé %)',
        cible, nb;
    END IF;
  END LOOP;

  -- ── 3. AUCUN index unique sur (id_assignation, date_jour) ────────────────
  -- ASSERTION INVERSÉE, ET C'EST DÉLIBÉRÉ. La table est append-only chaînée :
  -- une correction est une NOUVELLE ligne (`supersedes_jour_id`), jamais un
  -- UPDATE. Il s'ensuit que plusieurs lignes portent légitimement la même date
  -- pour la même assignation, et que
  --     count(lignes) − count(DISTINCT date_jour)
  -- est le TAUX DE CORRECTION — seule métrique de friction du recueil lisible
  -- sans nouvelle migration.
  -- Ajouter un index unique ici RESSEMBLERAIT à un durcissement (« empêcher les
  -- doublons ») et casserait le modèle : la première correction serait refusée
  -- en base, et la métrique de friction disparaîtrait avec elle. Le refus du
  -- doublon accidentel est tenu AILLEURS, au chemin d'écriture — un second envoi
  -- sur une date déjà notée est refusé en 409 sauf s'il porte un
  -- `supersedesJourId` désignant la journée active de cette date (décision
  -- D-014). C'est la place correcte : la base ne peut pas distinguer un
  -- double-clic d'une correction, le chemin d'écriture le peut.
  --
  -- DEUX assertions, pas une, pour la même raison que dans
  -- `c4_referentiel_provenance_v1.sql` : « aucun index unique » serait aussi
  -- satisfait par « l'index de lecture a disparu », qu'on ne veut pas du tout.
  -- On vérifie donc l'EXISTENCE de l'index de lecture, PUIS la non-unicité.
  SELECT count(*) INTO nb
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'agenda_alimentaire_jours'
    AND indexname = 'agd_ali_assignation_date_idx';
  IF nb <> 1 THEN
    RAISE EXCEPTION 'agenda alimentaire: index de lecture agd_ali_assignation_date_idx absent ou renommé';
  END IF;

  SELECT count(*) INTO nb
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'agenda_alimentaire_jours'
    AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
    AND indexdef ILIKE '%id_assignation%'
    AND indexdef ILIKE '%date_jour%';
  IF nb <> 0 THEN
    RAISE EXCEPTION
      'agenda alimentaire: un index UNIQUE couvre (id_assignation, date_jour) — le chaînage append-only et le taux de correction deviennent impossibles';
  END IF;

  -- ── 4. VERROU DE PÉRIMÈTRE : journal alimentaire, pas carnet de pesée ────
  -- La migration déclare en toutes lettres ce que la table ne portera pas :
  -- « aucune quantité, aucun gramme, aucune kcal, aucun score, aucun indice ».
  -- C'était un commentaire ; c'est maintenant un test — même patron que le
  -- VERROU HDS de `cb_biologie_structure_v1.sql`.
  -- Ce qu'il ferme : un lot ultérieur qui commencerait à stocker ICI une
  -- quantité ou un agrégat calculé. L'instrument mesure des HORAIRES et des
  -- PRÉSENCES déclarées ; y adjoindre une pesée changerait la nature clinique
  -- du recueil (et sa charge pour le patient) sans qu'aucune décision ne soit
  -- prise. Les agrégats ne vivent pas dans cette table.
  -- Motif volontairement insensible à la casse : `dose_kcal` comme `doseKcal`.
  SELECT c.column_name INTO colonne_suspecte
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'agenda_alimentaire_jours'
    AND c.column_name ~* '(gramme|kcal|score|indice|quantite)'
  LIMIT 1;

  IF colonne_suspecte IS NOT NULL THEN
    RAISE EXCEPTION
      'agenda alimentaire VERROU DE PÉRIMÈTRE: colonne « % » — la table est un journal d''horaires et de présences, pas un carnet de pesée ni de score. Frontière JA du registre des frontières.',
      colonne_suspecte;
  END IF;

  -- ── 4 bis. VERROU DE PÉRIMÈTRE, CÔTÉ JSONB ───────────────────────────────
  -- L'assertion 4 ne regarde que `information_schema.columns`, c'est-à-dire le
  -- SEUL chemin que ce lot n'emprunte pas. Toute la donnée du recueil vit dans
  -- la colonne `reponses` (JSONB) : un lot ultérieur qui voudrait ranger un
  -- `totalKcal` ou une `quantiteG` le poserait là, sans migration, sans revue de
  -- schéma, et sans que l'assertion 4 ne bronche. C'est le chemin le MOINS
  -- coûteux, donc le plus probable — un verrou qui ne couvre que le plus cher
  -- des deux ne verrouille rien.
  -- Portée : les clés de PREMIER NIVEAU seulement (`jsonb_object_keys` ne
  -- descend pas dans `prises[]`). C'est la granularité à laquelle un agrégat
  -- serait rangé ; une clé imbriquée passerait, et c'est une limite connue.
  -- VACUE EN CI comme les assertions 5 et 6 — la base y est vide, donc aucune
  -- clé à parcourir. Sa valeur est d'être REJOUABLE À LA MAIN, en lecture seule,
  -- SUR LA PRODUCTION (outil MCP Supabase `execute_sql`), une fois des journées
  -- recueillies. Même motif que 5 et 6 : la partie du contrat qui protège le
  -- plus est celle que le CI ne joue pas.
  SELECT k INTO colonne_suspecte
  FROM public.agenda_alimentaire_jours j,
       LATERAL jsonb_object_keys(
         CASE WHEN jsonb_typeof(j.reponses) = 'object' THEN j.reponses ELSE '{}'::jsonb END
       ) AS k
  WHERE k ~* '(gramme|kcal|score|indice|quantite)'
  LIMIT 1;

  IF colonne_suspecte IS NOT NULL THEN
    RAISE EXCEPTION
      'agenda alimentaire VERROU DE PÉRIMÈTRE (JSONB): clé « % » dans reponses — la table est un journal d''horaires et de présences, pas un carnet de pesée ni de score. Frontière JA du registre des frontières.',
      colonne_suspecte;
  END IF;

  -- ── 5. DONNÉES : aucune version de contrat inconnue en base ──────────────
  -- VACUE EN CI (base vide) : cette assertion renvoie 0 ligne et ne prouve
  -- rien. Sa valeur est d'être REJOUABLE À LA MAIN SUR LA PRODUCTION.
  -- Ce qu'elle éprouve là-bas : `toJourRow` refuse une ligne dont la version de
  -- contrat lui est inconnue, et `listJours` la met en QUARANTAINE plutôt que
  -- de rejeter la collection. Une ligne mise en quarantaine ne lève donc aucune
  -- erreur visible — elle sort seulement des agrégats, et un lot tronqué peut
  -- franchir les seuils d'exploitabilité (14 jours, 4 week-ends, 7 paires) en
  -- ayant perdu des journées. C'est exactement ce que ce SELECT rend visible,
  -- côté base, sans attendre qu'un praticien s'étonne d'un compte.
  -- `IS NOT NULL` : une clé absente ou un `null` JSON rendent SQL NULL et sont
  -- TOLÉRÉS — même règle que `ensureVersionContratLue`, qui accepte `undefined`
  -- pour qu'une ligne écrite avant l'injection de la version reste relisible.
  SELECT count(*) INTO nb
  FROM public.agenda_alimentaire_jours j
  WHERE j.reponses->>'contractVersion' IS NOT NULL
    AND NOT (j.reponses->>'contractVersion' = ANY(versions_lues));
  IF nb > 0 THEN
    RAISE EXCEPTION
      'agenda alimentaire: % ligne(s) sous une version de contrat non lue (versions lues : %)',
      nb, array_to_string(versions_lues, ', ');
  END IF;

  -- ── 6. DONNÉES : le chaînage de correction ne franchit aucune frontière ──
  -- VACUE EN CI, REJOUABLE SUR LA PRODUCTION, pour la même raison qu'en 5.
  -- `saveJour` tient cet invariant côté applicatif : une correction ne peut se
  -- chaîner qu'à une journée EXISTANTE, du MÊME patient, de la MÊME assignation
  -- et de la MÊME date. Rien ne le tient contre un `INSERT` manuel — il n'y a
  -- volontairement pas de clé étrangère sur `supersedes_jour_id`.
  -- Ce qu'un chaînage fautif produirait : la ligne supplantée sortirait de son
  -- agenda d'origine sans que rien ne le dise (frontière patient), ou bien —
  -- en se chaînant à la veille — un TROU et un DOUBLON du même coup, les deux
  -- dates changeant de journée active. `resolveJoursActifs` n'y verrait aucune
  -- anomalie : les deux résultats sont des agendas bien formés, faux.
  -- LEFT JOIN, et non JOIN : un pointeur PENDANT (aucune ligne cible) est
  -- fautif au même titre — `saveJour` le refuse aussi (`!precedente`), et un
  -- INNER JOIN l'aurait rendu invisible.
  SELECT count(*) INTO nb
  FROM public.agenda_alimentaire_jours j
  LEFT JOIN public.agenda_alimentaire_jours p ON p.id = j.supersedes_jour_id
  WHERE j.supersedes_jour_id IS NOT NULL
    AND (
      p.id IS NULL
      OR p.id_patient <> j.id_patient
      OR p.id_assignation <> j.id_assignation
      OR p.date_jour <> j.date_jour
    );
  IF nb > 0 THEN
    RAISE EXCEPTION
      'agenda alimentaire: % chaînage(s) supersedes_jour_id pendant(s) ou franchissant patient/assignation/date',
      nb;
  END IF;

  RAISE NOTICE 'agenda alimentaire: contrat v1 vérifié (structure ; verrou de périmètre JSONB et invariants de données vacués si la table est vide).';
END $$;
