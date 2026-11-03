### Processus de fond des lectures : boucle et fantômes sous banc (2026-11-03)

- La boucle du processus de fond (`bioExtractionWorker.ts`) est extraite
  dans `boucleFileExtraction.ts`, sans changement de comportement : balayage
  des fantômes chaque minute, signal de vie après un balayage réussi
  seulement, attente de 2 s sur file vide, arrêt après le tour en cours.
  Huit tests la jouent sur une horloge simulée.
- `reconcilierFantomes` reçoit une péremption injectable, par défaut celle
  de production : le banc PostgreSQL de la file prouve qu'un import frais
  reste et qu'un import périmé est clos `delai_depasse` (cas 11).
- Le même banc joue les refus de l'ouverture quand une lecture fraîche tient
  le compte rendu : à la réclamation (échec sans import) et à la reprise
  (import courant clos, puis échec) (cas 12).
- Arbitrage du responsable du 2026-11-03 ; aucune migration.
