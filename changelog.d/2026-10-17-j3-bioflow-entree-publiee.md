### BioFlow publié : entrée publiée, premier lecteur hors biologie, banc à liste fermée des imports (D-306, J3-bioflow, plan F63, 2026-10-17)

- Entrée publiée `web/src/lib/biology-library/publie.ts` (D-306 §1) : liste
  fermée des fichiers ré-exportés (`FICHIERS_PUBLIES`), tables dont BioFlow est
  propriétaire (`TABLES_BIOFLOW`, 25), drapeaux dont l'extinction le ferme
  (`DRAPEAUX_BIOFLOW`, 6).
- Premier lecteur hors biologie (D-306 §4) : la route de clôture et de
  désactivation d'un dossier (`/api/praticien/patients/cycle-de-vie`) lit
  BioFlow par la seule entrée publiée. Aucun comportement changé.
- Banc `bioflowPublie.guard.test.ts` (D-306 §2, §5) : tout import direct de la
  biologie hors du domaine est une dérogation datée (20, du 2026-10-17), sous
  plafond figé — la liste ne peut que diminuer ; un import neuf rougit la CI.
  Il vérifie aussi que l'entrée ne ré-exporte que sa liste fermée, que les
  tables déclarées existent sans qu'aucune table de biologie n'y manque, et
  que les drapeaux sont ceux de `featureFlag.ts`. Contre-épreuve comprise.
