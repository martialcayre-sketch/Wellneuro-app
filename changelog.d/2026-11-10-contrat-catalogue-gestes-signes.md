### Biologie : le contrat du catalogue ne compte plus les signatures du praticien (H15, 2026-11-10)

- `cb_catalogue_niveau_1_donnees.sql` était rouge en production depuis le
  2026-10-26 : son bloc D-376 comptait 35 lignes de compositions signées
  par le praticien sur les fiches d'acides gras (F80). En CI, base neuve,
  il restait vert ; le rouge a été vu au constat de D-473.
- Les blocs D-473, D-376, D-361 et D-323 ne comptent plus que ce qu'une
  migration écrit : plages, liens d'axe et items de panel. Les
  correspondances NABM et les compositions signées en sont retirées.
- Aucun changement de schéma, de donnée ni de logique clinique. Rejoué en
  production, en lecture seule : vert.
