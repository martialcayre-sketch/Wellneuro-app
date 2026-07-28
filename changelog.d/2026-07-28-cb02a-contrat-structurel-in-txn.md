### Import NABM : le contrat structurel entre dans la transaction (2026-07-28)

Le contrat du catalogue biologie était rejoué APRÈS le COMMIT de l'import NABM
(par `vercel-build.sh`, puis par le workflow `release-db`) : un échec de contrat
laissait alors la donnée écrite et le build rouge — le seul cas où « rouge » ne
voulait pas dire « rien écrit ».

Les invariants STRUCTURELS (CHECK, RLS, index partiels, verrou HDS, existence des
tables) sont extraits dans `prisma/checks/cb_biologie_structure_v1.sql` — un bloc
`DO` nu, sans enveloppe `BEGIN/COMMIT` — et désormais rejoués DANS la transaction
de l'import (`prisma/importNabm.ts`), avant COMMIT : une violation structurelle
annule l'import (ROLLBACK) au lieu d'être constatée après coup. Le contrat de
DONNÉES (`cb_biologie_catalogue_v1.sql`) ne porte plus que le pointeur, le
snapshot, les incompatibilités et la barrière D-003 ; cette dernière portant sur
des tables peuplées par d'autres lots (plages fonctionnelles, liens cliniques),
elle reste un contrat de catalogue joué en CI, hors du chemin d'import. Les
correspondances signées restent gardées, avant écriture, par le contrôle
d'orphelines existant, qui respecte `--accepte-orphelines`.

Aucune duplication : chaque invariant vit dans un seul fichier. Le CI joue les
deux contrats ; le workflow `release-db` ne rejoue plus de contrat après l'import
(le structurel est in-transaction). Le banc d'intégration NABM gagne un cas : une
colonne de sémantique patient ajoutée au catalogue doit faire ROLLBACK l'import
(verrou HDS détecté in-transaction). `vercel-build.sh` est inchangé — il rejoue
encore le contrat de données après l'import jusqu'à son allègement (lot suivant).
