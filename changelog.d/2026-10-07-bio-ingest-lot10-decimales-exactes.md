### Résultats biologiques : la valeur arrive en base exactement telle que saisie ou lue, BIO-INGEST LOT-10 (2026-10-07)

- La valeur d'un résultat ne passe plus par un nombre JavaScript (flottant)
  entre l'écran et la colonne : elle voyage en texte décimal, validé côté
  serveur, puis s'écrit en décimal exact. Vaut pour les quatre voies : saisie
  unitaire, saisie groupée d'un bilan, validation d'une ligne d'import,
  correction d'une mesure.
- Relecture exacte, en notation normale : `0,30000000000000004`, une valeur
  à 17 chiffres significatifs ou `0,0000001` reviennent à l'identique, à
  l'écran comme en base.
- Forme unique : virgule ou point à la saisie, rendu au point, sans zéro de
  tête ni de queue (`007,500` est consigné `7.5`) ; la colonne n'a jamais
  gardé les zéros de queue.
- Nouveau refus explicite : plus de 30 décimales (la base aurait arrondi en
  silence), en plus des 35 chiffres avant la virgule. Une valeur à exposant
  (`1e3`) ou hexadécimale n'est plus acceptée.
- Aucune migration, aucune conversion d'unité, aucun changement clinique.
