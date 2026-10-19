-- Objectif négocié : une version ne se révise qu'UNE fois (dette t11).
--
-- La route lit « cette version a-t-elle déjà été reformulée ? » puis écrit :
-- deux révisions concurrentes de la même version passaient toutes deux la
-- lecture et scindaient la chaîne en deux têtes, que seul un départage
-- (`D-161`, motif `remplace`) pouvait ramener à une. L'index ferme la course
-- dans la base ; la route rend son refus (P2002) en 409 `objectif_supplante`,
-- la même réponse que la lecture.
--
-- CE QU'IL NE TOUCHE PAS : deux RACINES distinctes (`supersedes_objectif_id`
-- NULL) restent possibles — Postgres admet plusieurs NULL dans un index
-- unique —, parce qu'un dossier peut légitimement porter une chaîne close et
-- une chaîne nouvelle. Leur coexistence active reste rendue visible et
-- départagée par le praticien.
--
-- Constaté avant écriture (2026-10-19, conteneur en lecture seule) : aucune
-- version de production n'est révisée deux fois — l'index s'applique sans
-- départage préalable.
CREATE UNIQUE INDEX "alli_objectif_negocie_supersedes_unique"
  ON "objectifs_negocies"("supersedes_objectif_id");
