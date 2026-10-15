-- WellNeuro — garde de contenu de la voie rapide : la dose (D-304, lettre n,
-- EF-3b).
--
-- Motif : la garde du 2026-07-27 (20260727140000) ferme la signature par lot
-- aux claims qui portent une borne de décision. Une dose écrite en toutes
-- lettres n'en fait pas partie : « 200 mg de zinc par jour » ne porte ni unité
-- de concentration, ni seuil, ni comparaison, ni intervalle — elle pouvait être
-- signée par lot sans avoir été lue seule, puis servie dans une fiche. La forme
-- à barre oblique, elle, était déjà prise (`g ?/ ?jour` de la famille 1).
--
-- La règle (D-304 §2) : un nombre, une unité de dose (mg, µg, g, UI, ml…),
-- puis une fréquence ou un poids — par jour, par prise, par kilo, quotidien,
-- matin ou soir — partent en revue individuelle, comme une borne. La garde ne
-- juge aucune dose ; elle ne fait que fermer la voie rapide. Sur-capture
-- assumée. Hors règle (§3) : les posologies sans nombre (« une gélule matin et
-- soir »).
--
-- Relevé par conteneur avant cette migration (D-304 §4), le 2026-10-15, en
-- comptes : 150 claims sont aujourd'hui signés par lot ; 4 portent une dose au
-- sens de la famille 6, et tous les 4 sont déjà pris par les familles 1 à 5 —
-- AUCUN claim signé par lot ne porte une dose que la garde laissait passer. Rien
-- n'est donc à signaler ni à reprendre. Aucun claim n'est en attente : la
-- famille 6 n'agit que sur les ingestions à venir. Sur les 8082 claims validés
-- individuellement, elle en aurait pris 349, dont 113 que les familles 1 à 5
-- laissaient passer ; une lecture de ces textes y trouve des doses, à quelques
-- unités près.
--
-- Aucune donnée n'est touchée : ni statut, ni signature, ni claim. Seule la
-- définition de la fonction change ; ses appelants (cinq requêtes de
-- web/src/lib/rag/claims/revue.ts et le trigger du journal) l'appellent, ils ne
-- la recopient pas. Les cinq familles existantes sont reprises à l'identique,
-- caractère pour caractère ; le contrat rag_claim_garde_seuils_v1.sql continue
-- de les épingler, rag_claim_garde_dose_v1.sql épingle la sixième.
--
-- `CREATE OR REPLACE` conserve propriétaire et droits ; les révocations sont
-- rejouées malgré tout, pour que la migration se suffise.
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
    -- 6. Une dose (D-304) : un nombre, une unité de dose, puis une fréquence ou
    --    un poids, à quarante caractères au plus et sans franchir de fin de
    --    phrase (`[^.;:]`) — « 200 mg d'extraits de ginseng par jour » est pris,
    --    « 20 mg. Il se prend le matin » ne l'est pas. Le `\M` ferme l'unité sur
    --    une fin de mot : « 1 gélule » n'est pas « 1 g », la locale de la
    --    production et du CI (en_US.utf8) comptant « é » parmi les lettres.
    --    « unité(s) » est l'UI écrite en toutes lettres (« vitamine D 2000
    --    unités par jour »). Le micro existe sous deux points de code (U+00B5 et
    --    U+03BC) : le corpus porte les deux.
    OR texte ~* '[0-9]+([.,][0-9]+)? ?(mg|µg|μg|ug|mcg|g|ui|iu|ml|unités?)\M[^.;:]{0,40}?((par|/) ?(jour|j|prise|kilo|kg)\M|quotidien|matin|soir|/ ?24 ?h)'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM authenticated;
  END IF;
END $$;

COMMENT ON FUNCTION public.rag_claim_porte_seuil(text) IS
  'Vrai si le texte d''un claim porte une borne de décision (plage de référence, seuil, bande d''interprétation) ou une dose écrite en nombre, unité et fréquence (D-304). Ferme la signature par lot, jamais la validation individuelle. Définition unique, appelée par revue.ts et par le trigger du journal. Audit du 2026-07-27 : rappel 55/55, précision 65 % ; famille dose ajoutée le 2026-10-15 (20261015140000).';
