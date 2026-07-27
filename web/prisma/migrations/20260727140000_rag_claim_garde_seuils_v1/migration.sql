-- WellNeuro — garde de contenu de la voie rapide de validation des claims.
--
-- Motif : l'audit du 2026-07-27
-- (docs/claude/propositions/2026-07-27-audit-claims-non-prescriptifs/) a lu un
-- par un les 245 claims porteurs d'un chiffre parmi les 563 du notebook 08
-- éligibles à la signature par lot. AU MOINS 55 portent une plage de référence
-- ou un seuil de décision : la grille ferritine en cinq bandes, les trois
-- seuils d'homocystéine, zinc, magnésium érythrocytaire, GABA, glutamate,
-- mélatonine, et 19 bandes d'interprétation de scores cliniques.
--
-- L'allowlist existante — 'déclaré'/'observé' non prescriptifs — ne les arrête
-- pas, et ce n'est pas un défaut d'étiquetage : le prompt du rédacteur définit
-- `prescriptif` comme « recommande une action, une dose, une conduite », et une
-- plage de référence n'en recommande aucune. Aucun des deux champs n'encode
-- « ce claim porte une borne de décision ». La frontière 'déclaré'/'interprété'
-- ne tranche pas davantage : une grille dont les bandes s'appellent « carence
-- profonde » et « zone de confort » se lit des deux façons. Un garde qui repose
-- sur une distinction qu'un lecteur compétent ne sait pas appliquer de façon
-- reproductible n'est pas un garde.
--
-- D'où un critère de CONTENU, vérifiable, indépendant de la typologie : un
-- claim porteur d'une borne numérique part en revue INDIVIDUELLE. Il n'est
-- jamais rejeté ni caché — seule la signature par lot lui est fermée.
--
-- Le motif est défini ICI ET UNE SEULE FOIS. La voie rapide s'éprouve en six
-- endroits (cinq requêtes de web/src/lib/rag/claims/revue.ts et le trigger
-- ci-dessous) ; une définition par site aurait divergé au premier ajustement,
-- et l'audit a précisément trébuché sur une énumération à quatre sites au lieu
-- de six. Les cinq requêtes appellent cette fonction, elles ne la recopient pas.
--
-- Aucune donnée n'est touchée : ni statut, ni signature, ni claim. Le corpus
-- est exclusivement documentaire, sans donnée patient.

-- Performance mesurée en production (2026-07-27), sur la vérité de terrain des
-- 55 claims établie par l'audit : RAPPEL 55/55 (aucun manqué), PRÉCISION 55/84
-- (65 %) sur la population auditée. Le garde sur-capture d'un tiers : vingt-neuf
-- claims de plus en revue individuelle, aucun laissé passer parmi ceux qui
-- portent un chiffre. Coût sur tout le corpus : 1511 claims éligibles à la voie
-- rapide deviennent 1254, soit 257 (17 %) qui basculent en revue individuelle.
--
-- Chaque alternative est mesurée, aucune n'est écrite au jugé. Deux exemples de
-- ce que la mesure a corrigé : `u?i? ?/ ?l`, hérité du script d'audit, avait ses
-- deux lettres optionnelles et matchait donc n'importe quel « /l » ; et
-- `en de..` attrapait « en dehors », « en demandant », « en deux » — 26 captures
-- de plus que `en de(ssous|çà)`, dont 23 que rien d'autre n'attrapait. Les
-- resserrer n'a rien coûté au rappel, revérifié à 55/55 après coup.
--
-- Ce que le motif NE VOIT PAS, et qu'il faut savoir : un claim sans aucun
-- chiffre. L'audit a exclu 318 claims sur ce critère, par une hypothèse
-- explicite — une borne de décision porte un nombre. « Les valeurs normales
-- sont celles du laboratoire » passerait donc, sans être exploitable comme
-- seuil pour autant.
--
-- IMMUTABLE : légitime parce que l'opérateur `~*` (texticregexeq) est lui-même
-- déclaré IMMUTABLE dans pg_catalog, et que la fonction ne lit ni table ni
-- réglage de session. Ce n'est PAS une optimisation par ligne : la clause
-- `SET search_path` interdit l'inlining, l'appel a donc bien lieu pour chaque
-- ligne. Et ce n'est pas non plus une condition d'appel depuis le trigger —
-- PostgreSQL n'impose aucune volatilité là. Ce que IMMUTABLE autorise seul,
-- c'est l'usage en index ou en CHECK, si le besoin s'en présentait.
CREATE OR REPLACE FUNCTION public.rag_claim_porte_seuil(texte text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT texte IS NOT NULL AND (
    -- 1. Une unité de concentration. Seule la PREMIÈRE alternative exige un
    --    chiffre devant ; les suivantes attrapent l'unité seule (« exprimé en
    --    mmol/l » part donc en revue individuelle — sur-capture assumée).
    --    Le `u` de la classe couvre le micro rendu en ASCII : une extraction PDF
    --    écrit « ug/L » aussi souvent que « µg/L ». Zéro occurrence au corpus
    --    aujourd'hui — l'alternative est une assurance, pas une réponse à une
    --    mesure, et elle ne coûte aucune capture.
    texte ~* '[0-9] ?(µ|u|n|m|p)?g ?/ ?(l|dl|ml|g)|mmol ?/ ?l|µmol ?/ ?(l|mmol)|nmol ?/ ?l|pmol ?/ ?l|ng ?/ ?ml|pg ?/ ?ml|m?ui ?/ ?l|u ?/ ?l|meq ?/ ?l|g ?/ ?(24 ?h|jour|j\M)'
    -- 2. Le vocabulaire de la borne, nombre ou pas.
    OR texte ~* 'seuil|valeur[s]? (de r.f.rence|normale?s?|souhait|de tol.rance)|plage|intervalle de r.f.rence|norme[s]?|fourchette|r.f.rence (maximale|minimale)'
    -- 3. Une comparaison — c'est elle qui attrape « rapport T3/rT3 supérieur à 20 ».
    --    `(^|[^p])[<>]` capture aussi la forme collée (« >2 % de lipides »,
    --    « >70 % cacao ») que ` < | > ` manquait, tout en écartant les p-values :
    --    au corpus, 11 claims portent un `<` ou `>` collé à un chiffre, et 7 sont
    --    des « p<0,0001 » qui ne sont pas des bornes de décision.
    OR texte ~* 'inf.rieur|sup.rieur|au-del.|en de(ssous|çà)|d.passant|≤|≥| < | > |(^|[^p])[<>] ?=? ?[0-9]'
    -- 4. Le vocabulaire de l'optimum. « cible » est délibérément absent : il
    --    attrapait « tissus cibles » et « gènes cibles » sans rien apporter au
    --    rappel — aucun des 55 ne dépend de lui.
    OR texte ~* 'optimal|carence si|d.ficit si'
    -- 5. Un intervalle numérique nu : « 50-77 », « 1,8 à 4,7 », « 0 et 10 ».
    --    C'est lui qui attrape les bandes de scores et « GABA 0.40-0.85 ».
    OR texte ~* '[0-9]+([.,][0-9]+)? ?(à|-|–|et) ?[0-9]'
  );
