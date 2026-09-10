### Note

- **Les quatre colonnes de déclaration de date sont assumées vides, pas
  oubliées.** `geste_le`, `dispose_le`, `exprime_le` et `repondu_le` existent en
  base et aucun code ne les écrit — le type ne porte même pas le champ, le vide
  est donc verrouillé à la compilation. Elles attendent une surface de saisie qui
  n'existe pas : tant que personne ne peut déclarer « j'ai répondu le 3, pas
  aujourd'hui », la colonne n'a rien à recevoir, et la combler depuis `cree_le`
  inventerait une date. Les retirer serait un lot — deux sont épinglées par la
  liste blanche d'un contrat. Aucun code ne change : ce qui change est ce qu'un
  lecteur comprend, quatre colonnes vides sans explication se lisant comme un
  bogue (`D-165`).
