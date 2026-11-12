### Atelier corpus : le filtre « Exclus de la recherche seulement » vaut dans les trois onglets (D-490, 2026-11-12)

Sans migration ni écriture en base.

- Route `GET /api/praticien/corpus/claims` : `exclu=1` est accepté pour les trois statuts (en attente, validés,
  rejetés) ; seule une valeur autre que `1` reste refusée (`400 exclu_invalide`). Le service de liste combinait
  déjà statut et exclusion.
- Atelier corpus : la case à cocher s'affiche dans les trois onglets ; le filtre survit au changement d'onglet
  (on suit un claim exclu remis en attente ou rejeté) et une recherche par identifiant le remet à zéro, comme
  avant. Message vide propre à chaque onglet filtré.
- `D-490` §4 : précision datée qui lève la restriction à `VALIDE` (question `20261112-1241-b`).
