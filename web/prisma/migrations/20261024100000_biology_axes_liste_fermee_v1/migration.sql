-- F52 — Référentiel d'axes biologiques : la liste fermée de D-348 §2.
--
-- La cible `axe` de `biology_analyte_links` acceptait jusqu'ici n'importe
-- quel `cible_code` : un axe mal orthographié ou inventé serait entré sans
-- erreur, et un lien vers lui n'aurait jamais été servi. Les dix codes sont
-- ceux de la lettre cm signée le 2026-10-23 (D-348 §2) ; chacun est fondé sur
-- des claims de mécanisme certifiés (D-348 §3, relus en production avant
-- cette migration). Ajouter, retirer, renommer ou scinder un axe exige une
-- nouvelle décision, donc une nouvelle migration (D-348 §8).
--
-- Contrainte seule : aucune ligne n'est écrite. La table est vide en
-- production (constaté le 2026-10-24) ; les liens analyte-axe se signent
-- claim par claim, plus tard (F79). Le lien sans claim est déjà refusé par
-- `claim_id NOT NULL` et `biology_analyte_links_claim_non_vide_check`.
--
-- CHECK non modélisé par Prisma : `schema.prisma` ne change pas. Il est
-- éprouvé par `prisma/checks/biology_axes_v1_negatif.sql`.
ALTER TABLE "biology_analyte_links"
    ADD CONSTRAINT "biology_analyte_links_cible_axe_check"
    CHECK ("cible_type" <> 'axe' OR "cible_code" IN (
        'methylation',
        'inflammation',
        'stress_oxydant',
        'energie_mitochondriale',
        'regulation_glycemique',
        'acides_gras_polyinsatures',
        'thyreotrope',
        'corticotrope',
        'barriere_intestinale',
        'microbiote_cerveau'
    ));
