-- Tests NÉGATIFS de la fraîcheur des claims épinglés (LOT-01, [[D-042]]/[[D-044]]).
--
-- `rag_claim_fraicheur_tables_signees_v1.sql` vérifie que l'invariant TIENT, sur
-- la production. Ce fichier vérifie qu'il MORD, en CI. Il n'est pas décoratif :
-- le contrat positif ne peut PAS tourner en CI — la base y est construite vide
-- par `migrate deploy`, les 29 claims épinglés y sont tous absents et le contrat
-- y rougirait à chaque exécution. Sans ce fichier-ci, rien en CI ne dirait
-- jamais que le prédicat fonctionne ([[D-012]], [[D-015]]).
--
-- NEUF CAS. Huit formes de rupture doivent lever ; le neuvième — joué EN
-- PREMIER sous le nom `N0` — est le CONTRÔLE : un corpus sain qui ne doit
-- jamais lever, sans quoi un prédicat inconditionnellement rouge passerait tous
-- les autres. Le jouer en premier évite aussi que les ruptures suivantes lèvent
-- pour une raison qui n'est pas la leur.
--
-- N1 À N6 SONT LES PROPRIÉTÉS, PLUS DEUX ABSENCES DE NATURE DIFFÉRENTE. `N1`
-- retire la ligne ; `N6` la laisse en place et lui change de VERSION. Les deux
-- se lisent « absent du corpus », mais seul `N6` tue le prédicat écrit sur
-- `claim_id` seul — celui qui laisserait une table signée s'appuyer sur une
-- version qu'elle n'a jamais relue. C'est la raison d'être de la jointure sur
-- la paire.
--
-- `N7` ET `N8` GARDENT LES AUTRES LIGNES — contradictions, puis règles d'arrêt
-- ([[D-053]]). N1 à N6 mutent tous un claim d'ORIENTATION : sans
-- N7, un prédicat exemptant la table de contradictions de TOUTES les propriétés
-- — et pas seulement de `prescriptif` — les passerait tous, et le claim de
-- C-STR ne serait gardé par rien. Avec N5, il borne l'exemption de [[D-046]]
-- des deux côtés : N5 dit qu'`prescriptif` reste exigé de l'orientation, N7 que
-- les trois autres propriétés restent exigées des contradictions.
--
-- CHAQUE CAS EXIGE SON MOTIF, jamais un rejet quelconque : un prédicat remplacé
-- par un `RAISE EXCEPTION` inconditionnel passerait les huit ruptures. La
-- sous-chaîne distinctive de chaque cas est contrôlée.
--
-- UNE SEULE ÉCRITURE DU PRÉDICAT DANS CE FICHIER. Il est posé une fois dans une
-- fonction temporaire, appelée par les neuf cas. Le bloc encadré par les
-- marqueurs `PREDICAT_FRAICHEUR_CLAIMS_EPINGLES` est repris MOT POUR MOT du
-- contrat, et `claimsEpinglesFraicheur.guard.test.ts` refuse que les deux
-- divergent — sans quoi ce fichier éprouverait un prédicat qui n'est plus celui
-- qui garde la production, tout en restant vert.
--
-- MUTATIONS ANNULÉES PAR CONSTRUCTION : chaque rupture est posée À L'INTÉRIEUR
-- du bloc qui intercepte l'exception, donc défaite avec lui. Le cas suivant
-- retrouve un décor sain sans avoir à le reconstruire.
--
-- Transaction annulée à la fin : aucune écriture ne survit. À ne JAMAIS jouer
-- contre la production — ce fichier ÉCRIT, même s'il défait. Le contrat de
-- production est l'autre, en `BEGIN READ ONLY`.
BEGIN;

CREATE FUNCTION pg_temp.predicat_fraicheur_claims() RETURNS void AS $fonction$
DECLARE
  detail text;
