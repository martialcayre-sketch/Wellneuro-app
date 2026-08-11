-- Tests NÉGATIFS de la fraîcheur des claims épinglés (LOT-01, [[D-042]]/[[D-044]]).
--
-- `rag_claim_fraicheur_tables_signees_v1.sql` vérifie que l'invariant TIENT, sur
-- la production. Ce fichier vérifie qu'il MORD, en CI. Il n'est pas décoratif :
-- le contrat positif ne peut PAS tourner en CI — la base y est construite vide
-- par `migrate deploy`, les 23 claims épinglés y sont tous absents et le contrat
-- y rougirait à chaque exécution. Sans ce fichier-ci, rien en CI ne dirait
-- jamais que le prédicat fonctionne ([[D-012]], [[D-015]]).
--
-- SEPT CAS. Six formes de rupture doivent lever ; le septième est le CONTRÔLE
-- — un corpus sain qui ne doit jamais lever, sans quoi un prédicat
-- inconditionnellement rouge passerait les six autres. Le contrôle est joué EN
-- PREMIER : si le décor lui-même levait, les six cas suivants lèveraient pour
-- une raison qui n'est pas la leur.
--
-- LES SIX RUPTURES SONT LES QUATRE PROPRIÉTÉS, PLUS DEUX ABSENCES DE NATURE
-- DIFFÉRENTE. `N1` retire la ligne ; `N6` la laisse en place et lui change de
-- VERSION. Les deux se lisent « absent du corpus », mais seul `N6` tue le
-- prédicat écrit sur `claim_id` seul — celui qui laisserait une table signée
-- s'appuyer sur une version qu'elle n'a jamais relue. C'est la raison d'être de
-- la jointure sur la paire.
--
-- CHAQUE CAS EXIGE SON MOTIF, jamais un rejet quelconque : un prédicat remplacé
-- par un `RAISE EXCEPTION` inconditionnel passerait les six ruptures. La
-- sous-chaîne distinctive de chaque cas est contrôlée.
--
-- UNE SEULE ÉCRITURE DU PRÉDICAT DANS CE FICHIER. Il est posé une fois dans une
-- fonction temporaire, appelée par les sept cas. Le bloc encadré par les
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
  SELECT string_agg(
           format('%s@%s (%s)', e.claim_id, e.version_claim,
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
    ('WN-CL-0047-008', 'v1.0'),
    ('WN-CL-0105-001', 'v1.0'),
    ('WN-CL-0136-003', 'v1.0'),
    ('WN-CL-0136-004', 'v1.0'),
    ('WN-CL-0154-013', 'v1.0'),
    ('WN-CL-0178-017', 'v1.0'),
    ('WN-CL-0228-009', 'v1.0'),
    ('WN-CL-0228-010', 'v1.0'),
    ('WN-CL-0234-010', 'v1.0'),
    ('WN-CL-0234-011', 'v1.0'),
    ('WN-CL-0243-005', 'v1.0'),
    ('WN-CL-0287-009', 'v1.0'),
    ('WN-CL-0312-021', 'v1.0'),
    ('WN-CL-0314-008', 'v1.0'),
    ('WN-CL-0314-012', 'v1.0'),
    ('WN-CL-0315-007', 'v1.0'),
    ('WN-CL-0319-010', 'v1.0'),
    ('WN-CL-0323-001', 'v1.0'),
    ('WN-CL-0323-013', 'v1.0'),
    ('WN-CL-0323-023', 'v1.0'),
    ('WN-CL-0323-025', 'v1.0'),
    ('WN-CL-0339-010', 'v1.0'),
    ('WN-CL-0359-025', 'v1.0')
  ) AS e(claim_id, version_claim)
  -- La jointure porte sur LA PAIRE. Joindre sur `claim_id` seul laisserait une
  -- table signée s'appuyer sur une version du claim qui n'est pas celle qu'elle
  -- a relue — c'est le cas `N6` du fichier négatif.
  LEFT JOIN public.rag_corpus_claims c
    ON c.claim_id = e.claim_id AND c.version_claim = e.version_claim
  WHERE c.claim_id IS NULL
     OR c.statut IS DISTINCT FROM 'VALIDE'
     OR c.active IS NOT TRUE
     OR c.superseded_at IS NOT NULL
     OR c.prescriptif IS NOT TRUE;

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
  -- ── Décor : les 23 paires épinglées, toutes saines ────────────────────────
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
  SELECT
    '__fraicheur_' || e.claim_id,
    e.claim_id,
    'WN-SRC-0000',
    e.version_claim,
    'Fixture de contrat — fraîcheur des claims épinglés.',
    md5(e.claim_id) || md5(e.version_claim),
    'déclaré', true, 'VALIDE', 'contrat', now(), true,
    '{"fixture": "fraicheur"}'::jsonb,
    'contrat', 1536, ('[' || repeat('0,', 1535) || '0]')::extensions.vector
  FROM (VALUES
    ('WN-CL-0047-008', 'v1.0'),
    ('WN-CL-0105-001', 'v1.0'),
    ('WN-CL-0136-003', 'v1.0'),
    ('WN-CL-0136-004', 'v1.0'),
    ('WN-CL-0154-013', 'v1.0'),
    ('WN-CL-0178-017', 'v1.0'),
    ('WN-CL-0228-009', 'v1.0'),
    ('WN-CL-0228-010', 'v1.0'),
    ('WN-CL-0234-010', 'v1.0'),
    ('WN-CL-0234-011', 'v1.0'),
    ('WN-CL-0243-005', 'v1.0'),
    ('WN-CL-0287-009', 'v1.0'),
    ('WN-CL-0312-021', 'v1.0'),
    ('WN-CL-0314-008', 'v1.0'),
    ('WN-CL-0314-012', 'v1.0'),
    ('WN-CL-0315-007', 'v1.0'),
    ('WN-CL-0319-010', 'v1.0'),
    ('WN-CL-0323-001', 'v1.0'),
    ('WN-CL-0323-013', 'v1.0'),
    ('WN-CL-0323-023', 'v1.0'),
    ('WN-CL-0323-025', 'v1.0'),
    ('WN-CL-0339-010', 'v1.0'),
    ('WN-CL-0359-025', 'v1.0')
  ) AS e(claim_id, version_claim);
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

  -- ── N5 — le claim n'est plus prescriptif ──────────────────────────────────
  -- La quatrième propriété, celle qu'on oublie : un claim descriptif reste
  -- `VALIDE`, `active` et non remplacé, mais ne peut plus fonder une règle.
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

  RAISE NOTICE 'fraicheur des claims epingles negatif: 6 formes de rupture detectees, 1 corpus sain laisse passer.';
END $$;

ROLLBACK;
