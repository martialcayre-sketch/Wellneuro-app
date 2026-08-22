-- ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
-- LOT-03 de « Biologie consolidée » — le garde-fou déjà cassé une fois devient
-- un contrat. Le 2026-08-06 à 18h02, `Q_ALI_09` (suspendu) est entré au pack
-- de base ACTIF — auteur indéterminé, aucune colonne d'audit — et serait parti
-- à chaque onboarding suivant. Réparé le 2026-08-07 à 15h46 par l'effet d'une
-- écriture d'une AUTRE campagne : par accident, pas par mécanisme. La réserve,
-- écrite à la clôture de `2026-08-07-dettes-packs-residuelles`, n'avait jamais
-- eu de lot d'accueil. Ce fichier est le mécanisme.
--
-- ── CE QU'IL NE DOUBLE PAS — NE PAS LE SUPPRIMER COMME REDONDANT ────────────
-- `packs_registre_coherence_v1.sql` garde un AUTRE invariant : que les deux
-- descriptions d'un même pack (`packs.qids` legacy et le miroir relationnel)
-- disent la même chose. Les deux peuvent dire la même chose et être TOUTES
-- DEUX FAUSSES : un pack parfaitement miroité peut référencer un instrument
-- suspendu — c'est exactement l'état de la base du 2026-08-06 au 2026-08-07.
-- Ce fichier est son frère, jamais son doublon.
--
-- ── LA SOURCE DES SUSPENDUS EST LA BASE, JAMAIS UNE LISTE ───────────────────
-- `IDS_SUSPENDUS` (`src/lib/questionnaires-catalog.ts`) dérive du champ
-- `actif` du catalogue de code — et pour `Q_ALI_09`, ce champ dépend d'un
-- drapeau d'environnement (`WN_AGENDA_ALI`). C'est l'objection `D-033` qui a
-- tenu la réserve ouverte : un contrat SQL lirait le catalogue dans la
-- mauvaise position. Ici la suspension se lit là où elle vit EN BASE —
-- `questionnaires.actif = false`, écrit depuis ce même catalogue par
-- `backfillQuestionnaireRegistry.ts`. Constaté en production le 2026-08-21 :
-- dix définitions suspendues, backfillées le 2026-08-06 — la source n'est pas
-- théorique. Une liste de qids recopiée ici dériverait en silence dès la
-- première suspension suivante, et un contrat qui dérive est pire qu'un
-- contrat absent : il rassure.
--
-- ── LES BORNES, NOMMÉES ─────────────────────────────────────────────────────
-- • Un qid sans ligne `questionnaires` n'est PAS jugé ici : son état de
--   suspension est INCONNU, pas « actif » (une absence n'est jamais saine).
--   Pour un pack miroité, l'assertion 1 du frère le fait rougir ; pour un
--   pack jamais synchronisé, personne ne le voit — borne assumée, nommée.
-- • La fraîcheur de `questionnaires.actif` dépend du backfill : une
--   suspension décidée au catalogue et jamais backfillée est invisible d'ici.
--   Le rempart d'exécution reste `IDS_SUSPENDUS` dans les routes
--   d'assignation ; ce contrat attrape ce que ce rempart ne voit pas —
--   l'écriture SQL hors application, l'import, le pack ancien jamais réédité.
--
-- ── CONVENTION D'ÉCRITURE ───────────────────────────────────────────────────
-- `BEGIN READ ONLY` … `ROLLBACK`, comme `packs_registre_coherence_v1.sql` :
-- la base refuse toute écriture pendant l'exécution, le fichier est rejouable
-- sans risque. C'est `RAISE EXCEPTION` qui fait sortir `prisma db execute` en
-- non-zéro.
--
-- ── OÙ IL TOURNE, ET CE QU'IL Y PROUVE ──────────────────────────────────────
-- `ci.yml`, APRÈS le seed, au voisinage du frère : la base y porte le pack de
-- base et ses cinq définitions, toutes actives — le contrat évalue des lignes
-- réelles et rougirait si le seed embarquait un suspendu. Le seed ne posant
-- aujourd'hui aucune définition suspendue, le chemin ROUGE n'est pas éprouvé
-- en continu : il l'a été par mutation locale à l'écriture du lot, les deux
-- assertions, les deux sens (fragment `changelog.d/` du LOT-03). Pas câblé en
-- préflight `release-db.yml` : hors périmètre du lot, décision distincte —
-- qui devra d'abord trancher la position de `Q_ALI_09` (note de conception de
-- `D-033` : le drapeau est documenté allumé en production quand la ligne
-- backfillée du 2026-08-06 dit `false` ; pour les neuf autres suspendus,
-- littéraux du catalogue, la question ne se pose pas).
BEGIN READ ONLY;

