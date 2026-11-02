### Atelier du corpus : recherche d'un claim par identifiant (2026-11-02)

- L'atelier de curation du corpus a un champ « Rechercher un claim par
  identifiant ». Il accepte `WN-CL-0061-008` ou `0061-008`, en majuscules ou
  en minuscules. Un `@v1.1` collé est accepté et ignoré : toutes les versions
  actives du claim s'affichent.
- La recherche est exacte. Aucun préfixe ni motif n'est accepté, donc un
  claim voisin ne peut pas sortir à la place du claim cherché : c'est la
  confusion du 2026-10-14. Une saisie illisible est refusée à l'écran, sans
  requête, et la route la refuse aussi (`claim_invalide`).
- La recherche filtre l'onglet ouvert et reste active quand on change
  d'onglet. Si le claim n'est pas dans l'onglet ouvert, l'écran dit dans quel
  onglet il se trouve et propose de l'ouvrir, avec les mêmes filtres de
  source et de notebook. Après une décision, la page se recharge avec la
  recherche toujours active.
- Les pages de cinquante (D-325), l'ordre de la liste et l'écran sans
  recherche ne changent pas. Aucune migration.
- Lot D/22 de la file B, tranché le 2026-10-21. Le périmètre (l'onglet
  ouvert, plus le renvoi vers le bon onglet) et la recherche exacte ont été
  arbitrés par le responsable le 2026-11-02.