BEGIN
-- >>> PREDICAT_FRAICHEUR_CLAIMS_EPINGLES
  -- La liste ci-dessous est la copie SQL de ce que les tables signées déclarent
  -- en TypeScript. `claimsEpinglesFraicheur.guard.test.ts` refuse que les deux
  -- divergent : c'est lui — et lui seul — qui force l'entrée d'une table signée
  -- neuve dans ce contrat. Sans ce banc, une table pourrait épingler des claims
  -- que rien ne contrôlerait jamais, ce qui est exactement le trou de l'audit
  -- §E que ce lot existe pour ne pas recopier.
  -- `prescriptif` N'EST EXIGÉ QUE DES TABLES QUI PRESCRIVENT — [[D-046]]. Les
  -- quatre propriétés de D-044 sont le jeu que la relecture du 2026-08-06 avait
  -- contrôlé SUR LA TABLE D'ORIENTATION, dont chaque règle suggère une
  -- exploration. Une règle de contradiction ne prescrit rien : elle CONSTATE
  -- que deux instruments ne disent pas la même chose, et ce constat se fonde
  -- sur un fait descriptif. Exiger `prescriptif` d'un claim descriptif est une
  -- erreur de catégorie — elle aurait forcé à épingler un claim voisin qui ne
  -- dit pas la règle (`DC-14`), ou à bloquer toutes les releases.
  SELECT string_agg(
           format('%s@%s [%s] (%s)', e.claim_id, e.version_claim, e.table_signee,
                  CASE
                    WHEN c.claim_id IS NULL THEN 'absent du corpus'
                    WHEN c.statut IS DISTINCT FROM 'VALIDE' THEN 'statut ' || coalesce(c.statut, '?')
                    WHEN c.active IS NOT TRUE THEN 'active = false'
                    WHEN c.superseded_at IS NOT NULL THEN 'remplacé (superseded_at)'
                    ELSE 'non prescriptif'
                  END),
           ', ' ORDER BY e.claim_id)
    INTO detail
  FROM (VALUES
    ('WN-CL-0047-008', 'v1.0', 'orientation', true),
    ('WN-CL-0105-001', 'v1.0', 'orientation', true),
    ('WN-CL-0136-003', 'v1.0', 'orientation', true),
    ('WN-CL-0136-004', 'v1.0', 'orientation', true),
    ('WN-CL-0154-013', 'v1.0', 'orientation', true),
    ('WN-CL-0178-017', 'v1.0', 'orientation', true),
    ('WN-CL-0228-009', 'v1.0', 'orientation', true),
    ('WN-CL-0228-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-011', 'v1.0', 'orientation', true),
    ('WN-CL-0243-005', 'v1.0', 'orientation', true),
    ('WN-CL-0287-009', 'v1.0', 'orientation', true),
    ('WN-CL-0312-021', 'v1.0', 'orientation', true),
    ('WN-CL-0314-008', 'v1.0', 'orientation', true),
    ('WN-CL-0314-012', 'v1.0', 'orientation', true),
    ('WN-CL-0315-007', 'v1.0', 'orientation', true),
    ('WN-CL-0319-010', 'v1.0', 'orientation', true),
    ('WN-CL-0323-001', 'v1.0', 'orientation', true),
    ('WN-CL-0323-013', 'v1.0', 'orientation', true),
    ('WN-CL-0323-023', 'v1.0', 'orientation', true),
    ('WN-CL-0323-025', 'v1.0', 'orientation', true),
    ('WN-CL-0339-010', 'v1.0', 'orientation', true),
    ('WN-CL-0359-025', 'v1.0', 'orientation', true),
    ('WN-CL-0238-002', 'v1.0', 'contradictions', false),
    -- Table des règles d'arrêt ([[D-053]]). `exige_prescriptif = false` : une
    -- règle d'arrêt ne prescrit pas une exploration, elle en retient une, et ce
    -- qu'elle épingle sont les bandes publiées des instruments qui doivent être
    -- rassurants. L'un de ces claims EST prescriptif (`WN-CL-0051-033`, la
    -- conduite attachée à la bande basse) : la colonne dit ce qu'on EXIGE, pas
    -- ce qu'on interdit.
    ('WN-CL-0051-019', 'v1.0', 'arret', false),
    ('WN-CL-0051-030', 'v1.0', 'arret', false),
    ('WN-CL-0051-033', 'v1.0', 'arret', false),
    ('WN-CL-0127-029', 'v1.0', 'arret', false),
    ('WN-CL-0127-030', 'v1.0', 'arret', false)
  ) AS e(claim_id, version_claim, table_signee, exige_prescriptif)
  -- La jointure porte sur LA PAIRE. Joindre sur `claim_id` seul laisserait une
  -- table signée s'appuyer sur une version du claim qui n'est pas celle qu'elle
  -- a relue — c'est le cas `N6` du fichier négatif.
  LEFT JOIN public.rag_corpus_claims c
    ON c.claim_id = e.claim_id AND c.version_claim = e.version_claim
  WHERE c.claim_id IS NULL
     OR c.statut IS DISTINCT FROM 'VALIDE'
     OR c.active IS NOT TRUE
     OR c.superseded_at IS NOT NULL
     OR (e.exige_prescriptif AND c.prescriptif IS NOT TRUE);

  IF detail IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'WN001',
      MESSAGE = format(
        'claims épinglés — fraîcheur rompue : %s. Une table de règles signée cite un claim que le corpus ne soutient plus. Correction = arbitrage clinique (re-signer la table sans ce claim, ou rétablir le claim par le chemin du corpus), jamais une écriture à la main sur le corpus pour faire verdir ce préflight.',
        detail);
  END IF;
