-- Contrat des positions d'expert citées par les tables SIGNÉES
-- ([[D-480]] §5.3, BP-17 PR 4 ; patron du contrat de fraîcheur des claims,
-- `rag_claim_fraicheur_tables_signees_v1.sql`, [[D-044]]).
--
-- CE QU'IL GARDE. Une table signée peut citer une position d'expert par
-- version (`WN-PE-NNNN@vN.M`) — aujourd'hui la seule bibliothèque des options,
-- dont chaque rubrique renvoie à ses sources ([[D-480]] §4). La signature dit
-- que le responsable a relu cette version ce jour-là ; elle ne dit rien de ce
-- que la position est devenue depuis. Les positions citées « se contrôlent
-- comme les claims » (réponse `20261110-1942-c`) : chacune doit EXISTER, être
-- la version COURANTE de sa position (aucune version ne la révise), et son
-- DERNIER acte, lu par `ordre`, doit être une SIGNATURE dont l'empreinte est
-- celle de la version. Une position révisée ou retirée met ce contrat au rouge,
-- comme un claim remplacé met au rouge le contrat des claims.
--
-- SES CLAIMS D'APPUI ([[D-525]], réponses `20261114-1435-c` et
-- `20261114-2214-c`). La position signée se lit avec les claims qui
-- l'appuient. Chacun, sur sa paire exacte `identifiant@version`, doit être
-- présent au corpus, `VALIDE`, actif et non remplacé : les trois propriétés
-- de [[D-046]], quelle que soit la rubrique qui cite la position, dose
-- comprise. `prescriptif` n'est pas exigé d'un appui : une observation
-- descriptive peut soutenir une position signée sans devenir elle-même une
-- recommandation. La base ne lie pas les appuis au corpus (aucune clé
-- étrangère, migration `positions_expert_v1`) : ce contrat est le seul
-- endroit où un appui rejeté, désactivé ou remplacé se voit. Il ne juge pas
-- le CONTENU de la position — qu'elle porte la dose et ses conditions est une
-- condition de sa signature (D-525 §2), non un prédicat.
--
-- L'EMPREINTE. La base refuse déjà un acte dont l'empreinte ne correspond pas
-- au contenu (trigger `positions_expert_actes_avant_insertion`), et le contenu
-- d'une version ne change plus (append-only). La comparaison est donc tenue en
-- défense : elle n'a pas de fixture possible, et le négatif le dit.
--
-- POURQUOI CE FICHIER NE TOURNE PAS EN CI. La base du CI est vide : une
-- position citée y serait absente. Il n'a de sens que contre la PRODUCTION, en
-- préflight de `release-db` (`web/scripts/release-db-scalingo.sh`), AVANT
-- `migrate deploy`. Ce qui éprouve qu'il MORD est
-- `positions_citees_tables_signees_v1_negatif.sql`, qui pose ses fixtures et
-- tourne en CI. Les deux portent le MÊME prédicat (bloc
-- PREDICAT_POSITIONS_CITEES) ; la liste ne vit qu'ici (bloc
-- LISTE_POSITIONS_CITEES). `positionsCitees.guard.test.ts` tient les trois
-- ensemble : la liste égale ce que citent les tables signées, et le prédicat
-- est le même des deux côtés.
--
-- LA LISTE EST VIDE au 2026-11-13 : la structure de la bibliothèque est vide
-- et non signée (BP-17, PR 3). Elle se remplit avec la transcription des
-- contenus du responsable (PR 7) ; chaque entrée se relit alors sur la
-- production, par conteneur, avant de passer ici. Au 2026-11-14, la
-- structure transcrite (PR 7, [[D-521]]) ne cite toujours aucune position :
-- la liste reste vide, et c'est le négatif, sur ses fixtures, qui prouve que
-- le contrôle des appuis mord. Une entrée neuve se relit avec ses appuis.
--
-- FAIL-CLOSED ASSUMÉ. Une release ne part pas sur une base où une table signée
-- cite une position que le responsable a révisée ou retirée, ou dont un claim
-- d'appui n'est plus tenu par le corpus. La correction est un ARBITRAGE
-- CLINIQUE — re-signer la table sur la version courante, réviser et re-signer
-- la position, ou rétablir le claim par le chemin du corpus — jamais une
-- écriture à la main pour faire verdir un préflight.
--
-- `BEGIN READ ONLY … ROLLBACK` : aucune écriture, rejouable sans risque.
-- ERRCODE sentinelle WN001, jamais intercepté ici.
BEGIN READ ONLY;

