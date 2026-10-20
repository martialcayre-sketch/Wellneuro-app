### Parcours : les tables des constats du praticien sont créées (D-331, BP-11, migration)

- Migration seule : deux tables en ajout seul gardent chaque constat du
  praticien sur une hypothèse du parcours (pose, remplacement, retrait) et
  ses pièces — une ligne de résultat de biologie ou une réponse de
  questionnaire du dossier, par une vraie clé. La base tient un seul constat
  en vigueur par hypothèse, refuse un motif hors de la liste de son verdict,
  un autre praticien que celui du dossier, une ligne déjà corrigée ou
  annulée, une passation exclue du raisonnement, une pièce ajoutée après
  coup, et un constat « confirmée » ou « non retenue » sans pièce. Aucune
  valeur recopiée.
- L'effacement d'un dossier vide les pièces puis les constats, avant les
  réponses et les résultats. Aucun écran ne les écrit ni ne les lit encore :
  le code suivra, sous drapeau éteint, après application constatée en
  production.
