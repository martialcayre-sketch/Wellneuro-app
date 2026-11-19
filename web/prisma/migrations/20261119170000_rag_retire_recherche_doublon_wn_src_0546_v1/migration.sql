-- WellNeuro — retrait de la recherche des claims et des passages du manuscrit
-- WN-SRC-0546, doublon de sa version publiée WN-SRC-0564 (question
-- 20261119-1311-b de la liste commune, réponse A du responsable du
-- 2026-11-19 ; mécanisme : [[D-490]]).
--
-- POURQUOI. Le manuscrit soumis WN-SRC-0546 (lot LOT_031) et l'article publié
-- WN-SRC-0564 (lot LOT_044) portent le même travail. Le registre des sources
-- tient le manuscrit pour `deprecated` (« claims non retenus », arbitrage du
-- 2026-10-20), mais ses 8 claims sont signés (VALIDE), actifs et remontaient
-- en recherche à côté de leurs jumeaux : la même étude y sortait deux fois.
--
-- CE QUE FAIT LA MIGRATION, sans créer aucune colonne ni aucun objet :
--   1. les claims VALIDE et actifs de WN-SRC-0546 sont EXCLUS DE LA RECHERCHE
--      par la marque existante `exclu_recherche` (D-490), que
--      `match_wellneuro_rag_claims` respecte. Leur statut, leur signataire et
--      leur date de signature ne bougent pas : l'exclusion n'est pas un rejet
--      (D-490 §2). Chaque exclusion est consignée au journal des décisions par
--      un acte `exclusion_recherche` (un claim par acte, sens `exclure`, motif
--      obligatoire), comme l'écrit l'atelier (`exclureDeLaRecherche`,
--      `revue.ts`) : l'UPDATE et l'INSERT du journal sont dans la même
--      transaction, celle de la migration. Le validateur consigné est celui qui
--      a signé le claim, le responsable (même identité que celle de l'atelier),
--      lue sur la ligne du claim : aucune adresse n'est écrite en dur ici ;
--   2. les passages de WN-SRC-0546 sont retirés de la recherche par le drapeau
--      existant `active = false`, que `match_wellneuro_rag_chunks` lit. Les
--      passages n'ont pas de marque d'exclusion propre : `active` est la seule
--      voie sans changement de schéma. Aucune ligne n'est supprimée, aucun
--      contenu ni aucune empreinte ne change ; les liens des claims vers ces
--      passages restent (AC-2 : un claim reste adossé à la version citée), et
--      `store.ts` les compte parmi les sources « supersédées », dérive qu'il
--      décrit lui-même comme normale, jamais comme une faute ;
--
-- CE QU'ELLE NE FAIT PAS. Rien n'est supprimé, rien n'est rejeté, aucun statut
-- ne change. WN-SRC-0564 n'est pas touché. L'acte se défait par l'acte
-- inverse de l'atelier (`retablir`) et par `active = true` sur les passages.
--
-- GARDES, qui annulent toute la migration (RAISE) plutôt que d'avancer :
--   * si WN-SRC-0546 porte des lignes vivantes mais que WN-SRC-0564 n'a aucun
--     claim VALIDE actif ni aucun passage actif, la migration refuse : elle ne
--     retire jamais la seule version d'une étude ;
--   * après coup, plus aucun claim VALIDE actif de WN-SRC-0546 n'est visible
--     en recherche, plus aucun de ses passages n'est actif, et chaque claim
--     exclu a son acte au journal.
-- Sur une base vide (le CI, un poste de développement), la migration est sans
-- effet : aucune ligne ne correspond, et les gardes ne s'appliquent pas.

DO $$
DECLARE
  n_vivants_claims integer;
  n_vivants_passages integer;
  n_publie_claims integer;
  n_publie_passages integer;
  n_exclus integer;
  n_actes integer;
  n_restants_claims integer;
  n_restants_passages integer;
BEGIN
  SELECT count(*) INTO n_vivants_claims
  FROM public.rag_corpus_claims
  WHERE source_id = 'WN-SRC-0546' AND statut = 'VALIDE' AND active = true AND exclu_recherche = false;

  SELECT count(*) INTO n_vivants_passages
  FROM public.rag_corpus_chunks
  WHERE source_id = 'WN-SRC-0546' AND active = true;

  IF n_vivants_claims + n_vivants_passages > 0 THEN
    SELECT count(*) INTO n_publie_claims
    FROM public.rag_corpus_claims
    WHERE source_id = 'WN-SRC-0564' AND statut = 'VALIDE' AND active = true AND exclu_recherche = false;

    SELECT count(*) INTO n_publie_passages
    FROM public.rag_corpus_chunks
    WHERE source_id = 'WN-SRC-0564' AND active = true;

    IF n_publie_claims = 0 OR n_publie_passages = 0 THEN
      RAISE EXCEPTION
        'doublon WN-SRC-0546 : la version publiée WN-SRC-0564 n''a ni claim VALIDE visible ni passage actif (% / %) ; le manuscrit n''est pas retiré.',
        n_publie_claims, n_publie_passages;
    END IF;
  END IF;

  -- 1. Claims : exclusion de la recherche + acte du journal, même instruction.
  WITH exclus AS (
    UPDATE public.rag_corpus_claims
    SET exclu_recherche = true,
        updated_at = now()
    WHERE source_id = 'WN-SRC-0546'
      AND statut = 'VALIDE'
      AND active = true
      AND exclu_recherche = false
    RETURNING id, claim_id, version_claim, source_id, validateur
  ), actes AS (
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, motif, validateur, source_id, claims)
    SELECT
      'exclusion_recherche',
      'Doublon : le manuscrit soumis WN-SRC-0546 est remplacé par sa version publiée WN-SRC-0564 (arbitrage du responsable du 2026-11-19, question 20261119-1311-b, réponse A ; D-490).',
      COALESCE(NULLIF(btrim(e.validateur), ''), 'migration'),
      e.source_id,
      jsonb_build_array(jsonb_build_object(
        'id', e.id,
        'claimId', e.claim_id,
        'versionClaim', e.version_claim,
        'sens', 'exclure'
      ))
    FROM exclus AS e
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM exclus), (SELECT count(*) FROM actes)
  INTO n_exclus, n_actes;

  IF n_exclus <> n_actes THEN
    RAISE EXCEPTION
      'doublon WN-SRC-0546 : % claim(s) exclu(s) mais % acte(s) au journal.', n_exclus, n_actes;
  END IF;

  -- 2. Passages : retrait de la recherche par le drapeau existant.
  UPDATE public.rag_corpus_chunks
  SET active = false,
      updated_at = now()
  WHERE source_id = 'WN-SRC-0546'
    AND active = true;

  -- 3. Garde de sortie.
  SELECT count(*) INTO n_restants_claims
  FROM public.rag_corpus_claims
  WHERE source_id = 'WN-SRC-0546' AND statut = 'VALIDE' AND active = true AND exclu_recherche = false;

  SELECT count(*) INTO n_restants_passages
  FROM public.rag_corpus_chunks
  WHERE source_id = 'WN-SRC-0546' AND active = true;

  IF n_restants_claims <> 0 OR n_restants_passages <> 0 THEN
    RAISE EXCEPTION
      'doublon WN-SRC-0546 : il reste % claim(s) visible(s) et % passage(s) actif(s) après la migration.',
      n_restants_claims, n_restants_passages;
  END IF;
END
$$;
