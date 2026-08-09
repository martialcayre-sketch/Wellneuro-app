-- ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
-- LOT-03, dette 4 — « double source de vérité des packs ». Un pack est décrit
-- DEUX fois : `packs.qids` (legacy, `text[]`) et le miroir relationnel
-- `questionnaire_packs` → `pack_questionnaires` → `questionnaires`. Le drift
-- check de Prisma atteste l'équivalence schéma ↔ migrations et rien de plus :
-- que les deux descriptions du MÊME pack disent la même chose lui est invisible.
--
-- Le 2026-08-05, le pack de base était en dérive (5 qids côté legacy, 4 au
-- miroir) et partait ainsi à CHAQUE onboarding. Les deux sources se sont
-- réaccordées le 2026-08-07 15:46 par l'effet d'une écriture d'une AUTRE
-- campagne : par accident, pas par mécanisme. Ce contrat est le mécanisme.
--
-- LE GÉNÉRATEUR EST FERMÉ AILLEURS. `syncPackToRegistry` refuse désormais un
-- qid sans `QuestionnaireDefinition` (`src/lib/consultation/packRegistry.ts`) :
-- la dérive ne peut plus naître d'un geste praticien. Ce fichier couvre ce que
-- ce garde-là ne voit pas — une écriture SQL hors application, un backfill, un
-- import.
--
-- ── L'INVARIANT, ET SA BORNE ────────────────────────────────────────────────
-- « UNE FOIS UN PACK MIROITÉ, LE MIROIR EST FIDÈLE. » Les trois assertions sont
-- donc toutes conditionnées à l'EXISTENCE d'une ligne `questionnaire_packs`.
--
-- Ce n'est pas une échappatoire, c'est la doctrine du code, écrite dans
-- `resolvePackQuestionnaireIds` : `registre_absent` décrit un pack jamais
-- synchronisé — bénin, et vrai pour tout pack neuf, entre sa création et sa
-- première synchro — quand `ensembles_divergents` décrit une VRAIE dérive. Un
-- contrat qui rougirait sur un pack neuf finirait par recevoir une exception, et
-- une exception creusée pour un cas légitime sert ensuite au défaut.
--
-- ⚠ La borne ne repose PLUS sur le seed. `prisma/seed.ts` n'écrivait aucun
-- miroir ni aucune définition, et c'était la justification citée ici jusqu'au
-- 2026-08-08 ; depuis, il écrit le miroir du pack de base — sans quoi le garde
-- d'écriture rendait l'écran des packs inutilisable en développement. Ne pas
-- rétablir cette citation : elle est devenue fausse dans le même lot.
--
-- En revanche un miroir PRÉSENT MAIS VIDE face à un pack non vide n'est pas
-- bénin : l'assertion 2 le prend, par comparaison d'ensembles.
--
-- ── CONVENTION D'ÉCRITURE ───────────────────────────────────────────────────
-- `BEGIN READ ONLY` … `ROLLBACK`, comme `c5_ciqual_production_preflight.sql` :
-- la base refuse toute écriture pendant l'exécution, et le fichier est donc
-- rejouable sans risque CONTRE LA PRODUCTION. C'est `RAISE EXCEPTION` qui fait
-- sortir `prisma db execute` en non-zéro.
--
-- ── OÙ IL TOURNE, ET CE QU'IL Y PROUVE ──────────────────────────────────────
-- • `release-db.yml`, préflight avant `migrate deploy` : c'est la SEULE lecture
--   de production du dépôt, et la seule qui voie la vraie dérive. Fail-closed
--   assumé : une release ne se déploie pas sur une base en dérive.
--   LE REMÈDE N'EST PAS LE MÊME SELON L'ASSERTION, et jamais une
--   resynchronisation SQL à la main. Assertions 2 et 3 : geste praticien,
--   ré-enregistrer le pack depuis l'écran. Assertion 1 : ce geste-là est
--   précisément ce que `syncPackToRegistry` refuse — il faut créer la définition
--   manquante (backfill), qui n'a AUCUN chemin sanctionné vers la production.
--   Réserve nommée, détaillée dans `release-db.yml`.
-- • `ci.yml`, DEUX FOIS, et les deux positions ne prouvent pas la même chose.
--   AVANT le seed, la base est construite par `migrate deploy` SEUL, donc VIDE :
--   les trois assertions y sont VACUES et ne prouvent RIEN de la cohérence —
--   seulement que le fichier parse et que le prédicat est celui qu'on croit.
--   APRÈS le seed, elles portent sur des données : c'est la seule position où le
--   contrat garde quelque chose en intégration continue, et c'est elle qui tient
--   le seed — seul écrivain de miroir hors `syncPackToRegistry` depuis le
--   LOT-03. Ce qui éprouve que le prédicat MORD reste le fichier
--   `packs_registre_coherence_v1_negatif.sql`, joué en CI et lui seul.
--
-- ── L'`ORDER BY` DE L'ASSERTION 2 EST DÉCLARATIF, ET C'EST VOULU ────────────
-- Mesuré le 2026-08-08 : `array_agg(DISTINCT x)` rend DÉJÀ un tableau trié
-- (`{Z,A,M,B}` → `{A,B,M,Z}`, égal à la version `ORDER BY`) — le `DISTINCT`
-- d'agrégat impose un tri. Retirer l'`ORDER BY` est donc un mutant ÉQUIVALENT :
-- aucun cas de donnée ne peut le tuer, et son survie au fichier négatif n'est
-- pas un trou. Il reste écrit parce qu'il dit l'intention, et c'est le banc
-- `packsRegistreCoherence.guard.test.ts` — textuel — qui l'épingle.
--
-- ── DEUX ÉCRITURES DU MÊME PRÉDICAT ─────────────────────────────────────────
-- Le bloc encadré ci-dessous par les marqueurs `PREDICAT_COHERENCE_PACKS` est
-- REPRIS MOT POUR MOT dans le fichier négatif. `packsRegistreCoherence.guard.test.ts`
-- refuse qu'ils divergent — sans lui, le négatif finirait par éprouver un autre
-- prédicat que celui qui garde la production.
--
-- ── UN TROISIÈME MESUREUR EXISTE, ET IL DIVERGE DÉLIBÉRÉMENT ────────────────
-- `prisma/checkPackRegistryConsistency.ts` (`npm run check:pack-registry`)
-- couvre le même terrain plus l'axe base ↔ doctrine, et traite le miroir
-- PRÉSENT MAIS VIDE en simple AVERTISSEMENT (code de sortie 0). Ici c'est un
-- échec dur. Ce script CONSTATE après un backfill ; ce fichier BARRE une
-- release. Un audit et une porte n'ont pas le même seuil — ne pas aligner l'un
-- sur l'autre sans décider lequel fait autorité.
--
-- ── HORS PÉRIMÈTRE, ET NOMMÉ ────────────────────────────────────────────────
-- « Aucun pack actif ne référence un qid de `IDS_SUSPENDUS` » (réserve de
-- `docs/DECISIONS.md`) N'EST PAS ici : `IDS_SUSPENDUS` est dérivé du catalogue
-- de code et dépend d'un drapeau d'environnement, donc un contrat SQL le lirait
-- dans la mauvaise position (D-033). La réserve reste ouverte.
BEGIN READ ONLY;

DO $$
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

  RAISE NOTICE 'packs/registre: contrat v1 verifie (% pack(s) miroite(s) sur % ; assertions vacues si la base est vide).',
    (SELECT count(*) FROM packs p JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack),
    (SELECT count(*) FROM packs);
END $$;

ROLLBACK;
