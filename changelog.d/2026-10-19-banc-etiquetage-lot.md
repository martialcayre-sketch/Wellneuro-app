### Atelier corpus

- **Étiquetage en lot, banc contre PostgreSQL (D-325)** : un banc joue le
  vrai écrivain de l'étiquetage en lot contre la base, en CI et en T3 :
  - les clés sont posées et le journal reçoit un acte par claim ;
  - un renvoi de la même liste n'ajoute rien ;
  - une liste refusée n'écrit rien ;
  - deux envois concurrents se sérialisent sur le verrou.

  Une contre-épreuve vérifie d'abord que le CHECK du journal est armé. Le
  banc a révélé un défaut, corrigé ici : des besoins reçus dans un autre
  ordre (« 4, 2 ») étaient réécrits et journalisés comme un changement.
  L'écrivain normalise désormais les clés avant de comparer ; l'atelier
  n'était pas touché, car la route triait déjà les besoins.