DO $$
DECLARE
  detail text;
  epinglees jsonb;
BEGIN
-- >>> LISTE_POSITIONS_CITEES
  -- Une entrée par position citée et par table : position, version, table.
  epinglees := '[]'::jsonb;
-- <<< LISTE_POSITIONS_CITEES
-- >>> PREDICAT_POSITIONS_CITEES
  -- Deux familles de violations, réunies en un seul détail. La POSITION
  -- d'abord (D-480 §5.3) : présente, courante, dernier acte une signature
  -- d'empreinte égale. Puis ses CLAIMS D'APPUI ([[D-525]]) : chacun, sur sa
  -- paire exacte `identifiant@version`, présent au corpus, `VALIDE`, actif et
  -- non remplacé — les trois propriétés de [[D-046]], dans toute rubrique, la
  -- dose comprise. `prescriptif` n'est PAS exigé d'un appui : la signature de
  -- la position porte seule son caractère prescriptif (D-525 §1). Les appuis
  -- se lisent sur la version ÉPINGLÉE, même révisée ; une position absente
  -- n'en a aucun à lire, et sa seule absence la refuse déjà.
  SELECT string_agg(
           format('%s@%s [%s] (%s)', x.position_id, x.version, x.table_signee, x.motif),
           ', ' ORDER BY x.position_id, x.version, x.table_signee, x.famille, x.appui)
    INTO detail
  FROM (
    SELECT e.position_id, e.version, e.table_signee, 1 AS famille, ''::text AS appui,
           CASE
             WHEN v.id IS NULL THEN 'absente'
             WHEN s.id IS NOT NULL THEN 'révisée par ' || s.version
             WHEN dernier.acte IS NULL THEN 'aucun acte'
             WHEN dernier.acte IS DISTINCT FROM 'signee' THEN 'dernier acte ' || dernier.acte
             ELSE 'empreinte de la signature différente de la version'
           END AS motif
    FROM jsonb_to_recordset(epinglees) AS e(position_id text, version text, table_signee text)
    LEFT JOIN positions_expert_versions v
      ON v.position_id = e.position_id AND v.version = e.version
    LEFT JOIN positions_expert_versions s
      ON s.id_version_revisee = v.id
    LEFT JOIN LATERAL (
      SELECT a.acte, a.empreinte
      FROM positions_expert_actes a
      WHERE a.id_version = v.id
      ORDER BY a.ordre DESC
      LIMIT 1
    ) dernier ON true
    WHERE v.id IS NULL
       OR s.id IS NOT NULL
       OR dernier.acte IS DISTINCT FROM 'signee'
       OR dernier.empreinte IS DISTINCT FROM public.positions_expert_empreinte_contenu(v.contenu)
    UNION ALL
    SELECT e.position_id, e.version, e.table_signee, 2 AS famille, appui.cle AS appui,
           'appui ' || appui.cle || ' : ' ||
           CASE
             WHEN c.claim_id IS NULL THEN 'absent du corpus'
             WHEN c.statut IS DISTINCT FROM 'VALIDE' THEN 'statut ' || coalesce(c.statut, '?')
             WHEN c.active IS NOT TRUE THEN 'active = false'
             ELSE 'remplacé (superseded_at)'
           END AS motif
    FROM jsonb_to_recordset(epinglees) AS e(position_id text, version text, table_signee text)
    JOIN positions_expert_versions v
      ON v.position_id = e.position_id AND v.version = e.version
    CROSS JOIN LATERAL unnest(v.claims_appui) AS appui(cle)
    -- La jointure porte sur LA PAIRE, comme au contrat de fraîcheur : un appui
    -- relu en v1.0 ne se tient pas par une v2.0 du même claim.
    LEFT JOIN public.rag_corpus_claims c
      ON c.claim_id = split_part(appui.cle, '@', 1)
     AND c.version_claim = split_part(appui.cle, '@', 2)
    WHERE c.claim_id IS NULL
       OR c.statut IS DISTINCT FROM 'VALIDE'
       OR c.active IS NOT TRUE
       OR c.superseded_at IS NOT NULL
  ) AS x;
-- <<< PREDICAT_POSITIONS_CITEES

  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une table signée cite une position qui n''est plus signée dans la version épinglée, ou dont un claim d''appui n''est plus tenu par le corpus — %', detail
      USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