$$;

-- Doctrine du dépôt, posée après l'incident du 2026-07-21
-- (20260721230000_rag_revoke_public_execute) : créer une fonction accorde
-- EXECUTE à PUBLIC par défaut, donc à `anon` et `authenticated`, et PostgREST
-- l'expose alors en /rpc/. Celle-ci est pure et ne lit aucune donnée — la
-- révocation ne protège rien de sensible ici, elle tient la règle plutôt que de
-- laisser une exception s'installer.
REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM PUBLIC;

COMMENT ON FUNCTION public.rag_claim_porte_seuil(text) IS
  'Vrai si le texte d''un claim porte une borne de décision (plage de référence, seuil, bande d''interprétation). Ferme la signature par lot, jamais la validation individuelle. Définition unique, appelée par revue.ts et par le trigger du journal. Audit du 2026-07-27 : rappel 55/55, précision 65 %.';

-- Le trigger du journal redonde l'allowlist applicative. Il reçoit ici le même
-- critère de contenu : sans lui, une ligne `decision_lot` couvrant un claim à
-- seuil serait acceptée par la base, et l'échec ne se produirait qu'en aval, au
-- comptage des lignes réellement mises à jour — un refus obscur
-- (`LOT_ETAT_DIVERGENT`) au lieu d'un refus nommé.
CREATE OR REPLACE FUNCTION public.rag_claim_decisions_avant_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  tirage_ok boolean;
  claims_invalides bigint;
BEGIN
  NEW.cree_le := now();

  IF NEW.tirage_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.rag_corpus_claim_decisions d
      WHERE d.id = NEW.tirage_id
        AND d.type_acte = 'tirage_echantillon'
        AND d.source_id = NEW.source_id
    ) INTO tirage_ok;
    IF NOT tirage_ok THEN
      RAISE EXCEPTION 'tirage_id % n''est pas un tirage_echantillon de la source %.',
        NEW.tirage_id, NEW.source_id;
    END IF;
  END IF;

  IF NEW.type_acte = 'decision_lot' THEN
    SELECT count(*) INTO claims_invalides
    FROM jsonb_array_elements(NEW.claims) AS e
    LEFT JOIN public.rag_corpus_claims c ON c.id = e.value ->> 'id'
    WHERE c.id IS NULL
       OR c.prescriptif
       OR c.typologie_lecture NOT IN ('déclaré', 'observé')
       OR c.source_id IS DISTINCT FROM NEW.source_id
       OR public.rag_claim_porte_seuil(c.texte_normalise);
    IF claims_invalides > 0 THEN
      RAISE EXCEPTION
        'decision_lot refusée : % claim(s) inexistants, hors source, prescriptifs, hors voie rapide (déclaré/observé seuls) ou porteurs d''une borne de décision — la voie lente ne se signe jamais par lot.',
        claims_invalides;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
