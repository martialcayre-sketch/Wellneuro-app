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
-- production, par conteneur, avant de passer ici.
--
-- FAIL-CLOSED ASSUMÉ. Une release ne part pas sur une base où une table signée
-- cite une position que le responsable a révisée ou retirée. La correction est
-- un ARBITRAGE CLINIQUE — re-signer la table sur la version courante, ou
-- re-signer la position — jamais une écriture à la main pour faire verdir un
-- préflight.
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
  SELECT string_agg(
           format('%s@%s [%s] (%s)', e.position_id, e.version, e.table_signee,
                  CASE
                    WHEN v.id IS NULL THEN 'absente'
                    WHEN s.id IS NOT NULL THEN 'révisée par ' || s.version
                    WHEN dernier.acte IS NULL THEN 'aucun acte'
                    WHEN dernier.acte IS DISTINCT FROM 'signee' THEN 'dernier acte ' || dernier.acte
                    ELSE 'empreinte de la signature différente de la version'
                  END),
           ', ' ORDER BY e.position_id, e.version, e.table_signee)
    INTO detail
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
     OR dernier.empreinte IS DISTINCT FROM public.positions_expert_empreinte_contenu(v.contenu);
-- <<< PREDICAT_POSITIONS_CITEES

  IF detail IS NOT NULL THEN
    RAISE EXCEPTION 'POSITIONS CITÉES : une table signée cite une position qui n''est plus signée dans la version épinglée — %', detail
      USING ERRCODE = 'WN001';
  END IF;
END $$;

ROLLBACK;
