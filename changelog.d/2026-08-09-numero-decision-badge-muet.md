### Corrigé

- L'inventaire écran ↔ registre imprimé par `npm run check` annonçait sa matière
  comme celle de **`D-037`**. Ce numéro est parti le même jour à la décision HDS,
  et il n'aurait pas pu être réservé : `decisions-numerotation.mjs` refuse tout
  trou dans la suite, donc **le numéro va à la décision qui s'écrit**. La sortie
  et les commentaires du LOT-04 désignent désormais la décision produit **par son
  objet** — le badge muet — sans citer de numéro futur. Nommer un numéro qu'on ne
  contrôle pas, c'est la même faute que celle que ce lot attrape : affirmer ce
  que le registre ne porte pas.