DO $$
BEGIN
  -- 1. LEGACY. `packs.qids` est ce que sert le repli de
  --    `resolvePackQuestionnaireIds`, et la seule représentation d'un pack
  --    jamais synchronisé : un pack actif y portant un instrument suspendu
  --    est l'incident du 2026-08-06, à la lettre.
  IF EXISTS (
    SELECT 1
    FROM packs p
    CROSS JOIN LATERAL unnest(p.qids) AS q
    JOIN questionnaires d ON d.questionnaire_id = q
    WHERE p.actif AND NOT d.actif
  ) THEN
    RAISE EXCEPTION
      'packs/suspendus — pack actif referencant un instrument suspendu (source legacy packs.qids) : % (pack, qid). Signaler est le travail du contrat, corriger est une decision : retirer l''instrument depuis l''ecran praticien, ou decider sa reactivation — jamais une reparation SQL.',
      (SELECT string_agg(p.id_pack || '/' || q, ', ' ORDER BY p.id_pack, q)
         FROM packs p
         CROSS JOIN LATERAL unnest(p.qids) AS q
         JOIN questionnaires d ON d.questionnaire_id = q
        WHERE p.actif AND NOT d.actif);
  END IF;

  -- 2. MIROIR. Même invariant sur la représentation relationnelle — pas
  --    redondant avec 1, même sous le contrat frère : le frère n'égalise les
  --    deux représentations que pour un pack MIROITÉ, et ce fichier ne doit
  --    pas dépendre de la santé d'un autre contrat. L'activité se juge sur
  --    `packs.actif` (la représentation qui gouverne le service), jamais sur
  --    `questionnaire_packs.actif` qui n'en est que la copie synchronisée.
  IF EXISTS (
    SELECT 1
    FROM packs p
    JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
    JOIN pack_questionnaires pq ON pq.pack_id = qp.id
    JOIN questionnaires d ON d.id = pq.questionnaire_id
    WHERE p.actif AND NOT d.actif
  ) THEN
    RAISE EXCEPTION
      'packs/suspendus — pack actif referencant un instrument suspendu (miroir relationnel) : % (pack, qid). Meme remede que la source legacy ; si une seule des deux representations est fautive, le frere packs_registre_coherence_v1 rougit aussi.',
      (SELECT string_agg(p.id_pack || '/' || d.questionnaire_id, ', ' ORDER BY p.id_pack, d.questionnaire_id)
         FROM packs p
         JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack
         JOIN pack_questionnaires pq ON pq.pack_id = qp.id
         JOIN questionnaires d ON d.id = pq.questionnaire_id
        WHERE p.actif AND NOT d.actif);
  END IF;

  RAISE NOTICE 'packs/suspendus: contrat v1 verifie (% pack(s) actif(s) evalues, % instrument(s) suspendu(s) connus en base — si ce dernier compte est zero, les assertions sont vacues).',
    (SELECT count(*) FROM packs WHERE actif),
    (SELECT count(*) FROM questionnaires WHERE NOT actif);
END $$;

ROLLBACK;