-- <<< PREDICAT_FRAICHEUR_CLAIMS_EPINGLES
END;
$fonction$ LANGUAGE plpgsql;

DO $$
DECLARE
  a_leve boolean;
  msg text;
  cible text := 'WN-CL-0287-009';
BEGIN
  -- ── Décor : les 29 paires épinglées, toutes saines ────────────────────────
  -- Les identifiants sont ceux de la production, mais les lignes sont des
  -- fixtures : texte, embedding et source sont fictifs. La base du CI est
  -- éphémère et vide ; rien de réel n'est touché, et la transaction est annulée.
  -- `validateur` / `valide_at` sont obligatoires dès `statut = 'VALIDE'`
  -- (contrainte `rag_corpus_claims_valide_signe`).
  INSERT INTO public.rag_corpus_claims
    (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
     typologie_lecture, prescriptif, statut, validateur, valide_at, active,
     metadata, embedding_model, embedding_dimensions, embedding)
-- >>> PAIRES_FIXTURES
  -- `prescriptif` SUIT LA TABLE, et c'est le décor qui porte la démonstration :
  -- le claim de la table de contradictions est inséré NON PRESCRIPTIF, comme il
  -- l'est en production. Le cas N0 ci-dessous — « un corpus sain ne lève pas »
  -- — prouve donc, à lui seul, que l'exemption de [[D-046]] fonctionne. Le cas
  -- N7 prouve qu'elle est BORNÉE à cette table.
  SELECT
    '__fraicheur_' || e.claim_id,
    e.claim_id,
    'WN-SRC-0000',
    e.version_claim,
    'Fixture de contrat — fraîcheur des claims épinglés.',
    md5(e.claim_id) || md5(e.version_claim),
    'déclaré', e.exige_prescriptif, 'VALIDE', 'contrat', now(), true,
    '{"fixture": "fraicheur"}'::jsonb,
    'contrat', 1536, ('[' || repeat('0,', 1535) || '0]')::extensions.vector
  FROM (VALUES
    ('WN-CL-0047-008', 'v1.0', 'orientation', true),
    ('WN-CL-0105-001', 'v1.0', 'orientation', true),
    ('WN-CL-0136-003', 'v1.0', 'orientation', true),
    ('WN-CL-0136-004', 'v1.0', 'orientation', true),
    ('WN-CL-0154-013', 'v1.0', 'orientation', true),
    ('WN-CL-0178-017', 'v1.0', 'orientation', true),
    ('WN-CL-0228-009', 'v1.0', 'orientation', true),
    ('WN-CL-0228-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-010', 'v1.0', 'orientation', true),
    ('WN-CL-0234-011', 'v1.0', 'orientation', true),
    ('WN-CL-0243-005', 'v1.0', 'orientation', true),
    ('WN-CL-0287-009', 'v1.0', 'orientation', true),
    ('WN-CL-0312-021', 'v1.0', 'orientation', true),
    ('WN-CL-0314-008', 'v1.0', 'orientation', true),
    ('WN-CL-0314-012', 'v1.0', 'orientation', true),
    ('WN-CL-0315-007', 'v1.0', 'orientation', true),
    ('WN-CL-0319-010', 'v1.0', 'orientation', true),
    ('WN-CL-0323-001', 'v1.0', 'orientation', true),
    ('WN-CL-0323-013', 'v1.0', 'orientation', true),
    ('WN-CL-0323-023', 'v1.0', 'orientation', true),
    ('WN-CL-0323-025', 'v1.0', 'orientation', true),
    ('WN-CL-0339-010', 'v1.0', 'orientation', true),
    ('WN-CL-0359-025', 'v1.0', 'orientation', true),
    ('WN-CL-0238-002', 'v1.0', 'contradictions', false),
    -- Table des règles d'arrêt ([[D-053]]). `exige_prescriptif = false` : une
    -- règle d'arrêt ne prescrit pas une exploration, elle en retient une, et ce
    -- qu'elle épingle sont les bandes publiées des instruments qui doivent être
    -- rassurants. L'un de ces claims EST prescriptif (`WN-CL-0051-033`, la
    -- conduite attachée à la bande basse) : la colonne dit ce qu'on EXIGE, pas
    -- ce qu'on interdit.
    ('WN-CL-0051-019', 'v1.0', 'arret', false),
    ('WN-CL-0051-030', 'v1.0', 'arret', false),
    ('WN-CL-0051-033', 'v1.0', 'arret', false),
    ('WN-CL-0127-029', 'v1.0', 'arret', false),
    ('WN-CL-0127-030', 'v1.0', 'arret', false)
  ) AS e(claim_id, version_claim, table_signee, exige_prescriptif);
