### Ajouté

- **Le transport des compositions du catalogue compléments existe et se mesure.**
  Le catalogue compte 140 148 fiches sans aucun ingrédient, et six critères de
  recherche sur huit en dépendent. Le chemin d'écriture (`POST
  /api/internal/supplements/compositions`, authentifié par Bearer) et son
  producteur (`tools/supplements/compositions/transporter.mjs`) sont désormais
  dans `main`.

  **Mesuré, pas estimé** : sur les 140 148 fiches, **138 728 (99,0 %)**
  passeraient de « coquille » à « composition connue », pour 575 769 lignes dont
  545 900 résolues (94,8 %) et **zéro libellé inconnu** — le non-résolu est de
  l'ambiguïté, pas de la donnée manquante.

  Le producteur est **`--dry-run` par défaut** : sans `--envoyer`, il n'ouvre
  aucune connexion, et un banc le prouve structurellement par un client HTTP
  factice qui échoue s'il est appelé. **Ce lot ne charge rien** : il livre la
  capacité et le chiffre. Le chargement réel reste un geste d'exploitation
  distinct, gardé par deux clés — l'hôte visé doit concorder avec
  `SUPPLEMENTS_TRANSPORT_HOTE`, à côté du secret, sur le modèle de la garde
  `--base` de l'import NABM.

### Corrigé

- **Un doublon de composition ne fait plus passer une fiche au feu vert.** La base
  ne peut pas stocker deux lignes de même ingrédient et même forme
  (`@@unique([productId, ingredientId, formeId])`) : la seconde est écartée, et
  ce n'est pas un choix. Ce qui se décide est le **dénominateur de complétude**.

  Un doublon **strictement identique** (même dose, même unité) ne perd aucune
  information : il sort du dénominateur, sans quoi une fiche entièrement résolue
  s'afficherait « partielle ». Un doublon **divergent** fait perdre une dose qui
  ne reviendra jamais : il **reste** au dénominateur, et la fiche reste
  « partielle » plutôt que de servir « Compatible » ou « Aucun cumul » sur une
  quantité sous-évaluée.

  Sur le corpus réel, la distinction n'est pas théorique : **7 307 doublons
  identiques contre 2 912 divergents**. Une première rédaction les sortait tous
  du dénominateur — jusqu'à 2 912 fiches auraient affiché un feu vert clinique en
  ayant perdu un apport. Trouvé en contre-revue adversariale.

- **Une composition ne s'écrit plus sur une fiche que personne ne sert.** La
  recherche du produit reprend désormais **les deux** conditions du catalogue —
  le pointeur de version courante **et** `statutFiche` non `inactive` — là où
  elle n'en posait qu'une tout en affirmant reprendre « exactement le critère ».
  Écrire sur une fiche inactive comptait comme un succès et n'était jamais servi.
  Un banc lit les deux fichiers et rougit si les critères divergent.

- **Le rejeu répare enfin ce qu'il promettait.** `compositionSourceLignes` est une
  colonne scalaire du produit, pas une ligne de composition : la corriger ne viole
  aucun append-only. Un rejeu sur lignes identiques mais dénominateur divergent le
  met à jour et le compte (`produitsDenominateurCorrige`). Sans cela, un lot
  transporté avec un mauvais dénominateur était **définitivement figé**, alors que
  le README, le refus d'envoi et l'erreur de payload présentaient tous le rejeu
  comme le geste de reprise complet.
