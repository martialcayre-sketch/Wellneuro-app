-- LE REPÈRE DE FRAÎCHEUR DU JOURNAL PATIENT — « jusqu'où ce patient a vu ».
--
-- Campagne « la vie du portail patient », LOT-02. Arbitrage du responsable,
-- 2026-09-12 : le journal est REPLIÉ par défaut et se DÉPLIE quand il y a du
-- neuf. C'est le seul point de toute la campagne qui demande une écriture — le
-- cadrage annonçait le contraire, et il avait tort.
--
-- POURQUOI UNE LIGNE EN BASE, ET PAS `localStorage`. Le « neuf » calculé
-- localement est exactement le défaut que cette campagne corrige : un patient
-- qui ouvre son portail sur son téléphone au lieu de son ordinateur verrait
-- tout en neuf, ou rien. Le repère suit la personne, pas le navigateur.
--
-- ── CE QUE CETTE TABLE NE PEUT PAS DEVENIR, ET C'EST SA RAISON D'ÊTRE ──────
--
-- UNE SEULE LIGNE PAR DOSSIER, ÉCRASÉE. `id_patient` EST la clé primaire : ce
-- n'est pas une commodité, c'est la contrainte qui rend un DÉCOMPTE
-- D'ASSIDUITÉ impossible. Une table append-only de visites dirait « ce patient
-- a ouvert son portail 14 fois en septembre » — un constat sur lui, que la
-- campagne s'interdit explicitement et que `DC-19`/`DC-20` interdisent en
-- général. Ce qui n'est pas conservé ne se compte pas.
--
-- DEUX COLONNES, ET PAS UNE DE PLUS. Pas de `mis_a_jour_le` : il vaudrait
-- toujours `vu_jusqua`, et une colonne redondante finit par servir à autre
-- chose. Pas de compteur, pas de première visite, pas de durée.
--
-- CE N'EST PAS UNE TRACE D'AUDIT, et il ne faut pas la lire comme telle : les
-- valeurs précédentes sont perdues à chaque avancée. C'est une commodité
-- d'affichage, et la perte est voulue.

CREATE TABLE "portail_journal_reperes" (
    "id_patient" TEXT NOT NULL,
    "vu_jusqua" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portail_journal_reperes_pkey" PRIMARY KEY ("id_patient")
);

-- ON DELETE RESTRICT, comme toutes ses sœurs : l'effacement d'un dossier est
-- une suppression NOMMÉE dans `patient/effacement.ts`. En CASCADE, cette ligne
-- deviendrait du code mort en silence.
ALTER TABLE "portail_journal_reperes" ADD CONSTRAINT "portail_journal_reperes_id_patient_fkey"
  FOREIGN KEY ("id_patient") REFERENCES "patients"("id_patient") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Posture `D-005` : deny-all, aucune policy. L'accès passe par l'application.
ALTER TABLE "public"."portail_journal_reperes" ENABLE ROW LEVEL SECURITY;