-- <<< PAIRES_FIXTURES

  -- ── N0 — CONTRÔLE : un corpus SAIN ne lève pas ────────────────────────────
  -- Sans ce cas, un prédicat toujours-rouge passerait les six suivants — et il
  -- bloquerait toutes les releases sur une production parfaitement saine.
  a_leve := false; msg := '';
  BEGIN
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF a_leve THEN
    RAISE EXCEPTION 'negatif N0: un corpus SAIN a ete declare en derive — %', msg;
  END IF;

  -- ── N1 — un claim épinglé ABSENT du corpus ────────────────────────────────
  a_leve := false; msg := '';
  BEGIN
    DELETE FROM public.rag_corpus_claims WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('absent du corpus' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N1: un claim epingle ABSENT n''a pas ete detecte — %', msg;
  END IF;

  -- ── N2 — le claim existe mais n'est plus VALIDE ───────────────────────────
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims
       SET statut = 'REJETE', validateur = NULL, valide_at = NULL
     WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('statut REJETE' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N2: un claim epingle NON VALIDE n''a pas ete detecte — %', msg;
  END IF;

  -- ── N3 — le claim est désactivé ───────────────────────────────────────────
  -- `active` est une colonne distincte de `statut` : un claim peut rester
  -- « VALIDE » et sortir du service. Contrôler `statut` seul le manquerait.
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET active = false WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('active = false' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N3: un claim epingle DESACTIVE n''a pas ete detecte — %', msg;
  END IF;

  -- ── N4 — le claim a été remplacé ──────────────────────────────────────────
  -- Un claim remplacé reste `VALIDE` et `active` : c'est `superseded_at`, et lui
  -- seul, qui dit que la table signée s'appuie sur une version périmée.
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET superseded_at = now() WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('remplacé (superseded_at)' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N4: un claim epingle REMPLACE n''a pas ete detecte — %', msg;
  END IF;

  -- ── N5 — un claim d'ORIENTATION n'est plus prescriptif ────────────────────
  -- La quatrième propriété, celle qu'on oublie : un claim descriptif reste
  -- `VALIDE`, `active` et non remplacé, mais ne peut plus fonder une règle qui
  -- PRESCRIT une exploration.
  --
  -- CE CAS BORNE AUSSI L'EXEMPTION DE [[D-046]], et c'est sa seconde raison
  -- d'être. `cible` est un claim de la table d'ORIENTATION : le décor prouve
  -- déjà qu'un claim de contradiction non prescriptif passe (cas N0, où
  -- `WN-CL-0238-002` est inséré non prescriptif, comme en production) ; ce cas
  -- prouve l'autre moitié. Un prédicat qui aurait simplement laissé tomber la
  -- propriété passerait N0 et échouerait ici.
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET prescriptif = false WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('non prescriptif' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N5: un claim epingle NON PRESCRIPTIF n''a pas ete detecte — %', msg;
  END IF;

  -- ── N6 — LE CLAIM EST LÀ, MAIS PAS DANS LA VERSION ÉPINGLÉE ───────────────
  -- Le cas qui tue le prédicat écrit sur `claim_id` seul. La ligne existe,
  -- elle est VALIDE, active, non remplacée et prescriptive — mais c'est une
  -- AUTRE version que celle que la table signée a relue. Un prédicat qui
  -- ignorerait `version_claim` passerait les cinq cas précédents et celui-ci
  -- resterait sa seule contradiction.
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET version_claim = 'v2.0' WHERE claim_id = cible;
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('absent du corpus' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N6: une VERSION DIVERGENTE du claim epingle n''a pas ete detectee — %', msg;
  END IF;

  -- ── N7 — LA LIGNE `contradictions` EST GARDÉE, ELLE AUSSI ────────────────
  -- LE CAS QUE LES SIX PRÉCÉDENTS NE COUVRAIENT PAS. N1 à N6 mutent tous
  -- `cible`, qui est un claim d'ORIENTATION. Un prédicat qui aurait exempté la
  -- table de contradictions de TOUTES les propriétés — et pas seulement de
  -- `prescriptif` — les passait tous les six, passait N0, et laissait le claim
  -- de C-STR gardé par rien, dans un contrat dont c'est l'unique raison d'être.
  --
  -- On désactive le claim de contradiction : `active` est une propriété exigée
  -- de TOUTES les tables, l'exemption de [[D-046]] ne porte que sur
  -- `prescriptif`.
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET active = false WHERE claim_id = 'WN-CL-0238-002';
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('WN-CL-0238-002' in msg) = 0 OR position('active = false' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N7: la ligne contradictions n''est gardee par rien — %', msg;
  END IF;

  -- ── N8 — LA LIGNE `arret` EST GARDÉE, ELLE AUSSI ─────────────────────────
  -- MÊME DÉMONSTRATION QUE N7, POUR LA TABLE DES RÈGLES D'ARRÊT ([[D-053]]).
  -- Elle entre au contrat avec `exige_prescriptif = false`, comme les
  -- contradictions : sans ce cas, un prédicat qui l'aurait exemptée de TOUTES
  -- les propriétés — et pas seulement de `prescriptif` — passerait les huit
  -- précédents, et une table capable d'ÉTEINDRE une exploration s'appuierait
  -- sur des claims que rien ne contrôlerait.
  --
  -- Ce qui rend le cas discriminant est double, et le second point est celui
  -- qu'on oublie : le prédicat doit LEVER, et le détail doit NOMMER ce claim-ci.
  -- Un prédicat qui ignorerait la table d'arrêt ne le nommerait pas. (Comme les
  -- sept cas précédents, la mutation est posée DANS le bloc qui intercepte :
  -- l'exception la défait, et le cas suivant repart d'un corpus sain.)
  a_leve := false; msg := '';
  BEGIN
    UPDATE public.rag_corpus_claims SET active = false WHERE claim_id = 'WN-CL-0051-033';
    PERFORM pg_temp.predicat_fraicheur_claims();
  EXCEPTION WHEN SQLSTATE 'WN001' THEN a_leve := true; msg := SQLERRM;
  END;
  IF NOT a_leve OR position('WN-CL-0051-033' in msg) = 0 OR position('active = false' in msg) = 0 THEN
    RAISE EXCEPTION 'negatif N8: la ligne arret n''est gardee par rien — %', msg;
  END IF;

  RAISE NOTICE 'fraicheur des claims epingles negatif: 8 formes de rupture detectees, 1 corpus sain (dont un claim de contradiction et cinq claims d''arret non prescriptifs) laisse passer.';
END $$;

ROLLBACK;
