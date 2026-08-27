-- Contrat de migration : forme du jalon et identité de cycle sur
-- `assessment_episodes` (`D-114`). Exécuté après `prisma migrate deploy`.
--
-- CE QUE CE CONTRAT GARDE, ET QUE RIEN D'AUTRE NE GARDE. Prisma ne sait
-- déclarer ni CHECK ni index partiel : ces trois objets vivent en SQL brut, et
-- le drift check ne les voit pas. Sans ce contrat, leur disparition — un
-- `DROP` d'exploitation, une migration qui recrée la table — ne rougirait
-- nulle part, et le filet aurait cessé d'exister en silence.
--
-- LE CAS NÉGATIF COMPTE AUTANT QUE LE POSITIF : un index présent mais dont le
-- prédicat aurait glissé laisserait passer exactement ce qu'il doit refuser.
-- Chaque écriture interdite est donc TENTÉE, dans une transaction annulée.
BEGIN;

-- ── 1. LES TROIS OBJETS EXISTENT, ET SOUS LA BONNE FORME ───────────────────
DO $$
DECLARE definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_episodes_milestone_check' AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'episodes: CHECK de forme du jalon absent';
  END IF;

  FOR definition IN
    SELECT unnest(ARRAY['assessment_episodes_ancre_unique_idx',
                        'assessment_episodes_mesure_cycle_unique_idx'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      WHERE c.relname = definition AND i.indisunique AND i.indpred IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'episodes: index % absent, non unique, ou devenu TOTAL', definition;
    END IF;
  END LOOP;

  -- L'index des ancres porte (id_patient, milestone), DANS CET ORDRE : inversé,
  -- il garderait une propriété différente de celle qu'on croit tenir.
  SELECT pg_get_indexdef(i.indexrelid) INTO definition
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
  WHERE c.relname = 'assessment_episodes_ancre_unique_idx';
  IF definition !~ 'id_patient.*milestone' THEN
    RAISE EXCEPTION 'episodes: colonnes de l''index d''ancre inattendues : %', definition;
  END IF;
END $$;

-- ── 2. UN DOSSIER DE TRAVAIL, DÉTRUIT AVEC LA TRANSACTION ──────────────────
--
-- La base du CI est VIDE (construite par `migrate deploy` seul) : les lignes
-- nécessaires sont créées ici, et le ROLLBACK final les emporte. Identité
-- neutre : aucun dossier réel n'est visé.
-- `updated_at` est NOT NULL SANS défaut en base : Prisma le pose côté client
-- (`@updatedAt`), pas PostgreSQL. Une insertion SQL brute doit donc l'écrire.
INSERT INTO "patients" ("id", "id_patient", "prenom", "nom", "email", "praticien_email", "updated_at")
VALUES ('CUID_CONTRAT_D114', 'PAT_CONTRAT_D114', 'Sophie', 'Nicola',
        'sophie.nicola@example.invalid', 'praticien@wellneuro.fr', now());

-- ── 3. LA FORME DU JALON REFUSE CE QUE PERSONNE NE RELIT ───────────────────
DO $$
DECLARE mauvais text;
BEGIN
  FOREACH mauvais IN ARRAY ARRAY['TA', 'T01', 'J7', 'T', '', 't0', 'J210', 'T-1'] LOOP
    BEGIN
      INSERT INTO "assessment_episodes"
        ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version")
      VALUES ('EP_FORME_' || md5(mauvais), 'PAT_CONTRAT_D114', mauvais,
              now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1');
      RAISE EXCEPTION 'episodes: le jalon « % » a été accepté alors que rien ne le relit', mauvais;
    EXCEPTION WHEN check_violation THEN
      NULL; -- refusé : c'est la propriété attendue
    END;
  END LOOP;
END $$;

-- ── 4. LA SÉRIE DES ANCRES EST OUVERTE, ET LES MESURES SONT LES TROIS ──────
--
-- Le pendant positif du bloc précédent : une forme trop stricte serait un
-- défaut symétrique. `T0` comme `T7` comme `T142` doivent passer — la série est
-- ouverte depuis `D-113`, et un CHECK qui n'accepterait que `T0` rendrait le
-- deuxième cycle impossible à ouvrir.
DO $$
DECLARE bon text;
BEGIN
  FOREACH bon IN ARRAY ARRAY['T0', 'T1', 'T7', 'T142', 'J21', 'J42', 'J90'] LOOP
    INSERT INTO "assessment_episodes"
      ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version", "cycle_id")
    VALUES ('EP_OK_' || bon, 'PAT_CONTRAT_D114', bon,
            now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', 'CYCLE_' || bon);
  END LOOP;
END $$;

-- ── 5. DEUX ANCRES DE MÊME NOM SONT REFUSÉES ───────────────────────────────
--
-- C'est la propriété qui ferme `N1.1` : deux lignes `T0` sur un dossier, ce
-- sont deux cycles dont les `J21` réclament la même clé primaire, et la seconde
-- confirmation n'écrit alors rien sous une réponse `ok: true`.
DO $$
BEGIN
  INSERT INTO "assessment_episodes"
    ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version", "cycle_id")
  VALUES ('EP_T0_BIS', 'PAT_CONTRAT_D114', 'T0',
          now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', 'CYCLE_AUTRE');
  RAISE EXCEPTION 'episodes: un SECOND T0 a été accepté sur le même dossier — la collision inter-cycle est rouverte';
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- ── 6. LE MÊME JALON DE MESURE, DEUX FOIS DANS UN CYCLE, EST REFUSÉ ────────
DO $$
BEGIN
  INSERT INTO "assessment_episodes"
    ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version", "cycle_id")
  VALUES ('EP_J21_BIS', 'PAT_CONTRAT_D114', 'J21',
          now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', 'CYCLE_J21');
  RAISE EXCEPTION 'episodes: un second J21 a été accepté dans le MÊME cycle';
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- ── 7. LE MÊME JALON DANS UN AUTRE CYCLE RESTE PERMIS ──────────────────────
--
-- L'index ne doit pas déborder : un `J21` par cycle est exactement ce que
-- `D-113` rend possible. Un index TOTAL au lieu de partiel casserait le
-- deuxième cycle, et ce banc est le seul à le dire.
INSERT INTO "assessment_episodes"
  ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version", "cycle_id")
VALUES ('EP_J21_CYCLE_2', 'PAT_CONTRAT_D114', 'J21',
        now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', 'CYCLE_SECOND');

-- ── 8. LA LIMITE ASSUMÉE, ÉPROUVÉE PLUTÔT QUE SUPPOSÉE ─────────────────────
--
-- `cycle_id` NULL sort du prédicat, et PostgreSQL traite deux NULL comme
-- distincts : deux mesures sans cycle résolu passent. Ce n'est pas un oubli,
-- c'est la limite écrite dans la migration — et l'éprouver ici garantit qu'on
-- ne la découvrira pas un jour en croyant la garde plus large qu'elle n'est.
INSERT INTO "assessment_episodes"
  ("id", "id_patient", "milestone", "target_at", "confirmed_at", "payload", "payload_hash", "contract_version", "cycle_id")
VALUES ('EP_J42_SANS_CYCLE_A', 'PAT_CONTRAT_D114', 'J42',
        now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', NULL),
       ('EP_J42_SANS_CYCLE_B', 'PAT_CONTRAT_D114', 'J42',
        now(), now(), '{}'::jsonb, 'h', 'objets-cliniques-v1', NULL);

ROLLBACK;
