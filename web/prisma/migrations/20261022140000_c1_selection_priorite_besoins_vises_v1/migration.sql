-- C1 — LES BESOINS VISÉS D'UNE PRIORITÉ LIBRE ([[D-338]] §3, amende [[D-279]] §1).
--
-- Fait nouveau de [[D-338]] : tant que les besoins 2, 6, 7, 10, 11 et 12 n'ont
-- aucune règle, toute priorité qui les vise est LIBRE, donc sans re-mesure
-- ciblée — un angle mort de suivi qui grandit avec chaque dossier servi. La
-- priorité libre reçoit un champ FACULTATIF « besoins visés », lu par la
-- re-passation ciblée SEULE : ni par la hiérarchie des assiettes, ni par aucun
-- calcul, ni par une règle. MIGRATION SEULE : le code qui écrit et lit cette
-- colonne vient après la `release-db` et son constat. Le reste de [[D-279]] est
-- inchangé — l'identifiant `libre:<domaine>:<empreinte>` ne dérive toujours que
-- du domaine et du libellé : changer les seuls besoins visés n'est pas un pivot
-- ([[D-255]]), comme changer le seul motif.
--
-- LA SÉLECTION RESTE UNE LIGNE DE `decision_priority_selections` ([[D-127]]) :
-- même fil append-only, mêmes gardes. Corriger les besoins visés crée une
-- ligne qui supplante la précédente, jamais un `UPDATE`.
--
-- CE QUE LA BASE TIENT :
--   1. des entiers de 1 à 12, clés de `BESOIN_SOURCES` — patron de
--      `biology_panels_besoins_bornes_check`. Les douze sont admis, y compris
--      ceux dont `BESOIN_SOURCES` est vide (2, 6, 7, 11) : la visée se consigne,
--      et l'écran dit qu'elle ne re-mesure rien (arbitrage du responsable du
--      2026-10-22). Un élément NULL n'est contenu dans aucun tableau : `<@` le
--      refuse ;
--   2. un tableau à une dimension, indicé à partir de 1 : `<@` compare élément
--      par élément et laisserait passer `{{1,2}}` ; et `'[0:1]={2,6}'` est en
--      SQL une valeur distincte de `{2,6}` (l'égalité compare les bornes) ;
--   3. la forme CANONIQUE — strictement croissante, donc sans doublon. La
--      sélection entre dans l'empreinte de la carte de décision ([[D-127]]) :
--      deux écritures d'une même visée ne doivent pas donner deux cartes. Un
--      CHECK n'admet pas de sous-requête, d'où la fonction IMMUTABLE ;
--   4. VIDE (`{}`) = aucun besoin visé. Une seule représentation de
--      l'absence : la colonne est NOT NULL et vaut `{}` par défaut — les lignes
--      existantes la reçoivent, et les CHECK se valident sur elles ;
--   5. un candidat du moteur (`priority:`) n'en porte aucun : ses besoins sont
--      ceux de sa règle signée (`provenance.needIds`), jamais une saisie.

-- AlterTable
ALTER TABLE "decision_priority_selections"
  ADD COLUMN "besoins_vises" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Strictement croissant : aucun indice où l'élément précédent est supérieur
-- ou égal au suivant. Vrai sur `{}`. IMMUTABLE : ne lit que son argument.
CREATE OR REPLACE FUNCTION public.selection_priorite_besoins_croissants(besoins integer[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM generate_subscripts(besoins, 1) AS i
    WHERE i > array_lower(besoins, 1)
      AND besoins[i - 1] >= besoins[i]
  );
$$;

ALTER TABLE "decision_priority_selections"
  ADD CONSTRAINT "decision_priority_selections_besoins_vises_bornes_check"
    CHECK ("besoins_vises" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]),
  ADD CONSTRAINT "decision_priority_selections_besoins_vises_forme_check"
    CHECK (
      (cardinality("besoins_vises") = 0
        OR (array_ndims("besoins_vises") = 1 AND array_lower("besoins_vises", 1) = 1))
      AND public.selection_priorite_besoins_croissants("besoins_vises")
    ),
  ADD CONSTRAINT "decision_priority_selections_besoins_vises_libre_check"
    CHECK ("candidate_id" LIKE 'libre:%' OR cardinality("besoins_vises") = 0);
